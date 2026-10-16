"""Periodo de acceso de un negocio (docs/PLAN_ALIADOS_NEGOCIO.md, sección 11).

Un negocio tiene un plan (`access_plan`) y un fin de acceso (`access_until`). Al vencer pasa a modo RESTRINGIDO de
solo lectura (se puede consultar y exportar; no crear ni editar): nunca se borra ni se expulsa."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.services.nfc_provisioning import TRIAL_DAYS

PLAN_TRIAL, PLAN_FOUNDER, PLAN_SUBSCRIPTION, PLAN_CONVENIO = "trial", "founder", "subscription", "convenio"
GRANT_PLANS = {PLAN_FOUNDER, PLAN_CONVENIO}


def effective_until(workshop) -> datetime | None:
    """Fin del acceso, o None si no vence (convenio). Sin fecha en otro plan: granted_at + 7 días, nunca un bloqueo de golpe."""
    if workshop.access_plan == PLAN_CONVENIO:
        return None
    if workshop.access_until is not None:
        return workshop.access_until
    granted = workshop.access_granted_at or workshop.created_at
    return granted + timedelta(days=TRIAL_DAYS)


def is_active(workshop, now: datetime | None = None) -> bool:
    until = effective_until(workshop)
    return until is None or until > (now or datetime.now(timezone.utc))


def grant(workshop, plan: str, days: int, now: datetime | None = None) -> None:
    now = now or datetime.now(timezone.utc)
    workshop.access_plan = plan
    workshop.access_granted_at = now
    workshop.access_until = None if plan == PLAN_CONVENIO else now + timedelta(days=days)


def subscription_fields(workshop, now: datetime | None = None) -> dict:
    """Los tres campos que el frontend ya sabe leer (`subscription_status`, `subscription_plan`, `trial_ends_at`).
    'trial' = acceso gratuito con vencimiento (muestra los días que quedan); 'active' = pago o convenio; 'expired' = restringido."""
    until = effective_until(workshop)
    if not is_active(workshop, now):
        status = "expired"
    elif workshop.access_plan in (PLAN_SUBSCRIPTION, PLAN_CONVENIO):
        status = "active"
    else:
        status = "trial"
    return {"subscription_status": status, "subscription_plan": workshop.access_plan, "trial_ends_at": until}
