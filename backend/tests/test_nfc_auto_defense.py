from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.services.alerts import pause_reason
from app.utils import client_ip, is_visitor_ip

LIMITS = dict(max_ips=10, max_scans=200)


@pytest.mark.parametrize("scans,ips", [(0, 0), (2, 1), (50, 3), (199, 9), (120, 9)])
def test_normal_use_is_never_paused(scans, ips):
    assert pause_reason(scans, ips, **LIMITS) is None


def test_many_distinct_connections_pause():
    assert "10 conexiones" in pause_reason(30, 10, **LIMITS)


def test_high_volume_pauses():
    assert "200 lecturas" in pause_reason(200, 2, **LIMITS)


@pytest.mark.parametrize("ip,expected", [
    ("100.64.0.4", False),   # red interna de Railway: el proxy, no un visitante
    ("127.0.0.1", False), ("10.1.2.3", False), ("192.168.1.5", False), ("::1", False),
    ("", False), (None, False), ("no-es-una-ip", False),
    ("181.49.10.20", True), ("203.0.113.7", True), ("2800:484::1", True),
])
def test_is_visitor_ip(ip, expected):
    assert is_visitor_ip(ip) is expected


def _req(headers: dict, host: str | None = "100.64.0.9"):
    return SimpleNamespace(headers={k.lower(): v for k, v in headers.items()}, client=SimpleNamespace(host=host) if host else None)


def test_client_ip_uses_last_forwarded_hop_not_client_supplied_one():
    # El cliente puede mandar su propio X-Forwarded-For; el proxy agrega la IP real AL FINAL.
    assert client_ip(_req({"X-Forwarded-For": "1.2.3.4, 181.49.10.20"})) == "181.49.10.20"


def test_client_ip_falls_back_to_real_ip_header_then_socket():
    assert client_ip(_req({"X-Real-Ip": "181.49.10.21"})) == "181.49.10.21"
    assert client_ip(_req({})) == "100.64.0.9"
    assert client_ip(_req({}, host=None)) == "unknown"


def test_client_ip_ignores_garbage_headers():
    assert client_ip(_req({"X-Forwarded-For": "not-an-ip"})) == "100.64.0.9"
