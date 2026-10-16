from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.schemas.schemas import WorkshopPublicOut

SECRET_KEYS = {"owner_id", "legal_id", "tax_rate_percent", "certification_code", "stamps_required", "promotion_description",
               "mechanics", "id", "is_published", "manager_name", "manager_role", "manager_avatar", "created_at", "workshop_id"}


def _workshop(**over):
    base = dict(
        id=uuid.uuid4(), owner_id=uuid.uuid4(), legal_id="900123456-7", code="TLR-ABCDE", name="Taller Uno", slogan="", city="Bogota",
        address="Cl 1", phone="3001234567", email="a@b.co", business_hours="", specialties=[], logo_url="", social_instagram="",
        social_facebook="", social_website="", social_whatsapp="", latitude=4.6, longitude=-74.0, is_verified=True, business_kind="taller",
        rating=4.5, tax_rate_percent=Decimal(19), certification_code="X", stamps_required=6, promotion_description="", is_published=True,
        manager_name="Ana", manager_role="Gerente", manager_avatar="", created_at=datetime.now(timezone.utc), description="",
    )
    base.update(over)
    return SimpleNamespace(**base)


def test_public_schema_is_a_whitelist():
    out = WorkshopPublicOut.model_validate(_workshop()).model_dump()
    assert not (SECRET_KEYS & set(out)), SECRET_KEYS & set(out)
    assert out["code"] == "TLR-ABCDE" and out["name"] == "Taller Uno" and out["latitude"] == 4.6


def test_public_review_and_service_hide_internal_ids():
    from app.schemas.schemas import WorkshopPublicReviewOut, WorkshopPublicServiceOut

    rv = WorkshopPublicReviewOut.model_validate(SimpleNamespace(
        id=uuid.uuid4(), workshop_id=uuid.uuid4(), submitted_by_user_id=uuid.uuid4(), client_name="Luis", rating=5, review_date=date.today(),
        comment="ok", vehicle_model="X", is_verified_client=True, manager_response="", created_at=datetime.now(timezone.utc), source="x")).model_dump()
    assert "submitted_by_user_id" not in rv and "workshop_id" not in rv
    sv = WorkshopPublicServiceOut.model_validate(SimpleNamespace(
        id=uuid.uuid4(), workshop_id=uuid.uuid4(), name="Frenos", category="c", estimated_price=Decimal(1), estimated_hours=Decimal(1),
        description="", photo_url="", is_featured=False, created_at=datetime.now(timezone.utc))).model_dump()
    assert "workshop_id" not in sv


class FakeRedis:
    def __init__(self):
        self.d = {}

    async def incr(self, k):
        self.d[k] = self.d.get(k, 0) + 1
        return self.d[k]

    async def expire(self, k, s):
        return True

    async def get(self, k):
        return self.d.get(k)


def _none_result():
    r = MagicMock()
    r.scalar_one_or_none.return_value = None
    return r


@pytest.mark.asyncio
async def test_guessing_codes_gets_blocked(client, mock_db, monkeypatch):
    fake = FakeRedis()
    monkeypatch.setattr("app.routers.workshops.get_redis", AsyncMock(return_value=fake))
    mock_db.execute = AsyncMock(side_effect=lambda *a, **k: _none_result())
    codes = [(await client.get(f"/api/workshops/TLR-AAA{i:02d}")).status_code for i in range(32)]
    assert codes[:30] == [404] * 30
    assert codes[30:] == [429, 429]
    # y bloqueado también para un código que sí existiría
    assert (await client.get("/api/workshops/TLR-ABCDE")).status_code == 429


@pytest.mark.asyncio
async def test_overlong_code_is_404_without_querying(client, mock_db, monkeypatch):
    monkeypatch.setattr("app.routers.workshops.get_redis", AsyncMock(return_value=None))
    mock_db.execute = AsyncMock(side_effect=AssertionError("no debe consultar la base"))
    assert (await client.get("/api/workshops/" + "A" * 40)).status_code == 404


@pytest.mark.asyncio
async def test_search_is_rate_limited_per_account(client, mock_db, monkeypatch):
    fake = FakeRedis()
    monkeypatch.setattr("app.routers.workshops.get_redis", AsyncMock(return_value=fake))
    empty = MagicMock()
    empty.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=empty)
    assert (await client.get("/api/workshops/search?q=ab")).status_code == 200
    for _ in range(239):
        await client.get("/api/workshops/search?q=ab")
    assert (await client.get("/api/workshops/search?q=ab")).status_code == 429


def test_search_requires_a_session():
    import inspect

    from app.routers import workshops

    assert "user_id" in inspect.signature(workshops.search_workshops).parameters


@pytest.mark.asyncio
async def test_public_endpoint_returns_only_whitelisted_fields(client, mock_db, monkeypatch):
    monkeypatch.setattr("app.routers.workshops.get_redis", AsyncMock(return_value=None))
    w = MagicMock()
    w.scalar_one_or_none.return_value = _workshop()
    svc = MagicMock()
    svc.scalars.return_value.all.return_value = [SimpleNamespace(
        id=uuid.uuid4(), workshop_id=uuid.uuid4(), name="Frenos", category="c", estimated_price=Decimal(5), estimated_hours=Decimal(1),
        description="", photo_url="", is_featured=False, created_at=datetime.now(timezone.utc))]
    rev = MagicMock()
    rev.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(side_effect=[w, svc, rev])
    resp = await client.get("/api/workshops/tlr-abcde")
    assert resp.status_code == 200
    body = resp.json()
    assert not (SECRET_KEYS & set(body))
    assert body["name"] == "Taller Uno" and body["service_items"][0]["name"] == "Frenos" and "workshop_id" not in body["service_items"][0]
