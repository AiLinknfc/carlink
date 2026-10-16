"""Fase 3 de docs/PLAN_ALIADOS_NEGOCIO.md: vehículos del aliado, kilometraje certificado y entrega."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.services import dealer_vehicles as rules
from app.services.capabilities import capabilities_for

FUTURE = datetime(2999, 1, 1, tzinfo=timezone.utc)
NOW = datetime(2026, 10, 16, 12, tzinfo=timezone.utc)


def _ws(**kw):
    base = dict(business_kind="concesionario", is_verified=True, can_certify_odometer=True, access_plan="founder", access_until=FUTURE,
                access_granted_at=NOW, created_at=NOW)
    return SimpleNamespace(**{**base, **kw})


def _dv(**kw):
    return SimpleNamespace(**{**dict(certify_attempts=0, certify_window_start=None), **kw})


# --- placa ---

def test_placa_se_normaliza_y_se_muestra_sin_revelarla():
    assert rules.normalize_plate("abc-123") == "ABC123"
    assert rules.normalize_plate(" ab c12d ") == "ABC12D"
    assert rules.display_plate("ABC123") == "ABC-123"
    assert rules.plate_hint("ABC123") == "ABC•••"


@pytest.mark.parametrize("bad", ["", "AB", "ABCDEFGHI", "---"])
def test_placa_invalida(bad):
    with pytest.raises(HTTPException) as e:
        rules.normalize_plate(bad)
    assert e.value.detail == "plate_invalid"


# --- capacidades ---

def test_solo_concesionario_y_compraventa_tienen_vehiculos_en_venta():
    for kind in ("concesionario", "compraventa"):
        assert "vehiculos_venta" in capabilities_for(kind)
    for kind in ("taller", "cda", "repuestos"):
        assert "vehiculos_venta" not in capabilities_for(kind)


# --- quién puede certificar ---

def test_puede_certificar_solo_si_cumple_todo():
    assert rules.certification_block(_ws()) is None
    assert rules.certification_block(_ws(business_kind="taller")) == "kind_not_allowed"
    assert rules.certification_block(_ws(business_kind="repuestos")) == "kind_not_allowed"
    assert rules.certification_block(_ws(business_kind="cda")) is None  # el CDA certifica con la RTM (Fase 3b)
    assert rules.certification_block(_ws(is_verified=False)) == "not_verified"
    assert rules.certification_block(_ws(access_until=datetime(2020, 1, 1, tzinfo=timezone.utc))) == "access_expired"
    assert rules.certification_block(_ws(can_certify_odometer=False)) == "not_enabled"
    assert rules.certification_block(_ws(business_kind="compraventa")) is None


def test_pesos_distintos_concesionario_certifica_compraventa_declara():
    assert rules.KIND_FOR_BUSINESS == {"concesionario": "dealer", "compraventa": "dealer_declared", "cda": "cda"}
    assert rules.label("cda") == "Certificado por CDA"
    assert rules.label("dealer") == "Certificado por concesionario"
    assert rules.label("dealer_declared") == "Declarado por compraventa verificada"
    assert rules.label(None) == "Declarado por el vendedor"


# --- reglas del kilometraje ---

def test_el_km_no_baja_del_historial_ni_de_lo_ya_certificado():
    rules.check_against_history(50_000, 50_000, None)          # igual: vale
    rules.check_against_history(60_000, 50_000, 55_000)
    with pytest.raises(HTTPException) as e:
        rules.check_against_history(49_999, 50_000, None)
    assert e.value.detail == "km_below_history"
    with pytest.raises(HTTPException) as e:
        rules.check_against_history(54_000, 0, 55_000)          # no baja de lo que el mismo aliado ya certificó
    assert e.value.detail == "km_below_history"


def test_el_km_no_salta_de_forma_absurda_sobre_el_historial():
    with pytest.raises(HTTPException) as e:
        rules.check_against_history(200_001, 50_000, None)
    assert e.value.detail == "km_jump_too_large"
    rules.check_against_history(150_000, 50_000, None)
    rules.check_against_history(900_000, 0, None)               # sin historial no hay contra qué comparar el salto


def test_el_mensaje_de_rechazo_no_revela_cifras_de_otra_cuenta():
    with pytest.raises(HTTPException) as e:
        rules.check_against_history(10, 123_456, None)
    assert "123" not in str(e.value.detail)


# --- tope de intentos (antioraculo) ---

def test_maximo_tres_intentos_por_vehiculo_cada_24h():
    dv = _dv()
    for _ in range(3):
        rules.register_attempt(dv, NOW)
    with pytest.raises(HTTPException) as e:
        rules.register_attempt(dv, NOW + timedelta(hours=23))
    assert e.value.status_code == 429 and e.value.detail == "certify_attempts_exceeded"
    rules.register_attempt(dv, NOW + timedelta(hours=25))       # pasada la ventana se reinicia
    assert dv.certify_attempts == 1
