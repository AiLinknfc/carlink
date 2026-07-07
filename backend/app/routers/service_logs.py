from __future__ import annotations

import uuid
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import ServiceLog, Vehicle
from app.schemas.schemas import ServiceLogCreate, ServiceLogOut

router = APIRouter(prefix="/service-logs", tags=["service-logs"])


async def _verify_vehicle_owner(vehicle_id: UUID, user_id: str, db: AsyncSession) -> Vehicle:
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.owner_id == uuid.UUID(user_id)))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return vehicle


@router.get("/vehicle/{vehicle_id}", response_model=list[ServiceLogOut])
async def list_service_logs(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _verify_vehicle_owner(vehicle_id, user_id, db)
    result = await db.execute(
        select(ServiceLog).where(ServiceLog.vehicle_id == vehicle_id).order_by(ServiceLog.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=ServiceLogOut, status_code=status.HTTP_201_CREATED)
async def create_service_log(
    body: ServiceLogCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _verify_vehicle_owner(body.vehicle_id, user_id, db)
    log = ServiceLog(**body.model_dump())
    db.add(log)
    await db.flush()
    await db.refresh(log)
    return log
