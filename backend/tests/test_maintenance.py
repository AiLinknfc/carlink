from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy import select

from app.models.models import MaintenanceRecord, OdometerReading, Part, Vehicle


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
    r.lubricant_product = ""
    r.next_service_mileage = None
    r.source_work_order_id = None
    r.origin = "user"
    r.lubricant_use = "motor"
    r.support_url = ""
    r.created_at = datetime.now(timezone.utc)
    if overrides:
        for k, v in overrides.items():
            setattr(r, k, v)
    return r


def _readings_result(rows=()):
    """Resultado de list_readings (scalars().all()) — lecturas de odómetro del vehículo."""
    r = MagicMock()
    r.scalars.return_value.all.return_value = list(rows)
    return r


def _no_linked():
    r = MagicMock()
    r.scalar_one_or_none.return_value = None
    return r


def _history_result(rows=()):
    """Resultado de la consulta (id, fecha, km) del historial que ahora hacen POST y PUT."""
    r = MagicMock()
    r.all.return_value = list(rows)
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
        "date": date.today().isoformat(),
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

    # El registro y su lectura de odómetro (source=service).
    kinds = [type(c.args[0]).__name__ for c in mock_db.add.call_args_list]
    assert kinds == ["MaintenanceRecord", "OdometerReading"]
    assert mock_db.flush.await_count == 2  # registro, luego su lectura de odómetro
    mock_db.refresh.assert_awaited_once()

    added: MaintenanceRecord = mock_db.add.call_args_list[0][0][0]
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
        "lubricant_brand": "Mobil 1", "lubricant_type": "5W-30",
        "mileage": 50000,
    })

    mock_vehicle = _fake_vehicle(fake_vehicle_id, fake_user_id)
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = mock_vehicle

    record_result = MagicMock()
    record_result.scalar_one_or_none.return_value = existing
    mock_db.execute = AsyncMock(side_effect=[record_result, vehicle_result, _history_result(), _readings_result(), _no_linked()])
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
        "lubricant_brand": "Mobil 1", "lubricant_type": "5W-30",
        "description": "Cambio simple",
        "mileage": 30000,
    }
    resp = await client.post("/api/maintenance", json=body)
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_create_maintenance_creates_replaced_part(client, mock_db, fake_user_id, fake_vehicle_id):
    """POST con replaced_parts crea la pieza en la misma transaccion (2026-09-30: antes esto era
    una segunda llamada aparte desde el frontend que se podia perder)."""
    mock_vehicle = _fake_vehicle(fake_vehicle_id, fake_user_id)
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = mock_vehicle
    no_existing_part = MagicMock()
    no_existing_part.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(side_effect=[vehicle_result, _history_result(), _readings_result(), no_existing_part])
    mock_db.flush = AsyncMock()

    async def _refresh(record):
        record.id = uuid.uuid4()
        record.date = date.today()
        record.created_at = datetime.now(timezone.utc)

    mock_db.refresh = AsyncMock(side_effect=_refresh)

    body = {
        "vehicle_id": fake_vehicle_id,
        "service_type": "Aceite",
        "lubricant_brand": "Mobil 1", "lubricant_type": "5W-30",
        "description": "Cambio de pastillas",
        "mileage": 52000,
        "replaced_parts": [{"name": "Pastillas de freno", "category": "Frenos", "lifespan_mileage": 20000}],
    }
    resp = await client.post("/api/maintenance", json=body)
    assert resp.status_code == 201
    assert mock_db.add.call_count == 3  # registro + lectura + pieza
    added_part = next(c.args[0] for c in mock_db.add.call_args_list if isinstance(c.args[0], Part))
    assert added_part.name == "Pastillas de freno"
    assert added_part.category == "Frenos"
    assert added_part.mileage_installed == 52000
    assert added_part.lifespan_mileage == 20000
    assert added_part.status == "ok"


