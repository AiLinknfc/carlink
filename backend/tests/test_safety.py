from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from pydantic import ValidationError

from app.models.models import VehicleSafetyItem
from app.routers import safety as safety_router
from app.schemas.schemas import SafetyItemBase, SafetyScanResult
from app.services import ocr as ocr_service


def test_missing_items_are_trimmed_and_empty_ones_dropped():
    item = SafetyItemBase(kind="botiquin", missing_items=["  gasas ", "", "alcohol"])
    assert item.missing_items == ["gasas", "alcohol"]


def test_kind_must_be_known():
    with pytest.raises(ValidationError):
        SafetyItemBase(kind="airbag")


@pytest.fixture
def owned_vehicle(monkeypatch):
    monkeypatch.setattr(safety_router, "verify_vehicle", AsyncMock(return_value=MagicMock()))


async def test_create_extintor_with_dates(client, mock_db, owned_vehicle):
    res_body = {
        "vehicle_id": str(uuid.uuid4()), "kind": "extintor", "purchase_date": "2025-01-10",
        "expiry_date": "2026-01-10", "recharge_date": "2025-06-01", "details": {"capacity": "10 lb", "agent": "PQS ABC"},
    }

    async def _refresh(obj):
        obj.id = uuid.uuid4()
        from datetime import datetime, timezone
        obj.created_at = datetime.now(timezone.utc)
    mock_db.refresh = AsyncMock(side_effect=_refresh)

    res = await client.post("/api/safety", json=res_body)
    assert res.status_code == 201
    saved = mock_db.add.call_args.args[0]
    assert isinstance(saved, VehicleSafetyItem)
    assert str(saved.expiry_date) == "2026-01-10"
    assert saved.details["agent"] == "PQS ABC"


async def test_otro_requires_a_name(client, mock_db, owned_vehicle):
    res = await client.post("/api/safety", json={"vehicle_id": str(uuid.uuid4()), "kind": "otro", "name": "  "})
    assert res.status_code == 422


async def test_ocr_safety_returns_nulls_without_api_key(monkeypatch):
    monkeypatch.setattr(ocr_service.settings, "deepseek_api_key", "")
    out = await ocr_service.structure_safety_data("EXTINTOR 10 LB PQS ABC VENCE 03/2027")
    assert out["kind"] is None and out["missing_items"] == []
    assert SafetyScanResult(**out, raw_text="x").expiry_date is None
