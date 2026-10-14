"""Vínculo taller-conductor por QR (docs/PLAN_VINCULO_TALLER_CONDUCTOR.md).

Funciones puras y de apoyo, sin rutas. Reglas del diseño:
- El vínculo lo inicia SIEMPRE el conductor, que decide qué comparte. El taller nunca vincula a nadie solo.
- Vínculo y procedencia son cosas distintas: un vínculo NO crea historial verificado.
- Los enlaces de reclamo son de un solo uso, caducan y se guardan con hash (nunca el token en claro).
"""
from __future__ import annotations

import hashlib
import re
import secrets
import unicodedata
from datetime import datetime, timedelta, timezone

from sqlalchemy import Text, column, table
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from app.config import get_settings

CLAIM_TTL_DAYS = 7
MAX_LINKS_PER_USER = 20

# `maintenance_records.claimed_workshop_id` (migración 074) no está en el modelo ORM a propósito: ver models.py.
maintenance_claims = table(
    "maintenance_records",
    column("id", PG_UUID(as_uuid=True)),
    column("vehicle_id", PG_UUID(as_uuid=True)),
    column("workshop", Text),
    column("claimed_workshop_id", PG_UUID(as_uuid=True)),
)


def links_enabled() -> bool:
    return get_settings().workshop_links_enabled


def new_claim_token() -> tuple[str, str, datetime]:
    """(token en claro, hash, caducidad). El token en claro solo se muestra una vez al taller."""
    raw = secrets.token_urlsafe(32)
    return raw, hash_token(raw), datetime.now(timezone.utc) + timedelta(days=CLAIM_TTL_DAYS)


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def normalize_plate(plate: str | None) -> str:
    return re.sub(r"[^A-Z0-9]", "", (plate or "").upper())


def mask_plate(plate: str | None) -> str:
    """ABC123 -> AB***3: suficiente para que el cliente reconozca su vehículo sin publicar la placa entera."""
    p = normalize_plate(plate)
    return p if len(p) <= 3 else f"{p[:2]}{'*' * (len(p) - 3)}{p[-1]}"


_STOP = {"taller", "talleres", "servicio", "servicios", "sas", "ltda", "sa", "cia", "s", "a", "de", "la", "el", "y", "e"}


def normalize_name(name: str | None) -> str:
    """Sin tildes, mayúsculas ni puntuación, y sin palabras genéricas ('Taller', 'S.A.S.'): 'Taller Aceitosos S.A.S.' -> 'aceitosos'."""
    text = unicodedata.normalize("NFD", (name or "").lower())
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    words = [w for w in re.sub(r"[^a-z0-9 ]", " ", text).split() if w not in _STOP]
    return " ".join(words)


def names_match(typed: str | None, registered: str | None) -> bool:
    """Sugerencia, no prueba: igualdad normalizada, o uno contenido en el otro si el corto tiene 5+ letras."""
    a, b = normalize_name(typed), normalize_name(registered)
    if not a or not b:
        return False
    if a == b:
        return True
    short, long_ = sorted((a, b), key=len)
    return len(short) >= 5 and short in long_


def city_compatible(a: str | None, b: str | None) -> bool:
    """Ciudad igual (normalizada) o desconocida en alguno de los dos lados."""
    na, nb = normalize_name(a).replace(" ", ""), normalize_name(b).replace(" ", "")
    return not na or not nb or na == nb
