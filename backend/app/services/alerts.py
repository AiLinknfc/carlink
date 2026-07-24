from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import NfcAccessLog, NfcAlert, NfcToken


async def check_and_create_alerts(
    token_id: UUID,
    ip_address: str | None,
    db: AsyncSession,
) -> list[NfcAlert]:
    """Check access patterns and create alerts if thresholds are exceeded."""
    alerts_created = []
    now = datetime.now(timezone.utc)

    # 1. Frequent scans: >50 in last 24h
    day_ago = now - timedelta(hours=24)
    count_result = await db.execute(
        select(func.count(NfcAccessLog.id)).where(
            NfcAccessLog.token_id == token_id,
            NfcAccessLog.scanned_at >= day_ago,
        )
    )
    daily_count = count_result.scalar() or 0
    if daily_count > 50:
        alert = NfcAlert(
            token_id=token_id,
            alert_type="frequent_scans",
            severity="warning",
            message=f"Token accessed {daily_count} times in the last 24h",
        )
        db.add(alert)
        alerts_created.append(alert)

    # 2. Multiple IPs: >3 unique IPs in 24h
    if ip_address:
        ips_result = await db.execute(
            select(func.count(func.distinct(NfcAccessLog.ip_address))).where(
                NfcAccessLog.token_id == token_id,
                NfcAccessLog.scanned_at >= day_ago,
            )
        )
        unique_ips = ips_result.scalar() or 0
        if unique_ips > 3:
            alert = NfcAlert(
                token_id=token_id,
                alert_type="multiple_ips",
                severity="critical",
                message=f"Token accessed from {unique_ips} different IPs in 24h",
            )
            db.add(alert)
            alerts_created.append(alert)

    # 3. Nighttime access: between 22:00 and 06:00 UTC
    hour = now.hour
    if hour >= 22 or hour < 6:
        # Check if this is a new nighttime access (not already alerted today)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        existing_night = await db.execute(
            select(func.count(NfcAlert.id)).where(
                NfcAlert.token_id == token_id,
                NfcAlert.alert_type == "nighttime_access",
                NfcAlert.created_at >= today_start,
            )
        )
        if (existing_night.scalar() or 0) == 0:
            alert = NfcAlert(
                token_id=token_id,
                alert_type="nighttime_access",
                severity="info",
                message=f"Token accessed at {now.strftime('%H:%M')} UTC (nighttime window)",
            )
            db.add(alert)
            alerts_created.append(alert)

    if alerts_created:
        await db.flush()

    return alerts_created
