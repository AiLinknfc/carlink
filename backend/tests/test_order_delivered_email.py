from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.routers import shop_orders
from app.schemas.schemas import ShopOrderFulfillmentUpdate
from app.services import email


def _order(delivered_at=None):
    o = MagicMock()
    o.status = "approved"
    o.reference = "CLK-TEST"
    o.customer_email = "cliente@correo.com"
    o.customer_name = "Ana"
    o.plate_text = ""
    o.tracking_note = ""
    o.delivered_at = delivered_at
    return o


def _db():
    db = MagicMock()
    db.flush = AsyncMock()
    db.refresh = AsyncMock()
    return db


def test_delivered_email_content_and_escaping():
    with patch.object(email, "_send_email", return_value=True) as send:
        ok = email.send_order_delivered_email("a@b.com", "<b>Ana</b>", "CLK-1", "")
    assert ok is True
    to, subject, html = send.call_args.args
    assert to == "a@b.com" and subject == "CarLink — Tu llavero NFC fue entregado"
    assert "&lt;b&gt;Ana&lt;/b&gt;" in html and "<b>Ana</b>" not in html  # el nombre va escapado
    assert "Llavero NFC" in html and "Entregado" in html
    assert "(placa" not in html  # sin placa no se muestra un "(placa )" vacio


@pytest.mark.asyncio
async def test_marking_delivered_sends_email_once():
    order = _order(delivered_at=None)
    with patch.object(shop_orders, "_get_order_by_reference", new=AsyncMock(return_value=order)), \
         patch.object(shop_orders.email, "send_order_delivered_email") as send:
        await shop_orders.update_shop_order_fulfillment("CLK-TEST", ShopOrderFulfillmentUpdate(status="delivered"), "admin", _db())
    send.assert_called_once()
    assert send.call_args.kwargs["customer_email"] == "cliente@correo.com"
    assert order.fulfillment_status == "delivered" and order.delivered_at is not None


@pytest.mark.asyncio
async def test_marking_delivered_again_does_not_resend():
    order = _order(delivered_at=datetime(2026, 10, 1, tzinfo=timezone.utc))
    with patch.object(shop_orders, "_get_order_by_reference", new=AsyncMock(return_value=order)), \
         patch.object(shop_orders.email, "send_order_delivered_email") as send:
        await shop_orders.update_shop_order_fulfillment("CLK-TEST", ShopOrderFulfillmentUpdate(status="delivered"), "admin", _db())
    send.assert_not_called()


@pytest.mark.asyncio
async def test_email_failure_never_breaks_the_status_change():
    order = _order(delivered_at=None)
    with patch.object(shop_orders, "_get_order_by_reference", new=AsyncMock(return_value=order)), \
         patch.object(shop_orders.email, "send_order_delivered_email", side_effect=RuntimeError("resend caido")):
        await shop_orders.update_shop_order_fulfillment("CLK-TEST", ShopOrderFulfillmentUpdate(status="delivered"), "admin", _db())
    assert order.fulfillment_status == "delivered"
