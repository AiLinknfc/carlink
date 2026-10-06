from __future__ import annotations

import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.models import Vehicle
from app.services import crypto
from app.services.crypto import EncryptionUnavailable
from app.services.vehicle_card import (
    card_digest, mask_card_data, normalize_card_data, open_card_data, required_fields, seal_card_data, validate_card,
)

KEY = bytes.fromhex("11" * 32)

GOOD_CARD = {
    "license_number": "10012345678", "owner_document": "79123456", "vin": "3MZBN1V70KM123456",
    "engine_number": "PE12345678", "chassis_number": "3MZBN1V70KM123456", "cilindraje": "2000",
    "service": "particular", "capacity": "5", "doors": "4", "registration_date": "2019-03-15",
}


@pytest.fixture
def with_key(monkeypatch):
    monkeypatch.setattr(crypto, "_get_key", lambda: KEY)


@pytest.fixture
def no_key(monkeypatch):
    monkeypatch.setattr(crypto, "_get_key", lambda: None)


def _veh(**over):
    v = dict(plate="ABC-123", city="Envigado", brand="Mazda", model="3", year=2019, color="Gris",
             body_type="Automóvil", type="particular", fuel_type="gasolina", owner_name="JUAN CARLOS PEREZ",
             card_data={}, card_confirmed_digest="", card_confirmed_at=None)
    v.update(over)
    return SimpleNamespace(**v)


# ---- Cifrado del documento ----

def test_owner_document_is_encrypted_at_rest(with_key):
    sealed = seal_card_data(normalize_card_data({"owner_document": "79.123.456", "vin": "abc"}))
    assert sealed["owner_document"].startswith("enc1:")
    assert "79123456" not in sealed["owner_document"]
    assert sealed["vin"] == "ABC"
    assert open_card_data(sealed)["owner_document"] == "79123456"


def test_sealing_is_idempotent_and_preserves_existing(with_key):
    first = seal_card_data({"owner_document": "79123456"})
    again = seal_card_data({"vin": "XYZ12345"}, first)
    assert again["owner_document"] == first["owner_document"]  # no se re-cifra
    assert again["vin"] == "XYZ12345"


def test_without_key_fails_closed(no_key):
    with pytest.raises(EncryptionUnavailable):
        seal_card_data({"owner_document": "79123456"})
    # Sin documento no hace falta clave.
    assert seal_card_data({"vin": "ABC12345"}) == {"vin": "ABC12345"}


def test_masked_value_is_never_stored_as_data(with_key):
    sealed = seal_card_data({"owner_document": "79123456"})
    masked = mask_card_data(sealed)
    assert masked["owner_document"] == "•••••456"
    assert mask_card_data(masked)["owner_document"] == "•••••456"  # idempotente
    # El cliente devuelve el valor enmascarado sin tocarlo: no cambia el dato guardado.
    assert normalize_card_data({"owner_document": masked["owner_document"]}) == {}
    assert normalize_card_data({"owner_document": sealed["owner_document"]}) == {}


def test_validate_decrypts_document(with_key):
    card = seal_card_data(GOOD_CARD)
    assert validate_card(_veh(card_data=card)) == {}


def test_undecryptable_document_counts_as_missing(no_key):
    sealed = "enc1:" + "AAAA"
    errors = validate_card(_veh(card_data={**GOOD_CARD, "owner_document": sealed}))
    assert "owner_document" in errors


# ---- Huella de confirmación ----

def test_digest_changes_when_any_field_changes(with_key):
    v = _veh(card_data=seal_card_data(GOOD_CARD))
    base = card_digest(v)
    assert card_digest(v) == base
    changed_card = _veh(card_data=seal_card_data({**GOOD_CARD, "vin": "3MZBN1V70KM123457"}))
    assert card_digest(changed_card) != base
    assert card_digest(_veh(card_data=seal_card_data(GOOD_CARD), brand="Kia")) != base
    assert card_digest(_veh(card_data=seal_card_data({**GOOD_CARD, "owner_document": "11111111"}))) != base


def test_required_fields_skip_doors_for_moto():
    assert "doors" in required_fields(_veh())
    assert "doors" not in required_fields(_veh(body_type="Moto", type="moto"))


# ---- Endpoints ----

def _db_vehicle(fake_vehicle_id, fake_user_id, **over):
    v = Vehicle(id=uuid.UUID(fake_vehicle_id), owner_id=uuid.UUID(fake_user_id), plate="ABC-123", city="Envigado",
                brand="Mazda", model="3", year=2019, type="particular", color="Gris", image_url="")
    v.body_type = "Automóvil"; v.fuel_type = "gasolina"; v.owner_name = "JUAN CARLOS PEREZ"
    v.card_data = seal_card_data(GOOD_CARD)
    v.card_confirmed_digest = ""; v.card_confirmed_at = None
    v.verification_status = "verified"
    v.nfc_active = False; v.sell_enabled = False
    for f, d in (("sell_price", ""), ("sell_city", ""), ("sell_zip", ""), ("sell_phone", ""), ("sell_description", ""),
                 ("lost_keychain_enabled", False), ("georeference_enabled", False),
                 ("verification_doc_url", ""), ("verification_doc_url_back", ""), ("verification_note", ""),
                 ("vehicle_condition", "usado")):
        setattr(v, f, d)
    v.verification_requested_at = None; v.verified_at = None
    v.created_at = v.updated_at = datetime.now(timezone.utc)
    for k, val in over.items():
        setattr(v, k, val)
    return v


