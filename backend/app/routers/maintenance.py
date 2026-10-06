from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_vehicle
from app.models.models import MaintenanceRecord, OdometerReading, Part
from app.schemas.schemas import MaintenanceCreate, MaintenanceOut, PriorMaintenanceCreate, ReplacedPartIn
from app.services.cache import cache_invalidate_vehicle
from app.services.odometer import as_history, list_readings
from app.services.maintenance_rules import (
    PRIOR_EDIT_WINDOW_HOURS, RuleError, check_cost, check_mileage, check_next_service, check_oil_used, check_support_url,
    resolve_prior_date, resolve_service_date,
)
from app.services.plan import FREE_SERVICE_TYPES, require_full_access

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


def _is_workshop_record(record: MaintenanceRecord) -> bool:
    """Registro generado por un taller (orden de trabajo): el dueño del vehículo no lo edita ni
    lo borra. El frontend ya ocultaba los botones, pero el endpoint lo permitía."""
    return record.source_work_order_id is not None or record.workshop_id is not None


async def _history(db: AsyncSession, vehicle_id: UUID, exclude_id: UUID | None = None) -> list[tuple[date, int]]:
    rows = (
        await db.execute(
            select(MaintenanceRecord.id, MaintenanceRecord.date, MaintenanceRecord.mileage)
            .where(MaintenanceRecord.vehicle_id == vehicle_id)
        )
    ).all()
    return [(r[1], r[2]) for r in rows if r[0] != exclude_id]


async def _sync_replaced_parts(
    vehicle_id: UUID, mileage: int, replaced_parts: list[ReplacedPartIn], db: AsyncSession
) -> None:
    """Crea/actualiza en `parts` cada pieza que el servicio renueva, en la misma transaccion que el
    registro de mantenimiento — antes esto era una segunda llamada aparte desde el frontend
    (ServiceFormModal.tsx), que podia perderse (el usuario cierra la pestana, falla la red) sin que
    el registro de mantenimiento se viera afectado. Mismo criterio de "buscar por nombre exacto en
    el vehiculo" que ya usaba esa logica en el cliente."""
    for rp in replaced_parts:
        existing = (
            await db.execute(select(Part).where(Part.vehicle_id == vehicle_id, Part.name == rp.name))
        ).scalar_one_or_none()
        if existing:
            existing.mileage_installed = mileage
            existing.status = "ok"
            # Marca/referencia nuevas pisan las anteriores solo si vienen; un cambio sin esos datos no borra lo que ya había.
            if rp.brand.strip():
                existing.brand = rp.brand.strip()
            if rp.part_number.strip():
                existing.part_number = rp.part_number.strip()
            if rp.lifespan_mileage is not None:
                existing.lifespan_mileage = rp.lifespan_mileage
            # Las notas llevan la vida útil en meses y el tipo (batería): al renovar la pieza se actualizan.
            if rp.notes:
                existing.notes = rp.notes
        else:
            db.add(Part(
                vehicle_id=vehicle_id,
                name=rp.name,
                category=rp.category or "Otros",
                status="ok",
                brand=rp.brand.strip(),
                part_number=rp.part_number.strip(),
                mileage_installed=mileage,
                lifespan_mileage=rp.lifespan_mileage,
                notes=rp.notes,
            ))


