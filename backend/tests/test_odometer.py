from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.models import OdometerReading, Vehicle
from app.services.maintenance_rules import RuleError, check_mileage
from app.services.odometer import can_correct_initial, reminder_state


def _vehicle(vid, uid):
    v = MagicMock(spec=Vehicle)
    v.id = uuid.UUID(vid)
    v.owner_id = uuid.UUID(uid)
    return v


def _reading(mileage, days_ago=0, hours_ago=0, source="service"):
    r = MagicMock(spec=OdometerReading)
    r.id = uuid.uuid4()
    r.mileage = mileage
    r.source = source
    r.maintenance_record_id = None
    r.recorded_at = datetime.now(timezone.utc) - timedelta(days=days_ago, hours=hours_ago)
    return r


def _res_vehicle(v):
    r = MagicMock()
    r.scalar_one_or_none.return_value = v
    return r


def _res_readings(rows=()):
    r = MagicMock()
    r.scalars.return_value.all.return_value = list(rows)
    return r


def _res_history(rows=()):
    r = MagicMock()
    r.all.return_value = list(rows)
    return r


# ---- Lógica pura ----

def test_reminder_state():
    now = datetime.now(timezone.utc)
    assert reminder_state([], now) == "initial"
    assert reminder_state([_reading(1000, days_ago=10)], now) == "ok"
    assert reminder_state([_reading(1000, days_ago=89)], now) == "ok"
    assert reminder_state([_reading(1000, days_ago=91)], now) == "periodic"
    # Basta una lectura reciente aunque haya otras viejas.
    assert reminder_state([_reading(900, days_ago=200), _reading(1000, days_ago=5)], now) == "ok"


def test_can_correct_initial_only_when_sole_recent_initial():
    now = datetime.now(timezone.utc)
    assert can_correct_initial([_reading(1000, hours_ago=2, source="initial")], now) is not None
    assert can_correct_initial([_reading(1000, hours_ago=49, source="initial")], now) is None
    assert can_correct_initial([_reading(1000, hours_ago=2, source="service")], now) is None
    assert can_correct_initial([_reading(1000, hours_ago=2, source="initial"), _reading(1100)], now) is None


def test_check_mileage_with_readings():
    today = date.today()
    readings = [(today, 50000)]
    check_mileage(50000, today, [], readings)
    check_mileage(50500, today, [], readings)
    with pytest.raises(RuleError):
        check_mileage(49000, today, [], readings)
    # Servicio fechado 10 días atrás con más km que la lectura de hoy: imposible.
    with pytest.raises(RuleError):
        check_mileage(50500, today - timedelta(days=10), [], readings)
    # Una lectura del día siguiente (UTC) cuenta como anterior a un servicio de "hoy" local.
    check_mileage(50500, today - timedelta(days=1), [], [(today, 50000)])


# ---- Endpoints ----

@pytest.mark.asyncio
async def test_status_initial_when_no_readings(client, mock_db, fake_user_id, fake_vehicle_id):
    mock_db.execute = AsyncMock(side_effect=[_res_vehicle(_vehicle(fake_vehicle_id, fake_user_id)), _res_readings()])
    resp = await client.get(f"/api/odometer/vehicle/{fake_vehicle_id}")
    assert resp.status_code == 200
    assert resp.json()["state"] == "initial"
    assert resp.json()["current_mileage"] is None


@pytest.mark.asyncio
async def test_status_periodic_uses_max_mileage(client, mock_db, fake_user_id, fake_vehicle_id):
    readings = [_reading(52000, days_ago=100), _reading(0, days_ago=100)]
    mock_db.execute = AsyncMock(side_effect=[_res_vehicle(_vehicle(fake_vehicle_id, fake_user_id)), _res_readings(readings)])
    body = (await client.get(f"/api/odometer/vehicle/{fake_vehicle_id}")).json()
    assert body["state"] == "periodic"
    assert body["current_mileage"] == 52000


