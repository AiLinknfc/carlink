from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Profile
from app.schemas.schemas import ProfileOut, ProfileUpdate
from app.services.auth import ensure_profile

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=ProfileOut)
async def get_profile(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    profile = await ensure_profile(user_id, db)
    return profile


@router.put("/me", response_model=ProfileOut)
async def update_profile(
    body: ProfileUpdate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Profile).where(Profile.id == uuid.UUID(user_id)))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    if body.full_name is not None:
        profile.full_name = body.full_name
    if body.document_number is not None:
        # El documento se fija una sola vez: es parte de la identidad declarada
        # que luego se contrasta contra la tarjeta de propiedad.
        if profile.document_number and profile.document_number != body.document_number:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El documento de identidad ya fue registrado y no puede cambiarse",
            )
        profile.document_number = body.document_number
    if body.whatsapp_enabled is not None:
        profile.whatsapp_enabled = body.whatsapp_enabled
    if body.whatsapp_number is not None:
        profile.whatsapp_number = body.whatsapp_number
    await db.flush()
    await db.refresh(profile)
    return profile

# POST /me/verification se movió a POST /vehicles/{vehicle_id}/verification
# (backend/app/routers/vehicles.py) — 2026-09-19. La verificación de
# identidad es por vehículo, no por cuenta (ver comentario en
# models.py Vehicle.verification_status): verificar una tarjeta habilitaba
# transferir/vender TODOS los vehículos de la cuenta, no sólo el revisado.
