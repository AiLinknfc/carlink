from __future__ import annotations

import uuid
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import FoundRequest, NfcToken, Profile, Vehicle
from app.schemas.schemas import FoundRequestCreate, FoundRequestOut
from app.services.email import send_found_request_email

router = APIRouter(prefix="/found-requests", tags=["found-requests"])


def _build_out(r: FoundRequest, vehicle: Vehicle | None, owner: Profile | None) -> FoundRequestOut:
    return FoundRequestOut(
        id=r.id,
        owner_id=r.owner_id,
        finder_id=r.finder_id,
        vehicle_id=r.vehicle_id,
        nfc_token_id=r.nfc_token_id,
        message=r.message,
        contact_method=r.contact_method,
        finder_email=r.finder_email,
        finder_phone=r.finder_phone,
        finder_name=r.finder_name,
        status=r.status,
        created_at=r.created_at,
        vehicle_plate=vehicle.plate if vehicle else "",
        vehicle_brand=vehicle.brand if vehicle else "",
        vehicle_model=vehicle.model if vehicle else "",
        owner_name=owner.full_name if owner else "",
        owner_email=owner.email if owner else "",
        owner_whatsapp=owner.whatsapp_number if owner and owner.whatsapp_enabled else "",
    )


@router.post("", response_model=FoundRequestOut, status_code=status.HTTP_201_CREATED)
async def create_found_request(
    body: FoundRequestCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Authenticated user reports finding a lost NFC key."""
    uid = uuid.UUID(user_id)

    v_result = await db.execute(select(Vehicle).where(Vehicle.id == body.vehicle_id))
    vehicle = v_result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    owner_result = await db.execute(select(Profile).where(Profile.id == vehicle.owner_id))
    owner = owner_result.scalar_one_or_none()

    finder_result = await db.execute(select(Profile).where(Profile.id == uid))
    finder = finder_result.scalar_one_or_none()

    request = FoundRequest(
        owner_id=vehicle.owner_id,
        finder_id=uid,
        vehicle_id=body.vehicle_id,
        nfc_token_id=body.nfc_token_id,
        message=body.message,
        contact_method=body.contact_method,
        finder_email=body.finder_email or (finder.email if finder else ""),
        finder_phone=body.finder_phone,
        finder_name=body.finder_name or (finder.full_name if finder else ""),
        status="pending",
    )
    db.add(request)
    await db.flush()
    await db.refresh(request)

    # Send email notification to owner
    if owner and owner.email and body.finder_phone:
        send_found_request_email(
            owner_email=owner.email,
            owner_name=owner.full_name or "",
            finder_name=request.finder_name,
            finder_phone=body.finder_phone,
            message=body.message,
            vehicle_plate=vehicle.plate,
        )

    return _build_out(request, vehicle, owner)


@router.post("/public", response_model=FoundRequestOut, status_code=status.HTTP_201_CREATED)
async def create_found_request_public(
    body: FoundRequestCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Unauthenticated user reports finding a lost NFC key (phone-based)."""
    if not body.finder_name.strip() or not body.finder_phone.strip():
        raise HTTPException(status_code=400, detail="Nombre y teléfono son requeridos")

    v_result = await db.execute(select(Vehicle).where(Vehicle.id == body.vehicle_id))
    vehicle = v_result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    owner_result = await db.execute(select(Profile).where(Profile.id == vehicle.owner_id))
    owner = owner_result.scalar_one_or_none()

    request = FoundRequest(
        owner_id=vehicle.owner_id,
        finder_id=None,
        vehicle_id=body.vehicle_id,
        nfc_token_id=body.nfc_token_id,
        message=body.message,
        contact_method="phone",
        finder_email="",
        finder_phone=body.finder_phone,
        finder_name=body.finder_name,
        status="pending",
    )
    db.add(request)
    await db.flush()
    await db.refresh(request)

    # Send email notification to owner
    if owner and owner.email:
        send_found_request_email(
            owner_email=owner.email,
            owner_name=owner.full_name or "",
            finder_name=request.finder_name,
            finder_phone=body.finder_phone,
            message=body.message,
            vehicle_plate=vehicle.plate,
        )

    return _build_out(request, vehicle, owner)


@router.get("", response_model=list[FoundRequestOut])
async def list_my_found_requests(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List found requests where the current user is the owner."""
    uid = uuid.UUID(user_id)
    result = await db.execute(
        select(FoundRequest).where(FoundRequest.owner_id == uid).order_by(FoundRequest.created_at.desc())
    )
    requests = list(result.scalars().all())

    out = []
    for r in requests:
        v_result = await db.execute(select(Vehicle).where(Vehicle.id == r.vehicle_id))
        v = v_result.scalar_one_or_none()
        owner_result = await db.execute(select(Profile).where(Profile.id == r.owner_id))
        owner = owner_result.scalar_one_or_none()
        out.append(_build_out(r, v, owner))
    return out


@router.patch("/{request_id}/read", status_code=status.HTTP_200_OK)
async def mark_found_request_read(
    request_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Mark a found request as read."""
    uid = uuid.UUID(user_id)
    result = await db.execute(
        select(FoundRequest).where(FoundRequest.id == request_id, FoundRequest.owner_id == uid)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    req.status = "read"
    await db.flush()
    return {"ok": True}
