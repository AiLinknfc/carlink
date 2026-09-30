from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_vehicle
from app.models.models import VehicleSafetyItem
from app.schemas.schemas import SafetyItemCreate, SafetyItemOut, SafetyItemUpdate

router = APIRouter(prefix="/safety", tags=["safety"])


async def _get_item(item_id: UUID, user_id: str, db: AsyncSession) -> VehicleSafetyItem:
    item = (await db.execute(select(VehicleSafetyItem).where(VehicleSafetyItem.id == item_id))).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Safety item not found")
    await verify_vehicle(item.vehicle_id, user_id, db)
    return item


@router.get("/vehicle/{vehicle_id}", response_model=list[SafetyItemOut])
async def list_safety_items(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await verify_vehicle(vehicle_id, user_id, db)
    rows = await db.execute(
        select(VehicleSafetyItem).where(VehicleSafetyItem.vehicle_id == vehicle_id).order_by(VehicleSafetyItem.created_at)
    )
    return list(rows.scalars().all())


@router.post("", response_model=SafetyItemOut, status_code=status.HTTP_201_CREATED)
async def create_safety_item(
    body: SafetyItemCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await verify_vehicle(body.vehicle_id, user_id, db)
    if body.kind == "otro" and not body.name.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="name_required_for_otro")
    item = VehicleSafetyItem(**body.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


@router.put("/{item_id}", response_model=SafetyItemOut)
async def update_safety_item(
    item_id: UUID,
    body: SafetyItemUpdate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    item = await _get_item(item_id, user_id, db)
    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(item, key, val)
    await db.flush()
    await db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_safety_item(
    item_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    item = await _get_item(item_id, user_id, db)
    await db.delete(item)
