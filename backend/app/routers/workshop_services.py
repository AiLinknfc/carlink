from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_workshop
from app.models.models import WorkshopServiceItem
from app.schemas.schemas import (
    WorkshopServiceItemCreate,
    WorkshopServiceItemOut,
    WorkshopServiceItemUpdate,
)

router = APIRouter(prefix="/workshops/me/services", tags=["workshop-services"])


@router.get("", response_model=list[WorkshopServiceItemOut])
async def list_service_items(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    workshop = await verify_workshop(user_id, db)
    result = await db.execute(
        select(WorkshopServiceItem)
        .where(WorkshopServiceItem.workshop_id == workshop.id)
        .order_by(WorkshopServiceItem.category, WorkshopServiceItem.name)
    )
    return list(result.scalars().all())


@router.post("", response_model=WorkshopServiceItemOut, status_code=status.HTTP_201_CREATED)
async def create_service_item(
    body: WorkshopServiceItemCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    workshop = await verify_workshop(user_id, db)
    item = WorkshopServiceItem(workshop_id=workshop.id, **body.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


async def _get_owned_service_item(item_id: UUID, user_id: str, db: AsyncSession) -> WorkshopServiceItem:
    workshop = await verify_workshop(user_id, db)
    result = await db.execute(
        select(WorkshopServiceItem).where(WorkshopServiceItem.id == item_id, WorkshopServiceItem.workshop_id == workshop.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service item not found")
    return item


@router.put("/{item_id}", response_model=WorkshopServiceItemOut)
async def update_service_item(
    item_id: UUID,
    body: WorkshopServiceItemUpdate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    item = await _get_owned_service_item(item_id, user_id, db)
    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(item, key, val)
    await db.flush()
    await db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service_item(
    item_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    item = await _get_owned_service_item(item_id, user_id, db)
    await db.delete(item)
