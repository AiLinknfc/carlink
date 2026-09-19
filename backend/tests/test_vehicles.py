from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.models import Profile

"""POST /vehicles — coverage for the free-trial-ficha gating rule decided
2026-08-07: a taller/empresa account's free 7-day trial only mints for its
FIRST vehicle. Before this, every vehicle a business account ever created
got its own unlimited free trial (see backend/app/routers/vehicles.py)."""


def _fake_profile(user_id: str, account_type: str) -> MagicMock:
    p = MagicMock(spec=Profile)
    p.id = uuid.UUID(user_id)
    p.account_type = account_type
    return p


def _mock_execute_sequence(profile, plate_conflict, other_vehicles_count, reserved_by_other=0):
    """Builds the 4 `db.execute` results `create_vehicle` consumes in order:
    ensure_profile's lookup, the plate-uniqueness check, the "reserved by
    another account" check, then the first-vehicle count — before it ever touches `db.add`/`db.flush`."""
    profile_result = MagicMock()
    profile_result.scalar_one_or_none.return_value = profile

    plate_result = MagicMock()
    plate_result.scalar_one_or_none.return_value = plate_conflict

    reserved_result = MagicMock()
    reserved_result.scalar.return_value = reserved_by_other

    count_result = MagicMock()
    count_result.scalar.return_value = other_vehicles_count

    return AsyncMock(side_effect=[profile_result, plate_result, reserved_result, count_result])


async def _refresh(vehicle):
    """`vehicle` is a real `Vehicle()` ORM instance built by `create_vehicle`
    itself (not a mock) — its column `default=` values only apply on a real
    DB insert, which `db.flush()` being mocked never actually does. Fill in
    what a real refresh-after-insert would have populated."""
    if vehicle.id is None:
        vehicle.id = uuid.uuid4()
    vehicle.nfc_active = False
    vehicle.sell_enabled = False
    vehicle.sell_price = ""
    vehicle.sell_city = ""
    vehicle.sell_zip = ""
    vehicle.sell_phone = ""
    vehicle.sell_description = ""
    vehicle.lost_keychain_enabled = False
    vehicle.georeference_enabled = False
    vehicle.body_type = ""
    vehicle.owner_name = ""
    vehicle.verification_status = "unverified"
    vehicle.verification_doc_url = ""
    vehicle.verification_doc_url_back = ""
    vehicle.verification_note = ""
    vehicle.verification_requested_at = None
    vehicle.verified_at = None
    vehicle.vehicle_condition = "usado"
    vehicle.created_at = datetime.now(timezone.utc)
    vehicle.updated_at = datetime.now(timezone.utc)


@pytest.mark.anyio
async def test_first_vehicle_for_taller_gets_free_trial(client, mock_db, fake_user_id):
    profile = _fake_profile(fake_user_id, "taller")
    mock_db.execute = _mock_execute_sequence(profile, plate_conflict=None, other_vehicles_count=0)
    mock_db.flush = AsyncMock()
    mock_db.refresh = AsyncMock(side_effect=_refresh)

    resp = await client.post(
        "/api/vehicles",
        json={"plate": "ABC-123", "brand": "Mazda", "model": "3", "year": 2022},
    )
    assert resp.status_code == 201

    added = [call.args[0] for call in mock_db.add.call_args_list]
    trial_tokens = [obj for obj in added if type(obj).__name__ == "NfcToken"]
    assert len(trial_tokens) == 1
    assert trial_tokens[0].token_type == "trial"


@pytest.mark.anyio
async def test_second_vehicle_for_taller_does_not_get_trial(client, mock_db, fake_user_id):
    """The account already owns 1 vehicle — its free trial was already spent."""
    profile = _fake_profile(fake_user_id, "taller")
    mock_db.execute = _mock_execute_sequence(profile, plate_conflict=None, other_vehicles_count=1)
    mock_db.flush = AsyncMock()
    mock_db.refresh = AsyncMock(side_effect=_refresh)

    resp = await client.post(
        "/api/vehicles",
        json={"plate": "XYZ-789", "brand": "Renault", "model": "Duster", "year": 2023},
    )
    assert resp.status_code == 201

    added = [call.args[0] for call in mock_db.add.call_args_list]
    trial_tokens = [obj for obj in added if type(obj).__name__ == "NfcToken"]
    assert trial_tokens == []