def _exec(mock_db, v):
    r = MagicMock()
    r.scalar_one_or_none.return_value = v
    mock_db.execute = AsyncMock(return_value=r)
    mock_db.flush = AsyncMock()
    mock_db.refresh = AsyncMock()
    mock_db.commit = AsyncMock()


@pytest.mark.anyio
async def test_confirm_requires_all_fields_marked(client, mock_db, fake_user_id, fake_vehicle_id, with_key):
    v = _db_vehicle(fake_vehicle_id, fake_user_id)
    _exec(mock_db, v)
    some = required_fields(v)[:-1]
    resp = await client.post(f"/api/vehicles/{fake_vehicle_id}/card-confirm", json={"confirmed_fields": some})
    assert resp.status_code == 422 and resp.json()["detail"]["missing"]
    assert v.card_confirmed_digest == ""
    ok = await client.post(f"/api/vehicles/{fake_vehicle_id}/card-confirm", json={"confirmed_fields": required_fields(v)})
    assert ok.status_code == 200
    assert v.card_confirmed_digest and v.card_confirmed_at is not None


@pytest.mark.anyio
async def test_confirm_rejected_when_card_incomplete(client, mock_db, fake_user_id, fake_vehicle_id, with_key):
    v = _db_vehicle(fake_vehicle_id, fake_user_id, card_data={})
    _exec(mock_db, v)
    resp = await client.post(f"/api/vehicles/{fake_vehicle_id}/card-confirm", json={"confirmed_fields": required_fields(v)})
    assert resp.status_code == 422 and "errors" in resp.json()["detail"]


@pytest.mark.anyio
async def test_card_check_reports_confirmation_and_invalidates_on_edit(client, mock_db, fake_user_id, fake_vehicle_id, with_key):
    v = _db_vehicle(fake_vehicle_id, fake_user_id)
    v.card_confirmed_digest = card_digest(v)
    v.card_confirmed_at = datetime.now(timezone.utc)
    _exec(mock_db, v)
    assert (await client.get(f"/api/vehicles/{fake_vehicle_id}/card-check")).json()["confirmed"] is True
    v.brand = "Kia"  # cambió un dato después de confirmar
    assert (await client.get(f"/api/vehicles/{fake_vehicle_id}/card-check")).json()["confirmed"] is False


@pytest.mark.anyio
async def test_selling_requires_verified_and_confirmed(client, mock_db, fake_user_id, fake_vehicle_id, with_key, monkeypatch):
    monkeypatch.setattr("app.routers.vehicles.require_full_access", AsyncMock())
    body = {"sell_enabled": True}
    v = _db_vehicle(fake_vehicle_id, fake_user_id, verification_status="pending")
    _exec(mock_db, v)
    assert (await client.put(f"/api/vehicles/{fake_vehicle_id}", json=body)).status_code == 403
    v = _db_vehicle(fake_vehicle_id, fake_user_id)  # verificado pero sin confirmar
    _exec(mock_db, v)
    resp = await client.put(f"/api/vehicles/{fake_vehicle_id}", json=body)
    assert resp.status_code == 409 and "Confirma" in resp.json()["detail"]
    assert v.sell_enabled is False
    v = _db_vehicle(fake_vehicle_id, fake_user_id)
    v.card_confirmed_digest = card_digest(v)
    _exec(mock_db, v)
    assert (await client.put(f"/api/vehicles/{fake_vehicle_id}", json=body)).status_code == 200
    assert v.sell_enabled is True


@pytest.mark.anyio
async def test_vehicle_response_masks_document(client, mock_db, fake_user_id, fake_vehicle_id, with_key):
    v = _db_vehicle(fake_vehicle_id, fake_user_id)
    v.created_at = v.updated_at = datetime.now(timezone.utc)
    for f, d in (("sell_price", ""), ("sell_city", ""), ("sell_zip", ""), ("sell_phone", ""), ("sell_description", ""),
                 ("lost_keychain_enabled", False), ("georeference_enabled", False), ("owner_name", "JUAN CARLOS PEREZ"),
                 ("verification_doc_url", ""), ("verification_doc_url_back", ""), ("verification_note", ""),
                 ("vehicle_condition", "usado")):
        setattr(v, f, d)
    v.verification_requested_at = None; v.verified_at = None
    _exec(mock_db, v)
    resp = await client.get(f"/api/vehicles/{fake_vehicle_id}")
    assert resp.status_code == 200
    doc = resp.json()["card_data"]["owner_document"]
    assert doc == "•••••456" and "79123456" not in resp.text
