from __future__ import annotations

import uuid
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import GalleryImage, Vehicle
from app.schemas.schemas import GalleryCreate, GalleryOut, GalleryUpdate
from app.services.cache import cache_invalidate_vehicle

router = APIRouter(prefix="/gallery", tags=["gallery"])


async def _verify_vehicle(vehicle_id: UUID, user_id: str, db: AsyncSession):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.owner_id == uuid.UUID(user_id)))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")


@router.get("/vehicle/{vehicle_id}", response_model=list[GalleryOut])
async def list_gallery(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _verify_vehicle(vehicle_id, user_id, db)
    result = await db.execute(
        select(GalleryImage).where(GalleryImage.vehicle_id == vehicle_id).order_by(GalleryImage.sort_order)
    )
    return list(result.scalars().all())


@router.post("", response_model=GalleryOut, status_code=status.HTTP_201_CREATED)
async def create_gallery_image(
    body: GalleryCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _verify_vehicle(body.vehicle_id, user_id, db)

    max_order_result = await db.execute(
        select(GalleryImage.sort_order).where(GalleryImage.vehicle_id == body.vehicle_id).order_by(GalleryImage.sort_order.desc()).limit(1)
    )
    max_order = max_order_result.scalar_one_or_none() or -1

    image = GalleryImage(
        vehicle_id=body.vehicle_id,
        image_url=body.image_url,
        caption=body.caption,
        sort_order=max_order + 1,
    )
    db.add(image)
    await db.flush()
    await db.refresh(image)
    await cache_invalidate_vehicle(str(body.vehicle_id))
    return image


@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_gallery_image(
    image_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(GalleryImage).where(GalleryImage.id == image_id))
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    await _verify_vehicle(image.vehicle_id, user_id, db)
    await db.delete(image)
    await cache_invalidate_vehicle(str(image.vehicle_id))


@router.patch("/{image_id}", response_model=GalleryOut)
async def update_gallery_image(
    image_id: UUID,
    body: GalleryUpdate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(GalleryImage).where(GalleryImage.id == image_id))
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    await _verify_vehicle(image.vehicle_id, user_id, db)
    if body.caption is not None:
        image.caption = body.caption
    if body.image_url is not None:
        image.image_url = body.image_url
    await db.flush()
    await db.refresh(image)
    await cache_invalidate_vehicle(str(image.vehicle_id))
    return image
