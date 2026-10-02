from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.config import get_settings
from app.database import async_session_factory
from app.models.models import NfcAccessLog, NfcAlert, NfcToken, Profile, Vehicle
from app.services import email
from app.services.admin_notify import notify_admin
from app.utils import is_visitor_ip


async def notify_nfc_alert(db: AsyncSession, alert: NfcAlert) -> None:
    """Campana del admin por una alerta de seguridad NFC. Solo las sospechosas (warning) o críticas:
    las informativas (p. ej. una lectura de noche) quedan en el historial de Alertas pero no avisan.
    Correo solo si es crítica. Una por token y tipo cada 24 h."""
    if alert.severity == "info":
        return
    await notify_admin(
        db, kind="nfc_alert", severity=alert.severity,
        title=f"Alerta NFC: {alert.alert_type.replace('_', ' ')}", body=alert.message or "",
        ref=f"{alert.token_id}:{alert.alert_type}", link=f"/admin?tab=alerts&alert={alert.id}",
        send_email=alert.severity == "critical", dedupe_hours=24,
    )


async def _already_alerted(db: AsyncSession, token_id: UUID, alert_type: str, since: datetime) -> bool:
    """Una alerta de este tipo para este token en las últimas 24 h (resuelta o no): no se repite en
    cada escaneo posterior al umbral."""
    n = (await db.execute(select(func.count(NfcAlert.id)).where(
        NfcAlert.token_id == token_id, NfcAlert.alert_type == alert_type, NfcAlert.created_at >= since
    ))).scalar() or 0
    return n > 0


logger = logging.getLogger("carlink.alerts")


def pause_reason(daily_count: int, unique_ips: int, *, max_ips: int, max_scans: int) -> str | None:
    """Decide si la actividad de un llavero en 24 h justifica pausarlo solo. Devuelve el motivo o None.
    Los umbrales son altos a propósito: la ficha pública está hecha para que la lean desconocidos
    (un comprador, un mecánico, quien encuentra el llavero), así que unas pocas conexiones distintas
    son normales. Diez o más conexiones distintas, o 200 lecturas en un día, ya parecen un llavero
    filtrado/clonado o a alguien rastreándolo."""
    if unique_ips >= max_ips:
        return f"{unique_ips} conexiones distintas en 24 h (umbral {max_ips})"
    if daily_count >= max_scans:
        return f"{daily_count} lecturas en 24 h (umbral {max_scans})"
    return None


async def auto_pause_token(token_id: UUID, reason: str) -> bool:
    """Pausa el llavero (is_active=False, status 'paused_security'), deja la alerta ya resuelta y avisa al
    admin (historial + correo) y al dueño (correo). Reversible: el dueño lo reactiva desde Mis llaveros.
    No pausa llaveros de la cuenta admin (demostraciones). Devuelve True si pausó.

    Corre en su PROPIA sesión y confirma al instante: la lectura que dispara la pausa termina enseguida con
    un error HTTP (la ficha ya no se muestra) y get_db revierte la transacción de la petición en cualquier
    excepción; si la pausa viviera en esa transacción, se deshacería (lo encontró qa_nfc_attack_sim.py)."""
    settings = get_settings()
    async with async_session_factory() as db:
        # FOR NO KEY UPDATE: lecturas simultáneas del mismo llavero no deben pausarlo (ni avisar) dos veces. Es
        # NO KEY a propósito: un FOR UPDATE normal choca con el FOR KEY SHARE que la petición que dispara la
        # pausa ya tiene sobre este llavero por el registro de lectura (FK) y se queda esperándola a ella misma.
        token = (await db.execute(select(NfcToken).where(NfcToken.id == token_id).with_for_update(key_share=True))).scalar_one_or_none()
        if not token or not token.is_active:
            return False
        if settings.admin_user_id and str(token.user_id) == settings.admin_user_id:
            return False
        owner = (await db.execute(select(Profile).where(Profile.id == token.user_id))).scalar_one_or_none()
        vehicle = (await db.execute(select(Vehicle).where(Vehicle.id == token.vehicle_id))).scalar_one_or_none()
        plate = vehicle.plate if vehicle else ""

        token.is_active = False
        token.status = "paused_security"
        now = datetime.now(timezone.utc)
        alert = NfcAlert(
            token_id=token.id, alert_type="auto_paused", severity="critical", resolved=True, resolved_at=now, seen_at=now,
            message=f"Pausado automáticamente: {reason}",
        )
        db.add(alert)
        await db.flush()
        await notify_admin(
            db, kind="nfc_alert", severity="critical", resolved=True,
            title=f"Llavero pausado automáticamente{f' ({plate})' if plate else ''}",
            body=f"{reason}\nDueño: {(owner.full_name if owner else '') or 'sin nombre'} · {owner.email if owner else 's/correo'}",
            ref=f"{token.id}:auto_paused", link=f"/admin?tab=alerts&alert={alert.id}", send_email=True,
        )
        await db.commit()
        owner_email, owner_name = (owner.email, owner.full_name or "") if owner else (None, "")
    if owner_email:
        try:
            await run_in_threadpool(email.send_token_paused_owner_email, owner_email, owner_name, plate)
        except Exception:
            logger.exception("owner paused-token email failed")
    return True


