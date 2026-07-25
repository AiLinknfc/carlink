from __future__ import annotations

import hashlib
import uuid
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import MaintenanceRecord, NfcAccessLog, NfcToken, NfcTokenLimit, Profile, Vehicle, Workshop
from app.schemas.schemas import NfcTokenCreate, NfcTokenInfoPublic, NfcTokenOut
from app.services.alerts import check_and_create_alerts
from app.services.cache import get_redis
from app.services.crypto import encrypt_url, decrypt_url

router = APIRouter(prefix="/nfc", tags=["nfc"])

_RATE_WINDOW = 60
_RATE_MAX = 30


async def _check_rate(ip: str) -> bool:
    r = await get_redis()
    if r is None:
        return True
    key = f"rate:nfc:{ip}"
    count = await r.incr(key)
    if count == 1:
        await r.expire(key, _RATE_WINDOW)
    return count <= _RATE_MAX


# ── Concrete /tokens routes BEFORE parameterized /{token} ──

@router.post("/tokens", response_model=NfcTokenOut, status_code=status.HTTP_201_CREATED)
async def create_nfc_token(
    body: NfcTokenCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Register a new NFC token (client sends SHA-256 hash of raw token)."""
    uid = uuid.UUID(user_id)

    v_result = await db.execute(
        select(Vehicle).where(Vehicle.owner_id == uid).order_by(Vehicle.created_at.desc()).limit(1)
    )
    vehicle = v_result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="No vehicles found. Register a vehicle first.")

    existing = await db.execute(select(NfcToken).where(NfcToken.token_hash == body.token_hash))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Token already exists")

    p_result = await db.execute(select(Profile).where(Profile.id == uid))
    profile = p_result.scalar_one_or_none()
    account_type = profile.account_type if profile else "persona"

    limit_result = await db.execute(
        select(NfcTokenLimit).where(NfcTokenLimit.account_type == account_type)
    )
    limit_row = limit_result.scalar_one_or_none()
    max_tokens = limit_row.max_tokens_per_vehicle if limit_row else 1

    count_result = await db.execute(
        select(func.count()).select_from(NfcToken).where(
            NfcToken.vehicle_id == vehicle.id,
            NfcToken.is_active == True,
        )
    )
    active_count = count_result.scalar() or 0
    if active_count >= max_tokens:
        raise HTTPException(
            status_code=409,
            detail=f"Límite de {max_tokens} llavero(s) por vehículo alcanzado. Revoca uno antes de crear otro.",
        )

    nfc_token = NfcToken(
        user_id=uid,
        vehicle_id=vehicle.id,
        token_hash=body.token_hash,
        token_prefix=body.token_prefix,
        label="Llavero NFC",
        token_url_encrypted=encrypt_url(body.token_url) if body.token_url else None,
    )
    db.add(nfc_token)
    await db.flush()
    await db.refresh(nfc_token)
    return nfc_token


@router.get("/tokens", response_model=list[NfcTokenOut])
async def list_nfc_tokens(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List all NFC tokens for the authenticated user."""
    result = await db.execute(
        select(NfcToken).where(NfcToken.user_id == uuid.UUID(user_id)).order_by(NfcToken.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/tokens/{token_id}/url")
async def get_token_url(
    token_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Return the decrypted NFC URL for the owner. Used when localStorage is lost."""
    result = await db.execute(
        select(NfcToken).where(NfcToken.id == token_id, NfcToken.user_id == uuid.UUID(user_id))
    )
    token = result.scalar_one_or_none()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    if not token.token_url_encrypted:
        raise HTTPException(status_code=404, detail="URL not available for this token. It was created before URL recovery was enabled.")
    url = decrypt_url(token.token_url_encrypted)
    if not url:
        raise HTTPException(status_code=500, detail="Failed to decrypt URL")
    return {"url": url}


@router.delete("/tokens/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_nfc_token(
    token_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Revoke an NFC token (soft delete — marks inactive)."""
    result = await db.execute(
        select(NfcToken).where(NfcToken.id == token_id, NfcToken.user_id == uuid.UUID(user_id))
    )
    token = result.scalar_one_or_none()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    token.is_active = False
    token.status = "revoked"
    await db.flush()


@router.post("/tokens/{token_id}/reactivate", response_model=NfcTokenOut)
async def reactivate_nfc_token(
    token_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Reactivate a previously revoked NFC token."""
    result = await db.execute(
        select(NfcToken).where(NfcToken.id == token_id, NfcToken.user_id == uuid.UUID(user_id))
    )
    token = result.scalar_one_or_none()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    if token.is_active:
        raise HTTPException(status_code=400, detail="Token is already active")

    uid = uuid.UUID(user_id)
    v_result = await db.execute(
        select(Vehicle).where(Vehicle.owner_id == uid).order_by(Vehicle.created_at.desc()).limit(1)
    )
    vehicle = v_result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="No vehicles found")

    p_result = await db.execute(select(Profile).where(Profile.id == uid))
    profile = p_result.scalar_one_or_none()
    account_type = profile.account_type if profile else "persona"

    limit_result = await db.execute(
        select(NfcTokenLimit).where(NfcTokenLimit.account_type == account_type)
    )
    limit_row = limit_result.scalar_one_or_none()
    max_tokens = limit_row.max_tokens_per_vehicle if limit_row else 1

    count_result = await db.execute(
        select(func.count()).select_from(NfcToken).where(
            NfcToken.vehicle_id == vehicle.id,
            NfcToken.is_active == True,
        )
    )
    active_count = count_result.scalar() or 0
    if active_count >= max_tokens:
        raise HTTPException(
            status_code=409,
            detail=f"Límite de llaveros alcanzados ({max_tokens}). Revoca uno antes de reactivar otro.",
        )

    token.is_active = True
    token.status = "active"
    await db.flush()
    await db.refresh(token)
    return token


@router.get("/my-preview", response_model=NfcTokenInfoPublic)
async def my_ficha_preview(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Authenticated endpoint — lets the owner preview their public ficha without needing the raw token."""
    uid = uuid.UUID(user_id)

    v_result = await db.execute(
        select(Vehicle).where(Vehicle.owner_id == uid).order_by(Vehicle.created_at.desc()).limit(1)
    )
    vehicle = v_result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="No vehicles found")

    m_result = await db.execute(
        select(MaintenanceRecord)
        .where(MaintenanceRecord.vehicle_id == vehicle.id)
        .order_by(MaintenanceRecord.date.desc(), MaintenanceRecord.created_at.desc())
        .limit(1)
    )
    latest = m_result.scalar_one_or_none()

    count_result = await db.execute(
        select(func.count()).select_from(MaintenanceRecord).where(MaintenanceRecord.vehicle_id == vehicle.id)
    )
    total_services = count_result.scalar() or 0

    workshop_rating = 0.0
    if latest and latest.workshop_id:
        w_result = await db.execute(select(Workshop).where(Workshop.id == latest.workshop_id))
        workshop = w_result.scalar_one_or_none()
        if workshop:
            workshop_rating = workshop.rating or 0.0

    owner_result = await db.execute(select(Profile).where(Profile.id == uid))
    owner = owner_result.scalar_one_or_none()
    owner_whatsapp = ""
    owner_name = ""
    if owner:
        owner_name = owner.full_name or ""
        if owner.whatsapp_enabled:
            owner_whatsapp = owner.whatsapp_number or ""

    return NfcTokenInfoPublic(
        plate=vehicle.plate,
        brand=vehicle.brand,
        model=vehicle.model,
        year=vehicle.year,
        color=vehicle.color,
        type=vehicle.type,
        vehicle_id=vehicle.id,
        current_mileage=latest.mileage if latest else None,
        next_service_mileage=latest.next_service_mileage if latest else None,
        lubricant_brand=latest.lubricant_brand if latest else "",
        lubricant_type=latest.lubricant_type if latest else "",
        total_services=total_services,
        latest_service_date=str(latest.date) if latest and latest.date else None,
        workshop_name=latest.workshop if latest else None,
        workshop_rating=workshop_rating,
        sell_enabled=vehicle.sell_enabled,
        sell_price=vehicle.sell_price or "",
        sell_city=vehicle.sell_city or "",
        sell_zip=vehicle.sell_zip or "",
        sell_phone=vehicle.sell_phone or "",
        sell_description=vehicle.sell_description or "",
        vehicle_condition=vehicle.vehicle_condition or "usado",
        published_at=str(vehicle.created_at) if vehicle.created_at else None,
        owner_whatsapp=owner_whatsapp,
        owner_name=owner_name,
    )


# ── Public parameterized route (MUST be last to avoid catching /tokens) ──

@router.get("/{token}", response_model=NfcTokenInfoPublic)
async def access_via_nfc(
    token: str,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Public endpoint. Validates NFC token and returns public vehicle data.

    Rate-limited to 30 req/min per IP. Never exposes owner info.
    """
    ip = request.client.host if request.client else "unknown"
    if not await _check_rate(ip):
        raise HTTPException(status_code=429, detail="Too many requests. Try again later.")

    if len(token) != 64:
        raise HTTPException(status_code=404, detail="Invalid token")

    token_hash = hashlib.sha256(token.encode()).hexdigest()
    result = await db.execute(
        select(NfcToken).where(NfcToken.token_hash == token_hash, NfcToken.is_active == True)
    )
    nfc_token = result.scalar_one_or_none()
    if not nfc_token:
        raise HTTPException(status_code=404, detail="Invalid or revoked token")

    if nfc_token.status != "active":
        raise HTTPException(status_code=404, detail="Token is not active")

    # Log access
    ua = request.headers.get("user-agent", "")
    access_log = NfcAccessLog(
        token_id=nfc_token.id,
        ip_address=ip,
        user_agent=ua[:500] if ua else None,
    )
    db.add(access_log)

    # Check for alerts
    await check_and_create_alerts(nfc_token.id, ip, db)

    nfc_token.access_count = (nfc_token.access_count or 0) + 1
    nfc_token.last_accessed_at = func.now()
    await db.flush()

    v_result = await db.execute(select(Vehicle).where(Vehicle.id == nfc_token.vehicle_id))
    vehicle = v_result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    if not vehicle.nfc_active:
        raise HTTPException(status_code=404, detail="Ficha pública desactivada por el propietario")

    # Fetch latest maintenance record for ficha técnica
    m_result = await db.execute(
        select(MaintenanceRecord)
        .where(MaintenanceRecord.vehicle_id == vehicle.id)
        .order_by(MaintenanceRecord.date.desc(), MaintenanceRecord.created_at.desc())
        .limit(1)
    )
    latest = m_result.scalar_one_or_none()

    # Count total services
    count_result = await db.execute(
        select(func.count()).select_from(MaintenanceRecord).where(MaintenanceRecord.vehicle_id == vehicle.id)
    )
    total_services = count_result.scalar() or 0

    # Fetch workshop rating from latest record
    workshop_rating = 0.0
    if latest and latest.workshop_id:
        w_result = await db.execute(select(Workshop).where(Workshop.id == latest.workshop_id))
        workshop = w_result.scalar_one_or_none()
        if workshop:
            workshop_rating = workshop.rating or 0.0

    # Fetch owner WhatsApp info
    owner_whatsapp = ""
    owner_name = ""
    owner_result = await db.execute(select(Profile).where(Profile.id == vehicle.owner_id))
    owner = owner_result.scalar_one_or_none()
    if owner:
        owner_name = owner.full_name or ""
        if owner.whatsapp_enabled:
            owner_whatsapp = owner.whatsapp_number or ""

    return NfcTokenInfoPublic(
        plate=vehicle.plate,
        brand=vehicle.brand,
        model=vehicle.model,
        year=vehicle.year,
        color=vehicle.color,
        type=vehicle.type,
        vehicle_id=vehicle.id,
        # Ficha técnica
        current_mileage=latest.mileage if latest else None,
        next_service_mileage=latest.next_service_mileage if latest else None,
        lubricant_brand=latest.lubricant_brand if latest else "",
        lubricant_type=latest.lubricant_type if latest else "",
        total_services=total_services,
        latest_service_date=str(latest.date) if latest and latest.date else None,
        workshop_name=latest.workshop if latest else None,
        workshop_rating=workshop_rating,
        # Sell info
        sell_enabled=vehicle.sell_enabled,
        sell_price=vehicle.sell_price or "",
        sell_city=vehicle.sell_city or "",
        sell_zip=vehicle.sell_zip or "",
        sell_phone=vehicle.sell_phone or "",
        sell_description=vehicle.sell_description or "",
        # Vehicle info
        vehicle_condition=vehicle.vehicle_condition or "usado",
        published_at=str(vehicle.created_at) if vehicle.created_at else None,
        owner_whatsapp=owner_whatsapp,
        owner_name=owner_name,
    )
