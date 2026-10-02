from __future__ import annotations

from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.routers.admin_notifications import day_bounds
from app.services import admin_notify


def test_day_bounds_uses_colombia_calendar_day():
    start, end = day_bounds(date(2026, 10, 1), date(2026, 10, 1))
    # Bogotá es UTC-5, sin horario de verano: el 1 de octubre empieza 05:00 UTC y termina 05:00 UTC del 2.
    assert start == datetime(2026, 10, 1, 5, 0, tzinfo=timezone.utc)
    assert end == datetime(2026, 10, 2, 5, 0, tzinfo=timezone.utc)


def test_day_bounds_open_ended():
    assert day_bounds(None, None) == (None, None)
    start, end = day_bounds(date(2026, 10, 1), None)
    assert start is not None and end is None


@pytest.mark.asyncio
async def test_notify_admin_never_raises_when_insert_fails():
    db = MagicMock()
    db.begin_nested.side_effect = RuntimeError("tabla no existe")
    with patch.object(admin_notify.email, "send_admin_alert_email") as send:
        await admin_notify.notify_admin(db, kind="order_paid", title="Venta", send_email=True)
    send.assert_not_called()  # sin fila guardada tampoco se manda correo


@pytest.mark.asyncio
async def test_notify_admin_email_failure_does_not_raise():
    db = MagicMock()
    ctx = MagicMock()
    ctx.__aenter__ = AsyncMock(return_value=None)
    ctx.__aexit__ = AsyncMock(return_value=False)
    db.begin_nested.return_value = ctx
    db.flush = AsyncMock()
    with patch.object(admin_notify.email, "send_admin_alert_email", side_effect=RuntimeError("resend caido")):
        await admin_notify.notify_admin(db, kind="order_cod", title="Pedido", send_email=True)
    db.add.assert_called_once()
