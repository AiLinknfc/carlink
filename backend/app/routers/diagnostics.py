from __future__ import annotations

import uuid
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Diagnostic, Vehicle
from app.schemas.schemas import DiagnosticCreate, DiagnosticOut

router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])


async def _verify_vehicle(vehicle_id: UUID, user_id: str, db: AsyncSession):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.owner_id == uuid.UUID(user_id)))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")


@router.get("/vehicle/{vehicle_id}", response_model=list[DiagnosticOut])
async def list_diagnostics(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _verify_vehicle(vehicle_id, user_id, db)
    result = await db.execute(
        select(Diagnostic).where(Diagnostic.vehicle_id == vehicle_id).order_by(Diagnostic.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=DiagnosticOut, status_code=status.HTTP_201_CREATED)
async def create_diagnostic(
    body: DiagnosticCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _verify_vehicle(body.vehicle_id, user_id, db)
    diag = Diagnostic(**body.model_dump())
    db.add(diag)
    await db.flush()
    await db.refresh(diag)
    return diag


@router.put("/{diag_id}/resolve", response_model=DiagnosticOut)
async def resolve_diagnostic(
    diag_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Diagnostic).where(Diagnostic.id == diag_id))
    diag = result.scalar_one_or_none()
    if not diag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diagnostic not found")
    await _verify_vehicle(diag.vehicle_id, user_id, db)
    diag.resolved = True
    await db.flush()
    await db.refresh(diag)
    return diag
