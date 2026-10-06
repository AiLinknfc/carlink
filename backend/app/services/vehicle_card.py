"""Datos de la tarjeta de propiedad (licencia de tránsito) y su validación.

Todos los campos son obligatorios para enviar el vehículo a revisión: una tarjeta real los trae
todos y, entre sí, deben ser coherentes (VIN de 17 caracteres, fecha de matrícula posterior al año
modelo, etc.). Se pueden guardar parcialmente mientras el usuario completa; la validación estricta
corre al pedir la revisión (routers/vehicles.py). Funciones puras, sin DB.
"""
from __future__ import annotations

import json
import re
from datetime import date, datetime
from typing import Any

from app.services.crypto import FIELD_PREFIX, decrypt_field, encrypt_field, hmac_digest

# Campos que viven en vehicles.card_data (los demás de la tarjeta tienen columna propia).
CARD_FIELDS = (
    "license_number", "owner_document", "vin", "engine_number", "chassis_number",
    "cilindraje", "service", "capacity", "doors", "registration_date",
    # Capturado tal cual lo leyó el OCR ("AUTOMOVIL", "CAMPERO"…): no se valida ni se exige, pero se
    # guarda para la verificación posterior (al transferir). `body_type` es su versión normalizada.
    "vehicle_class",
)

LABELS = {
    "plate": "Placa", "city": "Organismo de tránsito (ciudad)", "brand": "Marca", "model": "Línea / modelo",
    "year": "Año modelo", "color": "Color", "body_type": "Clase de vehículo", "fuel_type": "Combustible",
    "owner_name": "Propietario", "license_number": "Número de licencia de tránsito",
    "owner_document": "Documento del propietario", "vin": "VIN / serie", "engine_number": "Número de motor",
    "chassis_number": "Número de chasis", "cilindraje": "Cilindraje (cc)", "service": "Servicio",
    "capacity": "Capacidad", "doors": "Puertas", "registration_date": "Fecha de matrícula",
}

SERVICES = ("particular", "publico", "oficial", "diplomatico", "especial")

_VIN = re.compile(r"^[A-HJ-NPR-Z0-9]{17}$")
_VIN_MOTO = re.compile(r"^[A-Z0-9]{5,25}$")
_ENGINE = re.compile(r"^[A-Z0-9\-]{4,30}$")
_CHASSIS = re.compile(r"^[A-Z0-9\-]{5,30}$")


def _s(v: Any) -> str:
    return "" if v is None else str(v).strip()


def _normalize_service(raw: str) -> str:
    t = raw.lower()
    for key, canon in (("partic", "particular"), ("public", "publico"), ("públic", "publico"),
                       ("oficial", "oficial"), ("diplom", "diplomatico"), ("especial", "especial")):
        if key in t:
            return canon
    return raw


def _normalize_date(raw: str) -> str:
    raw = raw.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y"):
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            continue
    return raw


def normalize_card_data(raw: dict | None) -> dict[str, str]:
    """Solo claves conocidas, con formato canónico cuando se puede (ids en mayúsculas, números sin
    separadores, servicio y fecha normalizados). Lo que no se pueda interpretar se conserva tal
    cual para que la validación lo señale en vez de perderlo."""
    out: dict[str, str] = {}
    for key in CARD_FIELDS:
        v = _s((raw or {}).get(key))
        # Un valor enmascarado ("•••456") o ya cifrado es lo que el servidor devolvió: no es dato nuevo.
        if not v or "•" in v or v.startswith(FIELD_PREFIX):
            continue
        if key in ("vin", "engine_number", "chassis_number"):
            v = re.sub(r"[\s]", "", v).upper()
        elif key in ("license_number", "owner_document"):
            v = re.sub(r"\D", "", v) or v
        elif key in ("cilindraje", "capacity", "doors"):
            m = re.search(r"\d+", v.replace(".", "").replace(",", ""))
            v = m.group(0) if m else v
        elif key == "service":
            v = _normalize_service(v)
        elif key == "registration_date":
            v = _normalize_date(v)
        out[key] = v
    return out


def seal_card_data(incoming: dict[str, str], existing: dict | None = None) -> dict[str, str]:
    """Aplica `incoming` sobre `existing` y cifra el documento del propietario. Lanza
    EncryptionUnavailable si hay que cifrar y no hay clave (falla cerrado)."""
    merged: dict[str, str] = {**(existing or {}), **incoming}
    doc = merged.get("owner_document")
    if doc and not doc.startswith(FIELD_PREFIX):
        merged["owner_document"] = encrypt_field(doc)
    return merged


def open_card_data(card: dict | None) -> dict[str, str]:
    """card_data con el documento descifrado; si no se puede descifrar queda fuera (cuenta como
    faltante, no como un valor inválido)."""
    out = {k: v for k, v in (card or {}).items() if k != "owner_document"}
    doc = (card or {}).get("owner_document")
    if doc:
        plain = decrypt_field(doc) if doc.startswith(FIELD_PREFIX) else doc
        if plain:
            out["owner_document"] = plain
    return out


def mask_card_data(card: dict | None) -> dict[str, str]:
    """Versión para el cliente: el documento se enmascara (solo los últimos 3 dígitos). Idempotente."""
    out = dict(card or {})
    doc = out.get("owner_document")
    if doc and "•" not in doc:
        plain = decrypt_field(doc) if doc.startswith(FIELD_PREFIX) else doc
        out["owner_document"] = ("•••••" + plain[-3:]) if plain else "•••••"
    return out


