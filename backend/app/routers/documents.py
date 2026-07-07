from __future__ import annotations

import uuid
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Document, Vehicle
from app.schemas.schemas import DocumentCreate, DocumentOut

router = APIRouter(prefix="/documents", tags=["documents"])


async def _verify_vehicle(vehicle_id: UUID, user_id: str, db: AsyncSession):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.owner_id == uuid.UUID(user_id)))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")


@router.get("/vehicle/{vehicle_id}", response_model=list[DocumentOut])
async def list_documents(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _verify_vehicle(vehicle_id, user_id, db)
    result = await db.execute(
        select(Document).where(Document.vehicle_id == vehicle_id).order_by(Document.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def create_document(
    body: DocumentCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _verify_vehicle(body.vehicle_id, user_id, db)
    doc = Document(**body.model_dump())
    db.add(doc)
    await db.flush()
    await db.refresh(doc)
    return doc


@router.put("/{doc_id}", response_model=DocumentOut)
async def update_document(
    doc_id: UUID,
    body: DocumentCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    await _verify_vehicle(doc.vehicle_id, user_id, db)
    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(doc, key, val)
    await db.flush()
    await db.refresh(doc)
    return doc


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    await _verify_vehicle(doc.vehicle_id, user_id, db)
    await db.delete(doc)
