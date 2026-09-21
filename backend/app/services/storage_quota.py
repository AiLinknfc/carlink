from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.config import get_settings
from app.models.models import NfcToken, Profile
from app.services.storage import get_r2_client

"""Cupo de almacenamiento por cuenta (decidido 2026-09-20, docs/CONTEXTO.md).

Cuenta persona: gratis 100 MB; con llavero activo 200 MB; con 3 o más llaveros
activos (Kit) 500 MB. El Kit no tiene SKU propio en el backend, así que se
detecta por cantidad de llaveros personales activos. Talleres/empresas no tienen
cupo definido todavía (sin tope). El uso se calcula sumando los objetos de R2
bajo el prefijo `{user_id}/`, así que borrar un archivo libera espacio solo."""

MB = 1024 * 1024
FREE_QUOTA = 100 * MB
KEYCHAIN_QUOTA = 200 * MB
KIT_QUOTA = 500 * MB
KIT_MIN_KEYCHAINS = 3


def quota_for(account_type: str | None, active_keychains: int) -> int | None:
    """Bytes permitidos, o None si la cuenta no tiene tope."""
    if account_type is not None and account_type != "persona":
        return None
    if active_keychains >= KIT_MIN_KEYCHAINS:
        return KIT_QUOTA
    if active_keychains >= 1:
        return KEYCHAIN_QUOTA
    return FREE_QUOTA


def _sum_prefix(prefix: str) -> int:
    client = get_r2_client()
    bucket = get_settings().r2_bucket_name
    total = 0
    for page in client.get_paginator("list_objects_v2").paginate(Bucket=bucket, Prefix=prefix):
        total += sum(o["Size"] for o in page.get("Contents", []))
    return total


async def used_bytes(user_id: str) -> int:
    return await run_in_threadpool(_sum_prefix, f"{user_id}/")


async def get_usage(db: AsyncSession, user_id: str) -> tuple[int, int | None]:
    uid = uuid.UUID(user_id)
    account_type = (await db.execute(select(Profile.account_type).where(Profile.id == uid))).scalar()
    active = (await db.execute(
        select(func.count(NfcToken.id)).where(
            NfcToken.user_id == uid,
            NfcToken.token_type == "personal",
            NfcToken.is_active.is_(True),
        )
    )).scalar() or 0
    return await used_bytes(user_id), quota_for(account_type, active)


async def ensure_room(db: AsyncSession, user_id: str, incoming: int) -> None:
    used, limit = await get_usage(db, user_id)
    if limit is not None and used + incoming > limit:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"Superaste tu espacio de almacenamiento ({limit // MB} MB). "
                "Elimina archivos que ya no necesites o activa un llavero para ampliarlo."
            ),
        )
