from __future__ import annotations

import logging
import re
import uuid
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_current_user_optional
from app.models.models import NfcToken, Vehicle
from app.schemas.schemas import VehicleCreate, VehicleOut, VehicleUpdate
from app.services.auth import ensure_profile
from app.services.cache import (
    cache_delete,
    cache_get,
    cache_invalidate_vehicle,
    cache_set,
)
from app.services.nfc_provisioning import TRIAL_ACCOUNT_TYPES, generate_nfc_token

logger = logging.getLogger("carlink")

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
    await cache_set(f"vehicles:list:{user_id}", [VehicleOut.model_validate(v).model_dump() for v in vehicles], ttl=120)
    return vehicles


@router.get("/plate-check")
async def check_plate(
    plate: str,
    user_id: Annotated[str | None, Depends(get_current_user_optional)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Público (no requiere sesión) — lo usa el checkout del llavero NFC para
    saber, antes de dejar avanzar la compra, si esa placa ya está asociada a
    un vehículo existente. Declarado antes de /{vehicle_id} a propósito: si
    quedara después, Starlette lo matchearía contra esa ruta primero y
    "plate-check" fallaría al intentar convertirse a UUID.

    No devuelve a quién pertenece la placa (evita filtrar datos de otra
    cuenta) — solo si existe y si es la cuenta que está consultando, para que
    el frontend distinga "verifica tu cuenta" (es de alguien más) de
    "contáctanos para reemplazo/duplicado" (ya es tuya).
    """
    normalized = re.sub(r"[^A-Z0-9]", "", plate.strip().upper())
    if not normalized:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="plate query param required")

    result = await db.execute(
        select(Vehicle.owner_id).where(
            func.regexp_replace(func.upper(Vehicle.plate), r"[^A-Z0-9]", "", "g") == normalized
        )
    )
    row = result.first()
    if not row:
        return {"exists": False, "owned_by_you": False}

    owned_by_you = bool(user_id) and str(row[0]) == user_id
    return {"exists": True, "owned_by_you": owned_by_you}


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
    await cache_set(f"vehicles:{vehicle_id}", VehicleOut.model_validate(vehicle).model_dump(), ttl=120)
    return vehicle


@router.post("", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    body: VehicleCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    uid = uuid.UUID(user_id)
    logger.info(f"Creating vehicle for user {user_id}: plate={body.plate}, brand={body.brand}, model={body.model}")
    try:
        profile = await ensure_profile(user_id, db)
        logger.info(f"Profile ensured for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to ensure profile for user {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo crear el perfil. Verifica tu conexión e intenta de nuevo.",
        )

    existing = await db.execute(
        select(Vehicle).where(Vehicle.owner_id == uid, Vehicle.plate == body.plate.upper())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This plate is already registered")

    # Only this account's very first vehicle is eligible for the free trial
    # below — checked before insert so the new row doesn't count itself.
    # Decision (2026-08-07): a taller/empresa that wants a 2nd+ vehicle with
    # a working public ficha needs to buy and claim a physical keychain for
    # it, same as any additional vehicle for a persona account. Without this
    # check every vehicle a business account ever created got its own free
    # 7-day trial with no limit.
    other_vehicles_count = (
        await db.execute(select(func.count(Vehicle.id)).where(Vehicle.owner_id == uid))
    ).scalar() or 0
    is_first_vehicle = other_vehicles_count == 0

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
    try:
        await db.flush()
        await db.refresh(vehicle)
    except Exception as e:
        logger.error(f"Failed to create vehicle for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Vehicle creation failed: {e}")
    await cache_delete(f"vehicles:list:{user_id}")
    logger.info(f"Vehicle created successfully: {vehicle.id}")

    # Taller/empresa accounts get a free 7-day public-ficha trial on their
    # first vehicle only, minted automatically — no physical keychain
    # involved. Persona never gets this; it always requires claiming a real
    # keychain (see app/routers/nfc.py _has_ficha_access). Best-effort: a
    # failure here must not block vehicle registration.
    if profile.account_type in TRIAL_ACCOUNT_TYPES and is_first_vehicle:
        try:
            generated = generate_nfc_token()
            trial_token = NfcToken(
                user_id=uid,
                vehicle_id=vehicle.id,
                token_hash=generated.token_hash,
                token_prefix=generated.token_prefix,
                qr_slug=generated.qr_slug,
                token_type="trial",
                label="Ficha de prueba (7 días)",
            )
            db.add(trial_token)
            await db.flush()
            if generated.token_url_encrypted:
                await db.execute(
                    text("UPDATE nfc_tokens SET token_url_encrypted = :url WHERE id = :id"),
                    {"url": generated.token_url_encrypted, "id": str(trial_token.id)},
                )
                await db.flush()
        except Exception as e:
            logger.error(f"Failed to mint trial NFC token for vehicle {vehicle.id}: {e}", exc_info=True)

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

    # plate/city/type ya no existen en VehicleUpdate: Pydantic los descarta aunque
    # el cliente los mande, así que el congelado es efectivo aquí.
    update_data = body.model_dump(exclude_unset=True)
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


@router.patch("/{vehicle_id}/nfc-toggle", response_model=VehicleOut)
async def toggle_nfc_visibility(
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

    vehicle.nfc_active = not vehicle.nfc_active
    await db.flush()
    await db.refresh(vehicle)
    await cache_invalidate_vehicle(str(vehicle_id))
    return vehicle
