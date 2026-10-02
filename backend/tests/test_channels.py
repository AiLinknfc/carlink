from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.routers import channels
from app.schemas.schemas import ChannelCreate, ChannelMarkDistributed, ChannelProvisionRequest, ChannelUpdate

ADMIN = str(uuid.uuid4())


def _channel(status="active"):
    c = MagicMock()
    c.id = uuid.uuid4()
    c.name = "Shopify"
    c.kind = "tienda_propia"
    c.notes = ""
    c.status = status
    c.created_at = datetime(2026, 10, 2, tzinfo=timezone.utc)
    return c


def _db(scalar=0):
    db = MagicMock()
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.refresh = AsyncMock(side_effect=lambda e: setattr(e, 'id', getattr(e, 'id', None) or uuid.uuid4()))  # la DB real asigna el id
    res = MagicMock()
    res.scalar.return_value = scalar
    res.rowcount = 3
    db.execute = AsyncMock(return_value=res)
    return db


def test_channel_validation():
    with pytest.raises(Exception):
        ChannelCreate(name="x")  # nombre muy corto
    with pytest.raises(Exception):
        ChannelCreate(name="Shopify", kind="partner")  # un canal no es un partner
    with pytest.raises(Exception):
        ChannelUpdate(status="paused")
    assert ChannelCreate(name="Mercado Libre", kind="marketplace").kind == "marketplace"


@pytest.mark.asyncio
async def test_create_channel_rejects_duplicate_name():
    db = _db(scalar=1)
    with pytest.raises(Exception) as e:
        await channels.create_channel(ChannelCreate(name="shopify"), ADMIN, db)
    assert getattr(e.value, "status_code", None) == 409
    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_provision_creates_channel_keychains_outside_web_stock():
    ch = _channel()
    db = _db()
    # encrypt_url depende de ENCRYPTION_KEY (no existe en CI): se fija para que la prueba no dependa del entorno.
    with patch.object(channels, "_get_channel", new=AsyncMock(return_value=ch)), \
         patch.object(channels, "encrypt_url", side_effect=lambda v: f"enc:{v}"):
        items = await channels.provision_channel_keychains(ch.id, ChannelProvisionRequest(quantity=3, note="Lote 1"), ADMIN, db)
    assert len(items) == 3
    assert len({i.activation_code for i in items}) == 3 and len({i.tag_uid for i in items}) == 3
    entries = [c.args[0] for c in db.add.call_args_list]
    assert all(e.channel_id == ch.id for e in entries)            # atribuido al canal
    assert all(e.provisioned_by_partner_id is None for e in entries)  # nunca de partner a la vez
    assert all(e.activation_code_encrypted for e in entries)       # el codigo se puede volver a ver
    assert all(e.status == "available" and e.label == "Lote 1" for e in entries)


@pytest.mark.asyncio
@pytest.mark.parametrize("qty", [0, -1, 51])
async def test_provision_rejects_bad_quantity(qty):
    ch = _channel()
    db = _db()
    with patch.object(channels, "_get_channel", new=AsyncMock(return_value=ch)):
        with pytest.raises(Exception) as e:
            await channels.provision_channel_keychains(ch.id, ChannelProvisionRequest(quantity=qty), ADMIN, db)
    assert e.value.status_code == 400
    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_provision_rejects_closed_channel():
    ch = _channel(status="closed")
    db = _db()
    with patch.object(channels, "_get_channel", new=AsyncMock(return_value=ch)):
        with pytest.raises(Exception) as e:
            await channels.provision_channel_keychains(ch.id, ChannelProvisionRequest(quantity=1), ADMIN, db)
    assert e.value.status_code == 400
    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_mark_distributed_only_touches_channel_keychains_without_date():
    ch = _channel()
    db = _db()
    with patch.object(channels, "_get_channel", new=AsyncMock(return_value=ch)):
        out = await channels.mark_channel_distributed(ch.id, ChannelMarkDistributed(), ADMIN, db)
    assert out.count == 3
    sql = str(db.execute.await_args.args[0])
    assert "channel_id" in sql and "distributed_at IS NULL" in sql
