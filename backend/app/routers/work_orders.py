from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user, verify_workshop
from app.models.models import (
    MaintenanceRecord,
    Part,
    WorkOrder,
    WorkOrderLaborItem,
    WorkOrderPart,
    WorkOrderPhotoEvidence,
    Workshop,
    WorkshopClient,
    WorkshopInventoryPart,
    WorkshopIssuedDocument,
    WorkshopMechanic,
    WorkshopVehicle,
)
from app.routers.workshop_documents import _next_doc_number
from app.schemas.schemas import (
    WorkOrderCreate,
    WorkOrderOut,
    WorkOrderPhotoEvidenceIn,
    WorkOrderPhotoEvidenceOut,
    WorkOrderStatusUpdate,
    WorkOrderUpdate,
)

router = APIRouter(prefix="/workshops/me/work-orders", tags=["work-orders"])

_ORDER_LOADS = (
    selectinload(WorkOrder.labor_items),
    selectinload(WorkOrder.parts_items),
    selectinload(WorkOrder.photo_evidences),
)

# Estados que marcan la orden como cerrada para efectos de completed_date —
# mismo criterio que tallerpro (App.tsx handleUpdateOrderStatus).
_COMPLETING_STATUSES = {"Entregado", "Listo para Entrega"}


async def _restore_stock_for_order(work_order_id: UUID, db: AsyncSession) -> None:
    """Devuelve al inventario las cantidades que una orden había descontado,
    antes de reemplazar su lista de repuestos (edición) o eliminarla."""
    existing = (
        await db.execute(select(WorkOrderPart).where(WorkOrderPart.work_order_id == work_order_id))
    ).scalars().all()
    for line in existing:
        if line.part_id is None:
            continue
        inv = (
            await db.execute(
                select(WorkshopInventoryPart).where(WorkshopInventoryPart.id == line.part_id).with_for_update()
            )
        ).scalar_one_or_none()
        if inv:
            inv.stock = inv.stock + line.quantity


async def _apply_labor_items(work_order: WorkOrder, labor_items: list, db: AsyncSession) -> None:
    await db.execute(delete(WorkOrderLaborItem).where(WorkOrderLaborItem.work_order_id == work_order.id))
    for li in labor_items:
        total = (li.hours * li.rate_per_hour).quantize(Decimal("0.01"))
        db.add(WorkOrderLaborItem(
            work_order_id=work_order.id,
            description=li.description,
            hours=li.hours,
            rate_per_hour=li.rate_per_hour,
            total=total,
        ))
    await db.flush()


async def _apply_parts_items(work_order: WorkOrder, workshop: Workshop, parts_items: list, db: AsyncSession) -> None:
    """Restaura al inventario lo que la orden tenía descontado, borra sus líneas
    de repuestos y aplica las nuevas — con bloqueo de fila por repuesto para
    evitar condiciones de carrera entre dos órdenes tocando el mismo stock casi
    al mismo tiempo."""
    await _restore_stock_for_order(work_order.id, db)
    await db.execute(delete(WorkOrderPart).where(WorkOrderPart.work_order_id == work_order.id))

    for pi in parts_items:
        subtotal = (pi.unit_price * pi.quantity).quantize(Decimal("0.01"))
        resolved_part_id = None
        if pi.part_id:
            inv = (
                await db.execute(
                    select(WorkshopInventoryPart)
                    .where(WorkshopInventoryPart.id == pi.part_id, WorkshopInventoryPart.workshop_id == workshop.id)
                    .with_for_update()
                )
            ).scalar_one_or_none()
            if inv:
                inv.stock = max(0, inv.stock - pi.quantity)
                resolved_part_id = inv.id

        db.add(WorkOrderPart(
            work_order_id=work_order.id,
            part_id=resolved_part_id,
            part_name=pi.part_name,
            sku=pi.sku,
            quantity=pi.quantity,
            unit_cost=pi.unit_cost,
            unit_price=pi.unit_price,
            subtotal=subtotal,
        ))
    await db.flush()


