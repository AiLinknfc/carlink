"""Vinculo taller-conductor (docs/PLAN_VINCULO_TALLER_CONDUCTOR.md): reglas puras, flag y blindajes del nucleo.

Lo que depende de la base real (reclamo de punta a punta, sincronizacion retroactiva) se verifica con
`scripts/qa_workshop_links_e2e.py` contra una base real, como el resto de las rutas de taller (ver el encabezado
de test_workshop_clients.py).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services import workshop_links as svc


# ---- funciones puras --------------------------------------------------------------------------------------

def test_token_de_reclamo_es_unico_con_hash_y_caduca_en_7_dias():
    raw1, h1, exp1 = svc.new_claim_token()
    raw2, h2, _ = svc.new_claim_token()
    assert raw1 != raw2 and h1 != h2
    assert h1 == svc.hash_token(raw1) and raw1 not in h1 and len(h1) == 64
    assert len(raw1) >= 40  # 256 bits, no adivinable
    delta = exp1 - datetime.now(timezone.utc)
    assert timedelta(days=6, hours=23) < delta <= timedelta(days=7)


def test_placa_se_enmascara_y_se_normaliza():
    assert svc.mask_plate("ZYM-35C") == "ZY***C"
    assert svc.mask_plate("ab") == "AB"
    assert svc.normalize_plate(" zym-35c ") == "ZYM35C" == svc.normalize_plate("ZYM 35C")


@pytest.mark.parametrize("typed,registered,expected", [
    ("Aceitosos", "Taller Aceitosos S.A.S.", True),
    ("TALLER ACEITOSOS", "aceitosos sas", True),
    ("Mecánica Pérez", "Mecanica Perez", True),
    ("Motolitros", "Taller MotoLink", False),
    ("Juan", "Juan Autos", False),            # muy corto para contenerse: no es pista suficiente
    ("Motolink centro", "MotoLink", True),    # contenido y el corto tiene 5+ letras
    ("", "Cualquiera", False),
    (None, None, False),
    ("Taller", "Taller S.A.S.", False),       # solo palabras genericas
])
def test_coincidencia_de_nombres_es_prudente(typed, registered, expected):
    assert svc.names_match(typed, registered) is expected


def test_ciudad_compatible_si_iguales_o_desconocida():
    assert svc.city_compatible("Bogotá", "bogota")
    assert svc.city_compatible("", "Cali")
    assert svc.city_compatible("Cali", None)
    assert not svc.city_compatible("Cali", "Bogota")


# ---- flag apagado: la funcion no existe ---------------------------------------------------------------------

_ROUTES = [
    ("get", "/api/workshop-links/mine"),
    ("get", "/api/workshop-links/candidates"),
    ("get", f"/api/workshop-links/claim/{'x' * 30}"),
    ("get", "/api/workshops/me/links"),
    ("post", f"/api/workshops/me/vehicles/{uuid.uuid4()}/claim-token"),
    ("post", f"/api/workshops/me/orders/{uuid.uuid4()}/claim-token"),
    ("delete", f"/api/workshop-links/{uuid.uuid4()}"),
]


@pytest.mark.anyio
@pytest.mark.parametrize("method,path", _ROUTES)
async def test_con_el_flag_apagado_todo_responde_404(client, method, path):
    resp = await getattr(client, method)(path)
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_status_publico_dice_apagado_por_defecto(client):
    resp = await client.get("/api/workshop-links/status")
    assert resp.status_code == 200 and resp.json() == {"enabled": False}


@pytest.mark.anyio
async def test_status_publico_refleja_el_flag(client, monkeypatch):
    monkeypatch.setattr("app.services.workshop_links.get_settings", lambda: SimpleNamespace(workshop_links_enabled=True))
    assert (await client.get("/api/workshop-links/status")).json() == {"enabled": True}


# ---- con el flag encendido: blindajes de seguridad -------------------------------------------------------------

@pytest.fixture
def flag_on(monkeypatch):
    monkeypatch.setattr("app.services.workshop_links.get_settings", lambda: SimpleNamespace(workshop_links_enabled=True))


@pytest.mark.anyio
async def test_reclamar_con_token_inexistente_da_404_uniforme(client, mock_db, flag_on):
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=result)
    resp = await client.get(f"/api/workshop-links/claim/{'z' * 40}")
    assert resp.status_code == 404 and resp.json()["detail"] == "Enlace no válido o vencido"


@pytest.mark.anyio
@pytest.mark.parametrize("used_at,delta", [(datetime.now(timezone.utc), timedelta(days=3)), (None, timedelta(seconds=-5))])
async def test_token_usado_o_vencido_da_el_mismo_404(client, mock_db, flag_on, used_at, delta):
    row = SimpleNamespace(used_at=used_at, expires_at=datetime.now(timezone.utc) + delta)
    result = MagicMock()
    result.scalar_one_or_none.return_value = row
    mock_db.execute = AsyncMock(return_value=result)
    resp = await client.get(f"/api/workshop-links/claim/{'z' * 40}")
    assert resp.status_code == 404 and resp.json()["detail"] == "Enlace no válido o vencido"


@pytest.mark.anyio
async def test_no_se_puede_vincular_un_vehiculo_ajeno(client, mock_db, flag_on):
    """El vehiculo se busca con owner_id == usuario: si no es suyo, 404 (nunca se vincula el de otro)."""
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=result)
    resp = await client.post("/api/workshop-links", json={"workshop_code": "TLR-ABCDE", "vehicle_id": str(uuid.uuid4())})
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_vincular_exige_sesion():
    from httpx import ASGITransport, AsyncClient
    from app.main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        assert (await c.post("/api/workshop-links", json={})).status_code in (401, 403, 404, 422)


# ---- cuentas de taller/empresa no se vinculan como cliente ------------------------------------------------------

@pytest.fixture
def cuenta_taller(mock_db):
    result = MagicMock()
    result.scalar_one_or_none.return_value = "taller"
    mock_db.execute = AsyncMock(return_value=result)
    return mock_db


@pytest.mark.anyio
@pytest.mark.parametrize("path,body", [
    ("/api/workshop-links", {"workshop_code": "TLR-ABCDE", "vehicle_id": str(uuid.uuid4())}),
    ("/api/workshop-links/claim", {"token": "t" * 40, "vehicle_id": str(uuid.uuid4())}),
    ("/api/workshop-links/candidates/confirm", {"workshop_id": str(uuid.uuid4()), "vehicle_id": str(uuid.uuid4())}),
])
async def test_cuenta_de_taller_no_puede_vincularse_como_cliente(client, cuenta_taller, flag_on, path, body):
    resp = await client.post(path, json=body)
    assert resp.status_code == 403
    assert "taller o empresa" in resp.json()["detail"]


@pytest.mark.anyio
async def test_cuenta_de_taller_no_recibe_sugerencias(client, cuenta_taller, flag_on):
    resp = await client.get("/api/workshop-links/candidates")
    assert resp.status_code == 200 and resp.json() == []
