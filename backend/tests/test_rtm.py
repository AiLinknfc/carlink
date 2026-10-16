"""Fase 3b de docs/PLAN_ALIADOS_NEGOCIO.md: revisiones técnico-mecánicas (CDA), consignación y fotos."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.routers.dealer_vehicles import _clean_photos
from app.services import rtm
from app.services.capabilities import capabilities_for

TODAY = date(2026, 10, 17)
NOW = datetime(2026, 10, 17, 12, tzinfo=timezone.utc)


def test_capacidades_de_la_fase_3b():
    assert "revisiones" in capabilities_for("cda") and "revisiones" not in capabilities_for("taller")
    assert "consignacion" in capabilities_for("concesionario")
    for kind in ("taller", "cda", "compraventa", "repuestos"):
        assert "consignacion" not in capabilities_for(kind)
    assert "ordenes" not in capabilities_for("cda")  # el CDA sigue sin órdenes de trabajo


@pytest.mark.parametrize("raw,ok", [("RTM-2026-001234", True), ("ab12.cd/34", True), ("  rtm 123  ", True), ("12", False), ("", False), ("RTM<script>", False), ("-ABC123", False)])
def test_certificado(raw, ok):
    if ok:
        assert rtm.normalize_certificate(raw)
    else:
        with pytest.raises(HTTPException) as e:
            rtm.normalize_certificate(raw)
        assert e.value.detail == "certificate_invalid"


def test_fechas_de_la_revision():
    rtm.validate_dates(TODAY, TODAY + timedelta(days=365), TODAY)
    rtm.validate_dates(TODAY - timedelta(days=7), TODAY + timedelta(days=358), TODAY)   # registrada unos días después
    rtm.validate_dates(TODAY + timedelta(days=1), TODAY + timedelta(days=366), TODAY)   # holgura por la hora UTC
    for bad in [
        (TODAY - timedelta(days=8), TODAY + timedelta(days=300)),     # muy vieja: no se puede "inventar" historia
        (TODAY + timedelta(days=2), TODAY + timedelta(days=300)),     # del futuro
        (TODAY, TODAY),                                               # vence el mismo día
        (TODAY, TODAY - timedelta(days=1)),                           # vence antes de empezar
        (TODAY, TODAY + timedelta(days=800)),                         # vigencia absurda
    ]:
        with pytest.raises(HTTPException) as e:
            rtm.validate_dates(bad[0], bad[1], TODAY)
        assert e.value.detail == "rtm_dates_invalid"


def test_tope_de_tres_intentos_por_placa_cada_24h():
    row = SimpleNamespace(window_start=None, attempts=0)
    for _ in range(3):
        rtm.bump_attempt(row, NOW)
    with pytest.raises(HTTPException) as e:
        rtm.bump_attempt(row, NOW + timedelta(hours=23))
    assert e.value.status_code == 429 and e.value.detail == "certify_attempts_exceeded"
    rtm.bump_attempt(row, NOW + timedelta(hours=25))
    assert row.attempts == 1


def test_dias_restantes():
    assert rtm.days_left(TODAY + timedelta(days=10), TODAY) == 10
    assert rtm.days_left(TODAY - timedelta(days=3), TODAY) == -3


def test_fotos_solo_del_propio_aliado_sin_repetidas_y_maximo_seis():
    uid = str(uuid.uuid4())
    own = [f"/api/upload/files/{uid}/{uuid.uuid4()}.jpg" for _ in range(8)]
    assert _clean_photos([own[0], own[0], own[1]], uid) == [own[0], own[1]]
    assert len(_clean_photos(own, uid)) == 6
    assert _clean_photos(["", "  "], uid) == []
    for bad in ["https://evil.example/x.jpg", f"/api/upload/files/{uuid.uuid4()}/{uuid.uuid4()}.jpg", "javascript:alert(1)"]:
        with pytest.raises(HTTPException):
            _clean_photos([bad], uid)
