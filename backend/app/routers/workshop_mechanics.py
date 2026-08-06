from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_workshop
from app.models.models import WorkshopMechanic
from app.schemas.schemas import WorkshopMechanicCreate, WorkshopMechanicOut, WorkshopMechanicUpdate

router = APIRouter(prefix="/workshops/me/mechanics", tags=["workshop-mechanics"])


@router.get("", response_model=list[WorkshopMechanicOut])
async def list_mechanics(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    workshop = await verify_workshop(user_id, db)
    result = await db.execute(
        select(WorkshopMechanic).where(WorkshopMechanic.workshop_id == workshop.id).order_by(WorkshopMechanic.name)
    )
    return list(result.scalars().all())


@router.post("", response_model=WorkshopMechanicOut, status_code=status.HTTP_201_CREATED)
async def create_mechanic(
    body: WorkshopMechanicCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    workshop = await verify_workshop(user_id, db)
    mechanic = WorkshopMechanic(workshop_id=workshop.id, **body.model_dump())
    db.add(mechanic)
    await db.flush()
    await db.refresh(mechanic)
    return mechanic


async def _get_owned_mechanic(mechanic_id: UUID, user_id: str, db: AsyncSession) -> WorkshopMechanic:
    workshop = await verify_workshop(user_id, db)
    result = await db.execute(
        select(WorkshopMechanic).where(WorkshopMechanic.id == mechanic_id, WorkshopMechanic.workshop_id == workshop.id)
    )
    mechanic = result.scalar_one_or_none()
    if not mechanic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mechanic not found")
    return mechanic


@router.put("/{mechanic_id}", response_model=WorkshopMechanicOut)
async def update_mechanic(
    mechanic_id: UUID,
    body: WorkshopMechanicUpdate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    mechanic = await _get_owned_mechanic(mechanic_id, user_id, db)
    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(mechanic, key, val)
    await db.flush()
    await db.refresh(mechanic)
    return mechanic


@router.delete("/{mechanic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mechanic(
    mechanic_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    mechanic = await _get_owned_mechanic(mechanic_id, user_id, db)
    await db.delete(mechanic)
