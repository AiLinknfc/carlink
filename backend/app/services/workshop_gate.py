"""Compuerta de los routers del panel de negocio: tipo de negocio y periodo de acceso, en el backend.

`workshop_gate("ordenes")` se pone como dependencia del router. Responde:
  403 `capability_not_available` si el tipo de negocio no incluye esa función (p. ej. un concesionario y las órdenes);
  402 `access_expired` si el acceso venció y la petición escribe (GET/HEAD/OPTIONS siguen funcionando: modo solo lectura).
Si el usuario aún no tiene negocio no decide nada: la ruta responde 404 como antes."""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Workshop
from app.services import workshop_access
from app.services.capabilities import capabilities_for

_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def check(workshop, capability: str, method: str) -> None:
    """Lógica pura de la compuerta (se prueba sin base de datos)."""
    if capability not in capabilities_for(workshop.business_kind):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="capability_not_available")
    if method.upper() not in _SAFE_METHODS and not workshop_access.is_active(workshop):
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, detail="access_expired")


async def _load_workshop(user_id: str, db: AsyncSession):
    return (await db.execute(select(Workshop).where(Workshop.owner_id == uuid.UUID(user_id)))).scalar_one_or_none()


def workshop_gate(capability: str):
    async def dependency(
        request: Request,
        user_id: Annotated[str, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(get_db)],
    ) -> None:
        workshop = await _load_workshop(user_id, db)
        if workshop is not None:
            check(workshop, capability, request.method)

    return dependency
