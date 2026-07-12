from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.models import NfcToken, Vehicle


def _fake_vehicle(id: str, owner_id: str, nfc_active: bool = True) -> MagicMock:
    v = MagicMock(spec=Vehicle)
    v.id = uuid.UUID(id)
    v.owner_id = uuid.UUID(owner_id)
    v.plate = "TEST-123"
    v.city = "Bogotá"
    v.brand = "Test"
    v.model = "Car"
    v.year = 2024
    v.type = "Sedán"
    v.color = "Negro"
    v.image_url = ""
    v.nfc_active = nfc_active
    v.created_at = datetime.now(timezone.utc)
    v.updated_at = datetime.now(timezone.utc)
    return v


def _fake_token(vehicle_id: str, token_hash: str, is_active: bool = True) -> MagicMock:
    t = MagicMock(spec=NfcToken)
    t.id = uuid.uuid4()
    t.vehicle_id = uuid.UUID(vehicle_id)
    t.token_hash = token_hash
    t.token_prefix = "abcd1234"
    t.is_active = is_active
    t.access_count = 0
    t.last_accessed_at = None
    return t


@pytest.mark.asyncio
async def test_toggle_nfc_active_from_true_to_false(client, mock_db, fake_user_id, fake_vehicle_id):
    """PATCH /api/vehicles/{id}/nfc-toggle flips nfc_active True -> False."""
    mock_vehicle = _fake_vehicle(fake_vehicle_id, fake_user_id, nfc_active=True)
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = mock_vehicle
    mock_db.execute = AsyncMock(return_value=vehicle_result)
    mock_db.flush = AsyncMock()
    mock_db.refresh = AsyncMock()

    resp = await client.patch(f"/api/vehicles/{fake_vehicle_id}/nfc-toggle")
    assert resp.status_code == 200
    assert resp.json()["nfc_active"] is False
    assert mock_vehicle.nfc_active is False


@pytest.mark.asyncio
async def test_toggle_nfc_active_from_false_to_true(client, mock_db, fake_user_id, fake_vehicle_id):
    """PATCH toggles nfc_active False -> True."""
    mock_vehicle = _fake_vehicle(fake_vehicle_id, fake_user_id, nfc_active=False)
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = mock_vehicle
    mock_db.execute = AsyncMock(return_value=vehicle_result)
    mock_db.flush = AsyncMock()
    mock_db.refresh = AsyncMock()

    resp = await client.patch(f"/api/vehicles/{fake_vehicle_id}/nfc-toggle")
    assert resp.status_code == 200
    assert resp.json()["nfc_active"] is True
    assert mock_vehicle.nfc_active is True


@pytest.mark.asyncio
async def test_toggle_nfc_active_vehicle_not_found(client, mock_db, fake_user_id):
    """PATCH returns 404 when vehicle does not belong to user."""
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=vehicle_result)

    resp = await client.patch(f"/api/vehicles/{uuid.uuid4()}/nfc-toggle")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_public_nfc_endpoint_hidden_when_inactive(client, mock_db, fake_user_id, fake_vehicle_id):
    """GET /api/nfc/{token} returns 404 when the vehicle's public page is deactivated."""
    raw_token = "a" * 64
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    mock_token = _fake_token(fake_vehicle_id, token_hash, is_active=True)
    token_result = MagicMock()
    token_result.scalar_one_or_none.return_value = mock_token

    mock_vehicle = _fake_vehicle(fake_vehicle_id, fake_user_id, nfc_active=False)
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = mock_vehicle

    mock_db.execute = AsyncMock(side_effect=[token_result, vehicle_result])
    mock_db.flush = AsyncMock()

    resp = await client.get(f"/api/nfc/{raw_token}")
    assert resp.status_code == 404
    assert "desactivada" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_public_nfc_endpoint_visible_when_active(client, mock_db, fake_user_id, fake_vehicle_id):
    """GET /api/nfc/{token} returns vehicle public data when nfc_active is True."""
    raw_token = "b" * 64
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    mock_token = _fake_token(fake_vehicle_id, token_hash, is_active=True)
    token_result = MagicMock()
    token_result.scalar_one_or_none.return_value = mock_token

    mock_vehicle = _fake_vehicle(fake_vehicle_id, fake_user_id, nfc_active=True)
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = mock_vehicle

    mock_db.execute = AsyncMock(side_effect=[token_result, vehicle_result])
    mock_db.flush = AsyncMock()

    resp = await client.get(f"/api/nfc/{raw_token}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["plate"] == "TEST-123"
    assert "owner_id" not in data
