from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_workshop
from app.models.models import WorkshopInventoryPart
from app.schemas.schemas import (
    WorkshopInventoryPartCreate,
    WorkshopInventoryPartOut,
    WorkshopInventoryPartUpdate,
    WorkshopInventoryStockUpdate,
)

router = APIRouter(prefix="/workshops/me/inventory", tags=["workshop-inventory"])


@router.get("", response_model=list[WorkshopInventoryPartOut])
async def list_inventory(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    low_stock_only: bool = Query(False),
):
    workshop = await verify_workshop(user_id, db)
    query = select(WorkshopInventoryPart).where(WorkshopInventoryPart.workshop_id == workshop.id)
    if low_stock_only:
        query = query.where(WorkshopInventoryPart.stock <= WorkshopInventoryPart.min_stock)
    query = query.order_by(WorkshopInventoryPart.name)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("", response_model=WorkshopInventoryPartOut, status_code=status.HTTP_201_CREATED)
async def create_inventory_part(
    body: WorkshopInventoryPartCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    workshop = await verify_workshop(user_id, db)
    part = WorkshopInventoryPart(workshop_id=workshop.id, **body.model_dump())
    db.add(part)
    await db.flush()
    await db.refresh(part)
    return part


async def _get_owned_inventory_part(part_id: UUID, user_id: str, db: AsyncSession) -> WorkshopInventoryPart:
    workshop = await verify_workshop(user_id, db)
    result = await db.execute(
        select(WorkshopInventoryPart).where(
            WorkshopInventoryPart.id == part_id, WorkshopInventoryPart.workshop_id == workshop.id
        )
    )
    part = result.scalar_one_or_none()
    if not part:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory part not found")
    return part


@router.put("/{part_id}", response_model=WorkshopInventoryPartOut)
async def update_inventory_part(
    part_id: UUID,
    body: WorkshopInventoryPartUpdate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    part = await _get_owned_inventory_part(part_id, user_id, db)
    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(part, key, val)
    await db.flush()
    await db.refresh(part)
    return part


@router.put("/{part_id}/stock", response_model=WorkshopInventoryPartOut)
async def update_inventory_stock(
    part_id: UUID,
    body: WorkshopInventoryStockUpdate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Ajuste rápido de stock (+1/-1 desde la UI), separado del PUT general."""
    part = await _get_owned_inventory_part(part_id, user_id, db)
    part.stock = max(0, body.stock)
    await db.flush()
    await db.refresh(part)
    return part


@router.delete("/{part_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inventory_part(
    part_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    part = await _get_owned_inventory_part(part_id, user_id, db)
    await db.delete(part)
