from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_admin
from app.models.models import NfcTokenWhitelist, SalesChannel
from app.schemas.schemas import (
    ChannelCreate,
    ChannelKeychainOut,
    ChannelMarkDistributed,
    ChannelOut,
    ChannelProvisionedItem,
    ChannelProvisionRequest,
    ChannelUpdate,
    WhitelistBulkActionOut,
)
from app.services.crypto import decrypt_url, encrypt_url
from app.services.nfc_provisioning import generate_human_code, generate_nfc_token

# Canales de venta: experimentos para medir cómo se comportan los llaveros
# vendidos por otra vía (Shopify, Mercado Libre...). NO son partners — un
# partner es un aliado que vende productos de CarLink. Un llavero de canal
# nunca entra al inventario de la web (shop_orders.WEB_STOCK_WHERE).
router = APIRouter(prefix="/admin/nfc/channels", tags=["admin-channels"])

MAX_BATCH_SIZE = 50


async def _get_channel(channel_id: uuid.UUID, db: AsyncSession) -> SalesChannel:
    channel = (await db.execute(select(SalesChannel).where(SalesChannel.id == channel_id))).scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=404, detail="Canal no encontrado")
    return channel


def _out(c: SalesChannel, total: int = 0, distributed: int = 0, activated: int = 0) -> ChannelOut:
    return ChannelOut(
        id=c.id, name=c.name, kind=c.kind, notes=c.notes, status=c.status, created_at=c.created_at,
        total=total, distributed=distributed, activated=activated,
    )


@router.get("", response_model=list[ChannelOut])
async def list_channels(
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    channels = (await db.execute(select(SalesChannel).order_by(SalesChannel.created_at.desc()))).scalars().all()
    rows = (await db.execute(
        select(
            NfcTokenWhitelist.channel_id,
            func.count(),
            func.count(NfcTokenWhitelist.distributed_at),
            func.count().filter(NfcTokenWhitelist.status == "claimed"),
        ).where(NfcTokenWhitelist.channel_id.is_not(None)).group_by(NfcTokenWhitelist.channel_id)
    )).all()
    counts = {r[0]: (r[1], r[2], r[3]) for r in rows}
    return [_out(c, *counts.get(c.id, (0, 0, 0))) for c in channels]


@router.post("", response_model=ChannelOut, status_code=status.HTTP_201_CREATED)
async def create_channel(
    body: ChannelCreate,
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    name = body.name.strip()
    exists = (await db.execute(select(func.count()).select_from(SalesChannel).where(func.lower(SalesChannel.name) == name.lower()))).scalar() or 0
    if exists:
        raise HTTPException(status_code=409, detail="Ya existe un canal con ese nombre")
    channel = SalesChannel(name=name, kind=body.kind, notes=body.notes.strip())
    db.add(channel)
    try:
        await db.flush()
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Ya existe un canal con ese nombre")
    await db.refresh(channel)
    return _out(channel)


@router.patch("/{channel_id}", response_model=ChannelOut)
async def update_channel(
    channel_id: uuid.UUID,
    body: ChannelUpdate,
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    channel = await _get_channel(channel_id, db)
    if body.name is not None:
        channel.name = body.name.strip()
    if body.notes is not None:
        channel.notes = body.notes.strip()
    if body.status is not None:
        channel.status = body.status
    try:
        await db.flush()
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Ya existe un canal con ese nombre")
    await db.refresh(channel)
    return _out(channel)


@router.post("/{channel_id}/keychains", response_model=list[ChannelProvisionedItem], status_code=status.HTTP_201_CREATED)
async def provision_channel_keychains(
    channel_id: uuid.UUID,
    body: ChannelProvisionRequest,
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Genera llaveros para este canal con la misma ruta criptográfica que el
    resto (generate_nfc_token / generate_human_code). Quedan atribuidos al
    canal y fuera del inventario web desde el primer momento."""
    channel = await _get_channel(channel_id, db)
    if channel.status != "active":
        raise HTTPException(status_code=400, detail="El canal está cerrado")
    if body.quantity < 1 or body.quantity > MAX_BATCH_SIZE:
        raise HTTPException(status_code=400, detail=f"quantity debe estar entre 1 y {MAX_BATCH_SIZE}")

    batch = uuid.uuid4().hex[:10]
    label = body.note.strip() or channel.name
    items: list[ChannelProvisionedItem] = []
    for i in range(body.quantity):
        generated = generate_nfc_token()
        activation_code = generate_human_code()
        entry = NfcTokenWhitelist(
            # tag_uid es varchar(32): placeholder corto y único hasta tener el UID físico real.
            tag_uid=f"ch-{batch}-{i:02d}",
            label=label,
            added_by=uuid.UUID(admin),
            activation_code_hash=hashlib.sha256(activation_code.encode()).hexdigest(),
            activation_code_encrypted=encrypt_url(activation_code),
            token_hash=generated.token_hash,
            token_prefix=generated.token_prefix,
            token_url_encrypted=generated.token_url_encrypted,
            qr_slug=generated.qr_slug,
            status="available",
            channel_id=channel.id,
        )
        db.add(entry)
        await db.flush()
        await db.refresh(entry)
        items.append(ChannelProvisionedItem(
            id=entry.id, tag_uid=entry.tag_uid, activation_code=activation_code,
            token_url=generated.token_url, qr_url=generated.qr_url,
        ))
    return items


@router.get("/{channel_id}/keychains", response_model=list[ChannelKeychainOut])
async def list_channel_keychains(
    channel_id: uuid.UUID,
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Lote del canal, un llavero por fila, con su código de activación (para
    imprimirlo/consultarlo) y su QR. Solo admin: el código es lo que activa el llavero."""
    await _get_channel(channel_id, db)
    entries = (await db.execute(
        select(NfcTokenWhitelist).where(NfcTokenWhitelist.channel_id == channel_id).order_by(NfcTokenWhitelist.created_at, NfcTokenWhitelist.tag_uid)
    )).scalars().all()
    frontend_url = get_settings().frontend_url
    return [
        ChannelKeychainOut(
            id=e.id, tag_uid=e.tag_uid, label=e.label, status=e.status,
            activation_code=decrypt_url(e.activation_code_encrypted) if e.activation_code_encrypted else None,
            qr_url=f"{frontend_url}/nfc/q/{e.qr_slug}" if e.qr_slug else None,
            distributed_at=e.distributed_at, claimed_at=e.claimed_at, created_at=e.created_at,
        )
        for e in entries
    ]


@router.post("/{channel_id}/mark-distributed", response_model=WhitelistBulkActionOut)
async def mark_channel_distributed(
    channel_id: uuid.UUID,
    body: ChannelMarkDistributed,
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Confirma que llaveros del canal salieron físicamente hacia la
    plataforma — es el control de "qué se envió". Solo toca los del canal
    que aún no tenían fecha de envío; sin keychain_ids marca todos los pendientes."""
    await _get_channel(channel_id, db)
    stmt = (
        update(NfcTokenWhitelist)
        .where(NfcTokenWhitelist.channel_id == channel_id, NfcTokenWhitelist.distributed_at.is_(None))
        .values(distributed_at=datetime.now(timezone.utc))
    )
    if body.keychain_ids is not None:
        stmt = stmt.where(NfcTokenWhitelist.id.in_(body.keychain_ids))
    result = await db.execute(stmt)
    return WhitelistBulkActionOut(count=result.rowcount or 0)
