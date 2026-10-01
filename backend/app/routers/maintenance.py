from __future__ import annotations

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_vehicle
from app.models.models import MaintenanceRecord, Part
from app.schemas.schemas import MaintenanceCreate, MaintenanceOut, ReplacedPartIn
from app.services.cache import cache_invalidate_vehicle
from app.services.plan import FREE_SERVICE_TYPES, require_full_access

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


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
            if rp.lifespan_mileage is not None:
                existing.lifespan_mileage = rp.lifespan_mileage
        else:
            db.add(Part(
                vehicle_id=vehicle_id,
                name=rp.name,
                category=rp.category or "Otros",
                status="ok",
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
    if isinstance(data.get("date"), str):
        data["date"] = date.fromisoformat(data["date"])
    record = MaintenanceRecord(**data)
    db.add(record)
    if replaced_parts:
        await _sync_replaced_parts(body.vehicle_id, body.mileage, body.replaced_parts, db)
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
    data = body.model_dump(exclude_unset=True)
    replaced_parts = data.pop("replaced_parts", [])
    if isinstance(data.get("date"), str):
        data["date"] = date.fromisoformat(data["date"])
    for key, val in data.items():
        setattr(record, key, val)
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
    await db.delete(record)
    await cache_invalidate_vehicle(str(record.vehicle_id))
