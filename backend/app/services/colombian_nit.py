from __future__ import annotations

import re

# Algoritmo público del dígito de verificación de NIT (DIAN, Colombia).
# Pesos aplicados de derecha a izquierda sobre el número base (sin el
# dígito de verificación), hasta 15 dígitos.
_NIT_WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]

_NIT_PATTERN = re.compile(r"^(\d{6,15})-(\d)$")


def _check_digit(base: str) -> int:
    total = sum(int(d) * w for d, w in zip(reversed(base), _NIT_WEIGHTS))
    mod = total % 11
    return mod if mod in (0, 1) else 11 - mod


def is_valid_colombian_nit(raw: str) -> bool:
    """Exige el formato con dígito de verificación tal como aparece impreso
    en el RUT del negocio (ej. 900123456-7) y confirma que ese dígito sea
    matemáticamente correcto para el número base — no solo que "parezca" un
    NIT. Contexto: docs/PENDIENTES.md, "El trial de taller es la mayor
    grieta real del modelo cerrado" — hoy cualquier string único pasaba como
    legal_id, sin ninguna fricción real para crear cuentas taller desechables
    (cada una con acceso al trial gratuito de 7 días). Esto no elimina el
    abuso (alguien decidido puede calcular NITs válidos), pero sí filtra el
    caso trivial de "escribir cualquier cosa única". Solo se aplica al
    registrar un taller nuevo — nunca revalida NITs ya guardados."""
    cleaned = raw.strip().upper().replace(" ", "").replace(".", "")
    match = _NIT_PATTERN.match(cleaned)
    if not match:
        return False
    base, check = match.group(1), int(match.group(2))
    return _check_digit(base) == check