@pytest.mark.asyncio
async def test_create_maintenance_updates_existing_replaced_part(client, mock_db, fake_user_id, fake_vehicle_id):
    """Si ya existe una pieza con ese nombre en el vehiculo, se actualiza en vez de duplicarla."""
    mock_vehicle = _fake_vehicle(fake_vehicle_id, fake_user_id)
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = mock_vehicle
    existing_part = MagicMock(spec=Part)
    existing_part.mileage_installed = 30000
    existing_part.lifespan_mileage = 15000
    existing_part.status = "worn"
    existing_part_result = MagicMock()
    existing_part_result.scalar_one_or_none.return_value = existing_part
    mock_db.execute = AsyncMock(side_effect=[vehicle_result, _history_result(), _readings_result(), existing_part_result])
    mock_db.flush = AsyncMock()

    async def _refresh(record):
        record.id = uuid.uuid4()
        record.date = date.today()
        record.created_at = datetime.now(timezone.utc)

    mock_db.refresh = AsyncMock(side_effect=_refresh)

    body = {
        "vehicle_id": fake_vehicle_id,
        "service_type": "Aceite",
        "lubricant_brand": "Mobil 1", "lubricant_type": "5W-30",
        "description": "Cambio de pastillas",
        "mileage": 52000,
        "replaced_parts": [{"name": "Pastillas de freno", "category": "Frenos", "lifespan_mileage": 20000}],
    }
    resp = await client.post("/api/maintenance", json=body)
    assert resp.status_code == 201
    # registro + su lectura de odómetro — la pieza se actualiza, no se crea
    assert mock_db.add.call_count == 2
    assert not any(isinstance(c.args[0], Part) for c in mock_db.add.call_args_list)
    assert existing_part.mileage_installed == 52000
    assert existing_part.lifespan_mileage == 20000
    assert existing_part.status == "ok"


# ---- Reglas de integridad del historial (Fase 1) ----

def _post_body(fake_vehicle_id, **over):
    body = {"vehicle_id": fake_vehicle_id, "service_type": "Aceite", "mileage": 52000, "lubricant_brand": "Mobil 1", "lubricant_type": "5W-30"}
    body.update(over)
    return body


async def _setup_post(mock_db, fake_user_id, fake_vehicle_id, history=()):
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = _fake_vehicle(fake_vehicle_id, fake_user_id)
    mock_db.execute = AsyncMock(side_effect=[vehicle_result, _history_result(history), _readings_result()])

    async def _refresh(record):
        record.id = uuid.uuid4()
        record.created_at = datetime.now(timezone.utc)

    mock_db.refresh = AsyncMock(side_effect=_refresh)


@pytest.mark.asyncio
async def test_create_rejects_future_date(client, mock_db, fake_user_id, fake_vehicle_id):
    await _setup_post(mock_db, fake_user_id, fake_vehicle_id)
    future = (date.today() + timedelta(days=5)).isoformat()
    resp = await client.post("/api/maintenance", json=_post_body(fake_vehicle_id, date=future))
    assert resp.status_code == 422
    assert "futura" in resp.json()["detail"]
    mock_db.add.assert_not_called()


@pytest.mark.asyncio
async def test_create_rejects_date_older_than_30_days(client, mock_db, fake_user_id, fake_vehicle_id):
    await _setup_post(mock_db, fake_user_id, fake_vehicle_id)
    old = (date.today() - timedelta(days=31)).isoformat()
    resp = await client.post("/api/maintenance", json=_post_body(fake_vehicle_id, date=old))
    assert resp.status_code == 422
    assert "30 días" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_create_accepts_date_30_days_back_and_defaults_to_today(client, mock_db, fake_user_id, fake_vehicle_id):
    await _setup_post(mock_db, fake_user_id, fake_vehicle_id)
    edge = (date.today() - timedelta(days=30)).isoformat()
    assert (await client.post("/api/maintenance", json=_post_body(fake_vehicle_id, date=edge))).status_code == 201
    await _setup_post(mock_db, fake_user_id, fake_vehicle_id)
    assert (await client.post("/api/maintenance", json=_post_body(fake_vehicle_id))).status_code == 201
    created = [c.args[0] for c in mock_db.add.call_args_list if isinstance(c.args[0], MaintenanceRecord)][-1]
    assert created.date == date.today()