async def _recompute_totals(work_order: WorkOrder, workshop: Workshop, db: AsyncSession) -> None:
    """Recalcula los totales de la orden desde sus líneas ya persistidas en DB
    — siempre en el backend, nunca con una tasa de IVA fija en el cliente (ver
    docs/PLAN_MIGRACION_TALLERPRO.md Fase 6, IVA 19% hardcodeado en tallerpro)."""
    labor_rows = (
        await db.execute(select(WorkOrderLaborItem).where(WorkOrderLaborItem.work_order_id == work_order.id))
    ).scalars().all()
    parts_rows = (
        await db.execute(select(WorkOrderPart).where(WorkOrderPart.work_order_id == work_order.id))
    ).scalars().all()

    labor_total = sum((li.total for li in labor_rows), Decimal(0))
    parts_total = sum((pi.subtotal for pi in parts_rows), Decimal(0))
    total_cost_price = sum((pi.unit_cost * pi.quantity for pi in parts_rows), Decimal(0)).quantize(Decimal("0.01"))
    total_amount = labor_total + parts_total
    tax_amount = (total_amount * (workshop.tax_rate_percent / Decimal(100))).quantize(Decimal("0.01"))
    final_total = total_amount + tax_amount
    net_profit = total_amount - total_cost_price

    work_order.labor_total = labor_total
    work_order.parts_total = parts_total
    work_order.total_cost_price = total_cost_price
    work_order.total_amount = total_amount
    work_order.tax_amount = tax_amount
    work_order.final_total = final_total
    work_order.net_profit = net_profit


async def _auto_invoice_if_delivered_and_paid(order: WorkOrder, workshop: Workshop, db: AsyncSession) -> None:
    """Factura de compra automática — docs/PLAN_FACTURACION_AUTOMATICA.md Paso 1.
    En cuanto una orden queda Entregada Y pagada (en cualquier orden: primero
    se paga y después se entrega, o al revés — se llama tras cualquiera de los
    dos cambios), se emite sola, sin que el taller tenga que ir a "Documentos"
    a hacerlo a mano. Idempotente: si ya existe una factura para esta orden no
    crea una segunda aunque el estado se vuelva a guardar después.

    Solo cubre la emisión interna (`workshop_issued_documents`) — enviarla a
    la sección "Facturas" del cliente (si su vehículo está vinculado a una
    cuenta CarLink real) y actualizar su historial/partes son los próximos
    pasos del plan, todavía no implementados acá."""
    if order.status != "Entregado" or not order.is_paid:
        return
    already = await db.scalar(
        select(func.count()).select_from(WorkshopIssuedDocument).where(
            WorkshopIssuedDocument.work_order_id == order.id,
            WorkshopIssuedDocument.doc_type == "Factura de compra",
        )
    )
    if already:
        return

    client = (
        await db.execute(select(WorkshopClient).where(WorkshopClient.id == order.client_id))
    ).scalar_one_or_none()
    vehicle = (
        await db.execute(select(WorkshopVehicle).where(WorkshopVehicle.id == order.workshop_vehicle_id))
    ).scalar_one_or_none()
    mechanic_name = ""
    if order.mechanic_id:
        mechanic = (
            await db.execute(select(WorkshopMechanic).where(WorkshopMechanic.id == order.mechanic_id))
        ).scalar_one_or_none()
        mechanic_name = mechanic.name if mechanic else ""

    doc = WorkshopIssuedDocument(
        workshop_id=workshop.id,
        doc_type="Factura de compra",
        client_name=client.name if client else "",
        client_tax_id=client.document_id if client else "",
        vehicle_plate=vehicle.license_plate if vehicle else "",
        vehicle_model=vehicle.model if vehicle else "",
        work_order_id=order.id,
        amount=order.final_total,
        mechanic_name=mechanic_name,
        details=order.symptoms or order.category,
        issued_by=workshop.name,
    )
    # SAVEPOINT (begin_nested), no db.rollback() liso — esto corre en medio de
    # update_work_order/update_work_order_status, que ya tienen cambios de la
    # orden sin commitear en la misma sesión. Un rollback de toda la
    # transacción (como sí hace _next_doc_number en workshop_documents.py,
    # donde es la única operación pendiente) se llevaría puestos esos cambios
    # de la orden — acá solo se debe descartar el intento de insert que chocó.
    for attempt in range(5):
        doc.doc_number = await _next_doc_number(workshop.id, db)
        try:
            async with db.begin_nested():
                db.add(doc)
                await db.flush()
            return
        except IntegrityError:
            if attempt == 4:
                return


# Categorías de `workshop_inventory_parts` (InventarioModule.tsx: Otros,
# Motor, Frenos, Suspensión, Eléctrico, Filtros, Neumáticos, Carrocería) →
# categorías fijas de `parts` del lado persona (lib/part-categories.ts:
# Frenos, Motor, Suspensión, Eléctrico, Filtros, Transmisión, Enfriamiento,
# Llantas, Otros). Lo que no tiene equivalente directo (Carrocería) cae en
# "Otros" en vez de inventar una categoría nueva.
_INVENTORY_TO_PERSONA_PART_CATEGORY = {
    "Motor": "Motor",
    "Frenos": "Frenos",
    "Suspensión": "Suspensión",
    "Eléctrico": "Eléctrico",
    "Filtros": "Filtros",
    "Neumáticos": "Llantas",
    "Carrocería": "Otros",
    "Otros": "Otros",
}


