from __future__ import annotations

import uuid
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session_factory
from app.dependencies import get_current_user
from app.models.models import Profile, Vehicle
from app.schemas.schemas import VehicleCreate, VehicleOut, VehicleUpdate
from app.services.cache import cache_delete, cache_get, cache_invalidate_vehicle, cache_set

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.get("", response_model=list[VehicleOut])
async def list_vehicles(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    cached = await cache_get(f"vehicles:list:{user_id}")
    if cached:
        return [VehicleOut(**v) for v in cached]

    result = await db.execute(
        select(Vehicle).where(Vehicle.owner_id == uuid.UUID(user_id)).order_by(Vehicle.created_at.desc())
    )
    vehicles = list(result.scalars().all())
    await cache_set(f"vehicles:list:{user_id}", [v.__dict__ for v in vehicles], ttl=120)
    return vehicles


@router.get("/{vehicle_id}", response_model=VehicleOut)
async def get_vehicle(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    cached = await cache_get(f"vehicles:{vehicle_id}")
    if cached:
        return VehicleOut(**cached)

    result = await db.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.owner_id == uuid.UUID(user_id))
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    await cache_set(f"vehicles:{vehicle_id}", vehicle.__dict__, ttl=120)
    return vehicle


async def _ensure_profile(user_id: str, db: AsyncSession) -> None:
    result = await db.execute(select(Profile).where(Profile.id == uuid.UUID(user_id)))
    if result.scalar_one_or_none():
        return
    from supabase import create_client
    from app.config import get_settings
    settings = get_settings()
    sb = create_client(settings.supabase_url, settings.supabase_service_key)
    user_data = sb.auth.admin.get_user_by_id(user_id)
    if user_data and user_data.user:
        profile = Profile(
            id=user_id,
            email=user_data.user.email,
            full_name=user_data.user.user_metadata.get("full_name"),
            avatar_url=user_data.user.user_metadata.get("avatar_url"),
        )
        db.add(profile)
        await db.flush()


@router.post("", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    body: VehicleCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    uid = uuid.UUID(user_id)
    await _ensure_profile(user_id, db)

    existing = await db.execute(
        select(Vehicle).where(Vehicle.owner_id == uid, Vehicle.plate == body.plate.upper())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This plate is already registered")

    vehicle = Vehicle(
        owner_id=uid,
        plate=body.plate.upper(),
        city=body.city,
        brand=body.brand,
        model=body.model,
        year=body.year,
        type=body.type,
        color=body.color,
        image_url=body.image_url,
    )
    db.add(vehicle)
    await db.flush()
    await db.refresh(vehicle)
    await cache_delete(f"vehicles:list:{user_id}")
    return vehicle


@router.put("/{vehicle_id}", response_model=VehicleOut)
async def update_vehicle(
    vehicle_id: UUID,
    body: VehicleUpdate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.owner_id == uuid.UUID(user_id))
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    update_data = body.model_dump(exclude_unset=True)
    if "plate" in update_data:
        update_data["plate"] = update_data["plate"].upper()
    for key, val in update_data.items():
        setattr(vehicle, key, val)

    await db.flush()
    await db.refresh(vehicle)
    await cache_invalidate_vehicle(str(vehicle_id))
    return vehicle


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.owner_id == uuid.UUID(user_id))
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    await db.delete(vehicle)
    await cache_invalidate_vehicle(str(vehicle_id))
