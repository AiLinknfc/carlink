"""Reglas que protegen el historial de servicios de un vehículo.

Antes de esto el servidor aceptaba cualquier fecha, kilometraje y costo que mandara el cliente:
las comprobaciones de kilometraje vivían solo en el navegador, así que un POST directo las saltaba.
Son funciones puras (sin DB) para poder probarlas una por una; el router les pasa el historial.
"""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Iterable

# Cuánto atrás puede declarar un usuario la fecha de un servicio. Más allá de esto no es un
# registro del día: sería cargar historial viejo, que no se mezcla con el registro normal.
MAX_BACKDATE_DAYS = 30
# Margen hacia adelante por zona horaria (el servidor corre en UTC, el usuario en UTC-5 u otra).
FUTURE_TOLERANCE_DAYS = 1
# Mismo tope que ya usa el formulario sobre el último kilometraje registrado.
MAX_MILEAGE_JUMP = 100_000
MAX_MILEAGE = 3_000_000
MAX_COST = Decimal("1000000000")


class RuleError(ValueError):
    """Una regla de integridad del historial no se cumple; el mensaje va al usuario."""


def resolve_service_date(raw: str | date | None, today: date, current: date | None = None) -> date:
    """Fecha efectiva del servicio. Sin fecha: la del registro existente (edición) o hoy (alta).
    En una edición, dejar la fecha como estaba siempre es válido aunque ya sea vieja."""
    if raw is None or raw == "":
        return current or today
    if isinstance(raw, date):
        d = raw
    else:
        try:
            d = date.fromisoformat(raw)
        except ValueError:
            raise RuleError("La fecha del servicio no es válida.")
    if d > today + timedelta(days=FUTURE_TOLERANCE_DAYS):
        raise RuleError("La fecha del servicio no puede ser futura.")
    if d < today - timedelta(days=MAX_BACKDATE_DAYS) and d != current:
        raise RuleError(
            f"La fecha del servicio no puede ser anterior a {MAX_BACKDATE_DAYS} días. "
            "Registra los servicios cuando ocurren."
        )
    return d


def check_mileage(
    mileage: int,
    service_date: date,
    history: Iterable[tuple[date, int]],
    readings: Iterable[tuple[date, int]] = (),
) -> None:
    """El kilometraje nunca baja con el tiempo. `history` son los (fecha, km) de los demás
    registros del vehículo. Los de la misma fecha no se comparan entre sí: el orden dentro del
    día no se sabe, así que solo cuentan para el tope de salto.

    `readings` son las lecturas de odómetro (fecha en que el servidor las recibió, km). A
    diferencia de un servicio, una lectura tiene hora exacta: una del mismo día cuenta como
    anterior, y también una del día siguiente (el servidor corre en UTC y el usuario no)."""
    if mileage < 0 or mileage > MAX_MILEAGE:
        raise RuleError("El kilometraje no es válido.")
    history = list(history)
    readings = list(readings)
    if not history and not readings:
        return
    slack = service_date + timedelta(days=FUTURE_TOLERANCE_DAYS)
    earlier = [m for d, m in history if d < service_date] + [m for d, m in readings if d <= slack]
    later = [m for d, m in history if d > service_date] + [m for d, m in readings if d > slack]
    if earlier and mileage < max(earlier):
        raise RuleError(
            f"El kilometraje ({mileage:,} km) es menor al de un registro anterior "
            f"({max(earlier):,} km). Verifica el valor."
        )
    if later and mileage > min(later):
        raise RuleError(
            f"El kilometraje ({mileage:,} km) es mayor al de un registro posterior "
            f"({min(later):,} km). Verifica el valor."
        )
    top = max([m for _, m in history] + [m for _, m in readings])
    if mileage > top + MAX_MILEAGE_JUMP:
        raise RuleError(
            f"El kilometraje ({mileage:,} km) es muy alto comparado con el último registrado "
            f"({top:,} km). Verifica que no haya error de digitación."
        )


# Cuánto más allá del kilometraje actual puede quedar el próximo servicio (el filtro de partículas
# dura 100.000 km; nada razonable pasa de ahí).
MAX_NEXT_SERVICE_GAP = 150_000


def check_next_service(mileage: int, next_service: int | None) -> None:
    """El próximo servicio es futuro: tiene que ser mayor al kilometraje actual. Un registro con el
    mismo valor en los dos campos (error de digitación real, 2026-10-05) dejaba un intervalo de cero
    y rompía la vida útil del aceite en el tablero."""
    if next_service is None:
        return
    if next_service <= mileage:
        raise RuleError("El próximo servicio (km) debe ser mayor al kilometraje actual.")
    if next_service > mileage + MAX_NEXT_SERVICE_GAP:
        raise RuleError("El próximo servicio (km) es demasiado lejano. Verifica el valor.")


def check_oil_used(service_type: str, brand: str | None, viscosity: str | None) -> None:
    """Un cambio de aceite exige decir qué aceite se usó (marca y viscosidad): de eso depende la
    predicción de su vida útil."""
    if service_type == "Aceite" and (not (brand or "").strip() or not (viscosity or "").strip()):
        raise RuleError("Indica el aceite utilizado: marca y viscosidad son obligatorias en un cambio de aceite.")


def check_cost(cost: Decimal | None) -> None:
    if cost is None:
        return
    if cost < 0 or cost > MAX_COST:
        raise RuleError("El costo no es válido.")


# Historial anterior (carga de servicios hechos antes de unirse a CarLink).
PRIOR_EDIT_WINDOW_HOURS = 48
MAX_PRIOR_YEARS = 30


def resolve_prior_date(raw: str | date | None, joined: date, model_year: int | None = None) -> date:
    """Fecha de un servicio anterior: obligatoria, estrictamente anterior al alta del vehículo en
    CarLink (si no, serviría para rellenar historial reciente sin las reglas normales) y no
    absurda (ni más de 30 años atrás ni antes del año modelo)."""
    if raw is None or raw == "":
        raise RuleError("La fecha del servicio es obligatoria.")
    if isinstance(raw, date):
        d = raw
    else:
        try:
            d = date.fromisoformat(raw)
        except ValueError:
            raise RuleError("La fecha del servicio no es válida.")
    if d >= joined:
        raise RuleError(
            "El historial anterior debe ser de antes de registrar el vehículo en CarLink. "
            "Los servicios recientes se registran como un servicio normal."
        )
    if d < joined - timedelta(days=365 * MAX_PRIOR_YEARS):
        raise RuleError("La fecha del servicio es demasiado antigua.")
    if model_year and model_year > 1900 and d < date(model_year - 1, 1, 1):
        raise RuleError("La fecha del servicio es anterior al año del vehículo.")
    return d


def check_support_url(url: str, user_id: str) -> None:
    """El soporte tiene que ser un archivo que ESTE usuario subió por /api/upload (su carpeta es
    su id). Sin esto cualquiera podía mandar una URL ajena o inventada como "soporte"."""
    prefix = f"/api/upload/files/{user_id}/"
    if not url.startswith(prefix) or len(url) <= len(prefix) or "/" in url[len(prefix):] or ".." in url:
        raise RuleError("El soporte no es válido: sube una foto o PDF del comprobante.")
