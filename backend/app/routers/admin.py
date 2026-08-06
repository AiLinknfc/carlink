from __future__ import annotations

import hashlib
import uuid
from datetime import UTC
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_admin
from app.models.models import (
    NfcAccessLog,
    NfcAlert,
    NfcTagInventory,
    NfcToken,
    NfcTokenLimit,
    NfcTokenWhitelist,
    Profile,
    Vehicle,
)
from app.schemas.schemas import (
    NfcAccessLogOut,
    NfcAlertOut,
    NfcAlertResolve,
    NfcStatsOut,
    NfcTagInventoryBulkCreate,
    NfcTagInventoryCreate,
    NfcTagInventoryOut,
    NfcTokenAdminOut,
    NfcTokenLimitOut,
    NfcTokenLimitUpdate,
    NfcTokenUpdate,
    NfcWhitelistBulkCreate,
    NfcWhitelistCreate,
    NfcWhitelistOut,
    NfcWhitelistProvisionCreate,
    NfcWhitelistProvisionOut,
)
from app.services.nfc_provisioning import generate_human_code, generate_nfc_token

router = APIRouter(prefix="/admin/nfc", tags=["admin-nfc"])


# ── Dashboard Stats ──

@router.get("/stats", response_model=NfcStatsOut)
async def get_nfc_stats(
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    total = (await db.execute(select(func.count(NfcToken.id)))).scalar() or 0
    active = (await db.execute(
        select(func.count(NfcToken.id)).where(NfcToken.is_active == True)
    )).scalar() or 0

    from datetime import datetime, timedelta
    day_ago = datetime.now(UTC) - timedelta(hours=24)
    today_access = (await db.execute(
        select(func.count(NfcAccessLog.id)).where(NfcAccessLog.scanned_at >= day_ago)
    )).scalar() or 0

    total_alerts = (await db.execute(select(func.count(NfcAlert.id)))).scalar() or 0
    unresolved = (await db.execute(
        select(func.count(NfcAlert.id)).where(NfcAlert.resolved == False)
    )).scalar() or 0

    whitelist_count = (await db.execute(select(func.count(NfcTokenWhitelist.id)))).scalar() or 0

    return NfcStatsOut(
        total_tokens=total,
        active_tokens=active,
        total_access_today=today_access,
        total_alerts=total_alerts,
        unresolved_alerts=unresolved,
        whitelist_count=whitelist_count,
    )


# ── Tokens CRUD ──

@router.get("/tokens", response_model=list[NfcTokenAdminOut])
async def list_all_tokens(
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    stmt = select(NfcToken)
    if status_filter:
        stmt = stmt.where(NfcToken.status == status_filter)
    stmt = stmt.order_by(NfcToken.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    tokens = list(result.scalars().all())

    frontend_url = get_settings().frontend_url
    out = []
    for t in tokens:
        user_result = await db.execute(select(Profile).where(Profile.id == t.user_id))
        user = user_result.scalar_one_or_none()
        v_result = await db.execute(select(Vehicle).where(Vehicle.id == t.vehicle_id))
        vehicle = v_result.scalar_one_or_none()
        out.append(NfcTokenAdminOut(
            id=t.id, user_id=t.user_id, vehicle_id=t.vehicle_id,
            token_prefix=t.token_prefix, label=t.label, is_active=t.is_active,
            tag_uid=t.tag_uid, status=t.status, token_type=t.token_type,
            last_accessed_at=t.last_accessed_at, access_count=t.access_count,
            created_at=t.created_at,
            user_email=user.email if user else "",
            user_name=user.full_name if user else "",
            vehicle_plate=vehicle.plate if vehicle else "",
            vehicle_brand=vehicle.brand if vehicle else "",
            qr_url=f"{frontend_url}/nfc/q/{t.qr_slug}" if t.qr_slug else None,
        ))
    return out


@router.patch("/tokens/{token_id}", response_model=NfcTokenAdminOut)
async def update_token(
    token_id: UUID,
    body: NfcTokenUpdate,
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(NfcToken).where(NfcToken.id == token_id))
    token = result.scalar_one_or_none()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(token, field, value)
    await db.flush()
    await db.refresh(token)

    user_result = await db.execute(select(Profile).where(Profile.id == token.user_id))
    user = user_result.scalar_one_or_none()
    v_result = await db.execute(select(Vehicle).where(Vehicle.id == token.vehicle_id))
    vehicle = v_result.scalar_one_or_none()

    return NfcTokenAdminOut(
        id=token.id, user_id=token.user_id, vehicle_id=token.vehicle_id,
        token_prefix=token.token_prefix, label=token.label, is_active=token.is_active,
        tag_uid=token.tag_uid, status=token.status, token_type=token.token_type,
        last_accessed_at=token.last_accessed_at, access_count=token.access_count,
        created_at=token.created_at,
        user_email=user.email if user else "",
        user_name=user.full_name if user else "",
        vehicle_plate=vehicle.plate if vehicle else "",
        vehicle_brand=vehicle.brand if vehicle else "",
        qr_url=f"{get_settings().frontend_url}/nfc/q/{token.qr_slug}" if token.qr_slug else None,
    )


@router.delete("/tokens/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_token_admin(
    token_id: UUID,
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(NfcToken).where(NfcToken.id == token_id))
    token = result.scalar_one_or_none()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    token.is_active = False
    token.status = "revoked"
    await db.flush()


# ── Access Logs ──

@router.get("/tokens/{token_id}/logs", response_model=list[NfcAccessLogOut])
async def get_token_logs(
    token_id: UUID,
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(50, ge=1, le=200),
):
    result = await db.execute(
        select(NfcAccessLog)
        .where(NfcAccessLog.token_id == token_id)
        .order_by(NfcAccessLog.scanned_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


# ── Alerts ──

@router.get("/alerts", response_model=list[NfcAlertOut])
async def list_alerts(
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    resolved: bool | None = None,
    limit: int = Query(50, ge=1, le=200),
):
    stmt = select(NfcAlert)
    if resolved is not None:
        stmt = stmt.where(NfcAlert.resolved == resolved)
    stmt = stmt.order_by(NfcAlert.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.patch("/alerts/{alert_id}/resolve", response_model=NfcAlertOut)
async def resolve_alert(
    alert_id: UUID,
    body: NfcAlertResolve,
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    from datetime import datetime
    result = await db.execute(select(NfcAlert).where(NfcAlert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.resolved = body.resolved
    alert.resolved_at = datetime.now(UTC) if body.resolved else None
    await db.flush()
    await db.refresh(alert)
    return alert


# ── Whitelist ──

@router.get("/whitelist", response_model=list[NfcWhitelistOut])
async def list_whitelist(
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(NfcTokenWhitelist).order_by(NfcTokenWhitelist.created_at.desc())
    )
    entries = list(result.scalars().all())

    frontend_url = get_settings().frontend_url
    out = []
    for e in entries:
        claimer = None
        if e.claimed_by:
            c_result = await db.execute(select(Profile).where(Profile.id == e.claimed_by))
            claimer = c_result.scalar_one_or_none()
        out.append(NfcWhitelistOut(
            id=e.id, tag_uid=e.tag_uid, label=e.label, status=e.status,
            added_by=e.added_by, claimed_by=e.claimed_by, claimed_at=e.claimed_at,
            created_at=e.created_at,
            claimed_by_email=claimer.email if claimer else "",
            claimed_by_name=claimer.full_name if claimer else "",
            qr_url=f"{frontend_url}/nfc/q/{e.qr_slug}" if e.qr_slug else None,
        ))
    return out


@router.post("/whitelist", response_model=NfcWhitelistOut, status_code=status.HTTP_201_CREATED)
async def add_to_whitelist(
    body: NfcWhitelistCreate,
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Register a known-good physical chip UID without provisioning a token
    yet (anti-clone tracking only). Use /whitelist/provision to also generate
    the activation code + pre-written URL a user can actually claim."""
    existing = await db.execute(
        select(NfcTokenWhitelist).where(NfcTokenWhitelist.tag_uid == body.tag_uid)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="UID already whitelisted")

    entry = NfcTokenWhitelist(tag_uid=body.tag_uid, label=body.label, added_by=uuid.UUID(admin))
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return NfcWhitelistOut(
        id=entry.id, tag_uid=entry.tag_uid, label=entry.label, status=entry.status,
        added_by=entry.added_by, claimed_by=None, claimed_at=None, created_at=entry.created_at,
    )


@router.post("/whitelist/provision", response_model=NfcWhitelistProvisionOut, status_code=status.HTTP_201_CREATED)
async def provision_whitelist_entry(
    body: NfcWhitelistProvisionCreate,
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Pre-program a physical keychain before it ships: generates the raw
    token to write onto the chip and a separate activation code to print on
    its packaging. Both are returned ONCE here — only their hashes are
    stored, so this response cannot be reconstructed later."""
    existing = await db.execute(
        select(NfcTokenWhitelist).where(NfcTokenWhitelist.tag_uid == body.tag_uid)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Este tag UID ya está registrado")

    generated = generate_nfc_token()

    activation_code = generate_human_code()
    activation_code_hash = hashlib.sha256(activation_code.encode()).hexdigest()

    entry = NfcTokenWhitelist(
        tag_uid=body.tag_uid,
        label=body.label,
        added_by=uuid.UUID(admin),
        activation_code_hash=activation_code_hash,
        token_hash=generated.token_hash,
        token_prefix=generated.token_prefix,
        token_url_encrypted=generated.token_url_encrypted,
        qr_slug=generated.qr_slug,
        status="available",
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)

    return NfcWhitelistProvisionOut(
        id=entry.id,
        tag_uid=entry.tag_uid,
        activation_code=activation_code,
        token_url=generated.token_url,
        qr_url=generated.qr_url,
    )


@router.post("/whitelist/bulk", response_model=list[NfcWhitelistOut], status_code=status.HTTP_201_CREATED)
async def bulk_add_whitelist(
    body: NfcWhitelistBulkCreate,
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    created = []
    for item in body.entries:
        existing = await db.execute(
            select(NfcTokenWhitelist).where(NfcTokenWhitelist.tag_uid == item.tag_uid)
        )
        if existing.scalar_one_or_none():
            continue
        entry = NfcTokenWhitelist(tag_uid=item.tag_uid, label=item.label)
        db.add(entry)
        await db.flush()
        await db.refresh(entry)
        created.append(entry)
    return created


@router.delete("/whitelist/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_whitelist(
    entry_id: UUID,
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(NfcTokenWhitelist).where(NfcTokenWhitelist.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Whitelist entry not found")
    await db.delete(entry)
    await db.flush()


# ── Token Limits ──

@router.get("/limits", response_model=list[NfcTokenLimitOut])
async def list_limits(
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(NfcTokenLimit).order_by(NfcTokenLimit.account_type))
    return list(result.scalars().all())


@router.patch("/limits/{account_type}", response_model=NfcTokenLimitOut)
async def update_limit(
    account_type: str,
    body: NfcTokenLimitUpdate,
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(NfcTokenLimit).where(NfcTokenLimit.account_type == account_type)
    )
    limit = result.scalar_one_or_none()
    if not limit:
        raise HTTPException(status_code=404, detail="Limit not found for this account type")

    from datetime import datetime
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(limit, field, value)
    limit.updated_at = datetime.now(UTC)
    await db.flush()
    await db.refresh(limit)
    return limit


# ── NFC Tag Inventory (raw scan metadata, separate from whitelist/activation) ──

@router.get("/inventory", response_model=list[NfcTagInventoryOut])
async def list_tag_inventory(
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    result = await db.execute(
        select(NfcTagInventory).order_by(NfcTagInventory.created_at.desc()).offset(offset).limit(limit)
    )
    return list(result.scalars().all())


@router.post("/inventory", response_model=NfcTagInventoryOut, status_code=status.HTTP_201_CREATED)
async def create_tag_inventory(
    body: NfcTagInventoryCreate,
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    entry = NfcTagInventory(**body.model_dump(), added_by=uuid.UUID(admin))
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return entry


@router.post("/inventory/bulk", response_model=list[NfcTagInventoryOut], status_code=status.HTTP_201_CREATED)
async def bulk_create_tag_inventory(
    body: NfcTagInventoryBulkCreate,
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    created = []
    for item in body.entries:
        entry = NfcTagInventory(**item.model_dump(), added_by=uuid.UUID(admin))
        db.add(entry)
        created.append(entry)
    await db.flush()
    for entry in created:
        await db.refresh(entry)
    return created


@router.delete("/inventory/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag_inventory(
    entry_id: UUID,
    admin: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(NfcTagInventory).where(NfcTagInventory.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Inventory entry not found")
    await db.delete(entry)
    await db.flush()