@pytest.mark.asyncio
async def test_create_rejects_mileage_below_previous(client, mock_db, fake_user_id, fake_vehicle_id):
    prev = [(uuid.uuid4(), date.today() - timedelta(days=10), 60000)]
    await _setup_post(mock_db, fake_user_id, fake_vehicle_id, history=prev)
    resp = await client.post("/api/maintenance", json=_post_body(fake_vehicle_id, mileage=55000))
    assert resp.status_code == 422
    assert "menor" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_create_rejects_absurd_mileage_jump(client, mock_db, fake_user_id, fake_vehicle_id):
    prev = [(uuid.uuid4(), date.today() - timedelta(days=10), 60000)]
    await _setup_post(mock_db, fake_user_id, fake_vehicle_id, history=prev)
    resp = await client.post("/api/maintenance", json=_post_body(fake_vehicle_id, mileage=200000))
    assert resp.status_code == 422
    assert "muy alto" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_create_rejects_negative_cost(client, mock_db, fake_user_id, fake_vehicle_id):
    await _setup_post(mock_db, fake_user_id, fake_vehicle_id)
    resp = await client.post("/api/maintenance", json=_post_body(fake_vehicle_id, cost=-5))
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_ignores_client_workshop_id(client, mock_db, fake_user_id, fake_vehicle_id):
    """Un usuario no puede atribuirse un taller: sin esto el historial mostraba "Del taller"."""
    await _setup_post(mock_db, fake_user_id, fake_vehicle_id)
    resp = await client.post("/api/maintenance", json=_post_body(fake_vehicle_id, workshop_id=str(uuid.uuid4())))
    assert resp.status_code == 201
    created = next(c.args[0] for c in mock_db.add.call_args_list if isinstance(c.args[0], MaintenanceRecord))
    assert created.workshop_id is None


def _update_setup(mock_db, fake_user_id, fake_vehicle_id, existing, history=()):
    record_result = MagicMock()
    record_result.scalar_one_or_none.return_value = existing
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = _fake_vehicle(fake_vehicle_id, fake_user_id)
    mock_db.execute = AsyncMock(side_effect=[record_result, vehicle_result, _history_result(history)])


@pytest.mark.asyncio
async def test_update_rejects_workshop_record(client, mock_db, fake_user_id, fake_vehicle_id):
    existing = _fake_record({"vehicle_id": uuid.UUID(fake_vehicle_id), "source_work_order_id": uuid.uuid4()})
    _update_setup(mock_db, fake_user_id, fake_vehicle_id, existing)
    resp = await client.put(f"/api/maintenance/{existing.id}", json=_post_body(fake_vehicle_id))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_delete_rejects_workshop_record(client, mock_db, fake_user_id, fake_vehicle_id):
    existing = _fake_record({"vehicle_id": uuid.UUID(fake_vehicle_id), "workshop_id": uuid.uuid4()})
    _update_setup(mock_db, fake_user_id, fake_vehicle_id, existing)
    resp = await client.delete(f"/api/maintenance/{existing.id}")
    assert resp.status_code == 403
    mock_db.delete.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_cannot_move_record_to_another_vehicle(client, mock_db, fake_user_id, fake_vehicle_id):
    existing = _fake_record({"vehicle_id": uuid.UUID(fake_vehicle_id)})
    _update_setup(mock_db, fake_user_id, fake_vehicle_id, existing)
    resp = await client.put(f"/api/maintenance/{existing.id}", json=_post_body(str(uuid.uuid4())))
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_update_old_record_without_touching_date_or_km_is_allowed(client, mock_db, fake_user_id, fake_vehicle_id):
    """Un registro viejo (fuera de la ventana de 30 días) se puede corregir si no se toca fecha ni km."""
    existing = _fake_record({"vehicle_id": uuid.UUID(fake_vehicle_id), "date": date(2026, 1, 1), "mileage": 50000})
    _update_setup(mock_db, fake_user_id, fake_vehicle_id, existing)
    body = _post_body(fake_vehicle_id, mileage=50000, date="2026-01-01", description="Corregido")
    resp = await client.put(f"/api/maintenance/{existing.id}", json=body)
    assert resp.status_code == 200


