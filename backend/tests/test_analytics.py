from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.routers.analytics import _source_label
from app.schemas.schemas import AnalyticsEventBatch, AnalyticsEventIn

_BASE = {"anon_id": "anon-12345678", "session_id": "sess-12345678", "event": "page_view"}


def test_valid_event_accepted():
    e = AnalyticsEventIn(**_BASE, path="/shop", props={"step": "shipping"}, device="mobile")
    assert e.event == "page_view"


@pytest.mark.parametrize("name", ["Bad Name!", "", "x" * 61, "UPPER"])
def test_invalid_event_name_rejected(name):
    with pytest.raises(ValidationError):
        AnalyticsEventIn(**{**_BASE, "event": name})


def test_props_too_large_rejected():
    with pytest.raises(ValidationError):
        AnalyticsEventIn(**_BASE, props={f"k{i}": 1 for i in range(11)})
    with pytest.raises(ValidationError):
        AnalyticsEventIn(**_BASE, props={"k": "x" * 201})


def test_batch_limits():
    with pytest.raises(ValidationError):
        AnalyticsEventBatch(events=[])
    with pytest.raises(ValidationError):
        AnalyticsEventBatch(events=[_BASE] * 21)


def test_source_label():
    assert _source_label("facebook", "") == "facebook"
    assert _source_label("", "") == "directo"
    assert _source_label("", "https://carlink.com.co/shop") == "directo"
    assert _source_label("", "https://www.google.com/search?q=x") == "google.com"


# ---- Exclusión del admin y de las cuentas de prueba ----

import uuid  # noqa: E402

from sqlalchemy.dialects import postgresql  # noqa: E402

from app.services.analytics_scope import event_scope, is_internal_email  # noqa: E402


def test_internal_email_detection():
    assert is_internal_email("pruebas.features@carlink.internal")
    assert is_internal_email("  QA@CarLink.Internal ")
    assert not is_internal_email("persona@gmail.com")
    assert not is_internal_email("x@carlink.internal.evil.com")
    assert not is_internal_email(None) and not is_internal_email("")


def test_event_scope_excludes_users_and_their_browsers():
    sql = str(event_scope([uuid.uuid4()]).compile(dialect=postgresql.dialect()))
    assert "analytics_events.user_id IS NULL" in sql and "NOT IN" in sql
    assert "analytics_events.anon_id NOT IN (SELECT analytics_events.anon_id" in sql  # cruza por navegador


def test_event_scope_without_excluded_is_a_noop():
    assert str(event_scope([])) == ""
