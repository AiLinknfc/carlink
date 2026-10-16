from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.routers.workshop_applications import _detect_type, normalize_nit
from app.schemas.schemas import WORKSHOP_BUSINESS_TYPES, WorkshopApplicationCreate

_OK = dict(
    business_type="mecanica_general", name="Taller Prueba", nit="900123456-7", city="Bogota",
    address="Cl. 1 #2-3", contact_name="Ana", phone="3001234567", email="a@b.co",
    logo_url="/api/upload/files/applications/x.png", consent_accepted=True, consent_version="2.1",
)


def test_detect_type_by_signature():
    assert _detect_type(b"\x89PNG\r\n\x1a\n....") == ("image/png", "png")
    assert _detect_type(b"\xff\xd8\xff\xe0....") == ("image/jpeg", "jpg")
    assert _detect_type(b"%PDF-1.7 ...") == ("application/pdf", "pdf")
    assert _detect_type(b"RIFF\x00\x00\x00\x00WEBPVP8 ") == ("image/webp", "webp")


@pytest.mark.parametrize("payload", [b"<svg xmlns='http://www.w3.org/2000/svg'></svg>", b"<html>", b"MZ\x90\x00", b""])
def test_detect_type_rejects_svg_html_exe(payload):
    assert _detect_type(payload) is None


def test_normalize_nit():
    assert normalize_nit(" 900.123.456-7 ") == "900123456-7"


def test_schema_requires_consent_and_logo_fields():
    assert WorkshopApplicationCreate(**_OK).name == "Taller Prueba"
    with pytest.raises(ValidationError):
        WorkshopApplicationCreate(**{k: v for k, v in _OK.items() if k != "consent_accepted"})
    with pytest.raises(ValidationError):
        WorkshopApplicationCreate(**{**_OK, "name": "x"})


def test_business_types_include_parts_suppliers():
    assert "repuestos" in WORKSHOP_BUSINESS_TYPES


# --- ubicacion, telefono, mapa publico y lectura de Camara de Comercio (2026-10-16) ---

import asyncio
from types import SimpleNamespace

from fastapi import HTTPException

from app.routers.workshop_applications import _city_key, _resolve_location, _valid_phone
from app.services import ocr


@pytest.mark.parametrize("a,b", [("Bogotá D.C.", "bogota"), ("BOGOTA", "Bogotá"), ("  Duitama ", "duitama"), ("Ibagué", "ibague")])
def test_city_key_agrupa_variantes(a, b):
    assert _city_key(a) == _city_key(b)


@pytest.mark.parametrize("phone,ok", [
    ("3001234567", True), ("+57 300 123 4567", True), ("300 123 4567", True),
    ("6076512345", True), ("12345", False), ("abc", False), ("3001234", False),
])
def test_valid_phone(phone, ok):
    assert _valid_phone(phone) is ok


def test_resolve_location_usa_el_pin_confirmado_y_rechaza_fuera_de_colombia():
    ok = WorkshopApplicationCreate(**_OK, latitude=5.8237123, longitude=-73.0338123)
    assert asyncio.run(_resolve_location(ok)) == (5.823712, -73.033812)
    fuera = WorkshopApplicationCreate(**_OK, latitude=40.4, longitude=-3.7)
    with pytest.raises(HTTPException) as e:
        asyncio.run(_resolve_location(fuera))
    assert e.value.detail == "location_invalid"


def test_resolve_location_sin_pin_geocodifica_y_tolera_fallo():
    # conftest reemplaza geocode_address por un stub que devuelve None: la postulacion igual se guarda.
    assert asyncio.run(_resolve_location(WorkshopApplicationCreate(**_OK))) == (None, None)


_CAMARA = """CAMARA DE COMERCIO DE DUITAMA
INVERSIONES PEREZ S.A.S.
NIT 900.123.456-8
Domicilio: Duitama  Dirección: Calle 15 # 10-20
Teléfono 311 456 7890  Correo: Contacto@Perez.com.co
"""


def test_chamber_fallback_regex_sin_ia(monkeypatch):
    monkeypatch.setattr(ocr, "settings", SimpleNamespace(deepseek_api_key=""))
    r = asyncio.run(ocr.structure_chamber_data(_CAMARA))
    assert r["nit"] == "900123456-8" and r["email"] == "contacto@perez.com.co" and r["phone"] == "3114567890"
    assert r["legal_name"] is None  # sin IA no se inventa la razon social


