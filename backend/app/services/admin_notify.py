"""Buzón de notificaciones del administrador (campana de Admin y de la app) + correo.

`notify_admin` guarda una fila en `admin_notifications` (sin ver hasta que el admin la abra) y,
si `send_email=True`, manda un correo a ADMIN_EMAIL para poder atenderla pronto. Nunca lanza: una
notificación fallida no puede tumbar la venta, el ticket o la postulación que la originó.
Los flujos que YA mandan su propio correo al admin (venta pagada, ticket de soporte, postulación
de taller o de empleo) llaman con send_email=False para no duplicarlo.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.models.models import AdminNotification
from app.services import email

logger = logging.getLogger("carlink.admin_notify")


async def notify_admin(
    db: AsyncSession,
    *,
    kind: str,
    title: str,
    body: str = "",
    ref: str = "",
    link: str = "",
    severity: str = "info",
    send_email: bool = False,
    dedupe_hours: int = 0,
) -> None:
    """dedupe_hours > 0: si ya hay una notificación del mismo kind+ref de las últimas N horas, no crea otra
    (ni manda correo) — para alertas que se repiten en cada escaneo."""
    try:
        if dedupe_hours and ref:
            since = datetime.now(timezone.utc) - timedelta(hours=dedupe_hours)
            dup = (await db.execute(select(func.count()).select_from(AdminNotification).where(
                AdminNotification.kind == kind, AdminNotification.ref == ref, AdminNotification.created_at >= since
            ))).scalar() or 0
            if dup:
                return
        async with db.begin_nested():  # un fallo aquí no contamina la transacción del caller
            db.add(AdminNotification(kind=kind, severity=severity, title=title, body=body, ref=ref, link=link))
            await db.flush()
    except Exception:
        logger.exception("admin notification insert failed (%s)", kind)
        return
    if send_email:
        try:
            await run_in_threadpool(email.send_admin_alert_email, title=title, body=body, link=link, severity=severity)
        except Exception:
            logger.exception("admin alert email failed (%s)", kind)
