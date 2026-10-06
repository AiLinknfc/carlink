from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
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


def _res_readings() -> MagicMock:
    r = MagicMock()
    r.scalars.return_value.all.return_value = []
    return r


def _sequence(vehicle, account_type, active_keychains, history=False):
    """verify_vehicle -> perfil.account_type -> llaveros personales activos (-> historial de km)."""
    results = [
        _res(scalar_one_or_none=vehicle),
        _res(scalar=account_type),
        _res(scalar=active_keychains),
    ]
    if history:
        results.append(_res(all=[]))
        results.append(_res_readings())
    return AsyncMock(side_effect=results)


def _body(vid: str, service_type: str) -> dict:
    body = {"vehicle_id": vid, "service_type": service_type, "description": "x", "mileage": 1000, "date": date.today().isoformat()}
    if service_type == "Aceite":  # el cambio de aceite exige decir qué aceite se usó
        body.update(lubricant_brand="Mobil 1", lubricant_type="5W-30")
    return body


async def _refresh(record):
    record.id = uuid.uuid4()
    record.created_at = datetime.now(timezone.utc)


@pytest.mark.anyio
async def test_free_persona_can_register_oil(client, mock_db, fake_user_id, fake_vehicle_id):
    v = _vehicle(fake_vehicle_id, fake_user_id)
    mock_db.execute = AsyncMock(side_effect=[_res(scalar_one_or_none=v), _res(all=[]), _res_readings()])
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
    mock_db.execute = _sequence(v, "persona", 1, history=True)
    mock_db.refresh = AsyncMock(side_effect=_refresh)
    resp = await client.post("/api/maintenance", json=_body(fake_vehicle_id, "Frenos"))
    assert resp.status_code == 201


@pytest.mark.anyio
async def test_taller_is_not_subject_to_free_plan(client, mock_db, fake_user_id, fake_vehicle_id):
    v = _vehicle(fake_vehicle_id, fake_user_id)
    mock_db.execute = AsyncMock(side_effect=[_res(scalar_one_or_none=v), _res(scalar="taller"), _res(all=[]), _res_readings()])
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
