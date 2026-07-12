from __future__ import annotations

import secrets
import string
import uuid
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Profile, Vehicle, Workshop
from app.schemas.schemas import WorkshopCreate, WorkshopOut, WorkshopSearchResult

router = APIRouter(prefix="/workshops", tags=["workshops"])


def _generate_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return "TLR-" + "".join(secrets.choice(chars) for _ in range(5))


@router.post("", response_model=WorkshopOut, status_code=status.HTTP_201_CREATED)
async def create_workshop(
    body: WorkshopCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Register a new workshop (taller). Optionally registers a test vehicle."""
    uid = uuid.UUID(user_id)

    # Ensure profile exists
    p_result = await db.execute(select(Profile).where(Profile.id == uid))
    profile = p_result.scalar_one_or_none()
    if not profile:
        from app.routers.vehicles import _ensure_profile
        await _ensure_profile(str(uid), db)
        p_result = await db.execute(select(Profile).where(Profile.id == uid))
        profile = p_result.scalar_one_or_none()

    # Check legal_id uniqueness
    existing = await db.execute(select(Workshop).where(Workshop.legal_id == body.legal_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A workshop with this NIT/RUT is already registered")

    # Generate unique code
    code = ""
    for _ in range(20):
        candidate = _generate_code()
        c_result = await db.execute(select(Workshop).where(Workshop.code == candidate))
        if not c_result.scalar_one_or_none():
            code = candidate
            break
    if not code:
        raise HTTPException(status_code=500, detail="Could not generate a unique workshop code")

    workshop = Workshop(
        owner_id=uid,
        legal_id=body.legal_id,
        code=code,
        name=body.name,
        address=body.address,
        city=body.city,
        phone=body.phone,
        description=body.description,
    )
    db.add(workshop)
    await db.flush()

    # Update profile account_type
    profile.account_type = "taller"

    # Optionally create a test vehicle
    if body.plate:
        vehicle = Vehicle(
            owner_id=uid,
            plate=body.plate.upper(),
            city=body.vehicle_city or body.city or "",
            brand=body.brand or "",
            model=body.model or "",
            year=body.year or 0,
            type=body.vehicle_type or "",
            color=body.color or "",
        )
        db.add(vehicle)

    await db.flush()
    await db.refresh(workshop)
    return workshop


@router.get("/me", response_model=WorkshopOut)
async def get_my_workshop(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get the workshop owned by the current user."""
    result = await db.execute(
        select(Workshop).where(Workshop.owner_id == uuid.UUID(user_id))
    )
    workshop = result.scalar_one_or_none()
    if not workshop:
        raise HTTPException(status_code=404, detail="No workshop registered for this account")
    return workshop


@router.put("/me", response_model=WorkshopOut)
async def update_my_workshop(
    body: WorkshopCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update the workshop owned by the current user."""
    result = await db.execute(
        select(Workshop).where(Workshop.owner_id == uuid.UUID(user_id))
    )
    workshop = result.scalar_one_or_none()
    if not workshop:
        raise HTTPException(status_code=404, detail="No workshop registered for this account")

    update_data = body.model_dump(exclude_unset=True, exclude={"plate", "brand", "model", "year", "vehicle_type", "color", "vehicle_city"})
    for key, val in update_data.items():
        if val is not None:
            setattr(workshop, key, val)
    await db.flush()
    await db.refresh(workshop)
    return workshop


@router.get("/search", response_model=list[WorkshopSearchResult])
async def search_workshops(
    db: Annotated[AsyncSession, Depends(get_db)],
    q: str = Query("", min_length=1),
    city: str = Query("", min_length=0),
):
    """Search workshops by code, name, or legal_id, optionally filtered by city."""
    query = select(Workshop)

    conditions = []
    if q:
        pattern = f"%{q}%"
        conditions.append(
            or_(
                Workshop.code.ilike(pattern),
                Workshop.name.ilike(pattern),
                Workshop.legal_id.ilike(pattern),
            )
        )
    if city:
        conditions.append(Workshop.city.ilike(f"%{city}%"))

    if conditions:
        query = query.where(*conditions)

    query = query.order_by(Workshop.is_verified.desc(), Workshop.name.asc()).limit(20)

    result = await db.execute(query)
    workshops = list(result.scalars().all())
    return workshops


@router.get("/{code}", response_model=WorkshopOut)
async def get_workshop_by_code(
    code: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get workshop by its TLR-XXXXX code (public)."""
    result = await db.execute(select(Workshop).where(Workshop.code == code.upper()))
    workshop = result.scalar_one_or_none()
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
    return workshop
