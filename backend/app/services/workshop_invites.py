"""Invitación de registro que se envía al aprobar una postulación (docs/PLAN_ALIADOS_NEGOCIO.md, Fase 0).

El token crudo viaja solo en el correo; en la base queda su hash SHA-256 (mismo criterio que los llaveros NFC).
Une la aprobación manual del admin con el alta real de la cuenta: el registro con invitación exige que el NIT
coincida con el de la postulación aprobada, y la invitación se gasta una sola vez."""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

INVITE_DAYS = 14


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def issue(application, now: datetime | None = None) -> str:
    """Genera una invitación nueva (reemplaza la anterior) y devuelve el token crudo para el correo."""
    now = now or datetime.now(timezone.utc)
    raw = secrets.token_urlsafe(32)
    application.invite_token_hash = hash_token(raw)
    application.invite_expires_at = now + timedelta(days=INVITE_DAYS)
    application.invite_used_at = None
    application.invite_used_by = None
    return raw


def state(application, now: datetime | None = None) -> str:
    """'none' | 'valid' | 'expired' | 'used' — para validar el registro y para el panel del admin."""
    now = now or datetime.now(timezone.utc)
    if not application.invite_token_hash:
        return "none"
    if application.invite_used_at is not None:
        return "used"
    if application.invite_expires_at is None or application.invite_expires_at <= now:
        return "expired"
    return "valid"
