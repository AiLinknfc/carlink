from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Profile
from app.schemas.schemas import ProfileOut, ProfileUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=ProfileOut)
async def get_profile(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Profile).where(Profile.id == uuid.UUID(user_id)))
    profile = result.scalar_one_or_none()
    if not profile:
        from app.database import async_session_factory
        async with async_session_factory() as session:
            from supabase import create_client
            from app.config import get_settings
            settings = get_settings()
            sb = create_client(settings.supabase_url, settings.supabase_service_key)
            user_data = sb.auth.admin.get_user_by_id(user_id)
            if user_data and user_data.user:
                profile = Profile(
                    id=uuid.UUID(user_id),
                    email=user_data.user.email,
                    full_name=user_data.user.user_metadata.get("full_name"),
                    avatar_url=user_data.user.user_metadata.get("avatar_url"),
                )
                session.add(profile)
                await session.commit()
                await session.refresh(profile)
                return profile
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
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
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    if body.full_name is not None:
        profile.full_name = body.full_name
    await db.flush()
    await db.refresh(profile)
    return profile
