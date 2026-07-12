from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.database import get_db
from app.dependencies import get_current_user


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

    app.dependency_overrides[get_db] = _get_db
    app.dependency_overrides[get_current_user] = _get_current_user
    yield
    app.dependency_overrides.clear()


@pytest.fixture
async def client(override_deps):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