async def check_and_create_alerts(
    token_id: UUID,
    ip_address: str | None,
    db: AsyncSession,
) -> list[NfcAlert]:
    """Revisa el patrón de lecturas de un llavero. Si parece clonado/filtrado/rastreado lo pausa solo
    (auto_pause_token). Lo demás (algo inusual pero no concluyente) queda como alerta informativa en el
    historial: no avisa ni requiere acción."""
    settings = get_settings()
    alerts_created: list[NfcAlert] = []
    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(hours=24)

    # Ventana de análisis: las últimas 24 h, pero nunca antes de la última pausa automática. Si el dueño
    # reactiva el llavero, la actividad que ya causó la pausa no debe volver a pausarlo en la primera lectura.
    last_pause = (await db.execute(
        select(func.max(NfcAlert.created_at)).where(NfcAlert.token_id == token_id, NfcAlert.alert_type == "auto_paused")
    )).scalar()
    window_start = max(day_ago, last_pause) if last_pause else day_ago

    daily_count = (await db.execute(
        select(func.count(NfcAccessLog.id)).where(NfcAccessLog.token_id == token_id, NfcAccessLog.scanned_at >= window_start)
    )).scalar() or 0
    unique_ips = 0
    if ip_address:
        # Solo IPs de visitantes reales (ver utils.is_visitor_ip): las del proxy interno no cuentan.
        ips = (await db.execute(
            select(func.host(NfcAccessLog.ip_address)).where(
                NfcAccessLog.token_id == token_id, NfcAccessLog.scanned_at >= window_start
            ).distinct()
        )).scalars().all()
        unique_ips = sum(1 for i in ips if is_visitor_ip(i))

    if settings.nfc_auto_pause_enabled:
        reason = pause_reason(daily_count, unique_ips, max_ips=settings.nfc_auto_pause_ips, max_scans=settings.nfc_auto_pause_scans)
        if reason and await auto_pause_token(token_id, reason):
            return alerts_created

    # Inusual pero no concluyente: solo historial (severity info => no notifica).
    if daily_count > 50 and not await _already_alerted(db, token_id, "frequent_scans", day_ago):
        alerts_created.append(NfcAlert(
            token_id=token_id, alert_type="frequent_scans", severity="info",
            message=f"Token accessed {daily_count} times in the last 24h",
        ))
    if unique_ips > 3 and not await _already_alerted(db, token_id, "multiple_ips", day_ago):
        alerts_created.append(NfcAlert(
            token_id=token_id, alert_type="multiple_ips", severity="info",
            message=f"Token accessed from {unique_ips} different IPs in 24h",
        ))

    # Lectura nocturna (22:00-06:00 UTC), una por día y llavero.
    if now.hour >= 22 or now.hour < 6:
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        existing_night = (await db.execute(
            select(func.count(NfcAlert.id)).where(
                NfcAlert.token_id == token_id, NfcAlert.alert_type == "nighttime_access", NfcAlert.created_at >= today_start,
            )
        )).scalar() or 0
        if existing_night == 0:
            alerts_created.append(NfcAlert(
                token_id=token_id, alert_type="nighttime_access", severity="info",
                message=f"Token accessed at {now.strftime('%H:%M')} UTC (nighttime window)",
            ))

    if alerts_created:
        db.add_all(alerts_created)
        await db.flush()
        for a in alerts_created:
            await notify_nfc_alert(db, a)

    return alerts_created
