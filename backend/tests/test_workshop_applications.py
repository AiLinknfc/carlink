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