async def _sync_client_records_if_linked(order: WorkOrder, workshop: Workshop, db: AsyncSession) -> None:
    """Historial + repuestos reemplazados del cliente — docs/PLAN_FACTURACION_AUTOMATICA.md
    Paso 3. Solo corre si el vehículo del taller está vinculado a una cuenta
    CarLink real (`workshop_vehicles.linked_vehicle_id`, ver
    `workshop_clients.py` → `link_workshop_vehicle`). Idempotente por
    `source_work_order_id` — no duplica si la orden se re-guarda. El cliente
    nunca puede editar lo que esto crea (se filtra en el frontend por
    `workshop_id`/`source_work_order_id` presentes)."""
    if order.status != "Entregado" or not order.is_paid:
        return
    workshop_vehicle = (
        await db.execute(select(WorkshopVehicle).where(WorkshopVehicle.id == order.workshop_vehicle_id))
    ).scalar_one_or_none()
    if not workshop_vehicle or not workshop_vehicle.linked_vehicle_id:
        return
    linked_vehicle_id = workshop_vehicle.linked_vehicle_id

    already_history = await db.scalar(
        select(func.count()).select_from(MaintenanceRecord).where(MaintenanceRecord.source_work_order_id == order.id)
    )
    if not already_history:
        db.add(MaintenanceRecord(
            vehicle_id=linked_vehicle_id,
            workshop_id=workshop.id,
            source_work_order_id=order.id,
            service_type=order.category or "Servicio de taller",
            description=f"{order.symptoms or order.category or 'Servicio realizado'} (Orden {order.order_number})",
            mileage=workshop_vehicle.mileage or 0,
            workshop=workshop.name,
            cost=order.final_total,
        ))

    already_parts = await db.scalar(
        select(func.count()).select_from(Part).where(Part.source_work_order_id == order.id)
    )
    if not already_parts:
        # Solo líneas con un repuesto real de inventario vinculado — una línea
        # de texto libre (sin part_id) no tiene categoría de la que partir,
        # así que no se inventa una.
        lines = (
            await db.execute(
                select(WorkOrderPart).where(WorkOrderPart.work_order_id == order.id, WorkOrderPart.part_id.isnot(None))
            )
        ).scalars().all()
        for line in lines:
            inv = (
                await db.execute(select(WorkshopInventoryPart).where(WorkshopInventoryPart.id == line.part_id))
            ).scalar_one_or_none()
            if not inv:
                continue
            db.add(Part(
                vehicle_id=linked_vehicle_id,
                workshop_id=workshop.id,
                source_work_order_id=order.id,
                name=inv.name,
                category=_INVENTORY_TO_PERSONA_PART_CATEGORY.get(inv.category, "Otros"),
                part_number=inv.sku,
                status="ok",
                mileage_installed=workshop_vehicle.mileage or None,
                notes=f"Reemplazado por {workshop.name} — Orden {order.order_number}",
            ))
    await db.flush()


async def _next_order_number(workshop_id: UUID, db: AsyncSession) -> str:
    count = await db.scalar(select(func.count()).select_from(WorkOrder).where(WorkOrder.workshop_id == workshop_id))
    return f"OT-{1001 + (count or 0)}"


async def _insert_order_with_unique_number(order: WorkOrder, workshop: Workshop, user_id: str, db: AsyncSession) -> Workshop:
    """order_number es único por taller (UNIQUE(workshop_id, order_number)) —
    reintenta si dos órdenes se crean casi simultáneamente y chocan contra esa
    constraint. Compartido entre la creación directa y la conversión de citas
    (antes esta última no reintentaba — gap encontrado en la revisión del
    backend, ver docs/PLAN_MIGRACION_TALLERPRO.md). Devuelve el `workshop`
    (puede haberse refrescado tras un rollback)."""
    for attempt in range(5):
        order.order_number = await _next_order_number(workshop.id, db)
        db.add(order)
        try:
            await db.flush()
            return workshop
        except IntegrityError:
            await db.rollback()
            if attempt == 4:
                raise HTTPException(status_code=500, detail="Could not generate a unique order number")
            workshop = await verify_workshop(user_id, db)
    return workshop  # unreachable, keeps type-checkers happy


