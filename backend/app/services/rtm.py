"""Revisiones técnico-mecánicas (RTM) de un CDA (docs/PLAN_ALIADOS_NEGOCIO.md, sección 16).

Reglas de nivel alto: solo un CDA verificado, con acceso vigente y habilitado por el admin registra revisiones; el kilometraje se
compara con el historial de la placa en cualquier cuenta; tope de 3 intentos por placa cada 24 h; y NADA se escribe en la cuenta del
dueño del vehículo hasta que él acepta la constancia."""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException, status

from app.services.dealer_vehicles import CERTIFY_MAX_ATTEMPTS, CERTIFY_WINDOW

CLAIM_DAYS = 30
MAX_PAST_DAYS = 7          # una revisión se registra el mismo día o pocos días después
MAX_VALIDITY_DAYS = 2 * 366  # la RTM vigente dura 1 año (2 en el primer ciclo de algunos vehículos nuevos)

_CERT_RE = re.compile(r"^[A-Z0-9][A-Z0-9\-/.]{3,39}$")


def normalize_certificate(raw: str) -> str:
    code = (raw or "").strip().upper().replace(" ", "")
    if not _CERT_RE.match(code):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="certificate_invalid")
    return code


def validate_dates(inspected_on: date, expires_on: date, today: date | None = None) -> None:
    today = today or datetime.now(timezone.utc).date()
    # Un día de holgura hacia adelante: el servidor corre en UTC y el CDA en hora de Colombia.
    if inspected_on > today + timedelta(days=1) or inspected_on < today - timedelta(days=MAX_PAST_DAYS):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="rtm_dates_invalid")
    if expires_on <= inspected_on or (expires_on - inspected_on).days > MAX_VALIDITY_DAYS:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="rtm_dates_invalid")


def bump_attempt(row, now: datetime | None = None) -> None:
    """Cuenta un intento de la fila (workshop_id, plate). Máximo 3 cada 24 h, cuenten o no como válidos."""
    now = now or datetime.now(timezone.utc)
    if row.window_start is None or now - row.window_start >= CERTIFY_WINDOW:
        row.window_start, row.attempts = now, 0
    if row.attempts >= CERTIFY_MAX_ATTEMPTS:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="certify_attempts_exceeded")
    row.attempts += 1


def days_left(expires_on: date, today: date | None = None) -> int:
    return (expires_on - (today or datetime.now(timezone.utc).date())).days