def required_fields(vehicle: Any) -> list[str]:
    """Campos que el dueño tiene que revisar y confirmar a mano (todos los de la tarjeta)."""
    fields = ["plate", "city", "brand", "model", "year", "color", "body_type", "fuel_type", "owner_name",
              "license_number", "owner_document", "vin", "engine_number", "chassis_number",
              "cilindraje", "service", "capacity"]
    if not _is_moto(vehicle):
        fields.append("doors")
    fields.append("registration_date")
    return fields


def card_digest(vehicle: Any) -> str:
    """Huella de los datos de la tarjeta tal como están ahora. Cambia si se edita cualquier campo."""
    card = open_card_data(getattr(vehicle, "card_data", None))
    values = {}
    for f in required_fields(vehicle):
        values[f] = str(card[f] if f in card else getattr(vehicle, f, "") or "")
    return hmac_digest(json.dumps(values, sort_keys=True, ensure_ascii=False))


def _is_moto(vehicle: Any) -> bool:
    return _s(getattr(vehicle, "body_type", "")).lower() == "moto" or _s(getattr(vehicle, "type", "")).lower() == "moto"


def validate_card(vehicle: Any, today: date | None = None) -> dict[str, str]:
    """Errores por campo (clave = nombre del campo, valor = mensaje). Vacío = tarjeta completa y
    coherente. `vehicle` es el modelo Vehicle (con `card_data` ya normalizado)."""
    today = today or date.today()
    card: dict[str, str] = open_card_data(getattr(vehicle, "card_data", None))
    errors: dict[str, str] = {}
    moto = _is_moto(vehicle)

    def need(field: str, value: Any, ok: bool, msg: str) -> None:
        if _s(value) == "" or _s(value) == "0" and field == "year":
            errors[field] = f"{LABELS[field]}: falta este dato."
        elif not ok:
            errors[field] = f"{LABELS[field]}: {msg}"

    plate = _s(getattr(vehicle, "plate", ""))
    need("plate", plate, bool(plate), "no es válida.")
    # La línea puede ser de un solo carácter (Mazda "3", Renault "9"): basta con que no esté vacía.
    for f, min_len in (("city", 2), ("brand", 2), ("model", 1), ("color", 2), ("body_type", 2)):
        v = getattr(vehicle, f, "")
        need(f, v, len(_s(v)) >= min_len, "es muy corto.")
    year = getattr(vehicle, "year", 0) or 0
    need("year", year, 1950 <= int(year) <= today.year + 1, "no es un año modelo válido.")
    fuel = _s(getattr(vehicle, "fuel_type", ""))
    need("fuel_type", fuel, fuel in {"gasolina", "diesel", "gas", "hibrido", "electrico"}, "no es válido.")
    owner = _s(getattr(vehicle, "owner_name", ""))
    need("owner_name", owner, len(owner) >= 5 and " " in owner, "escribe el nombre completo tal como figura en la tarjeta.")

    need("license_number", card.get("license_number"), bool(re.fullmatch(r"\d{6,20}", _s(card.get("license_number")))), "debe tener entre 6 y 20 dígitos.")
    need("owner_document", card.get("owner_document"), bool(re.fullmatch(r"\d{5,15}", _s(card.get("owner_document")))), "debe tener entre 5 y 15 dígitos.")
    vin = _s(card.get("vin"))
    need("vin", vin, bool((_VIN_MOTO if moto else _VIN).match(vin)),
         "debe tener entre 5 y 25 caracteres (letras y números)." if moto else "debe tener 17 caracteres (letras y números, sin I, O ni Q).")
    need("engine_number", card.get("engine_number"), bool(_ENGINE.match(_s(card.get("engine_number")))), "debe tener entre 4 y 30 caracteres (letras, números o guion).")
    need("chassis_number", card.get("chassis_number"), bool(_CHASSIS.match(_s(card.get("chassis_number")))), "debe tener entre 5 y 30 caracteres (letras, números o guion).")

    cc = _s(card.get("cilindraje"))
    cc_ok = cc.isdigit() and (int(cc) == 0 if fuel == "electrico" else 50 <= int(cc) <= 20000)
    need("cilindraje", cc, cc_ok, "debe estar entre 50 y 20.000 cc (0 solo en eléctricos).")
    need("service", card.get("service"), _s(card.get("service")) in SERVICES, "debe ser particular, público, oficial, diplomático o especial.")
    cap = _s(card.get("capacity"))
    need("capacity", cap, cap.isdigit() and 1 <= int(cap) <= 60000, "debe ser un número entre 1 y 60.000.")
    if not moto:  # una moto no tiene puertas
        doors = _s(card.get("doors"))
        need("doors", doors, doors.isdigit() and 1 <= int(doors) <= 6, "debe estar entre 1 y 6.")

    reg = _s(card.get("registration_date"))
    reg_ok = False
    if reg:
        try:
            d = date.fromisoformat(reg)
            reg_ok = date(1950, 1, 1) <= d <= today and (not year or d >= date(int(year) - 1, 1, 1))
        except ValueError:
            reg_ok = False
    need("registration_date", reg, reg_ok, "no es válida (ni futura, ni anterior al año modelo).")
    return errors
