from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy import select

from app.models.models import MaintenanceRecord, Vehicle


def _fake_vehicle(id: str, owner_id: str) -> MagicMock:
    v = MagicMock(spec=Vehicle)
    v.id = uuid.UUID(id)
    v.owner_id = uuid.UUID(owner_id)
    v.plate = "TEST-123"
    v.brand = "Test"
    v.model = "Car"
    return v


def _fake_record(overrides: dict | None = None) -> MagicMock:
    r = MagicMock(spec=MaintenanceRecord)
    r.id = uuid.uuid4()
    r.vehicle_id = uuid.uuid4()
    r.workshop_id = None
    r.service_type = "Aceite"
    r.description = "Cambio de aceite"
    r.mileage = 50000
    r.date = date(2026, 7, 7)
    r.workshop = "Taller Test"
    r.cost = Decimal("150.00")
    r.lubricant_brand = ""
    r.lubricant_type = ""
    r.next_service_mileage = None
    r.created_at = datetime.now(timezone.utc)
    if overrides:
        for k, v in overrides.items():
            setattr(r, k, v)
    return r


@pytest.mark.asyncio
async def test_list_maintenance_empty(client, mock_db, fake_user_id, fake_vehicle_id):
    """GET /api/maintenance/vehicle/{id} returns empty list when no records."""
    mock_vehicle = _fake_vehicle(fake_vehicle_id, fake_user_id)
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = mock_vehicle
    records_result = MagicMock()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = []
    records_result.scalars.return_value = scalars_mock
    mock_db.execute = AsyncMock(side_effect=[vehicle_result, records_result])

    resp = await client.get(f"/api/maintenance/vehicle/{fake_vehicle_id}")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_maintenance_with_records(client, mock_db, fake_user_id, fake_vehicle_id):
    """GET returns list of maintenance records."""
    mock_vehicle = _fake_vehicle(fake_vehicle_id, fake_user_id)
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = mock_vehicle

    rec1 = _fake_record({"service_type": "Aceite", "mileage": 50000})
    rec2 = _fake_record({"service_type": "Frenos", "mileage": 52000})
    records_result = MagicMock()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = [rec1, rec2]
    records_result.scalars.return_value = scalars_mock
    mock_db.execute = AsyncMock(side_effect=[vehicle_result, records_result])

    resp = await client.get(f"/api/maintenance/vehicle/{fake_vehicle_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["service_type"] == "Aceite"


@pytest.mark.asyncio
async def test_get_latest_maintenance(client, mock_db, fake_user_id, fake_vehicle_id):
    """GET /api/maintenance/vehicle/{id}/latest returns the most recent record."""
    mock_vehicle = _fake_vehicle(fake_vehicle_id, fake_user_id)
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = mock_vehicle

    rec = _fake_record({"service_type": "Aceite"})
    latest_result = MagicMock()
    latest_result.scalar_one_or_none.return_value = rec
    mock_db.execute = AsyncMock(side_effect=[vehicle_result, latest_result])

    resp = await client.get(f"/api/maintenance/vehicle/{fake_vehicle_id}/latest")
    assert resp.status_code == 200
    data = resp.json()
    assert data["service_type"] == "Aceite"


@pytest.mark.asyncio
async def test_get_latest_maintenance_none(client, mock_db, fake_user_id, fake_vehicle_id):
    """GET latest returns null when no records exist."""
    mock_vehicle = _fake_vehicle(fake_vehicle_id, fake_user_id)
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = mock_vehicle

    latest_result = MagicMock()
    latest_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(side_effect=[vehicle_result, latest_result])

    resp = await client.get(f"/api/maintenance/vehicle/{fake_vehicle_id}/latest")
    assert resp.status_code == 200
    assert resp.json() is None


@pytest.mark.asyncio
async def test_create_maintenance(client, mock_db, fake_user_id, fake_vehicle_id):
    """POST /api/maintenance creates a new record."""
    mock_vehicle = _fake_vehicle(fake_vehicle_id, fake_user_id)
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = mock_vehicle
    mock_db.execute = AsyncMock(return_value=vehicle_result)
    mock_db.flush = AsyncMock()
    mock_db.refresh = AsyncMock()

    body = {
        "vehicle_id": fake_vehicle_id,
        "service_type": "Aceite",
        "description": "Cambio de aceite completo",
        "mileage": 50000,
        "date": "2026-07-07",
        "workshop": "Taller Test",
        "cost": 150.00,
        "lubricant_brand": "Mobil 1",
        "lubricant_type": "5W-30",
        "next_service_mileage": 60000,
    }

    async def _refresh(record):
        record.id = uuid.uuid4()
        record.created_at = datetime.now(timezone.utc)

    mock_db.refresh = AsyncMock(side_effect=_refresh)

    resp = await client.post("/api/maintenance", json=body)
    assert resp.status_code == 201

    mock_db.add.assert_called_once()
    mock_db.flush.assert_awaited_once()
    mock_db.refresh.assert_awaited_once()

    added: MaintenanceRecord = mock_db.add.call_args[0][0]
    assert added.service_type == "Aceite"
    assert added.mileage == 50000
    assert added.lubricant_brand == "Mobil 1"


@pytest.mark.asyncio
async def test_create_maintenance_validation_error(client, mock_db, fake_user_id, fake_vehicle_id):
    """POST returns 422 when required fields are missing."""
    body = {
        "vehicle_id": fake_vehicle_id,
        "description": "test",
    }
    resp = await client.post("/api/maintenance", json=body)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_maintenance_vehicle_not_found(client, mock_db, fake_user_id):
    """POST returns 404 when vehicle does not belong to user."""
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=vehicle_result)

    body = {
        "vehicle_id": str(uuid.uuid4()),
        "service_type": "Aceite",
        "description": "test",
        "mileage": 10000,
        "date": "2026-07-07",
    }
    resp = await client.post("/api/maintenance", json=body)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_maintenance(client, mock_db, fake_user_id, fake_vehicle_id):
    """PUT /api/maintenance/{id} updates an existing record."""
    record_id = str(uuid.uuid4())
    existing = _fake_record({
        "id": uuid.UUID(record_id),
        "vehicle_id": uuid.UUID(fake_vehicle_id),
        "service_type": "Aceite",
        "mileage": 50000,
    })

    mock_vehicle = _fake_vehicle(fake_vehicle_id, fake_user_id)
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = mock_vehicle

    record_result = MagicMock()
    record_result.scalar_one_or_none.return_value = existing
    mock_db.execute = AsyncMock(side_effect=[record_result, vehicle_result])
    mock_db.flush = AsyncMock()
    mock_db.refresh = AsyncMock()

    body = {
        "vehicle_id": fake_vehicle_id,
        "service_type": "Frenos",
        "description": "Cambio de pastillas",
        "mileage": 52000,
    }
    resp = await client.put(f"/api/maintenance/{record_id}", json=body)
    assert resp.status_code == 200
    assert existing.service_type == "Frenos"
    assert existing.mileage == 52000


