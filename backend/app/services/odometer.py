"""Lecturas de odómetro (migración 069): consultas y reglas del recordatorio.

La tabla es de solo agregar: una lectura es lo que el vehículo marcaba cuando el servidor la
recibió. El kilometraje actual deja de depender del último servicio y se puede detectar una
lectura que baja o que salta de forma absurda (ver maintenance_rules.check_mileage).
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import OdometerReading

# Cuántos días sin ninguna lectura ni servicio antes de sugerir una lectura periódica.
REMINDER_AFTER_DAYS = 90
# La lectura inicial se puede corregir (reemplazar) este tiempo, y solo mientras sea la única:
# un error de tipeo en el primer valor, si no, bloquearía todo servicio posterior.
INITIAL_CORRECTION_HOURS = 48


async def list_readings(db: AsyncSession, vehicle_id: UUID, exclude_record_id: UUID | None = None) -> list[OdometerReading]:
    rows = (
        await db.execute(
            select(OdometerReading)
            .where(OdometerReading.vehicle_id == vehicle_id)
            .order_by(OdometerReading.recorded_at.desc())
        )
    ).scalars().all()
    return [r for r in rows if exclude_record_id is None or r.maintenance_record_id != exclude_record_id]


def as_history(readings: list[OdometerReading]) -> list[tuple[date, int]]:
    return [(r.recorded_at.date(), r.mileage) for r in readings]


def reminder_state(readings: list[OdometerReading], now: datetime) -> str:
    """'initial' si el vehículo no tiene ninguna lectura, 'periodic' si la última tiene más de
    REMINDER_AFTER_DAYS días, 'ok' en otro caso. Los servicios generan lectura, así que "meses
    sin servicio" y "meses sin lectura" son lo mismo."""
    if not readings:
        return "initial"
    latest = max(r.recorded_at for r in readings)
    return "periodic" if now - latest >= timedelta(days=REMINDER_AFTER_DAYS) else "ok"


def can_correct_initial(readings: list[OdometerReading], now: datetime) -> OdometerReading | None:
    """La lectura inicial a reemplazar, si sigue siendo la única y está dentro de la ventana."""
    if len(readings) != 1 or readings[0].source != "initial":
        return None
    age = now - readings[0].recorded_at
    return readings[0] if age <= timedelta(hours=INITIAL_CORRECTION_HOURS) else None


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
