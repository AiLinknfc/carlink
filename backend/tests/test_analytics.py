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
