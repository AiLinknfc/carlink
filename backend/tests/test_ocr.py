from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.services.ocr import OcrUnavailableError


@pytest.mark.asyncio
async def test_scan_document_success(client):
    """POST /api/ocr/scan returns structured fields extracted from OCR text."""
    with patch("app.routers.ocr.extract_text_from_file", return_value="FACTURA\nTaller XYZ\n11/07/2026\nTotal: 185000"), \
         patch("app.routers.ocr.structure_receipt_data", new=AsyncMock(return_value={
             "title": "Factura cambio de aceite",
             "vendor": "Taller XYZ",
             "issue_date": "2026-07-11",
             "cost": 185000,
             "currency": "COP",
         })):
        resp = await client.post(
            "/api/ocr/scan",
            files={"file": ("receipt.jpg", b"fake-bytes", "image/jpeg")},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Factura cambio de aceite"
    assert data["vendor"] == "Taller XYZ"
    assert data["issue_date"] == "2026-07-11"
    assert float(data["cost"]) == 185000.0
    assert "FACTURA" in data["raw_text"]


@pytest.mark.asyncio
async def test_scan_document_rejects_bad_content_type(client):
    """Non-image/PDF uploads are rejected before touching OCR."""
    resp = await client.post(
        "/api/ocr/scan",
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_scan_document_rejects_oversized_file(client):
    """Files over 10MB are rejected."""
    big = b"0" * (10 * 1024 * 1024 + 1)
    resp = await client.post(
        "/api/ocr/scan",
        files={"file": ("big.jpg", big, "image/jpeg")},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_scan_document_ocr_unavailable(client):
    """Returns 503 when Tesseract isn't installed on the server."""
    with patch("app.routers.ocr.extract_text_from_file", side_effect=OcrUnavailableError("no tesseract")):
        resp = await client.post(
            "/api/ocr/scan",
            files={"file": ("receipt.jpg", b"fake-bytes", "image/jpeg")},
        )
    assert resp.status_code == 503


@pytest.mark.asyncio
async def test_scan_document_requires_auth(client, override_deps):
    """Requires a valid bearer token like every other endpoint."""
    from app.main import app as _app
    _app.dependency_overrides.clear()

    resp = await client.post(
        "/api/ocr/scan",
        files={"file": ("receipt.jpg", b"fake-bytes", "image/jpeg")},
    )
    assert resp.status_code == 401