# ---- Historial anterior (origin=prior, soporte obligatorio) ----

def _prior_body(fake_vehicle_id, fake_user_id, **over):
    body = {
        "vehicle_id": fake_vehicle_id, "service_type": "Aceite", "mileage": 30000,
        "date": (date.today() - timedelta(days=200)).isoformat(),
        "support_url": f"/api/upload/files/{fake_user_id}/factura.jpg",
    }
    body.update(over)
    return body


def _setup_prior(mock_db, fake_user_id, fake_vehicle_id, readings=()):
    v = _fake_vehicle(fake_vehicle_id, fake_user_id)
    v.created_at = datetime.now(timezone.utc) - timedelta(days=60)
    v.year = 0
    vr = MagicMock()
    vr.scalar_one_or_none.return_value = v
    mock_db.execute = AsyncMock(side_effect=[vr, _history_result(), _readings_result(readings)])

    async def _refresh(record):
        record.id = uuid.uuid4()
        record.created_at = datetime.now(timezone.utc)

    mock_db.refresh = AsyncMock(side_effect=_refresh)


@pytest.mark.asyncio
async def test_prior_creates_record_without_reading_or_parts(client, mock_db, fake_user_id, fake_vehicle_id):
    _setup_prior(mock_db, fake_user_id, fake_vehicle_id)
    resp = await client.post("/api/maintenance/prior", json=_prior_body(fake_vehicle_id, fake_user_id))
    assert resp.status_code == 201
    assert resp.json()["origin"] == "prior"
    added = [c.args[0] for c in mock_db.add.call_args_list]
    assert len(added) == 1 and isinstance(added[0], MaintenanceRecord)  # sin lectura de odómetro ni piezas
    assert added[0].origin == "prior" and added[0].next_service_mileage is None


@pytest.mark.asyncio
async def test_prior_requires_support(client, mock_db, fake_user_id, fake_vehicle_id):
    _setup_prior(mock_db, fake_user_id, fake_vehicle_id)
    body = _prior_body(fake_vehicle_id, fake_user_id)
    del body["support_url"]
    assert (await client.post("/api/maintenance/prior", json=body)).status_code == 422
    _setup_prior(mock_db, fake_user_id, fake_vehicle_id)
    bad = _prior_body(fake_vehicle_id, fake_user_id, support_url="https://evil.example/x.jpg")
    assert (await client.post("/api/maintenance/prior", json=bad)).status_code == 422


@pytest.mark.asyncio
async def test_prior_rejects_date_after_join(client, mock_db, fake_user_id, fake_vehicle_id):
    _setup_prior(mock_db, fake_user_id, fake_vehicle_id)
    recent = (date.today() - timedelta(days=5)).isoformat()  # el vehículo se registró hace 60 días
    resp = await client.post("/api/maintenance/prior", json=_prior_body(fake_vehicle_id, fake_user_id, date=recent))
    assert resp.status_code == 422
    assert "antes de registrar" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_prior_mileage_cannot_exceed_initial_reading(client, mock_db, fake_user_id, fake_vehicle_id):
    initial = MagicMock(spec=OdometerReading)
    initial.mileage = 40000
    initial.maintenance_record_id = None
    initial.recorded_at = datetime.now(timezone.utc) - timedelta(days=60)
    _setup_prior(mock_db, fake_user_id, fake_vehicle_id, readings=[initial])
    resp = await client.post("/api/maintenance/prior", json=_prior_body(fake_vehicle_id, fake_user_id, mileage=45000))
    assert resp.status_code == 422
    _setup_prior(mock_db, fake_user_id, fake_vehicle_id, readings=[initial])
    ok = await client.post("/api/maintenance/prior", json=_prior_body(fake_vehicle_id, fake_user_id, mileage=39000))
    assert ok.status_code == 201


