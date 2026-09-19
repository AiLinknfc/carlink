from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import NfcToken, Profile

"""Plan gratuito vs. con llavero (decidido 2026-09-18, docs/CONTEXTO.md).

Una cuenta persona sin llavero personal activo en el vehículo puede usar el
módulo de aceite y ver lo demás bloqueado; no puede publicar información al
exterior (ficha pública, vender). Al activar el código del llavero se libera
todo. Talleres/empresas no están sujetos a este plan."""

# Servicios de mantenimiento que el plan gratuito puede registrar.
FREE_SERVICE_TYPES = {"Aceite"}

UNLOCK_DETAIL = "Esta función se desbloquea al activar tu llavero NFC."
PUBLISH_DETAIL = "Publicar información al exterior requiere activar tu llavero NFC."


async def has_full_access(db: AsyncSession, user_id: str, vehicle_id: uuid.UUID) -> bool:
    account_type = (await db.execute(
        select(Profile.account_type).where(Profile.id == uuid.UUID(user_id))
    )).scalar()
    if account_type is not None and account_type != "persona":
        return True
    active = (await db.execute(
        select(func.count(NfcToken.id)).where(
            NfcToken.vehicle_id == vehicle_id,
            NfcToken.token_type == "personal",
            NfcToken.is_active.is_(True),
        )
    )).scalar() or 0
    return active > 0


async def require_full_access(
    db: AsyncSession, user_id: str, vehicle_id: uuid.UUID, detail: str = UNLOCK_DETAIL
) -> None:
    if not await has_full_access(db, user_id, vehicle_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)