@pytest.mark.anyio
async def test_persona_vehicle_never_gets_trial_even_if_first(client, mock_db, fake_user_id):
    profile = _fake_profile(fake_user_id, "persona")
    mock_db.execute = _mock_execute_sequence(profile, plate_conflict=None, other_vehicles_count=0)
    mock_db.flush = AsyncMock()
    mock_db.refresh = AsyncMock(side_effect=_refresh)

    resp = await client.post(
        "/api/vehicles",
        json={"plate": "DEF-456", "brand": "Chevrolet", "model": "Spark", "year": 2020},
    )
    assert resp.status_code == 201

    added = [call.args[0] for call in mock_db.add.call_args_list]
    trial_tokens = [obj for obj in added if type(obj).__name__ == "NfcToken"]
    assert trial_tokens == []


def _persona_with_vehicles(fake_user_id, mock_db, vehicles, spare_parts):
    """persona con `vehicles` ya creados; spare_parts = (comprados, activados, sin_llavero)."""
    profile = _fake_profile(fake_user_id, "persona")
    seq = list(_mock_execute_sequence(profile, None, vehicles).side_effect)
    for v in spare_parts:
        r = MagicMock()
        r.scalar.return_value = v
        seq.append(r)
    mock_db.execute = AsyncMock(side_effect=seq)
    mock_db.flush = AsyncMock()
    mock_db.refresh = AsyncMock(side_effect=_refresh)


@pytest.mark.anyio
async def test_persona_second_vehicle_without_keychain_is_blocked(client, mock_db, fake_user_id):
    _persona_with_vehicles(fake_user_id, mock_db, 1, (0, 0, 1))
    resp = await client.post("/api/vehicles", json={"plate": "AAA-111", "brand": "Kia", "model": "Rio", "year": 2021})
    assert resp.status_code == 403
    assert mock_db.add.call_count == 0


@pytest.mark.anyio
async def test_persona_second_vehicle_with_purchased_keychain_is_allowed(client, mock_db, fake_user_id):
    _persona_with_vehicles(fake_user_id, mock_db, 1, (1, 0, 1))
    resp = await client.post("/api/vehicles", json={"plate": "BBB-222", "brand": "Kia", "model": "Rio", "year": 2021})
    assert resp.status_code == 201


@pytest.mark.anyio
async def test_persona_third_vehicle_needs_another_keychain(client, mock_db, fake_user_id):
    """1 comprado, ya hay 2 vehículos sin llavero activado: el segundo ya reservó el llavero."""
    _persona_with_vehicles(fake_user_id, mock_db, 2, (1, 0, 2))
    resp = await client.post("/api/vehicles", json={"plate": "CCC-333", "brand": "Kia", "model": "Rio", "year": 2021})
    assert resp.status_code == 403


@pytest.mark.anyio
async def test_persona_second_vehicle_after_activating_first_needs_new_purchase(client, mock_db, fake_user_id):
    """El único llavero comprado ya se activó en el 1er vehículo."""
    _persona_with_vehicles(fake_user_id, mock_db, 1, (1, 1, 0))
    resp = await client.post("/api/vehicles", json={"plate": "DDD-444", "brand": "Kia", "model": "Rio", "year": 2021})
    assert resp.status_code == 403


@pytest.mark.anyio
async def test_plate_reserved_by_other_account_is_rejected(client, mock_db, fake_user_id):
    """Otra cuenta la tiene verificada o con llavero activo: 409 desde el backend."""
    profile = _fake_profile(fake_user_id, "persona")
    mock_db.execute = _mock_execute_sequence(profile, None, 0, reserved_by_other=1)
    resp = await client.post("/api/vehicles", json={"plate": "EEE-555", "brand": "Kia", "model": "Rio", "year": 2021})
    assert resp.status_code == 409
    assert mock_db.add.call_count == 0


@pytest.mark.anyio
async def test_plate_only_free_unverified_elsewhere_is_allowed(client, mock_db, fake_user_id):
    """Un registro gratuito sin verificar de otra cuenta no reserva la placa."""
    profile = _fake_profile(fake_user_id, "persona")
    mock_db.execute = _mock_execute_sequence(profile, None, 0, reserved_by_other=0)
    mock_db.flush = AsyncMock()
    mock_db.refresh = AsyncMock(side_effect=_refresh)
    resp = await client.post("/api/vehicles", json={"plate": "FFF-666", "brand": "Kia", "model": "Rio", "year": 2021})
    assert resp.status_code == 201
