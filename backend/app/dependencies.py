from __future__ import annotations

import uuid
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.models import Vehicle, Workshop
from app.services.auth import verify_supabase_jwt

bearer_scheme = HTTPBearer(auto_error=False)


def _get_admin_id() -> str:
    from app.config import get_settings
    return get_settings().admin_user_id


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> str:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization token")
    user_id = await verify_supabase_jwt(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return user_id


async def get_current_admin(
    user_id: Annotated[str, Depends(get_current_user)],
) -> str:
    admin_id = _get_admin_id()
    if not admin_id:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="ADMIN_USER_ID not configured")
    if user_id != admin_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user_id


async def verify_vehicle(vehicle_id: UUID, user_id: str, db: AsyncSession) -> Vehicle:
    result = await db.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.owner_id == uuid.UUID(user_id))
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return vehicle


async def verify_workshop(user_id: str, db: AsyncSession) -> Workshop:
    """Panel de negocio (taller/empresa): toda la data nueva (clientes, órdenes,
    inventario, citas, etc.) cuelga del workshop del usuario autenticado — nunca
    de un vehicle_id, porque los clientes de un taller casi nunca son usuarios
    de CarLink. Ver docs/PLAN_MIGRACION_TALLERPRO.md."""
    result = await db.execute(select(Workshop).where(Workshop.owner_id == uuid.UUID(user_id)))
    workshop = result.scalar_one_or_none()
    if not workshop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No workshop registered for this account")
    return workshop
