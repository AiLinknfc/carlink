from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.database import get_db
from app.dependencies import get_current_admin, get_current_user


@pytest.fixture
def fake_user_id() -> str:
    return str(uuid.uuid4())


@pytest.fixture
def fake_vehicle_id() -> str:
    return str(uuid.uuid4())


@pytest.fixture
def mock_db():
    session = AsyncMock(spec=AsyncSession)
    session.add = MagicMock()
    session.flush = AsyncMock()
    session.refresh = AsyncMock()
    session.delete = AsyncMock()
    return session


@pytest.fixture
def override_deps(mock_db, fake_user_id):
    async def _get_db():
        yield mock_db

    async def _get_current_user():
        return fake_user_id

    async def _get_current_admin():
        return fake_user_id

    app.dependency_overrides[get_db] = _get_db
    app.dependency_overrides[get_current_user] = _get_current_user
    app.dependency_overrides[get_current_admin] = _get_current_admin
    yield
    app.dependency_overrides.clear()


@pytest.fixture
async def client(override_deps):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture(autouse=True)
def _no_real_geocoding(monkeypatch):
    """Ninguna prueba debe llamar a Nominatim de verdad (red + politica de uso). Las pruebas del servicio
    de geocodificacion pasan su propio cliente HTTP simulado, que no depende de esta funcion."""
    async def _none(*_a, **_k):
        return None
    monkeypatch.setattr("app.services.geocoding.geocode_address", _none)


@pytest.fixture(autouse=True)
def _workshop_links_apagado_por_defecto(monkeypatch):
    """El vinculo taller-conductor viene apagado: las pruebas no dependen del WORKSHOP_LINKS_ENABLED del .env local
    (que se enciende a mano para probar la interfaz). Las que lo necesitan encendido usan su propia fixture `flag_on`."""
    from types import SimpleNamespace
    monkeypatch.setattr("app.services.workshop_links.get_settings", lambda: SimpleNamespace(workshop_links_enabled=False))
