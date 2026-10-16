"""Verificación automática de una empresa por NIT contra el RUES (docs/PLAN_ALIADOS_NEGOCIO.md, sección 17).

Fuente: dataset abierto de Confecámaras "Personas Naturales, Personas Jurídicas y ESAL" (RUES) publicado en datos.gov.co, licencia
CC BY-SA 4.0. Sin clave ni costo. Es una AYUDA para el admin: la aprobación sigue siendo manual y este resultado nunca aprueba ni
rechaza solo. Un NIT es un dato público de una empresa; de CarLink sale únicamente el NIT (nunca datos de personas)."""
from __future__ import annotations

import logging
import re
import unicodedata
from datetime import date, datetime, timezone

import httpx

from app.config import get_settings

logger = logging.getLogger("carlink")

SOCRATA_URL = "https://www.datos.gov.co/resource/c82u-588k.json"
SOURCE = "RUES (Confecámaras) · datos.gov.co · CC BY-SA 4.0"
_FIELDS = ("razon_social,nit,digito_verificacion,numero_identificacion,estado_matricula,organizacion_juridica,categoria_matricula,"
           "camara_comercio,cod_ciiu_act_econ_pri,ultimo_ano_renovado,fecha_renovacion,fecha_cancelacion,matricula")

# Orientativo: prefijos del CIIU principal que se esperan según el tipo de negocio (45 = comercio y reparación de vehículos).
EXPECTED_CIIU = {
    "taller": ("45", "29", "22"),
    "concesionario": ("451",),
    "compraventa": ("451",),
    "repuestos": ("453", "454", "45"),
    "cda": ("7120", "45"),
}
_NOISE = {"sas", "s", "a", "sa", "ltda", "limitada", "y", "de", "la", "el", "los", "las", "cia", "compania", "e", "u", "en", "del", "sociedad", "anonima", "por", "acciones", "simplificada", "colombia", "lt"}


def _fold(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", (text or "").lower()) if unicodedata.category(c) != "Mn")


def name_tokens(name: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", _fold(name)) if t not in _NOISE and len(t) > 1}


def names_match(registered: str, *given: str) -> bool:
    """Orientativo: al menos la mitad de las palabras significativas del nombre dado aparecen en la razón social del RUES (o al revés)."""
    reg = name_tokens(registered)
    if not reg:
        return False
    for g in given:
        tok = name_tokens(g)
        if tok and len(tok & reg) / min(len(tok), len(reg)) >= 0.5:
            return True
    return False


def split_nit(nit: str) -> tuple[str, str | None]:
    """'900123456-8' -> ('900123456', '8'); '900123456' -> ('900123456', None)."""
    clean = re.sub(r"[\s.]", "", (nit or "").strip())
    base, _, dv = clean.partition("-")
    return re.sub(r"\D", "", base), (dv or None)


async def fetch_rows(base: str, client: httpx.AsyncClient | None = None) -> list[dict] | None:
    """Filas del RUES con ese NIT (o cédula, para personas naturales). None si el servicio no responde: nunca lanza."""
    if not base.isdigit() or not 6 <= len(base) <= 15:
        return []
    params = {"$select": _FIELDS, "$where": f"nit = '{base}' OR numero_identificacion = '{base}'", "$limit": "20"}
    s = get_settings()
    own = client is None
    http = client or httpx.AsyncClient(timeout=s.company_verification_timeout_seconds)
    try:
        r = await http.get(SOCRATA_URL, params=params)
        if r.status_code != 200:
            logger.warning("company verification: HTTP %s", r.status_code)
            return None
        data = r.json()
        return data if isinstance(data, list) else None
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("company verification: fallo (%s)", type(exc).__name__)
        return None
    finally:
        if own:
            await http.aclose()


def pick_record(rows: list[dict]) -> dict | None:
    """La matrícula más relevante: activa primero, luego la renovada más recientemente."""
    if not rows:
        return None
    def key(r: dict):
        return (r.get("estado_matricula") == "ACTIVA", str(r.get("fecha_renovacion") or ""), str(r.get("ultimo_ano_renovado") or ""))
    return max(rows, key=key)


def renewed_ok(last_year: int | None, today: date | None = None) -> bool:
    """La matrícula mercantil se renueva a más tardar el 31 de marzo de cada año."""
    today = today or datetime.now(timezone.utc).date()
    if not last_year:
        return False
    return last_year >= (today.year - 1 if (today.month, today.day) <= (3, 31) else today.year)


def evaluate(rows: list[dict] | None, *, nit: str, name: str, legal_name: str, kind: str, today: date | None = None) -> dict:
    """Resultado guardado en `workshop_applications.verification`. status: ok | review | fail | not_found | unavailable."""
    base, dv = split_nit(nit)
    out: dict = {"source": SOURCE, "checked_at": datetime.now(timezone.utc).isoformat(), "status": "unavailable", "found": False}
    if rows is None:
        return out
    rec = pick_record(rows)
    if rec is None:
        out.update(status="not_found")
        return out
    try:
        year = int(rec.get("ultimo_ano_renovado") or 0)
    except ValueError:
        year = 0
    rec_dv = (rec.get("digito_verificacion") or "").strip() or None
    ciiu = (rec.get("cod_ciiu_act_econ_pri") or "").strip()
    checks = {
        "active": rec.get("estado_matricula") == "ACTIVA",
        "renewed": renewed_ok(year, today),
        "dv": None if (dv is None or rec_dv is None) else dv == rec_dv,
        "name": names_match(rec.get("razon_social", ""), legal_name, name),
        "activity": bool(ciiu) and ciiu not in ("9999", "0000") and ciiu.startswith(EXPECTED_CIIU.get(kind, ("45",))),
    }
    hard_ok = checks["active"] and checks["renewed"] and checks["dv"] is not False
    status = "fail" if not hard_ok else ("ok" if checks["name"] and checks["activity"] else "review")
    out.update(
        status=status, found=True, razon_social=rec.get("razon_social"), estado=rec.get("estado_matricula"), organizacion=rec.get("organizacion_juridica"),
        camara=rec.get("camara_comercio"), ciiu=ciiu or None, ultimo_ano_renovado=year or None, fecha_renovacion=rec.get("fecha_renovacion"),
        matriculas=len(rows), checks=checks,
    )
    return out


async def verify(*, nit: str, name: str, legal_name: str, kind: str, client: httpx.AsyncClient | None = None) -> dict:
    if not get_settings().company_verification_enabled:
        return {}
    base, _ = split_nit(nit)
    return evaluate(await fetch_rows(base, client), nit=nit, name=name, legal_name=legal_name, kind=kind)
