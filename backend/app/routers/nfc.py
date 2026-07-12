from __future__ import annotations

import hashlib
import time
import uuid
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import NfcToken, Vehicle
from app.schemas.schemas import NfcTokenCreate, NfcTokenInfoPublic, NfcTokenOut

router = APIRouter(prefix="/nfc", tags=["nfc"])

# In-memory per-IP rate limiter for the public endpoint
# Production: replace with Redis-based rate limiting via the existing cache service
_rate_store: dict[str, list[float]] = {}
_RATE_WINDOW = 60
_RATE_MAX = 30


def _check_rate(ip: str) -> bool:
    now = time.time()
    cutoff = now - _RATE_WINDOW
    if ip not in _rate_store:
        _rate_store[ip] = []
    _rate_store[ip] = [t for t in _rate_store[ip] if t > cutoff]
    if len(_rate_store[ip]) >= _RATE_MAX:
        return False
    _rate_store[ip].append(now)
    return True


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

    nfc_token = NfcToken(
        user_id=uid,
        vehicle_id=vehicle.id,
        token_hash=body.token_hash,
        token_prefix=body.token_prefix,
        label="Llavero NFC",
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
    await db.flush()


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
    if not _check_rate(ip):
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

    nfc_token.access_count = (nfc_token.access_count or 0) + 1
    nfc_token.last_accessed_at = func.now()
    await db.flush()

    v_result = await db.execute(select(Vehicle).where(Vehicle.id == nfc_token.vehicle_id))
    vehicle = v_result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    if not vehicle.nfc_active:
        raise HTTPException(status_code=404, detail="Ficha pública desactivada por el propietario")

    return NfcTokenInfoPublic(
        plate=vehicle.plate,
        brand=vehicle.brand,
        model=vehicle.model,
        year=vehicle.year,
        color=vehicle.color,
        type=vehicle.type,
        vehicle_id=vehicle.id,
    )
