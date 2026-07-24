from __future__ import annotations

import pytest


@pytest.mark.anyio
async def test_admin_stats(client):
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
async def test_admin_list_tokens(client):
    response = await client.get("/api/admin/nfc/tokens")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.anyio
async def test_admin_list_limits(client):
    response = await client.get("/api/admin/nfc/limits")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # Should have persona and taller limits
    account_types = {l["account_type"] for l in data}
    assert "persona" in account_types
    assert "taller" in account_types


@pytest.mark.anyio
async def test_admin_list_whitelist(client):
    response = await client.get("/api/admin/nfc/whitelist")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.anyio
async def test_admin_list_alerts(client):
    response = await client.get("/api/admin/nfc/alerts")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
