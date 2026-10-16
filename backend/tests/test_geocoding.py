"""Geocodificacion de la direccion del taller (fase 0 de PLAN_VINCULO_TALLER_CONDUCTOR.md)."""
import asyncio
from types import SimpleNamespace

import httpx

from app.services import geocoding

import pytest

# conftest.py reemplaza geocode_address por un stub (autouse) para el resto de la suite. Esta es la funcion
# real, capturada al importar el modulo, antes de que corra cualquier fixture.
_REAL_GEOCODE = geocoding.geocode_address


class real:  # noqa: N801 - agrupa la funcion real con el resto del modulo
    geocode_address = staticmethod(_REAL_GEOCODE)
    apply_geocode = staticmethod(geocoding.apply_geocode)


@pytest.fixture(autouse=True)
def _usar_geocode_real(monkeypatch):
    monkeypatch.setattr(geocoding, "geocode_address", _REAL_GEOCODE)


def _client(handler):
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


def _run(coro):
    return asyncio.run(coro)


def test_direccion_encontrada_devuelve_coordenadas():
    seen = {}

    def handler(request):
        seen["q"] = request.url.params["q"]
        seen["cc"] = request.url.params["countrycodes"]
        return httpx.Response(200, json=[{"lat": "4.6486", "lon": "-74.0628"}])

    async def go():
        async with _client(handler) as c:
            return await real.geocode_address("Cra 13 # 85-20", "Bogota", c)

    assert _run(go()) == (4.6486, -74.0628)
    assert seen == {"q": "Cra 13 # 85-20, Bogota", "cc": "co"}


def test_sin_direccion_no_llama_al_servicio():
    called = []

    def handler(request):
        called.append(1)
        return httpx.Response(200, json=[])

    async def go():
        async with _client(handler) as c:
            return await real.geocode_address("  ", "Bogota", c)

    assert _run(go()) is None and called == []


def test_resultado_fuera_de_colombia_se_descarta():
    async def go():
        async with _client(lambda r: httpx.Response(200, json=[{"lat": "40.4", "lon": "-3.7"}])) as c:
            return await real.geocode_address("Calle Mayor 1", "Madrid", c)
    assert _run(go()) is None


def test_sin_resultados_error_http_y_json_raro_devuelven_none():
    for resp in (httpx.Response(200, json=[]), httpx.Response(500), httpx.Response(200, json=[{"x": 1}])):
        async def go(resp=resp):
            async with _client(lambda r: resp) as c:
                return await real.geocode_address("Calle 1", "Cali", c)
        assert _run(go()) is None


def test_falla_de_red_no_lanza_excepcion():
    def boom(request):
        raise httpx.ConnectTimeout("lento")

    async def go():
        async with _client(boom) as c:
            return await real.geocode_address("Calle 1", "Cali", c)
    assert _run(go()) is None


def test_apply_geocode_limpia_pin_viejo_si_la_nueva_direccion_no_se_ubica():
    ws = SimpleNamespace(address="Direccion nueva", city="Cali", latitude=4.0, longitude=-74.0)

    async def go():
        async with _client(lambda r: httpx.Response(200, json=[])) as c:
            return await real.apply_geocode(ws, c)

    assert _run(go()) is False
    assert (ws.latitude, ws.longitude) == (None, None)


def test_apply_geocode_asigna_coordenadas():
    ws = SimpleNamespace(address="Calle 1", city="Cali", latitude=None, longitude=None)

    async def go():
        async with _client(lambda r: httpx.Response(200, json=[{"lat": "3.45", "lon": "-76.53"}])) as c:
            return await real.apply_geocode(ws, c)

    assert _run(go()) is True
    assert (ws.latitude, ws.longitude) == (3.45, -76.53)
