from __future__ import annotations

import phonenumbers
from email_validator import EmailNotValidError, validate_email

# Región usada cuando el contacto NO trae indicativo explícito (sin "+" ni
# "00" adelante) — Colombia es el mercado del negocio. Si la persona sí
# escribe su propio indicativo (+57, +1, +34, etc.), phonenumbers lo respeta
# y valida contra ESE país, no contra este default — este es solo el
# fallback quie evita que "3001234567" (sin indicativo, forma en la que la
# mayoría de la gente escribe su propio celular) se rechace por no tener "+".
_DEFAULT_PHONE_REGION = "CO"


def classify_contact(raw: str) -> tuple[str, str] | None:
    """Determina si `raw` es un correo o un celular válido y lo normaliza.

    Devuelve `(tipo, valor_normalizado)` — tipo es "email" o "phone" — o
    `None` si no es ninguno de los dos. Reemplaza el regex laxo que había
    antes (`^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$`, aceptaba casi cualquier cosa con
    un "@" y un punto) — motivado por docs/PENDIENTES.md: la info de
    waitlist_leads se usa para campañas de marketing/seguimiento, así que un
    contacto mal formado ahí no es solo un typo del usuario, es un lead
    inutilizable. La normalización (email en minúsculas sin espacios, celular
    a formato E.164 "+57...") también evita que la misma persona quede
    duplicada en dos formatos distintos (ej. "3001234567" vs
    "+57 300 123 4567") si vuelve a dejar el contacto en otro formulario.

    email-validator y phonenumbers son las mismas librerías (o el mismo
    dataset base, en el caso de phonenumbers — puerto de libphonenumber de
    Google) que corresponde usar para esto en vez de regexes caseros; un
    regex no puede saber que "3001234567" es un celular colombiano válido
    pero "3001234" no, o que ".user@@dominio" no es un correo real."""
    value = raw.strip()
    if not value:
        return None

    try:
        result = validate_email(value, check_deliverability=False)
        return "email", result.normalized
    except EmailNotValidError:
        pass

    try:
        parsed = phonenumbers.parse(value, _DEFAULT_PHONE_REGION)
    except phonenumbers.NumberParseException:
        return None
    if not phonenumbers.is_valid_number(parsed):
        return None
    return "phone", phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
