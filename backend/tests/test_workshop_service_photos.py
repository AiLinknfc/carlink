"""Fotos del catalogo de servicios del taller y servicios destacados (migracion 075).

Reglas: la foto solo puede ser un archivo subido por el propio usuario; un destacado necesita foto;
maximo 4 destacados por taller; quitar la foto quita el destacado.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.routers import workshop_services as ws


def _own(uid: str) -> str:
    return f"/api/upload/files/{uid}/{uuid.uuid4()}.jpg"


def test_foto_propia_se_acepta(fake_user_id):
    url = _own(fake_user_id)
    assert ws._clean_photo_url(url, fake_user_id) == url
    assert ws._clean_photo_url("", fake_user_id) == ""


@pytest.mark.parametrize("bad", [
    "https://evil.example/x.jpg",
    "javascript:alert(1)",
    "//evil.example/x.jpg",
    "/api/upload/files/otro-usuario/00000000-0000-0000-0000-000000000000.jpg",
    "/api/upload/files/{uid}/../../x.jpg",
    "/api/upload/files/{uid}/00000000-0000-0000-0000-000000000000.jpg?x=<script>",
])
def test_foto_ajena_o_externa_se_rechaza(bad, fake_user_id):
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as e:
        ws._clean_photo_url(bad.replace("{uid}", fake_user_id), fake_user_id)
    assert e.value.status_code == 422


def _item(**kw):
    base = dict(id=uuid.uuid4(), workshop_id=uuid.uuid4(), name="Frenos", category="", estimated_price=0, estimated_hours=0,
                description="", photo_url="", is_featured=False, created_at=datetime.now(timezone.utc))
    return SimpleNamespace(**{**base, **kw})


@pytest.fixture
def taller(monkeypatch, mock_db):
    workshop = SimpleNamespace(id=uuid.uuid4())
    monkeypatch.setattr(ws, "verify_workshop", AsyncMock(return_value=workshop))
    return workshop


@pytest.mark.anyio
async def test_destacado_sin_foto_da_422(client, taller):
    resp = await client.post("/api/workshops/me/services", json={"name": "Frenos", "is_featured": True})
    assert resp.status_code == 422 and "foto" in resp.json()["detail"]


@pytest.mark.anyio
async def test_foto_externa_en_alta_da_422(client, taller):
    resp = await client.post("/api/workshops/me/services", json={"name": "Frenos", "photo_url": "https://evil.example/x.jpg"})
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_quinto_destacado_da_409(client, taller, mock_db, fake_user_id):
    mock_db.scalar = AsyncMock(return_value=ws.MAX_FEATURED)
    resp = await client.post("/api/workshops/me/services", json={"name": "Frenos", "is_featured": True, "photo_url": _own(fake_user_id)})
    assert resp.status_code == 409 and "4" in resp.json()["detail"]


@pytest.mark.anyio
async def test_quitar_la_foto_quita_el_destacado(client, taller, monkeypatch, mock_db):
    item = _item(photo_url="/api/upload/files/x/y.jpg", is_featured=True)
    monkeypatch.setattr(ws, "_get_owned_service_item", AsyncMock(return_value=item))
    resp = await client.put(f"/api/workshops/me/services/{item.id}", json={"photo_url": ""})
    assert resp.status_code == 200
    assert item.photo_url == "" and item.is_featured is False


@pytest.mark.anyio
async def test_destacar_servicio_sin_foto_da_422(client, taller, monkeypatch):
    item = _item(photo_url="", is_featured=False)
    monkeypatch.setattr(ws, "_get_owned_service_item", AsyncMock(return_value=item))
    resp = await client.put(f"/api/workshops/me/services/{item.id}", json={"is_featured": True})
    assert resp.status_code == 422
