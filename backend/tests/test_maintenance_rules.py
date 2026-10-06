from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.services.maintenance_rules import (
    MAX_BACKDATE_DAYS, MAX_MILEAGE_JUMP, RuleError, check_cost, check_mileage, resolve_service_date,
)

TODAY = date(2026, 10, 5)


def test_date_defaults():
    assert resolve_service_date(None, TODAY) == TODAY
    assert resolve_service_date("", TODAY) == TODAY
    assert resolve_service_date(None, TODAY, current=date(2026, 1, 1)) == date(2026, 1, 1)


def test_date_window_edges():
    assert resolve_service_date((TODAY - timedelta(days=MAX_BACKDATE_DAYS)).isoformat(), TODAY)
    with pytest.raises(RuleError):
        resolve_service_date((TODAY - timedelta(days=MAX_BACKDATE_DAYS + 1)).isoformat(), TODAY)
    assert resolve_service_date((TODAY + timedelta(days=1)).isoformat(), TODAY)  # tolerancia de zona horaria
    with pytest.raises(RuleError):
        resolve_service_date((TODAY + timedelta(days=2)).isoformat(), TODAY)


def test_date_invalid_and_unchanged_old():
    with pytest.raises(RuleError):
        resolve_service_date("no-es-fecha", TODAY)
    old = date(2026, 1, 1)
    assert resolve_service_date("2026-01-01", TODAY, current=old) == old
    with pytest.raises(RuleError):
        resolve_service_date("2026-01-02", TODAY, current=old)


def test_mileage_empty_history_and_bounds():
    check_mileage(1000, TODAY, [])
    for bad in (-1, 3_000_001):
        with pytest.raises(RuleError):
            check_mileage(bad, TODAY, [])


def test_mileage_order_by_date():
    hist = [(date(2026, 9, 1), 50000), (date(2026, 10, 1), 60000)]
    check_mileage(65000, date(2026, 10, 5), hist)
    with pytest.raises(RuleError):
        check_mileage(55000, date(2026, 10, 5), hist)       # menor a uno anterior
    check_mileage(55000, date(2026, 9, 15), hist)           # entre los dos: válido
    with pytest.raises(RuleError):
        check_mileage(61000, date(2026, 9, 15), hist)       # mayor a uno posterior


def test_mileage_same_day_not_compared_but_jump_applies():
    hist = [(TODAY, 60000)]
    check_mileage(59000, TODAY, hist)
    with pytest.raises(RuleError):
        check_mileage(60000 + MAX_MILEAGE_JUMP + 1, TODAY, hist)
    check_mileage(60000 + MAX_MILEAGE_JUMP, TODAY, hist)


def test_cost():
    check_cost(None)
    check_cost(Decimal("0"))
    check_cost(Decimal("150000"))
    for bad in (Decimal("-1"), Decimal("1000000001")):
        with pytest.raises(RuleError):
            check_cost(bad)


# ---- Historial anterior ----

from app.services.maintenance_rules import check_support_url, resolve_prior_date  # noqa: E402

JOINED = date(2026, 9, 1)


def test_prior_date_required_and_before_join():
    with pytest.raises(RuleError):
        resolve_prior_date(None, JOINED)
    with pytest.raises(RuleError):
        resolve_prior_date("", JOINED)
    assert resolve_prior_date("2026-08-31", JOINED) == date(2026, 8, 31)
    for same_or_later in ("2026-09-01", "2026-10-01"):
        with pytest.raises(RuleError):
            resolve_prior_date(same_or_later, JOINED)


def test_prior_date_sanity_bounds():
    with pytest.raises(RuleError):
        resolve_prior_date("not-a-date", JOINED)
    with pytest.raises(RuleError):
        resolve_prior_date("1990-01-01", JOINED)  # más de 30 años
    with pytest.raises(RuleError):
        resolve_prior_date("2017-12-31", JOINED, model_year=2019)  # antes del año del vehículo
    assert resolve_prior_date("2018-06-01", JOINED, model_year=2019) == date(2018, 6, 1)  # modelo 2019 sale en 2018


def test_support_url_must_be_users_own_upload():
    uid = "11111111-1111-1111-1111-111111111111"
    check_support_url(f"/api/upload/files/{uid}/abc.jpg", uid)
    for bad in (
        "", "https://evil.example/x.jpg", "/api/upload/files/other/abc.jpg",
        f"/api/upload/files/{uid}/", f"/api/upload/files/{uid}/../x.jpg", f"/api/upload/files/{uid}/a/b.jpg",
    ):
        with pytest.raises(RuleError):
            check_support_url(bad, uid)