async def _get_owned_order(order_id: UUID, user_id: str, db: AsyncSession) -> tuple[WorkOrder, Workshop]:
    workshop = await verify_workshop(user_id, db)
    result = await db.execute(
        select(WorkOrder)
        .options(*_ORDER_LOADS)
        .where(WorkOrder.id == order_id, WorkOrder.workshop_id == workshop.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")
    return order, workshop


@router.get("", response_model=list[WorkOrderOut])
async def list_work_orders(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    order_status: str | None = Query(None, alias="status"),
    client_id: UUID | None = Query(None),
    workshop_vehicle_id: UUID | None = Query(None),
):
    workshop = await verify_workshop(user_id, db)
    query = select(WorkOrder).options(*_ORDER_LOADS).where(WorkOrder.workshop_id == workshop.id)
    if order_status:
        query = query.where(WorkOrder.status == order_status)
    if client_id:
        query = query.where(WorkOrder.client_id == client_id)
    if workshop_vehicle_id:
        query = query.where(WorkOrder.workshop_vehicle_id == workshop_vehicle_id)
    query = query.order_by(WorkOrder.entry_date.desc()).limit(300)
    result = await db.execute(query)
    return list(result.scalars().unique().all())


@router.get("/{order_id}", response_model=WorkOrderOut)
async def get_work_order(
    order_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    order, _ = await _get_owned_order(order_id, user_id, db)
    return order


@router.post("", response_model=WorkOrderOut, status_code=status.HTTP_201_CREATED)
async def create_work_order(
    body: WorkOrderCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    workshop = await verify_workshop(user_id, db)

    order = WorkOrder(
        workshop_id=workshop.id,
        workshop_vehicle_id=body.workshop_vehicle_id,
        client_id=body.client_id,
        mechanic_id=body.mechanic_id,
        estimated_completion_date=body.estimated_completion_date,
        status=body.status,
        symptoms=body.symptoms,
        technical_notes=body.technical_notes,
        category=body.category,
        payment_method=body.payment_method,
        is_paid=body.is_paid,
        completed_date=datetime.now(UTC) if body.status in _COMPLETING_STATUSES else None,
    )

    workshop = await _insert_order_with_unique_number(order, workshop, user_id, db)

    await _apply_labor_items(order, body.labor_items, db)
    await _apply_parts_items(order, workshop, body.parts_items, db)
    await _recompute_totals(order, workshop, db)
    await db.flush()
    result = await db.execute(select(WorkOrder).options(*_ORDER_LOADS).where(WorkOrder.id == order.id))
    return result.scalar_one()


@router.put("/{order_id}", response_model=WorkOrderOut)
async def update_work_order(
    order_id: UUID,
    body: WorkOrderUpdate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    order, workshop = await _get_owned_order(order_id, user_id, db)

    update_data = body.model_dump(exclude_unset=True, exclude={"labor_items", "parts_items"})
    new_status = update_data.get("status")
    for key, val in update_data.items():
        setattr(order, key, val)
    if new_status and new_status in _COMPLETING_STATUSES and not order.completed_date:
        order.completed_date = datetime.now(UTC)

    if body.labor_items is not None:
        await _apply_labor_items(order, body.labor_items, db)
    if body.parts_items is not None:
        await _apply_parts_items(order, workshop, body.parts_items, db)
    await _recompute_totals(order, workshop, db)

    await db.flush()
    await _auto_invoice_if_delivered_and_paid(order, workshop, db)
    await _sync_client_records_if_linked(order, workshop, db)
    result = await db.execute(select(WorkOrder).options(*_ORDER_LOADS).where(WorkOrder.id == order.id))
    return result.scalar_one()


@router.put("/{order_id}/status", response_model=WorkOrderOut)
async def update_work_order_status(
    order_id: UUID,
    body: WorkOrderStatusUpdate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Cambio rápido de estado desde el tablero de órdenes (drag/drop o botón),
    sin tocar mano de obra/repuestos — equivalente a handleUpdateOrderStatus."""
    order, workshop = await _get_owned_order(order_id, user_id, db)
    order.status = body.status
    if body.status in _COMPLETING_STATUSES and not order.completed_date:
        order.completed_date = datetime.now(UTC)
    await db.flush()
    await _auto_invoice_if_delivered_and_paid(order, workshop, db)
    await _sync_client_records_if_linked(order, workshop, db)
    await db.refresh(order)
    return order


@router.post("/{order_id}/photos", response_model=WorkOrderPhotoEvidenceOut, status_code=status.HTTP_201_CREATED)
async def add_work_order_photo(
    order_id: UUID,
    body: WorkOrderPhotoEvidenceIn,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    order, _ = await _get_owned_order(order_id, user_id, db)
    photo = WorkOrderPhotoEvidence(work_order_id=order.id, **body.model_dump())
    db.add(photo)
    await db.flush()
    await db.refresh(photo)
    return photo