@pytest.mark.asyncio
async def test_initial_creates_reading(client, mock_db, fake_user_id, fake_vehicle_id):
    mock_db.execute = AsyncMock(side_effect=[
        _res_vehicle(_vehicle(fake_vehicle_id, fake_user_id)), _res_readings(), _res_history(),
    ])
    resp = await client.post(f"/api/odometer/vehicle/{fake_vehicle_id}/initial", json={"mileage": 48000})
    assert resp.status_code == 201
    added = mock_db.add.call_args[0][0]
    assert isinstance(added, OdometerReading)
    assert (added.mileage, added.source) == (48000, "initial")
    assert resp.json()["current_mileage"] == 48000


@pytest.mark.asyncio
async def test_initial_conflict_when_already_has_readings(client, mock_db, fake_user_id, fake_vehicle_id):
    mock_db.execute = AsyncMock(side_effect=[
        _res_vehicle(_vehicle(fake_vehicle_id, fake_user_id)), _res_readings([_reading(50000, days_ago=30)]),
    ])
    resp = await client.post(f"/api/odometer/vehicle/{fake_vehicle_id}/initial", json={"mileage": 10})
    assert resp.status_code == 409
    mock_db.add.assert_not_called()


@pytest.mark.asyncio
async def test_initial_can_be_corrected_within_48h(client, mock_db, fake_user_id, fake_vehicle_id):
    existing = _reading(5000, hours_ago=3, source="initial")
    mock_db.execute = AsyncMock(side_effect=[
        _res_vehicle(_vehicle(fake_vehicle_id, fake_user_id)), _res_readings([existing]), _res_history(),
    ])
    resp = await client.post(f"/api/odometer/vehicle/{fake_vehicle_id}/initial", json={"mileage": 50000})
    assert resp.status_code == 201
    assert existing.mileage == 50000
    mock_db.add.assert_not_called()


@pytest.mark.asyncio
async def test_periodic_requires_initial(client, mock_db, fake_user_id, fake_vehicle_id):
    mock_db.execute = AsyncMock(side_effect=[_res_vehicle(_vehicle(fake_vehicle_id, fake_user_id)), _res_readings()])
    resp = await client.post(f"/api/odometer/vehicle/{fake_vehicle_id}/periodic", json={"mileage": 60000})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_periodic_rejects_lower_and_accepts_higher(client, mock_db, fake_user_id, fake_vehicle_id):
    readings = [_reading(60000, days_ago=120)]
    mock_db.execute = AsyncMock(side_effect=[
        _res_vehicle(_vehicle(fake_vehicle_id, fake_user_id)), _res_readings(readings), _res_history(),
    ])
    low = await client.post(f"/api/odometer/vehicle/{fake_vehicle_id}/periodic", json={"mileage": 55000})
    assert low.status_code == 422
    mock_db.execute = AsyncMock(side_effect=[
        _res_vehicle(_vehicle(fake_vehicle_id, fake_user_id)), _res_readings(readings), _res_history(),
    ])
    ok = await client.post(f"/api/odometer/vehicle/{fake_vehicle_id}/periodic", json={"mileage": 63000})
    assert ok.status_code == 201
    assert ok.json()["state"] == "ok"
    assert mock_db.add.call_args[0][0].source == "periodic"


@pytest.mark.asyncio
async def test_odometer_vehicle_not_owned(client, mock_db, fake_user_id, fake_vehicle_id):
    mock_db.execute = AsyncMock(side_effect=[_res_vehicle(None)])
    resp = await client.get(f"/api/odometer/vehicle/{fake_vehicle_id}")
    assert resp.status_code == 404


def test_vehicle_create_initial_mileage_bounds():
    from pydantic import ValidationError

    from app.schemas.schemas import VehicleCreate

    assert VehicleCreate(plate="ABC-123").initial_mileage is None
    assert VehicleCreate(plate="ABC-123", initial_mileage=0).initial_mileage == 0
    for bad in (-1, 3_000_001):
        with pytest.raises(ValidationError):
            VehicleCreate(plate="ABC-123", initial_mileage=bad)
