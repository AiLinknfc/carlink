from __future__ import annotations

import uuid
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.models import NfcTokenWhitelist, SalesChannel
from app.routers import shop_orders
from app.routers.shop_orders import WEB_STOCK_WHERE, _alert_low_web_stock, _assign_activation_codes


def _order(quantity: int = 1):
    o = MagicMock()
    o.id = uuid.uuid4()
    o.quantity = quantity
    o.reference = "CLK-TEST"
    return o


def test_web_stock_excludes_partner_and_channel_keychains():
    # Un llavero de canal vendido por la web seria irreversible (el fisico ya esta en otras manos).
    assert "provisioned_by_partner_id IS NULL" in WEB_STOCK_WHERE
    assert "channel_id IS NULL" in WEB_STOCK_WHERE
    assert "status = 'available'" in WEB_STOCK_WHERE
    assert "activation_code_encrypted IS NOT NULL" in WEB_STOCK_WHERE
    assert "suspended_at IS NULL" in WEB_STOCK_WHERE


@pytest.mark.asyncio
async def test_assign_codes_reserves_only_from_web_stock():
    db = MagicMock()
    count_result = MagicMock()
    count_result.scalar.return_value = 0  # ya asignados a este pedido
    update_result = MagicMock()
    update_result.all.return_value = []
    db.execute = AsyncMock(side_effect=[count_result, update_result])
    assert await _assign_activation_codes(_order(), db) == []
    update_sql = str(db.execute.await_args_list[1].args[0])
    assert "channel_id IS NULL" in update_sql
    assert "provisioned_by_partner_id IS NULL" in update_sql


@pytest.mark.asyncio
async def test_low_stock_alert_counts_only_web_stock():
    db = MagicMock()
    result = MagicMock()
    result.scalar.return_value = 100  # holgado: no alerta
    db.execute = AsyncMock(return_value=result)
    with patch.object(shop_orders, "notify_admin", new=AsyncMock()) as notify:
        await _alert_low_web_stock(_order(), assigned=1, db=db)
    assert "channel_id IS NULL" in str(db.execute.await_args.args[0])
    notify.assert_not_called()


@pytest.mark.asyncio
async def test_low_stock_alert_fires_when_stock_is_low_or_order_is_short():
    db = MagicMock()
    result = MagicMock()
    result.scalar.return_value = 0
    db.execute = AsyncMock(return_value=result)
    with patch.object(shop_orders, "notify_admin", new=AsyncMock()) as notify:
        await _alert_low_web_stock(_order(quantity=2), assigned=1, db=db)
    notify.assert_awaited_once()
    kwargs = notify.await_args.kwargs
    assert kwargs["kind"] == "stock_web_low" and kwargs["severity"] == "critical" and kwargs["send_email"] is True


def test_models_and_migration_define_channels():
    assert SalesChannel.__tablename__ == "sales_channels"
    assert "channel_id" in NfcTokenWhitelist.__table__.columns
    sql = (Path(__file__).resolve().parents[2] / "supabase/migrations/067_sales_channels.sql").read_text()
    assert "CREATE TABLE IF NOT EXISTS sales_channels" in sql
    assert "ENABLE ROW LEVEL SECURITY" in sql
    assert "channel_id IS NULL OR provisioned_by_partner_id IS NULL" in sql