def test_chamber_con_ia_mezcla_y_prefiere_nit_completo(monkeypatch):
    import httpx
    monkeypatch.setattr(ocr, "settings", SimpleNamespace(deepseek_api_key="k", deepseek_base_url="http://x", deepseek_model="m"))
    content = '{"legal_name": "INVERSIONES PEREZ S.A.S.", "nit": "900123456", "city": "Duitama", "business_type": "mecanica_general", "address": null}'

    class FakeClient:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def post(self, *a, **k):
            return httpx.Response(200, json={"choices": [{"message": {"content": content}}]}, request=httpx.Request("POST", "http://x"))

    monkeypatch.setattr(ocr.httpx, "AsyncClient", FakeClient)
    r = asyncio.run(ocr.structure_chamber_data(_CAMARA))
    assert r["legal_name"] == "INVERSIONES PEREZ S.A.S." and r["city"] == "Duitama"
    assert r["nit"] == "900123456-8" and r["address"] is None and r["business_type"] == "mecanica_general"


# --- Fase 0 de docs/PLAN_ALIADOS_NEGOCIO.md: tipo de organizacion e invitacion de registro ---

from datetime import datetime, timedelta, timezone

from app.schemas.schemas import KINDS_WITH_SPECIALTIES, WORKSHOP_BUSINESS_KINDS, WORKSHOP_CHECK_KEYS
from app.services import workshop_invites


def test_kinds_sin_aseguradora_y_con_especialidades_solo_taller_y_concesionario():
    assert WORKSHOP_BUSINESS_KINDS == {"taller", "cda", "concesionario", "compraventa", "repuestos"}
    assert KINDS_WITH_SPECIALTIES == {"taller", "concesionario"}
    assert WORKSHOP_CHECK_KEYS == {"doc_reviewed", "nit_confirmed", "contact_confirmed", "location_ok"}


def test_schema_acepta_kind_sin_subtipo():
    body = WorkshopApplicationCreate(**{**_OK, "business_type": "", "business_kind": "compraventa"})
    assert body.business_kind == "compraventa" and body.business_type == ""
    assert WorkshopApplicationCreate(**_OK).business_kind == "taller"  # clientes viejos siguen funcionando


def test_invitacion_emite_hash_y_vence():
    row = SimpleNamespace(invite_token_hash=None, invite_expires_at=None, invite_used_at=None, invite_used_by=None)
    assert workshop_invites.state(row) == "none"
    now = datetime(2026, 10, 16, tzinfo=timezone.utc)
    raw = workshop_invites.issue(row, now)
    assert len(raw) >= 40 and row.invite_token_hash == workshop_invites.hash_token(raw) and raw not in row.invite_token_hash
    assert row.invite_expires_at == now + timedelta(days=workshop_invites.INVITE_DAYS)
    assert workshop_invites.state(row, now) == "valid"
    assert workshop_invites.state(row, now + timedelta(days=workshop_invites.INVITE_DAYS, seconds=1)) == "expired"
    row.invite_used_at = now
    assert workshop_invites.state(row, now) == "used"


def test_reemitir_invalida_la_anterior_y_limpia_el_uso():
    row = SimpleNamespace(invite_token_hash=None, invite_expires_at=None, invite_used_at=None, invite_used_by=None)
    first = workshop_invites.issue(row)
    h1 = row.invite_token_hash
    second = workshop_invites.issue(row)
    assert first != second and row.invite_token_hash != h1


def test_correo_de_aprobacion_menciona_registro_exitoso_y_enlace(monkeypatch):
    from app.services import email
    sent = {}
    monkeypatch.setattr(email, "_send_email", lambda to, subject, html, log_label="": sent.update(to=to, subject=subject, html=html) or True)
    email.send_workshop_application_approved_email("a@b.co", "Ana", "Autos <Mil>", invite_url="https://x.co/register?invite=T", business_kind="concesionario")
    assert "exitoso" in sent["subject"].lower() and "https://x.co/register?invite=T" in sent["html"]
    assert "concesionario" in sent["html"] and "Autos &lt;Mil&gt;" in sent["html"]


@pytest.mark.asyncio
async def test_public_allies_exposes_only_name_logo_code(client, mock_db):
    from types import SimpleNamespace
    from unittest.mock import AsyncMock, MagicMock

    apps = MagicMock()
    apps.all.return_value = [SimpleNamespace(name="Taller Uno", logo_url="/api/upload/files/applications/a.png", nit="900123456-7")]
    codes = MagicMock()
    codes.all.return_value = [("900123456-7", "TLR-ABCDE")]
    mock_db.execute = AsyncMock(side_effect=[apps, codes])
    resp = await client.get("/api/workshop-applications/public-allies")
    assert resp.status_code == 200
    assert resp.json()["items"] == [{"name": "Taller Uno", "logo_url": "/api/upload/files/applications/a.png", "code": "TLR-ABCDE"}]
    assert "max-age" in resp.headers["cache-control"]

    empty = MagicMock()
    empty.all.return_value = []
    mock_db.execute = AsyncMock(side_effect=[empty])
    assert (await client.get("/api/workshop-applications/public-allies")).json() == {"items": []}


def test_logo_is_optional_in_application():
    data = {k: v for k, v in _OK.items() if k != "logo_url"}
    assert WorkshopApplicationCreate(**data).logo_url == ""
