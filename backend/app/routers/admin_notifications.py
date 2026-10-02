"""Buzón de notificaciones del administrador: lista con filtros (estado, tipo, fecha), contador de
no vistas para la campana, y marcar como vista / resuelta. Solo admin."""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from typing import Annotated
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin
from app.models.models import AdminNotification
from app.schemas.schemas import AdminNotificationOut, AdminNotificationUpdate

router = APIRouter(prefix="/admin/notifications", tags=["admin-notifications"])

BOGOTA = ZoneInfo("America/Bogota")


def day_bounds(date_from: date | None, date_to: date | None) -> tuple[datetime | None, datetime | None]:
    """Fechas calendario de Colombia -> instantes UTC: [inicio del día desde, inicio del día después de hasta)."""
    start = datetime.combine(date_from, time.min, tzinfo=BOGOTA).astimezone(timezone.utc) if date_from else None
    end = datetime.combine(date_to + timedelta(days=1), time.min, tzinfo=BOGOTA).astimezone(timezone.utc) if date_to else None
    return start, end


@router.get("", response_model=list[AdminNotificationOut])
async def list_notifications(
    _: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    state: str = Query("all", pattern="^(all|unseen|pending|resolved)$"),
    kind: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = Query(100, ge=1, le=300),
):
    q = select(AdminNotification)
    if state == "unseen":
        q = q.where(AdminNotification.seen_at.is_(None))
    elif state == "pending":
        q = q.where(AdminNotification.resolved_at.is_(None))
    elif state == "resolved":
        q = q.where(AdminNotification.resolved_at.is_not(None))
    if kind:
        q = q.where(AdminNotification.kind == kind)
    start, end = day_bounds(date_from, date_to)
    if start:
        q = q.where(AdminNotification.created_at >= start)
    if end:
        q = q.where(AdminNotification.created_at < end)
    q = q.order_by(AdminNotification.created_at.desc()).limit(limit)
    return (await db.execute(q)).scalars().all()


@router.get("/summary")
async def notifications_summary(
    _: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Lo que alimenta la campana: cuántas no se han visto y cuántas siguen sin atender."""
    unseen = (await db.execute(
        select(func.count()).select_from(AdminNotification).where(AdminNotification.seen_at.is_(None))
    )).scalar() or 0
    pending = (await db.execute(
        select(func.count()).select_from(AdminNotification).where(AdminNotification.resolved_at.is_(None))
    )).scalar() or 0
    return {"unseen": unseen, "pending": pending}


@router.post("/mark-all-seen")
async def mark_all_seen(
    _: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    res = await db.execute(
        update(AdminNotification).where(AdminNotification.seen_at.is_(None)).values(seen_at=func.now())
    )
    return {"updated": res.rowcount or 0}


@router.patch("/{notification_id}", response_model=AdminNotificationOut)
async def update_notification(
    notification_id: UUID,
    body: AdminNotificationUpdate,
    _: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    row = (await db.execute(select(AdminNotification).where(AdminNotification.id == notification_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Notification not found")
    now = datetime.now(timezone.utc)
    if body.seen is not None:
        row.seen_at = now if body.seen else None
    if body.resolved is not None:
        row.resolved_at = now if body.resolved else None
        if body.resolved and row.seen_at is None:
            row.seen_at = now  # atender implica haberla visto
    await db.flush()
    await db.refresh(row)
    return row
