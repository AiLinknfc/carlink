from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest



def _generic_result(scalar=0, one=None, many=None):
    """A single MagicMock that answers `.scalar()`, `.scalar_one_or_none()` and
    `.scalars().all()` consistently, whichever one the endpoint happens to call.

    `mock_db` (conftest.py) is a bare `AsyncMock(spec=AsyncSession)` — its
    auto-generated children are themselves `AsyncMock`, so an un-configured
    `db.execute(...)` returns an *awaitable* `result.scalars()` instead of the
    real (sync) `Result.scalars()`, which breaks `list(result.scalars().all())`
    with `AttributeError: 'coroutine' object has no attribute 'all'`. These
    admin endpoints run several different queries per request without
    per-call mocking, so every test here needs an explicit, plain (non-async)
    result object like this one rather than relying on the fixture default.
    """
    result = MagicMock()
    result.scalar.return_value = scalar
    result.scalar_one_or_none.return_value = one
    result.scalars.return_value.all.return_value = many or []
    return result


@pytest.mark.anyio
async def test_admin_stats(client, mock_db):
    mock_db.execute = AsyncMock(return_value=_generic_result(scalar=0))

    response = await client.get("/api/admin/nfc/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_tokens" in data
    assert "active_tokens" in data
    assert "total_access_today" in data
    assert "total_alerts" in data
    assert "unresolved_alerts" in data
    assert "whitelist_count" in data


@pytest.mark.anyio
async def test_admin_list_tokens(client, mock_db):
    # Empty token list — no per-token Profile/Vehicle lookups get triggered.
    mock_db.execute = AsyncMock(return_value=_generic_result(many=[]))

    response = await client.get("/api/admin/nfc/tokens")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.anyio
async def test_admin_list_whitelist(client, mock_db):
    mock_db.execute = AsyncMock(return_value=_generic_result(many=[]))

    response = await client.get("/api/admin/nfc/whitelist")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.anyio
async def test_admin_list_alerts(client, mock_db):
    mock_db.execute = AsyncMock(return_value=_generic_result(many=[]))

    response = await client.get("/api/admin/nfc/alerts")
    assert response.status_code == 200
    assert response.json() == []
