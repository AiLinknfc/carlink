"""Quién NO cuenta en las métricas: el administrador y las cuentas de prueba.

Las cuentas de prueba usan el dominio `@carlink.internal` (scripts/qa_test_account.py). Los eventos
de esas cuentas y del admin se siguen guardando —sirven para reconocer su navegador— pero las
consultas del panel los dejan fuera, incluidas las visitas anónimas (sin sesión) hechas desde un
navegador en el que alguna vez iniciaron sesión (se cruzan por `anon_id`).
"""
from __future__ import annotations

import uuid

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.models import AnalyticsEvent, Profile

INTERNAL_EMAIL_DOMAIN = "@carlink.internal"


def is_internal_email(email: str | None) -> bool:
    return bool(email) and email.strip().lower().endswith(INTERNAL_EMAIL_DOMAIN)


async def excluded_user_ids(db: AsyncSession) -> list[uuid.UUID]:
    """Admin + cuentas de prueba."""
    ids: set[uuid.UUID] = set()
    admin = get_settings().admin_user_id
    if admin:
        try:
            ids.add(uuid.UUID(admin))
        except ValueError:
            pass
    rows = await db.execute(select(Profile.id).where(Profile.email.ilike(f"%{INTERNAL_EMAIL_DOMAIN}")))
    ids.update(r[0] for r in rows.all())
    return list(ids)


def event_scope(excluded: list[uuid.UUID]):
    """Condición SQL para analytics_events: sin eventos de usuarios excluidos ni de los navegadores
    (anon_id) desde los que alguno de ellos navegó. Sin excluidos no filtra nada."""
    if not excluded:
        return and_()
    their_browsers = select(AnalyticsEvent.anon_id).where(AnalyticsEvent.user_id.in_(excluded))
    return and_(
        or_(AnalyticsEvent.user_id.is_(None), AnalyticsEvent.user_id.notin_(excluded)),
        AnalyticsEvent.anon_id.notin_(their_browsers),
    )