@pytest.mark.asyncio
async def test_prior_record_cannot_be_edited_and_delete_expires(client, mock_db, fake_user_id, fake_vehicle_id):
    old = _fake_record({"vehicle_id": uuid.UUID(fake_vehicle_id), "origin": "prior",
                        "created_at": datetime.now(timezone.utc) - timedelta(hours=49)})
    _update_setup(mock_db, fake_user_id, fake_vehicle_id, old)
    assert (await client.put(f"/api/maintenance/{old.id}", json=_post_body(fake_vehicle_id))).status_code == 403
    _update_setup(mock_db, fake_user_id, fake_vehicle_id, old)
    assert (await client.delete(f"/api/maintenance/{old.id}")).status_code == 403
    fresh = _fake_record({"vehicle_id": uuid.UUID(fake_vehicle_id), "origin": "prior",
                          "created_at": datetime.now(timezone.utc) - timedelta(hours=2)})
    _update_setup(mock_db, fake_user_id, fake_vehicle_id, fresh)
    assert (await client.delete(f"/api/maintenance/{fresh.id}")).status_code == 204



# ---- Aceite usado obligatorio y próximo servicio coherente ----

@pytest.mark.asyncio
async def test_oil_change_requires_brand_and_viscosity(client, mock_db, fake_user_id, fake_vehicle_id):
    for extra in ({}, {"lubricant_brand": "Mobil 1"}, {"lubricant_type": "5W-30"}, {"lubricant_brand": " ", "lubricant_type": "5W-30"}):
        await _setup_post(mock_db, fake_user_id, fake_vehicle_id)
        resp = await client.post("/api/maintenance", json={"vehicle_id": fake_vehicle_id, "service_type": "Aceite", "mileage": 52000, **extra})
        assert resp.status_code == 422, extra
        assert "aceite utilizado" in resp.json()["detail"]
    mock_db.add.assert_not_called()


@pytest.mark.asyncio
async def test_other_services_do_not_require_oil(client, mock_db, fake_user_id, fake_vehicle_id):
    v = _fake_vehicle(fake_vehicle_id, fake_user_id)
    vr = MagicMock(); vr.scalar_one_or_none.return_value = v
    plan = MagicMock(); plan.scalar.return_value = "taller"
    mock_db.execute = AsyncMock(side_effect=[vr, plan, _history_result(), _readings_result()])

    async def _refresh(record):
        record.id = uuid.uuid4(); record.created_at = datetime.now(timezone.utc)

    mock_db.refresh = AsyncMock(side_effect=_refresh)
    resp = await client.post("/api/maintenance", json={"vehicle_id": fake_vehicle_id, "service_type": "Frenos", "mileage": 52000})
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_next_service_must_be_greater_than_mileage(client, mock_db, fake_user_id, fake_vehicle_id):
    base = {"vehicle_id": fake_vehicle_id, "service_type": "Aceite", "mileage": 2000, "lubricant_brand": "Mobil 1", "lubricant_type": "5W-30"}
    for nxt in (2000, 1500):  # el error real: mismo valor en kilometraje y próximo servicio
        await _setup_post(mock_db, fake_user_id, fake_vehicle_id)
        resp = await client.post("/api/maintenance", json={**base, "next_service_mileage": nxt})
        assert resp.status_code == 422 and "mayor al kilometraje" in resp.json()["detail"]
    await _setup_post(mock_db, fake_user_id, fake_vehicle_id)
    resp = await client.post("/api/maintenance", json={**base, "next_service_mileage": 2000 + 200000})
    assert resp.status_code == 422 and "lejano" in resp.json()["detail"]
    await _setup_post(mock_db, fake_user_id, fake_vehicle_id)
    assert (await client.post("/api/maintenance", json={**base, "next_service_mileage": 10000})).status_code == 201


# ---- Marca y referencia del repuesto (filtros) ----

