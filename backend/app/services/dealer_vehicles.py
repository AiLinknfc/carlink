"""Vehículos del aliado: reglas de certificación de kilometraje y etiquetas (docs/PLAN_ALIADOS_NEGOCIO.md, secciones 10 y 15).

Dos pesos distintos, a propósito (decisión 2026-10-16): un CONCESIONARIO verificado y habilitado "certifica"; una COMPRAVENTA
verificada y habilitada solo "declara", porque tiene conflicto de interés (un kilometraje bajo le conviene)."""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import OdometerReading, Vehicle
from app.services import workshop_access
from app.services.maintenance_rules import MAX_MILEAGE_JUMP

CERTIFY_MAX_ATTEMPTS = 3
CERTIFY_WINDOW = timedelta(hours=24)
DELIVERY_DAYS = 14
MAX_VEHICLES_PER_DEALER = 300

# El CDA certifica con el mayor peso: la lectura sale de una revisión técnico-mecánica regulada (Fase 3b).
KIND_FOR_BUSINESS = {"concesionario": "dealer", "compraventa": "dealer_declared", "cda": "cda"}
LABELS = {
    "cda": "Certificado por CDA",
    "dealer": "Certificado por concesionario",
    "dealer_declared": "Declarado por compraventa verificada",
    None: "Declarado por el vendedor",
}


def label(kind: str | None) -> str:
    return LABELS.get(kind, LABELS[None])


def normalize_plate(raw: str) -> str:
    plate = re.sub(r"[^A-Z0-9]", "", (raw or "").upper())
    if not 5 <= len(plate) <= 7:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="plate_invalid")
    return plate


def display_plate(plate: str) -> str:
    """ABC123 -> ABC-123: así se guardan las placas de los vehículos de las cuentas (formato del formulario de registro)."""
    return f"{plate[:3]}-{plate[3:]}" if len(plate) > 3 else plate


def plate_hint(plate: str) -> str:
    """ABC123 -> ABC•••: la ficha pública no muestra la placa completa."""
    return plate[:3] + "•" * max(len(plate) - 3, 0)


def certification_block(workshop) -> str | None:
    """None si el negocio puede certificar; si no, el motivo (se devuelve tal cual al panel)."""
    if workshop.business_kind not in KIND_FOR_BUSINESS:
        return "kind_not_allowed"
    if not workshop.is_verified:
        return "not_verified"
    if not workshop_access.is_active(workshop):
        return "access_expired"
    if not workshop.can_certify_odometer:
        return "not_enabled"
    return None


def register_attempt(dv, now: datetime | None = None) -> None:
    """Cuenta un intento de certificar. Máximo 3 por vehículo cada 24 h: sin este tope, probar valores distintos permitiría
    adivinar el kilometraje de la placa en otra cuenta (la comparación con el historial responde sí/no)."""
    now = now or datetime.now(timezone.utc)
    if dv.certify_window_start is None or now - dv.certify_window_start >= CERTIFY_WINDOW:
        dv.certify_window_start, dv.certify_attempts = now, 0
    if dv.certify_attempts >= CERTIFY_MAX_ATTEMPTS:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="certify_attempts_exceeded")
    dv.certify_attempts += 1


async def history_max_km(db: AsyncSession, plate: str) -> int:
    """Mayor kilometraje registrado en CarLink para esa placa (en cualquier cuenta). 0 si no hay historial."""
    return (await db.execute(
        select(func.coalesce(func.max(OdometerReading.mileage), 0))
        .join(Vehicle, Vehicle.id == OdometerReading.vehicle_id)
        # Las placas de las cuentas pueden estar guardadas con o sin guion: se comparan normalizadas.
        .where(func.regexp_replace(func.upper(Vehicle.plate), r"[^A-Z0-9]", "", "g") == plate)
    )).scalar() or 0


def check_against_history(km: int, history_max: int, previous_certified: int | None) -> None:
    """El kilometraje nunca baja y no salta de forma absurda. El mensaje NO revela cifras de otra cuenta."""
    floor = max(history_max, previous_certified or 0)
    if km < floor:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="km_below_history")
    if history_max and km > history_max + MAX_MILEAGE_JUMP:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="km_jump_too_large")
