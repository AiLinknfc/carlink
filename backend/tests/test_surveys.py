from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from pydantic import ValidationError

from app.models.models import Survey
from app.schemas.schemas import SurveyUpdate


def _survey(**kw) -> Survey:
    base = dict(key="app_satisfaction", title="Titulo", hint="Pista", target_type="platform",
                trigger_key="usage_milestone", location="", timing="", is_active=True, position=1)
    return Survey(**{**base, **kw})


def test_survey_update_validates_title_length():
    assert SurveyUpdate(title="Nueva encuesta").title == "Nueva encuesta"
    with pytest.raises(ValidationError):
        SurveyUpdate(title="x")


async def test_admin_can_edit_and_deactivate_survey(client, mock_db):
    survey = _survey()
    mock_db.get = AsyncMock(return_value=survey)
    res = await client.patch("/api/admin/surveys/app_satisfaction", json={"title": "  Otro titulo  ", "is_active": False})
    assert res.status_code == 200
    assert survey.title == "Otro titulo"
    assert survey.is_active is False
    assert res.json()["key"] == "app_satisfaction"


async def test_admin_patch_unknown_survey_is_404(client, mock_db):
    mock_db.get = AsyncMock(return_value=None)
    res = await client.patch("/api/admin/surveys/nope", json={"is_active": False})
    assert res.status_code == 404


async def test_review_without_survey_key_uses_category_default(client, mock_db):
    mock_db.get = AsyncMock(return_value=_survey(key="keychain_setup", target_type="product", title="El llavero"))
    empty = MagicMock()
    empty.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=empty)

    async def _refresh(obj):
        obj.id = obj.id or __import__("uuid").uuid4()
        now = datetime.now(timezone.utc)
        obj.created_at = now
        obj.updated_at = now
    mock_db.refresh = AsyncMock(side_effect=_refresh)

    res = await client.post("/api/reviews", json={"target_type": "product", "rating": 5})
    assert res.status_code == 201
    body = res.json()
    assert body["survey_key"] == "keychain_setup"
    assert body["context"] == "El llavero"


async def test_review_rejects_survey_of_other_category(client, mock_db):
    mock_db.get = AsyncMock(return_value=_survey(key="keychain_setup", target_type="product"))
    res = await client.post("/api/reviews", json={"target_type": "platform", "rating": 4, "survey_key": "keychain_setup"})
    assert res.status_code == 422


async def test_admin_create_survey_uses_trigger_catalog(client, mock_db):
    mock_db.get = AsyncMock(return_value=None)
    mock_db.scalar = AsyncMock(return_value=6)
    res = await client.post("/api/admin/surveys", json={
        "title": "¿Qué tal la cotización?", "hint": "Cuéntanos", "trigger_key": "first_service_registered", "target_type": "platform",
    })
    assert res.status_code == 201
    body = res.json()
    assert body["key"] == "que_tal_la_cotizacion"
    assert body["trigger_key"] == "first_service_registered"
    created = mock_db.add.call_args.args[0]
    assert created.position == 7
    assert "Justo despues" in created.timing


async def test_admin_create_survey_rejects_unknown_trigger_and_bad_category(client, mock_db):
    base = {"title": "Encuesta nueva", "hint": "", "target_type": "platform"}
    res = await client.post("/api/admin/surveys", json={**base, "trigger_key": "nope"})
    assert res.status_code == 422
    res = await client.post("/api/admin/surveys", json={**base, "trigger_key": "workshop_service_registered"})
    assert res.status_code == 422


async def test_admin_cannot_delete_survey_with_responses(client, mock_db):
    mock_db.get = AsyncMock(return_value=_survey(key="custom"))
    mock_db.scalar = AsyncMock(return_value=2)
    res = await client.delete("/api/admin/surveys/custom")
    assert res.status_code == 409


async def test_admin_can_delete_empty_survey(client, mock_db):
    mock_db.get = AsyncMock(return_value=_survey(key="custom"))
    mock_db.scalar = AsyncMock(return_value=0)
    res = await client.delete("/api/admin/surveys/custom")
    assert res.status_code == 204
