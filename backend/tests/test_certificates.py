from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.models import Certificate, Vehicle


def _fake_vehicle(id: str, owner_id: str) -> MagicMock:
    v = MagicMock(spec=Vehicle)
    v.id = uuid.UUID(id)
    v.owner_id = uuid.UUID(owner_id)
    return v


def _fake_cert(overrides: dict | None = None) -> MagicMock:
    c = MagicMock(spec=Certificate)
    c.id = uuid.uuid4()
    c.vehicle_id = uuid.uuid4()
    c.name = "Factura"
    c.issued_by = "Taller XYZ"
    c.issue_date = date(2026, 7, 11)
    c.expiry_date = None
    c.file_url = "https://pub-hash.r2.dev/user123/abc.jpg"
    c.cost = Decimal("185000.00")
    c.notes = ""
    c.created_at = datetime.now(timezone.utc)
    if overrides:
        for k, v in overrides.items():
            setattr(c, k, v)
    return c


@pytest.mark.asyncio
async def test_create_certificate_with_cost(client, mock_db, fake_user_id, fake_vehicle_id):
    """POST /api/certificates persists the cost field from OCR or manual entry."""
    mock_vehicle = _fake_vehicle(fake_vehicle_id, fake_user_id)
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = mock_vehicle
    mock_db.execute = AsyncMock(return_value=vehicle_result)
    mock_db.flush = AsyncMock()

    async def _refresh(cert):
        cert.id = uuid.uuid4()
        cert.created_at = datetime.now(timezone.utc)

    mock_db.refresh = AsyncMock(side_effect=_refresh)

    body = {
        "vehicle_id": fake_vehicle_id,
        "name": "Factura cambio de aceite",
        "issued_by": "Taller Automotriz XYZ",
        "issue_date": "2026-07-11",
        "file_url": "https://pub-hash.r2.dev/x.jpg",
        "cost": 185000,
        "notes": "",
    }
    resp = await client.post("/api/certificates", json=body)
    assert resp.status_code == 201
    data = resp.json()
    assert data["cost"] == "185000.00" or float(data["cost"]) == 185000.0

    added: Certificate = mock_db.add.call_args[0][0]
    assert added.cost == Decimal("185000")


@pytest.mark.asyncio
async def test_create_certificate_without_cost(client, mock_db, fake_user_id, fake_vehicle_id):
    """cost is optional — omitting it should not error."""
    mock_vehicle = _fake_vehicle(fake_vehicle_id, fake_user_id)
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = mock_vehicle
    mock_db.execute = AsyncMock(return_value=vehicle_result)
    mock_db.flush = AsyncMock()

    async def _refresh(cert):
        cert.id = uuid.uuid4()
        cert.created_at = datetime.now(timezone.utc)

    mock_db.refresh = AsyncMock(side_effect=_refresh)

    body = {"vehicle_id": fake_vehicle_id, "name": "SOAT"}
    resp = await client.post("/api/certificates", json=body)
    assert resp.status_code == 201

    added: Certificate = mock_db.add.call_args[0][0]
    assert added.cost is None


@pytest.mark.asyncio
async def test_update_certificate_cost(client, mock_db, fake_user_id, fake_vehicle_id):
    """PUT /api/certificates/{id} can update just the cost field."""
    cert_id = str(uuid.uuid4())
    existing = _fake_cert({"id": uuid.UUID(cert_id), "vehicle_id": uuid.UUID(fake_vehicle_id), "cost": None})

    mock_vehicle = _fake_vehicle(fake_vehicle_id, fake_user_id)
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = mock_vehicle

    cert_result = MagicMock()
    cert_result.scalar_one_or_none.return_value = existing
    mock_db.execute = AsyncMock(side_effect=[cert_result, vehicle_result])
    mock_db.flush = AsyncMock()
    mock_db.refresh = AsyncMock()

    resp = await client.put(f"/api/certificates/{cert_id}", json={"cost": 92000.5})
    assert resp.status_code == 200
    assert existing.cost == Decimal("92000.5")


@pytest.mark.asyncio
async def test_download_certificate(client, mock_db, fake_user_id, fake_vehicle_id):
    """GET /api/certificates/{id}/download proxies the R2 object with an attachment header."""
    cert_id = str(uuid.uuid4())
    existing = _fake_cert({
        "id": uuid.UUID(cert_id),
        "vehicle_id": uuid.UUID(fake_vehicle_id),
        "name": "Factura Aceite",
        "file_url": "https://pub-hash.r2.dev/user123/receipt.jpg",
    })

    mock_vehicle = _fake_vehicle(fake_vehicle_id, fake_user_id)
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = mock_vehicle

    cert_result = MagicMock()
    cert_result.scalar_one_or_none.return_value = existing
    mock_db.execute = AsyncMock(side_effect=[cert_result, vehicle_result])

    with patch("app.routers.certificates.key_from_url", return_value="user123/receipt.jpg"), \
         patch("app.routers.certificates.get_file", return_value=(b"fake-image-bytes", "image/jpeg")):
        resp = await client.get(f"/api/certificates/{cert_id}/download")

    assert resp.status_code == 200
    assert resp.content == b"fake-image-bytes"
    assert "attachment" in resp.headers["content-disposition"]
    assert "Factura Aceite.jpg" in resp.headers["content-disposition"]


@pytest.mark.asyncio
async def test_download_certificate_no_file(client, mock_db, fake_user_id, fake_vehicle_id):
    """Download returns 404 when the certificate has no attached file."""
    cert_id = str(uuid.uuid4())
    existing = _fake_cert({"id": uuid.UUID(cert_id), "vehicle_id": uuid.UUID(fake_vehicle_id), "file_url": ""})

    mock_vehicle = _fake_vehicle(fake_vehicle_id, fake_user_id)
    vehicle_result = MagicMock()
    vehicle_result.scalar_one_or_none.return_value = mock_vehicle

    cert_result = MagicMock()
    cert_result.scalar_one_or_none.return_value = existing
    mock_db.execute = AsyncMock(side_effect=[cert_result, vehicle_result])

    resp = await client.get(f"/api/certificates/{cert_id}/download")
    assert resp.status_code == 404
