from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.models import Vehicle

"""Plan gratuito (2026-09-18): una cuenta persona sin llavero personal activo
en el vehículo solo registra servicios de aceite y no publica al exterior."""


def _vehicle(vid: str, uid: str, **kw) -> MagicMock:
    v = MagicMock(spec=Vehicle)
    v.id = uuid.UUID(vid)
    v.owner_id = uuid.UUID(uid)
    v.plate = "ABC-123"
    v.nfc_active = kw.get("nfc_active", False)
    v.sell_enabled = kw.get("sell_enabled", False)
    return v


def _res(**attrs) -> MagicMock:
    r = MagicMock()
    for k, val in attrs.items():
        getattr(r, k).return_value = val
    return r


def _sequence(vehicle, account_type, active_keychains):
    """verify_vehicle -> perfil.account_type -> llaveros personales activos."""
    return AsyncMock(side_effect=[
        _res(scalar_one_or_none=vehicle),
        _res(scalar=account_type),
        _res(scalar=active_keychains),
    ])


def _body(vid: str, service_type: str) -> dict:
    return {"vehicle_id": vid, "service_type": service_type, "description": "x", "mileage": 1000, "date": "2026-07-07"}


async def _refresh(record):
    record.id = uuid.uuid4()
    record.created_at = datetime.now(timezone.utc)


@pytest.mark.anyio
async def test_free_persona_can_register_oil(client, mock_db, fake_user_id, fake_vehicle_id):
    v = _vehicle(fake_vehicle_id, fake_user_id)
    mock_db.execute = AsyncMock(side_effect=[_res(scalar_one_or_none=v)])
    mock_db.refresh = AsyncMock(side_effect=_refresh)
    resp = await client.post("/api/maintenance", json=_body(fake_vehicle_id, "Aceite"))
    assert resp.status_code == 201


@pytest.mark.anyio
async def test_free_persona_blocked_on_other_services(client, mock_db, fake_user_id, fake_vehicle_id):
    v = _vehicle(fake_vehicle_id, fake_user_id)
    mock_db.execute = _sequence(v, "persona", 0)
    resp = await client.post("/api/maintenance", json=_body(fake_vehicle_id, "Frenos"))
    assert resp.status_code == 403
    assert mock_db.add.call_count == 0


@pytest.mark.anyio
async def test_persona_with_active_keychain_can_register_any_service(client, mock_db, fake_user_id, fake_vehicle_id):
    v = _vehicle(fake_vehicle_id, fake_user_id)
    mock_db.execute = _sequence(v, "persona", 1)
    mock_db.refresh = AsyncMock(side_effect=_refresh)
    resp = await client.post("/api/maintenance", json=_body(fake_vehicle_id, "Frenos"))
    assert resp.status_code == 201


@pytest.mark.anyio
async def test_taller_is_not_subject_to_free_plan(client, mock_db, fake_user_id, fake_vehicle_id):
    v = _vehicle(fake_vehicle_id, fake_user_id)
    mock_db.execute = AsyncMock(side_effect=[_res(scalar_one_or_none=v), _res(scalar="taller")])
    mock_db.refresh = AsyncMock(side_effect=_refresh)
    resp = await client.post("/api/maintenance", json=_body(fake_vehicle_id, "Frenos"))
    assert resp.status_code == 201


@pytest.mark.anyio
async def test_free_persona_cannot_publish_for_sale(client, mock_db, fake_user_id, fake_vehicle_id):
    v = _vehicle(fake_vehicle_id, fake_user_id)
    mock_db.execute = AsyncMock(side_effect=[
        _res(scalar_one_or_none=v), _res(scalar="persona"), _res(scalar=0),
    ])
    resp = await client.put(f"/api/vehicles/{fake_vehicle_id}", json={"sell_enabled": True})
    assert resp.status_code == 403


@pytest.mark.anyio
async def test_free_persona_cannot_turn_public_ficha_on(client, mock_db, fake_user_id, fake_vehicle_id):
    v = _vehicle(fake_vehicle_id, fake_user_id, nfc_active=False)
    mock_db.execute = AsyncMock(side_effect=[
        _res(scalar_one_or_none=v), _res(scalar="persona"), _res(scalar=0),
    ])
    resp = await client.patch(f"/api/vehicles/{fake_vehicle_id}/nfc-toggle")
    assert resp.status_code == 403
    assert v.nfc_active is False


@pytest.mark.anyio
async def test_free_persona_blocked_on_gallery_upload(client, mock_db, fake_user_id, fake_vehicle_id):
    v = _vehicle(fake_vehicle_id, fake_user_id)
    mock_db.execute = _sequence(v, "persona", 0)
    resp = await client.post("/api/gallery", json={"vehicle_id": fake_vehicle_id, "image_url": "https://x/y.jpg"})
    assert resp.status_code == 403
