from __future__ import annotations

import hashlib
import hmac
from unittest.mock import patch

import pytest

from app.services import whatsapp


@pytest.mark.parametrize("raw,expected", [
    ("3124044313", "573124044313"),
    ("+57 312 404 4313", "573124044313"),
    ("57 312-404-4313", "573124044313"),
    ("0057 312 404 4313", "573124044313"),
    ("6011234567", None),      # fijo
    ("12345", None),
    ("+1 555 158 5813", None),  # extranjero: se omite
    ("", None),
])
def test_normalize_co_phone(raw, expected):
    assert whatsapp.normalize_co_phone(raw) == expected


def test_verify_signature_rejects_without_secret():
    with patch("app.services.whatsapp.get_settings") as gs:
        gs.return_value.whatsapp_app_secret = ""
        assert whatsapp.verify_signature(b"{}", "sha256=abc") is False


def test_verify_signature_valid_and_invalid():
    body = b'{"entry":[]}'
    with patch("app.services.whatsapp.get_settings") as gs:
        gs.return_value.whatsapp_app_secret = "s3cret"
        good = "sha256=" + hmac.new(b"s3cret", body, hashlib.sha256).hexdigest()
        assert whatsapp.verify_signature(body, good) is True
        assert whatsapp.verify_signature(body, "sha256=deadbeef") is False
        assert whatsapp.verify_signature(body, None) is False
        assert whatsapp.verify_signature(b"tampered", good) is False


def test_send_template_not_configured_never_raises():
    with patch("app.services.whatsapp.get_settings") as gs:
        gs.return_value.whatsapp_token = ""
        gs.return_value.whatsapp_phone_id = ""
        mid, err = whatsapp.send_template("573124044313", "x", ["a"])
        assert mid is None and "no configurado" in err


def test_send_template_api_error_returns_error_not_raise():
    class R:
        status_code = 400
        content = b"x"
        text = "x"
        def json(self):
            return {"error": {"code": 132001, "message": "template does not exist"}}
    with patch("app.services.whatsapp.get_settings") as gs, patch("app.services.whatsapp.httpx.post", return_value=R()):
        gs.return_value.whatsapp_token = "t"
        gs.return_value.whatsapp_phone_id = "1"
        gs.return_value.whatsapp_template_lang = "es"
        mid, err = whatsapp.send_template("573124044313", "x", ["a"])
        assert mid is None and err.startswith("132001")


def test_send_template_copy_code_adds_url_button():
    captured = {}

    class R:
        status_code = 200
        content = b"x"
        text = "x"
        def json(self):
            return {"messages": [{"id": "wamid.X"}]}

    def fake_post(url, headers, json, timeout):
        captured["json"] = json
        return R()

    with patch("app.services.whatsapp.get_settings") as gs, patch("app.services.whatsapp.httpx.post", side_effect=fake_post):
        gs.return_value.whatsapp_token = "t"
        gs.return_value.whatsapp_phone_id = "1"
        gs.return_value.whatsapp_template_lang = "es"
        mid, err = whatsapp.send_template("573124044313", "codigo_activacion_carlink", ["K7M2XQ9PA4"], copy_code="K7M2XQ9PA4")
    assert mid == "wamid.X" and err == ""
    comps = captured["json"]["template"]["components"]
    assert comps[0]["type"] == "body"
    assert comps[1] == {"type": "button", "sub_type": "url", "index": "0", "parameters": [{"type": "text", "text": "K7M2XQ9PA4"}]}


# ── Plan B: respuesta al mensaje entrante ────────────────────────────────
import uuid
from unittest.mock import AsyncMock, MagicMock

from app.models.models import ShopOrder
from app.routers import whatsapp_webhook as wh

REF = "CLK-0123456789ABCDEF"


def _order(phone="3124044313", status="approved", user_id=None):
    o = MagicMock(spec=ShopOrder)
    o.id = uuid.uuid4()
    o.reference = REF
    o.status = status
    o.customer_phone = phone
    o.customer_name = "Carlos Perez"
    o.user_id = user_id
    return o


def _db(order, dup=False, replies=0, codes=("ENC",)):
    """AsyncSession falso: el orden de execute/scalar sigue al del handler."""
    db = MagicMock()
    db.add = MagicMock()
    db.flush = AsyncMock()
    r_dup = MagicMock(); r_dup.first.return_value = (1,) if dup else None
    r_order = MagicMock(); r_order.scalar_one_or_none.return_value = order
    r_codes = MagicMock(); r_codes.all.return_value = [(c,) for c in codes]
    db.execute = AsyncMock(side_effect=[r_dup, r_order, r_codes])
    db.scalar = AsyncMock(return_value=replies)
    return db


async def _run(db, sender="573124044313", text=f"quiero mi codigo del pedido {REF}"):
    sent = {}
    def fake_send(to, body):
        sent["to"], sent["body"] = to, body
        return "wamid.OUT", ""
    with patch.object(wh.whatsapp, "send_text", side_effect=fake_send), \
         patch.object(wh, "decrypt_url", return_value="K7M2XQ9PA4"):
        await wh._reply_activation_code(sender, text, "wamid.IN", db)
    return sent


@pytest.mark.asyncio
async def test_guest_gets_code_when_phone_matches():
    sent = await _run(_db(_order()))
    assert sent["to"] == "573124044313" and "K7M2XQ9PA4" in sent["body"]


@pytest.mark.asyncio
async def test_other_phone_never_gets_code():
    sent = await _run(_db(_order()), sender="573001112233")
    assert "K7M2XQ9PA4" not in sent["body"] and "No encontramos" in sent["body"]


@pytest.mark.asyncio
async def test_unpaid_order_never_gets_code():
    sent = await _run(_db(_order(status="pending")))
    assert "K7M2XQ9PA4" not in sent["body"]


@pytest.mark.asyncio
async def test_account_holder_only_pointed_to_mis_pedidos():
    sent = await _run(_db(_order(user_id=uuid.uuid4())))
    assert "K7M2XQ9PA4" not in sent["body"] and "Mis pedidos" in sent["body"]


@pytest.mark.asyncio
async def test_reply_limit_per_order():
    sent = await _run(_db(_order(), replies=5))
    assert "K7M2XQ9PA4" not in sent["body"]


@pytest.mark.asyncio
async def test_duplicate_webhook_is_ignored():
    assert await _run(_db(_order(), dup=True)) == {}


@pytest.mark.asyncio
async def test_message_without_reference_gets_no_reply():
    db = MagicMock(); db.add = MagicMock(); db.flush = AsyncMock()
    r_dup = MagicMock(); r_dup.first.return_value = None
    db.execute = AsyncMock(side_effect=[r_dup])
    assert await _run(db, text="hola, buenas tardes") == {}
