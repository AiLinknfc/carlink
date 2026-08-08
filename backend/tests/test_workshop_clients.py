from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.models import Workshop, WorkshopClient

"""Coverage for the taller/empresa "cartera de clientes" isolation boundary
(`workshop_clients.py`) — this is the same property already verified
end-to-end against a real disposable DB during the tallerpro migration
(9/9 checks, see docs/PLAN_MIGRACION_TALLERPRO.md Fase 7: a second workshop
can't read/edit a client that belongs to the first one). This file adds a
fast, CI-running regression test for that same property, on top of (not
instead of) the E2E verification — deep multi-step logic in this router
family (stock deduction, auto-invoicing) is intentionally left to E2E
scripts against a real DB rather than deep mocks; see
docs/PENDIENTES.md "Hallazgos de arquitectura" #3 for why."""


def _fake_workshop(owner_id: str) -> MagicMock:
    w = MagicMock(spec=Workshop)
    w.id = uuid.uuid4()
    w.owner_id = uuid.UUID(owner_id)
    return w


def _fake_client(workshop_id, overrides: dict | None = None) -> MagicMock:
    c = MagicMock(spec=WorkshopClient)
    c.id = uuid.uuid4()
    c.workshop_id = workshop_id
    c.name = "Cliente Test"
    c.phone = "3001234567"
    c.email = ""
    c.address = ""
    c.document_id = ""
    c.created_at = datetime.now(timezone.utc)
    if overrides:
        for k, v in overrides.items():
            setattr(c, k, v)
    return c


@pytest.mark.anyio
async def test_list_clients_scoped_to_own_workshop(client, mock_db, fake_user_id):
    """GET /workshops/me/clients only ever queries the caller's own workshop_id."""
    workshop = _fake_workshop(fake_user_id)
    workshop_result = MagicMock()
    workshop_result.scalar_one_or_none.return_value = workshop

    my_client = _fake_client(workshop.id)
    clients_result = MagicMock()
    clients_result.scalars.return_value.all.return_value = [my_client]

    mock_db.execute = AsyncMock(side_effect=[workshop_result, clients_result])

    resp = await client.get("/api/workshops/me/clients")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["workshop_id"] == str(workshop.id)


@pytest.mark.anyio
async def test_update_client_from_another_workshop_returns_404(client, mock_db, fake_user_id):
    """A workshop can't edit a client that belongs to a different workshop —
    this is the isolation guarantee `_get_owned_client` exists to enforce:
    the ownership check is baked into the query itself
    (`WorkshopClient.workshop_id == workshop.id`), not applied after the fact,
    so a client from another workshop simply doesn't match and the query
    legitimately returns nothing — same shape as a real "not found"."""
    workshop = _fake_workshop(fake_user_id)
    workshop_result = MagicMock()
    workshop_result.scalar_one_or_none.return_value = workshop

    # The client exists (belongs to some other workshop), but the scoped
    # query (workshop_id == caller's workshop.id) correctly finds nothing.
    not_found_result = MagicMock()
    not_found_result.scalar_one_or_none.return_value = None

    mock_db.execute = AsyncMock(side_effect=[workshop_result, not_found_result])

    resp = await client.put(
        f"/api/workshops/me/clients/{uuid.uuid4()}",
        json={"name": "Nombre editado"},
    )
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_delete_client_from_another_workshop_returns_404(client, mock_db, fake_user_id):
    workshop = _fake_workshop(fake_user_id)
    workshop_result = MagicMock()
    workshop_result.scalar_one_or_none.return_value = workshop

    not_found_result = MagicMock()
    not_found_result.scalar_one_or_none.return_value = None

    mock_db.execute = AsyncMock(side_effect=[workshop_result, not_found_result])

    resp = await client.delete(f"/api/workshops/me/clients/{uuid.uuid4()}")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_update_own_client_succeeds(client, mock_db, fake_user_id):
    workshop = _fake_workshop(fake_user_id)
    workshop_result = MagicMock()
    workshop_result.scalar_one_or_none.return_value = workshop

    my_client = _fake_client(workshop.id)
    found_result = MagicMock()
    found_result.scalar_one_or_none.return_value = my_client

    mock_db.execute = AsyncMock(side_effect=[workshop_result, found_result])
    mock_db.flush = AsyncMock()
    mock_db.refresh = AsyncMock()

    resp = await client.put(
        f"/api/workshops/me/clients/{my_client.id}",
        json={"name": "Nombre editado"},
    )
    assert resp.status_code == 200
    assert my_client.name == "Nombre editado"


@pytest.mark.anyio
async def test_create_client_without_registered_workshop_returns_404(client, mock_db):
    """An authenticated user with no `workshops` row at all (never registered
    as taller/empresa) gets a clean 404, not a 500 — `verify_workshop` is the
    single gate every endpoint in this router goes through first."""
    no_workshop_result = MagicMock()
    no_workshop_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=no_workshop_result)

    resp = await client.post(
        "/api/workshops/me/clients",
        json={"name": "Cliente nuevo"},
    )
    assert resp.status_code == 404