@pytest.mark.asyncio
async def test_update_maintenance_not_found(client, mock_db, fake_user_id):
    """PUT returns 404 when record does not exist."""
    record_result = MagicMock()
    record_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=record_result)

    body = {
        "vehicle_id": str(uuid.uuid4()),
        "service_type": "Aceite",
        "description": "test",
        "mileage": 10000,
    }
    resp = await client.put(f"/api/maintenance/{uuid.uuid4()}", json=body)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_maintenance(client, mock_db, fake_user_id, fake_vehicle_id):
    """DELETE /api/maintenance/{id} deletes a record."""
    record_id = str(uuid.uuid4())
    existing = _fake_record({
        "id": uuid.UUID(record_id),
        "vehicle_id": uuid.UUID(fake_vehicle_id),
    })

    mock_vehicle = _fake_vehicle(fake_vehicle_id, fake_user_id)
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = mock_vehicle

    record_result = MagicMock()
    record_result.scalar_one_or_none.return_value = existing
    mock_db.execute = AsyncMock(side_effect=[record_result, vehicle_result])
    mock_db.delete = AsyncMock()
    mock_db.flush = AsyncMock()

    resp = await client.delete(f"/api/maintenance/{record_id}")
    assert resp.status_code == 204
    mock_db.delete.assert_awaited_once_with(existing)


@pytest.mark.asyncio
async def test_delete_maintenance_not_found(client, mock_db, fake_user_id):
    """DELETE returns 404 when record does not exist."""
    record_result = MagicMock()
    record_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=record_result)

    resp = await client.delete(f"/api/maintenance/{uuid.uuid4()}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_maintenance_requires_auth(client, override_deps):
    """GET returns 401 without auth token."""
    from app.main import app as _app
    _app.dependency_overrides.clear()

    resp = await client.get("/api/maintenance/vehicle/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_create_maintenance_minimal_fields(client, mock_db, fake_user_id, fake_vehicle_id):
    """POST succeeds with only required fields."""
    mock_vehicle = _fake_vehicle(fake_vehicle_id, fake_user_id)
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = mock_vehicle
    mock_db.execute = AsyncMock(return_value=vehicle_result)
    mock_db.flush = AsyncMock()

    async def _refresh(record):
        record.id = uuid.uuid4()
        record.date = date.today()
        record.created_at = datetime.now(timezone.utc)

    mock_db.refresh = AsyncMock(side_effect=_refresh)

    body = {
        "vehicle_id": fake_vehicle_id,
        "service_type": "Aceite",
        "description": "Cambio simple",
        "mileage": 30000,
    }
    resp = await client.post("/api/maintenance", json=body)
    assert resp.status_code == 201
