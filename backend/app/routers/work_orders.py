from __future__ import annotations

from datetime import datetime, timezone
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
    Workshop,
    WorkOrder,
    WorkOrderLaborItem,
    WorkOrderPart,
    WorkOrderPhotoEvidence,
    WorkshopInventoryPart,
)
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

    labor_total = sum((li.total for li in labor_rows), Decimal("0"))
    parts_total = sum((pi.subtotal for pi in parts_rows), Decimal("0"))
    total_cost_price = sum((pi.unit_cost * pi.quantity for pi in parts_rows), Decimal("0")).quantize(Decimal("0.01"))
    total_amount = labor_total + parts_total
    tax_amount = (total_amount * (workshop.tax_rate_percent / Decimal("100"))).quantize(Decimal("0.01"))
    final_total = total_amount + tax_amount
    net_profit = total_amount - total_cost_price

    work_order.labor_total = labor_total
    work_order.parts_total = parts_total
    work_order.total_cost_price = total_cost_price
    work_order.total_amount = total_amount
    work_order.tax_amount = tax_amount
    work_order.final_total = final_total
    work_order.net_profit = net_profit


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
        completed_date=datetime.now(timezone.utc) if body.status in _COMPLETING_STATUSES else None,
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
        order.completed_date = datetime.now(timezone.utc)

    if body.labor_items is not None:
        await _apply_labor_items(order, body.labor_items, db)
    if body.parts_items is not None:
        await _apply_parts_items(order, workshop, body.parts_items, db)
    await _recompute_totals(order, workshop, db)

    await db.flush()
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
    order, _ = await _get_owned_order(order_id, user_id, db)
    order.status = body.status
    if body.status in _COMPLETING_STATUSES and not order.completed_date:
        order.completed_date = datetime.now(timezone.utc)
    await db.flush()
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
