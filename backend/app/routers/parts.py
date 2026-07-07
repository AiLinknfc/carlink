from __future__ import annotations

import uuid
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Part, Vehicle
from app.schemas.schemas import PartCreate, PartOut
from app.services.cache import cache_invalidate_vehicle

router = APIRouter(prefix="/parts", tags=["parts"])


async def _verify_vehicle_owner(vehicle_id: UUID, user_id: str, db: AsyncSession) -> Vehicle:
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.owner_id == uuid.UUID(user_id)))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return vehicle


@router.get("/vehicle/{vehicle_id}", response_model=list[PartOut])
async def list_parts(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _verify_vehicle_owner(vehicle_id, user_id, db)
    result = await db.execute(
        select(Part).where(Part.vehicle_id == vehicle_id).order_by(Part.name)
    )
    return list(result.scalars().all())


@router.post("", response_model=PartOut, status_code=status.HTTP_201_CREATED)
async def create_part(
    body: PartCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _verify_vehicle_owner(body.vehicle_id, user_id, db)
    part = Part(**body.model_dump())
    db.add(part)
    await db.flush()
    await db.refresh(part)
    await cache_invalidate_vehicle(str(body.vehicle_id))
    return part


@router.put("/{part_id}", response_model=PartOut)
async def update_part(
    part_id: UUID,
    body: PartCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Part).where(Part.id == part_id))
    part = result.scalar_one_or_none()
    if not part:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Part not found")
    await _verify_vehicle_owner(part.vehicle_id, user_id, db)
    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(part, key, val)
    await db.flush()
    await db.refresh(part)
    await cache_invalidate_vehicle(str(part.vehicle_id))
    return part


@router.delete("/{part_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_part(
    part_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Part).where(Part.id == part_id))
    part = result.scalar_one_or_none()
    if not part:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Part not found")
    await _verify_vehicle_owner(part.vehicle_id, user_id, db)
    await db.delete(part)
    await cache_invalidate_vehicle(str(part.vehicle_id))
