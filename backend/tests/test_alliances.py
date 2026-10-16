"""Fase 2 de docs/PLAN_ALIADOS_NEGOCIO.md: código de alianza y descuento por llavero."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.routers import shop_orders as so
from app.services import alliances

FUTURE = datetime(2999, 1, 1, tzinfo=timezone.utc)
PAST = datetime(2020, 1, 1, tzinfo=timezone.utc)


def _ws(**kw):
    base = dict(id=uuid.uuid4(), owner_id=uuid.uuid4(), code="TLR-AB12C", name="Frenos Duitama", is_verified=True, is_published=True,
                business_kind="taller", access_plan="founder", access_until=FUTURE,
                access_granted_at=datetime(2026, 10, 1, tzinfo=timezone.utc), created_at=datetime(2026, 10, 1, tzinfo=timezone.utc))
    return SimpleNamespace(**{**base, **kw})


def _db_returning(workshop, units=0):
    """Base simulada: 1.a consulta -> el taller, 2.a -> unidades ya recomendadas en 30 días."""
    first, second = MagicMock(), MagicMock()
    first.scalar_one_or_none.return_value = workshop
    second.scalar.return_value = units
    db = AsyncMock()
    db.execute = AsyncMock(side_effect=[first, second])
    return db


# --- el código ---

@pytest.mark.parametrize("raw,expected", [("tlr-ab12c ", "TLR-AB12C"), ("TLR-AB12C", "TLR-AB12C"), ("TLR-AB12", None), ("XYZ-AB12C", None), ("", None), (None, None), ("TLR-AB12C; DROP", None)])
def test_normalizar_codigo(raw, expected):
    assert alliances.normalize(raw) == expected


def test_descuento_siete_mil_por_llavero_y_nunca_baja_de_cero():
    assert alliances.discount_for(1, 39_900) == (7000, 7000)
    assert alliances.discount_for(3, 39_900) == (7000, 21_000)
    assert alliances.discount_for(2, 5_000) == (5000, 10_000)  # el descuento no supera el precio


# --- resolver ---

@pytest.mark.anyio
async def test_codigo_valido_calcula_el_descuento_en_el_servidor():
    r = await alliances.resolve(_db_returning(_ws()), "tlr-ab12c", 2, 39_900)
    assert r.code == "TLR-AB12C" and r.discount_per_unit_cop == 7000 and r.discount_cop == 14_000


@pytest.mark.anyio
@pytest.mark.parametrize("raw", ["no-es-codigo", "TLR-ZZZZZ"])
async def test_codigo_inexistente_o_mal_formado_es_invalido(raw):
    with pytest.raises(alliances.AllianceError) as e:
        await alliances.resolve(_db_returning(None), raw, 1, 39_900)
    assert e.value.reason == "invalid"


@pytest.mark.anyio
async def test_negocio_sin_verificar_se_ve_como_invalido_no_como_no_verificado():
    with pytest.raises(alliances.AllianceError) as e:
        await alliances.resolve(_db_returning(_ws(is_verified=False)), "TLR-AB12C", 1, 39_900)
    assert e.value.reason == "invalid"


@pytest.mark.anyio
async def test_negocio_con_acceso_vencido_no_da_descuento():
    with pytest.raises(alliances.AllianceError) as e:
        await alliances.resolve(_db_returning(_ws(access_until=PAST)), "TLR-AB12C", 1, 39_900)
    assert e.value.reason == "inactive"


@pytest.mark.anyio
async def test_nadie_se_descuenta_con_su_propio_codigo():
    ws = _ws()
    with pytest.raises(alliances.AllianceError) as e:
        await alliances.resolve(_db_returning(ws), "TLR-AB12C", 1, 39_900, buyer_user_id=str(ws.owner_id))
    assert e.value.reason == "self"
    ok = await alliances.resolve(_db_returning(ws), "TLR-AB12C", 1, 39_900, buyer_user_id=str(uuid.uuid4()))
    assert ok.discount_cop == 7000


@pytest.mark.anyio
async def test_tope_mensual_de_unidades(monkeypatch):
    monkeypatch.setattr(alliances, "get_settings", lambda: SimpleNamespace(alliance_discount_per_keychain_cop=7000, alliance_monthly_cap_units=30))
    with pytest.raises(alliances.AllianceError) as e:
        await alliances.resolve(_db_returning(_ws(), units=29), "TLR-AB12C", 2, 39_900)  # 29 + 2 > 30
    assert e.value.reason == "limit"
    ok = await alliances.resolve(_db_returning(_ws(), units=28), "TLR-AB12C", 2, 39_900)  # 28 + 2 = 30
    assert ok.discount_cop == 14_000


def test_elegibilidad():
    assert alliances.eligibility(_ws()) is None
    assert alliances.eligibility(_ws(is_verified=False)) == "not_verified"
    assert alliances.eligibility(_ws(access_until=PAST)) == "access_expired"
    assert alliances.eligibility(_ws(access_plan="convenio", access_until=None)) is None


# --- HTTP: validar el código y crear el pedido con descuento ---

@pytest.mark.anyio
async def test_endpoint_valida_codigo_y_muestra_total(client, monkeypatch):
    async def _resolve(db, code, qty, price, uid=None):
        return alliances.Resolved(workshop=_ws(), code="TLR-AB12C", discount_per_unit_cop=7000, discount_cop=7000 * qty)
    monkeypatch.setattr(so.alliances, "resolve", _resolve)
    j = (await client.get("/api/shop/alliance/TLR-AB12C?quantity=3")).json()
    assert j == {"valid": True, "reason": None, "workshop_name": "Frenos Duitama", "discount_per_unit_cop": 7000, "discount_cop": 21_000, "total_cop": 3 * 39_900 - 21_000}


@pytest.mark.anyio
async def test_endpoint_codigo_invalido_responde_valid_false_sin_datos(client, monkeypatch):
    async def _resolve(*a, **k):
        raise alliances.AllianceError("invalid")
    monkeypatch.setattr(so.alliances, "resolve", _resolve)
    j = (await client.get("/api/shop/alliance/TLR-ZZZZZ")).json()
    assert j["valid"] is False and j["reason"] == "invalid" and j["workshop_name"] is None


@pytest.mark.anyio
async def test_nombre_del_negocio_oculto_si_su_ficha_no_es_publica(client, monkeypatch):
    async def _resolve(db, code, qty, price, uid=None):
        return alliances.Resolved(workshop=_ws(is_published=False), code="TLR-AB12C", discount_per_unit_cop=7000, discount_cop=7000)
    monkeypatch.setattr(so.alliances, "resolve", _resolve)
    assert (await client.get("/api/shop/alliance/TLR-AB12C")).json()["workshop_name"] == "un aliado de CarLink"


_ORDER = dict(plate_text="", plate_type="", plate_city="", quantity=2, customer_name="Ana", customer_email="a@b.co", customer_phone="3001234567",
              shipping_address="Calle 1 # 2-3", shipping_city="Duitama")


@pytest.mark.anyio
async def test_pedido_con_codigo_cobra_el_monto_con_descuento_y_guarda_la_atribucion(client, mock_db, monkeypatch):
    ws = _ws()
    async def _resolve(db, code, qty, price, uid=None):
        return alliances.Resolved(workshop=ws, code="TLR-AB12C", discount_per_unit_cop=7000, discount_cop=7000 * qty)
    monkeypatch.setattr(so.alliances, "resolve", _resolve)
    saved = {}
    mock_db.add = lambda o: saved.setdefault("order", o)
    async def _refresh(o):
        o.id = uuid.uuid4()
    mock_db.refresh = _refresh
    resp = await client.post("/api/shop/orders", json={**_ORDER, "alliance_code": "tlr-ab12c"})
    assert resp.status_code == 201
    order = saved["order"]
    assert order.amount_in_cents == (2 * 39_900 - 14_000) * 100 == resp.json()["amount_in_cents"]
    assert order.discount_cents == 14_000 * 100 and order.alliance_code == "TLR-AB12C" and order.alliance_workshop_id == ws.id


@pytest.mark.anyio
async def test_pedido_sin_codigo_cobra_el_precio_completo(client, mock_db):
    saved = {}
    mock_db.add = lambda o: saved.setdefault("order", o)
    async def _refresh(o):
        o.id = uuid.uuid4()
    mock_db.refresh = _refresh
    resp = await client.post("/api/shop/orders", json=_ORDER)
    assert resp.status_code == 201
    o = saved["order"]
    assert o.amount_in_cents == 2 * 39_900 * 100 and o.discount_cents == 0 and o.alliance_workshop_id is None and o.alliance_code == ""


@pytest.mark.anyio
async def test_pedido_con_codigo_que_ya_no_sirve_da_422_y_no_crea_nada(client, mock_db, monkeypatch):
    async def _resolve(*a, **k):
        raise alliances.AllianceError("limit")
    monkeypatch.setattr(so.alliances, "resolve", _resolve)
    added = []
    mock_db.add = added.append
    resp = await client.post("/api/shop/orders", json={**_ORDER, "alliance_code": "TLR-AB12C"})
    assert resp.status_code == 422 and resp.json()["detail"] == "alliance_limit"
    assert added == []


@pytest.mark.anyio
async def test_el_cliente_no_puede_mandar_montos_ni_descuentos(client, mock_db):
    saved = {}
    mock_db.add = lambda o: saved.setdefault("order", o)
    async def _refresh(o):
        o.id = uuid.uuid4()
    mock_db.refresh = _refresh
    resp = await client.post("/api/shop/orders", json={**_ORDER, "amount_in_cents": 1, "discount_cents": 99_999_999})
    assert resp.status_code == 201 and saved["order"].amount_in_cents == 2 * 39_900 * 100 and saved["order"].discount_cents == 0
