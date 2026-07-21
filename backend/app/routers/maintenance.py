from __future__ import annotations

import uuid
from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import MaintenanceRecord, Vehicle
from app.schemas.schemas import MaintenanceCreate, MaintenanceOut
from app.services.cache import cache_invalidate_vehicle

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


async def _verify_vehicle_owner(vehicle_id: UUID, user_id: str, db: AsyncSession) -> Vehicle:
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.owner_id == uuid.UUID(user_id)))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return vehicle


@router.get("/vehicle/{vehicle_id}", response_model=list[MaintenanceOut])
async def list_maintenance(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _verify_vehicle_owner(vehicle_id, user_id, db)
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
    await _verify_vehicle_owner(vehicle_id, user_id, db)
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
    await _verify_vehicle_owner(body.vehicle_id, user_id, db)
    data = body.model_dump()
    if isinstance(data.get("date"), str):
        data["date"] = date.fromisoformat(data["date"])
    record = MaintenanceRecord(**data)
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
    await _verify_vehicle_owner(record.vehicle_id, user_id, db)
    data = body.model_dump(exclude_unset=True)
    if isinstance(data.get("date"), str):
        data["date"] = date.fromisoformat(data["date"])
    for key, val in data.items():
        setattr(record, key, val)
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
    await _verify_vehicle_owner(record.vehicle_id, user_id, db)
    await db.delete(record)
    await cache_invalidate_vehicle(str(record.vehicle_id))