@router.get("/vehicle/{vehicle_id}", response_model=list[MaintenanceOut])
async def list_maintenance(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await verify_vehicle(vehicle_id, user_id, db)
    result = await db.execute(
        select(MaintenanceRecord).where(MaintenanceRecord.vehicle_id == vehicle_id).order_by(MaintenanceRecord.mileage.desc())
    )
    return list(result.scalars().all())


@router.get("/vehicle/{vehicle_id}/latest", response_model=MaintenanceOut | None)
async def get_latest_maintenance(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await verify_vehicle(vehicle_id, user_id, db)
    result = await db.execute(
        select(MaintenanceRecord).where(MaintenanceRecord.vehicle_id == vehicle_id).order_by(MaintenanceRecord.mileage.desc()).limit(1)
    )
    return result.scalar_one_or_none()


@router.post("", response_model=MaintenanceOut, status_code=status.HTTP_201_CREATED)
async def create_maintenance(
    body: MaintenanceCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await verify_vehicle(body.vehicle_id, user_id, db)
    # Plan gratuito: solo el servicio de aceite; el resto se desbloquea con el llavero.
    if body.service_type not in FREE_SERVICE_TYPES:
        await require_full_access(db, user_id, body.vehicle_id)
    data = body.model_dump()
    replaced_parts = data.pop("replaced_parts", [])
    # Un usuario no se atribuye un taller: workshop_id solo lo ponen las órdenes de trabajo del
    # propio taller (work_orders.py). Antes cualquiera mandaba el id de un taller y el historial
    # mostraba la etiqueta "Del taller" sobre un registro que el taller nunca hizo.
    data["workshop_id"] = None
    data["origin"] = "user"
    data["support_url"] = ""
    try:
        data["date"] = resolve_service_date(data.get("date"), date.today())
        check_cost(data.get("cost"))
        check_oil_used(body.service_type, body.lubricant_brand, body.lubricant_type)
        check_next_service(body.mileage, body.next_service_mileage)
        check_mileage(
            body.mileage, data["date"], await _history(db, body.vehicle_id),
            as_history(await list_readings(db, body.vehicle_id)),
        )
    except RuleError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    record = MaintenanceRecord(**data)
    db.add(record)
    if replaced_parts:
        await _sync_replaced_parts(body.vehicle_id, body.mileage, body.replaced_parts, db)
    await db.flush()
    # El servicio también es una lectura de odómetro (migración 069): el kilometraje actual del
    # vehículo sale de las lecturas, y la regla de "no baja" las compara con todo lo posterior.
    db.add(OdometerReading(vehicle_id=body.vehicle_id, mileage=body.mileage, source="service", maintenance_record_id=record.id))
    await db.flush()
    await db.refresh(record)
    await cache_invalidate_vehicle(str(body.vehicle_id))
    return record


@router.post("/prior", response_model=MaintenanceOut, status_code=status.HTTP_201_CREATED)
async def create_prior_maintenance(
    body: PriorMaintenanceCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Historial anterior al alta del vehículo en CarLink. Queda marcado `origin=prior`, exige
    soporte (foto/PDF) y no cuenta para sellos, partes ni próximos servicios: no genera lectura de
    odómetro, no sincroniza piezas y no fija próximo servicio."""
    vehicle = await verify_vehicle(body.vehicle_id, user_id, db)
    if body.service_type not in FREE_SERVICE_TYPES:
        await require_full_access(db, user_id, body.vehicle_id)
    try:
        joined = vehicle.created_at.date() if vehicle.created_at else date.today()
        service_date = resolve_prior_date(body.date, joined, vehicle.year)
        check_support_url(body.support_url, user_id)
        check_cost(body.cost)
        check_mileage(
            body.mileage, service_date, await _history(db, body.vehicle_id),
            as_history(await list_readings(db, body.vehicle_id)),
        )
    except RuleError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    record = MaintenanceRecord(
        vehicle_id=body.vehicle_id, service_type=body.service_type, description=body.description,
        mileage=body.mileage, date=service_date, workshop=body.workshop or "Taller no registrado",
        workshop_id=None, cost=body.cost, next_service_mileage=None,
        lubricant_brand="", lubricant_type="", lubricant_product="",
        lubricant_use="motor",
        origin="prior", support_url=body.support_url,
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    await cache_invalidate_vehicle(str(body.vehicle_id))
    return record


@router.put("/{record_id}", response_model=MaintenanceOut)
async def update_maintenance(
    record_id: UUID,
    body: MaintenanceCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(MaintenanceRecord).where(MaintenanceRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    await verify_vehicle(record.vehicle_id, user_id, db)
    if _is_workshop_record(record):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Este registro lo hizo un taller y no se puede editar.")
    if record.origin == "prior":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El historial anterior no se edita; solo se puede eliminar durante las primeras 48 horas.")
    # Sin esto el body podía mover el registro a un vehículo ajeno (solo se verificaba el dueño
    # del vehículo original).
    if body.vehicle_id != record.vehicle_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se puede cambiar el vehículo de un registro.")
    data = body.model_dump(exclude_unset=True)
    replaced_parts = data.pop("replaced_parts", [])
    data.pop("workshop_id", None)
    try:
        service_date = resolve_service_date(data.get("date"), date.today(), current=record.date)
        data["date"] = service_date
        if "cost" in data:
            check_cost(data["cost"])
        if "next_service_mileage" in data and (body.next_service_mileage != record.next_service_mileage or body.mileage != record.mileage):
            check_next_service(body.mileage, body.next_service_mileage)
        # Si no se tocó ni km ni fecha no se revalida: un dato viejo no debe impedir corregir,
        # por ejemplo, la descripción.
        if body.mileage != record.mileage or service_date != record.date:
            check_mileage(
                body.mileage, service_date, await _history(db, record.vehicle_id, exclude_id=record.id),
                # La lectura que generó este mismo registro se excluye: si no, bajar el km de
                # este servicio chocaría con su propio valor anterior.
                as_history(await list_readings(db, record.vehicle_id, exclude_record_id=record.id)),
            )
    except RuleError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    km_changed = body.mileage != record.mileage
    for key, val in data.items():
        setattr(record, key, val)
    if km_changed:
        # La lectura del servicio refleja su kilometraje: se corrige junto con él.
        linked = (
            await db.execute(select(OdometerReading).where(OdometerReading.maintenance_record_id == record.id))
        ).scalar_one_or_none()
        if linked is not None:
            linked.mileage = body.mileage
    if replaced_parts:
        await _sync_replaced_parts(record.vehicle_id, record.mileage, body.replaced_parts, db)
    await db.flush()
    await db.refresh(record)
    await cache_invalidate_vehicle(str(record.vehicle_id))
    return record


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_maintenance(
    record_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(MaintenanceRecord).where(MaintenanceRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    await verify_vehicle(record.vehicle_id, user_id, db)
    if _is_workshop_record(record):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Este registro lo hizo un taller y no se puede borrar.")
    if record.origin == "prior" and datetime.now(timezone.utc) - record.created_at > timedelta(hours=PRIOR_EDIT_WINDOW_HOURS):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El historial anterior solo se puede eliminar durante las primeras 48 horas.")
    await db.delete(record)
    await cache_invalidate_vehicle(str(record.vehicle_id))
