from __future__ import annotations

import hashlib
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_partner
from app.models.models import NfcTokenWhitelist, Partner
from app.schemas.schemas import (
    PartnerBatchOut,
    PartnerMeOut,
    PartnerProvisionedItem,
    PartnerProvisionOut,
    PartnerProvisionRequest,
    PartnerTokenOut,
)
from app.services.nfc_provisioning import generate_human_code, generate_nfc_token

router = APIRouter(prefix="/partners", tags=["partners"])

MAX_BATCH_SIZE = 50


@router.get("/me", response_model=PartnerMeOut)
async def get_partner_me(partner: Annotated[Partner, Depends(get_current_partner)]):
    return PartnerMeOut(
        name=partner.name,
        status=partner.status,
        quota_total=partner.quota_total,
        quota_used=partner.quota_used,
        quota_remaining=max(partner.quota_total - partner.quota_used, 0),
    )


@router.post("/me/provision", response_model=PartnerProvisionOut, status_code=status.HTTP_201_CREATED)
async def provision_batch(
    body: PartnerProvisionRequest,
    partner: Annotated[Partner, Depends(get_current_partner)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Genera un lote de llaveros dentro del cupo del partner. Misma ruta
    criptográfica que POST /admin/nfc/whitelist/provision — solo cambia
    quién la llama y que queda atribuido a este partner con un cupo."""
    if body.quantity < 1 or body.quantity > MAX_BATCH_SIZE:
        raise HTTPException(status_code=400, detail=f"quantity debe estar entre 1 y {MAX_BATCH_SIZE}")
    if body.tag_uids is not None and len(body.tag_uids) != body.quantity:
        raise HTTPException(status_code=400, detail="tag_uids debe tener exactamente quantity elementos")
    remaining = partner.quota_total - partner.quota_used
    if body.quantity > remaining:
        raise HTTPException(status_code=400, detail=f"Cupo insuficiente: quedan {remaining}, se pidieron {body.quantity}")

    batch_id = uuid.uuid4()
    items: list[PartnerProvisionedItem] = []
    for i in range(body.quantity):
        # tag_uid es varchar(32) en la DB real — placeholder corto pero
        # único (deriva del batch, no del partner completo, para no pasarse
        # de largo) hasta que el partner tenga el UID físico real.
        tag_uid = body.tag_uids[i] if body.tag_uids else f"pt-{batch_id.hex[:10]}-{i:02d}"
        existing = await db.execute(select(NfcTokenWhitelist).where(NfcTokenWhitelist.tag_uid == tag_uid))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail=f"tag_uid ya registrado: {tag_uid}")

        generated = generate_nfc_token()
        activation_code = generate_human_code()
        activation_code_hash = hashlib.sha256(activation_code.encode()).hexdigest()

        entry = NfcTokenWhitelist(
            tag_uid=tag_uid,
            label=body.batch_note,
            activation_code_hash=activation_code_hash,
            token_hash=generated.token_hash,
            token_prefix=generated.token_prefix,
            token_url_encrypted=generated.token_url_encrypted,
            qr_slug=generated.qr_slug,
            status="available",
            provisioned_by_partner_id=partner.id,
            partner_batch_id=batch_id,
        )
        db.add(entry)
        await db.flush()
        await db.refresh(entry)
        items.append(PartnerProvisionedItem(
            id=entry.id,
            tag_uid=entry.tag_uid,
            activation_code=activation_code,
            token_url=generated.token_url,
            qr_url=generated.qr_url,
        ))

    partner.quota_used += body.quantity
    await db.flush()

    return PartnerProvisionOut(
        batch_id=batch_id,
        items=items,
        quota_remaining=max(partner.quota_total - partner.quota_used, 0),
    )


@router.get("/me/batches", response_model=list[PartnerBatchOut])
async def list_partner_batches(
    partner: Annotated[Partner, Depends(get_current_partner)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Lotes propios, agregados por partner_batch_id. A propósito NO expone
    claimed_by — un partner ve si un código ya se activó, no quién lo activó."""
    result = await db.execute(
        select(
            NfcTokenWhitelist.partner_batch_id,
            func.min(NfcTokenWhitelist.created_at).label("created_at"),
            func.min(NfcTokenWhitelist.label).label("note"),
            func.count().label("total"),
            func.count().filter(NfcTokenWhitelist.status != "available").label("claimed"),
        )
        .where(NfcTokenWhitelist.provisioned_by_partner_id == partner.id)
        .group_by(NfcTokenWhitelist.partner_batch_id)
        .order_by(func.min(NfcTokenWhitelist.created_at).desc())
    )
    return [
        PartnerBatchOut(batch_id=row.partner_batch_id, created_at=row.created_at, total=row.total, claimed=row.claimed, note=row.note or "")
        for row in result.all()
    ]


@router.get("/me/tokens", response_model=list[PartnerTokenOut])
async def list_partner_tokens(
    partner: Annotated[Partner, Depends(get_current_partner)],
    db: Annotated[AsyncSession, Depends(get_db)],
    batch_id: uuid.UUID | None = None,
):
    """Llaveros propios, uno por fila — a diferencia de /me/batches (que
    agrega), esto es lo que alimenta "control estricto sobre los QR
    generados": qr_url no es de un solo uso, así que un partner puede
    volver a verlo/manipularlo para cualquier llavero suyo cuando quiera,
    no solo en el momento de aprovisionarlo. Filtrable por lote para manejar
    una campaña específica."""
    stmt = select(NfcTokenWhitelist).where(NfcTokenWhitelist.provisioned_by_partner_id == partner.id)
    if batch_id:
        stmt = stmt.where(NfcTokenWhitelist.partner_batch_id == batch_id)
    stmt = stmt.order_by(NfcTokenWhitelist.created_at.desc())
    result = await db.execute(stmt)
    entries = result.scalars().all()

    frontend_url = get_settings().frontend_url
    return [
        PartnerTokenOut(
            id=e.id, tag_uid=e.tag_uid, label=e.label, status=e.status,
            qr_url=f"{frontend_url}/nfc/q/{e.qr_slug}" if e.qr_slug else None,
            partner_batch_id=e.partner_batch_id, created_at=e.created_at,
        )
        for e in entries
    ]
