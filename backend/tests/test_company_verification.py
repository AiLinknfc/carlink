"""Fase 4 de docs/PLAN_ALIADOS_NEGOCIO.md: verificación automática de empresas contra el RUES (datos abiertos)."""
from __future__ import annotations

import asyncio
from datetime import date

import httpx
import pytest

from app.services import company_verification as cv

REAL_FETCH = cv.fetch_rows  # conftest reemplaza `fetch_rows` por un stub; esta es la función real, capturada al importar


def _row(**kw):
    base = dict(razon_social="TALLER PEREZ S A S", nit="900123456", digito_verificacion="8", estado_matricula="ACTIVA", organizacion_juridica="SOCIEDAD POR ACCIONES SIMPLIFICADA",
                camara_comercio="TUNJA", cod_ciiu_act_econ_pri="4520", ultimo_ano_renovado="2026", fecha_renovacion="20260320")
    return {**base, **kw}


EV = dict(nit="900123456-8", name="Frenos y Mas", legal_name="Taller Perez SAS", kind="taller", today=date(2026, 10, 17))


def test_nit_se_separa_con_y_sin_digito():
    assert cv.split_nit("900.123.456-8") == ("900123456", "8")
    assert cv.split_nit(" 900123456 ") == ("900123456", None)
    assert cv.split_nit("abc") == ("", None)


def test_nombres_orientativos():
    assert cv.names_match("TALLER PEREZ S A S", "Taller Pérez SAS")
    assert cv.names_match("INVERSIONES PEREZ Y CIA S A S", "Pérez")
    assert not cv.names_match("INVERSIONES GOMEZ LTDA", "Taller Pérez", "Frenos y Más")
    assert not cv.names_match("", "Taller")


@pytest.mark.parametrize("year,today,ok", [
    (2026, date(2026, 10, 17), True), (2025, date(2026, 10, 17), False),   # después del 31 de marzo debe estar al día este año
    (2025, date(2026, 3, 31), True), (2025, date(2026, 4, 1), False),       # hasta el 31 de marzo todavía vale el año anterior
    (0, date(2026, 10, 17), False), (None, date(2026, 10, 17), False),
])
def test_renovacion_de_la_matricula(year, today, ok):
    assert cv.renewed_ok(year, today) is ok


def test_empresa_en_regla_da_ok():
    r = cv.evaluate([_row()], **EV)
    assert r["status"] == "ok" and r["found"] and r["checks"] == {"active": True, "renewed": True, "dv": True, "name": True, "activity": True}
    assert r["razon_social"] == "TALLER PEREZ S A S" and r["camara"] == "TUNJA" and r["ciiu"] == "4520" and "Confecámaras" in r["source"]


def test_no_encontrada():
    assert cv.evaluate([], **EV)["status"] == "not_found"


def test_servicio_caido_no_inventa_resultados():
    r = cv.evaluate(None, **EV)
    assert r["status"] == "unavailable" and r["found"] is False and "checks" not in r


@pytest.mark.parametrize("over", [{"estado_matricula": "CANCELADA"}, {"ultimo_ano_renovado": "2022"}, {"digito_verificacion": "3"}])
def test_problemas_duros_dan_fail(over):
    assert cv.evaluate([_row(**over)], **EV)["status"] == "fail"


def test_nombre_o_actividad_distintos_dan_review_no_fail():
    assert cv.evaluate([_row(razon_social="COMERCIAL XYZ")], **EV)["status"] == "review"
    assert cv.evaluate([_row(cod_ciiu_act_econ_pri="9999")], **EV)["status"] == "review"
    assert cv.evaluate([_row(cod_ciiu_act_econ_pri="4511")], **{**EV, "kind": "concesionario"})["status"] == "ok"
    assert cv.evaluate([_row(cod_ciiu_act_econ_pri="7120")], **{**EV, "kind": "cda"})["status"] == "ok"


def test_sin_digito_en_alguna_de_las_dos_partes_no_falla():
    assert cv.evaluate([_row(digito_verificacion="")], **EV)["checks"]["dv"] is None
    assert cv.evaluate([_row()], **{**EV, "nit": "900123456"})["checks"]["dv"] is None


def test_elige_la_matricula_activa_mas_reciente():
    old = _row(estado_matricula="CANCELADA", fecha_renovacion="20200101", razon_social="VIEJA")
    new = _row(fecha_renovacion="20260320")
    assert cv.pick_record([old, new])["razon_social"] == "TALLER PEREZ S A S"


def _client(handler):
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


def test_consulta_arma_el_filtro_por_nit_o_cedula_y_nunca_lanza():
    seen = {}

    def ok(request):
        seen["where"] = request.url.params["$where"]
        return httpx.Response(200, json=[_row()])
    assert asyncio.run(REAL_FETCH("900123456", _client(ok)))[0]["nit"] == "900123456"
    assert "nit = '900123456'" in seen["where"] and "numero_identificacion = '900123456'" in seen["where"]
    assert asyncio.run(REAL_FETCH("900123456", _client(lambda r: httpx.Response(503)))) is None
    assert asyncio.run(REAL_FETCH("900123456", _client(lambda r: httpx.Response(200, text="no es json")))) is None

    def boom(request):
        raise httpx.ConnectError("sin red")
    assert asyncio.run(REAL_FETCH("900123456", _client(boom))) is None


@pytest.mark.parametrize("bad", ["", "abc", "12", "9001234567890123456", "1' OR '1'='1"])
def test_un_nit_raro_nunca_llega_a_la_consulta(bad):
    # Evita inyectar texto en el filtro de la consulta: solo se consulta con dígitos de 6 a 15 caracteres.
    def never(request):
        raise AssertionError("no debía consultar")
    assert asyncio.run(REAL_FETCH(cv.split_nit(bad)[0], _client(never))) == []