@pytest.mark.asyncio
async def test_replaced_part_stores_brand_and_reference(client, mock_db, fake_user_id, fake_vehicle_id):
    v = _fake_vehicle(fake_vehicle_id, fake_user_id)
    vr = MagicMock(); vr.scalar_one_or_none.return_value = v
    plan = MagicMock(); plan.scalar.return_value = "taller"
    no_part = MagicMock(); no_part.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(side_effect=[vr, plan, _history_result(), _readings_result(), no_part])

    async def _refresh(record):
        record.id = uuid.uuid4(); record.created_at = datetime.now(timezone.utc)

    mock_db.refresh = AsyncMock(side_effect=_refresh)
    body = {"vehicle_id": fake_vehicle_id, "service_type": "Aire", "mileage": 30000,
            "replaced_parts": [{"name": "Filtro de habitáculo", "category": "Filtros", "lifespan_mileage": 15000,
                                "brand": " Bosch ", "part_number": "0 986 AF4 121"}]}
    resp = await client.post("/api/maintenance", json=body)
    assert resp.status_code == 201
    part = next(c.args[0] for c in mock_db.add.call_args_list if isinstance(c.args[0], Part))
    assert (part.brand, part.part_number) == ("Bosch", "0 986 AF4 121")


@pytest.mark.asyncio
async def test_replaced_part_without_brand_keeps_existing(client, mock_db, fake_user_id, fake_vehicle_id):
    v = _fake_vehicle(fake_vehicle_id, fake_user_id)
    vr = MagicMock(); vr.scalar_one_or_none.return_value = v
    plan = MagicMock(); plan.scalar.return_value = "taller"
    existing = MagicMock(spec=Part); existing.brand = "Mann"; existing.part_number = "C 25 114"
    ex = MagicMock(); ex.scalar_one_or_none.return_value = existing
    mock_db.execute = AsyncMock(side_effect=[vr, plan, _history_result(), _readings_result(), ex])

    async def _refresh(record):
        record.id = uuid.uuid4(); record.created_at = datetime.now(timezone.utc)

    mock_db.refresh = AsyncMock(side_effect=_refresh)
    body = {"vehicle_id": fake_vehicle_id, "service_type": "Aire", "mileage": 30000,
            "replaced_parts": [{"name": "Filtro de aire", "category": "Filtros", "lifespan_mileage": 15000}]}
    assert (await client.post("/api/maintenance", json=body)).status_code == 201
    assert (existing.brand, existing.part_number) == ("Mann", "C 25 114")


# ---- Lubricante de motor, caja o transmisión ----

@pytest.mark.asyncio
async def test_lubricant_use_is_stored_and_defaults_to_motor(client, mock_db, fake_user_id, fake_vehicle_id):
    base = {"vehicle_id": fake_vehicle_id, "service_type": "Aceite", "mileage": 52000, "lubricant_brand": "Motul", "lubricant_type": "75W-90"}
    await _setup_post(mock_db, fake_user_id, fake_vehicle_id)
    assert (await client.post("/api/maintenance", json={**base, "lubricant_use": "caja"})).status_code == 201
    rec = next(c.args[0] for c in mock_db.add.call_args_list if isinstance(c.args[0], MaintenanceRecord))
    assert rec.lubricant_use == "caja"
    await _setup_post(mock_db, fake_user_id, fake_vehicle_id)
    assert (await client.post("/api/maintenance", json=base)).status_code == 201
    rec = [c.args[0] for c in mock_db.add.call_args_list if isinstance(c.args[0], MaintenanceRecord)][-1]
    assert rec.lubricant_use == "motor"


@pytest.mark.asyncio
async def test_invalid_lubricant_use_is_rejected(client, mock_db, fake_user_id, fake_vehicle_id):
    await _setup_post(mock_db, fake_user_id, fake_vehicle_id)
    resp = await client.post("/api/maintenance", json={"vehicle_id": fake_vehicle_id, "service_type": "Aceite", "mileage": 52000,
                                                      "lubricant_brand": "X", "lubricant_type": "Y", "lubricant_use": "freno"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_gearbox_oil_still_requires_brand_and_type(client, mock_db, fake_user_id, fake_vehicle_id):
    await _setup_post(mock_db, fake_user_id, fake_vehicle_id)
    resp = await client.post("/api/maintenance", json={"vehicle_id": fake_vehicle_id, "service_type": "Aceite", "mileage": 52000, "lubricant_use": "transmision"})
    assert resp.status_code == 422 and "aceite utilizado" in resp.json()["detail"]
