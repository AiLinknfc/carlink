"""Fase 1 de docs/PLAN_ALIADOS_NEGOCIO.md: capacidades por tipo de negocio y periodo de acceso."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.main import app
from app.services import workshop_access, workshop_gate
from app.services.capabilities import KIND_CAPABILITIES, capabilities_for

NOW = datetime(2026, 10, 16, 12, tzinfo=timezone.utc)


def _w(kind="taller", plan="founder", until=None, granted=NOW, created=NOW):
    return SimpleNamespace(business_kind=kind, access_plan=plan, access_until=until, access_granted_at=granted, created_at=created)


# --- matriz de capacidades ---

def test_taller_tiene_el_panel_completo():
    caps = capabilities_for("taller")
    assert {"clientes", "ordenes", "mecanicos", "catalogo", "inventario", "citas", "diagnostico_ia", "rentabilidad"} <= caps


@pytest.mark.parametrize("kind", ["cda", "concesionario", "compraventa", "repuestos"])
def test_los_demas_tipos_no_tienen_ordenes_ni_diagnostico_ia(kind):
    caps = capabilities_for(kind)
    assert not ({"ordenes", "mecanicos", "catalogo", "diagnostico_ia", "rentabilidad"} & caps)
    assert {"perfil", "notificaciones", "documentos"} <= caps


def test_matriz_v2_por_tipo():
    assert "citas" in capabilities_for("cda") and "citas" not in capabilities_for("concesionario")
    assert "clientes" in capabilities_for("compraventa") and "clientes" not in capabilities_for("repuestos")
    assert "inventario" in capabilities_for("repuestos") and "inventario" not in capabilities_for("cda")


def test_tipo_desconocido_recibe_solo_lo_basico():
    assert capabilities_for("aseguradora") == capabilities_for("zzz") and "ordenes" not in capabilities_for("zzz")
    assert capabilities_for(None) == KIND_CAPABILITIES["taller"]  # sin dato: es un taller de antes de la migracion


# --- periodo de acceso ---

def test_acceso_vigente_y_vencido():
    w = _w(until=NOW + timedelta(days=10))
    assert workshop_access.is_active(w, NOW)
    assert not workshop_access.is_active(w, NOW + timedelta(days=11))


def test_convenio_no_vence():
    w = _w(plan="convenio", until=None)
    assert workshop_access.effective_until(w) is None and workshop_access.is_active(w, NOW + timedelta(days=9999))


def test_sin_fecha_en_otro_plan_equivale_a_siete_dias_desde_que_empezo():
    w = _w(plan="founder", until=None, granted=NOW)
    assert workshop_access.effective_until(w) == NOW + timedelta(days=7)


def test_grant_un_año_y_convenio():
    w = _w(plan="trial")
    workshop_access.grant(w, "founder", 365, NOW)
    assert w.access_plan == "founder" and w.access_until == NOW + timedelta(days=365) and w.access_granted_at == NOW
    workshop_access.grant(w, "convenio", 365, NOW)
    assert w.access_until is None


def test_campos_de_suscripcion_para_el_frontend():
    f = workshop_access.subscription_fields(_w(until=NOW + timedelta(days=5)), NOW)
    assert f["subscription_status"] == "trial" and f["subscription_plan"] == "founder" and f["trial_ends_at"] == NOW + timedelta(days=5)
    assert workshop_access.subscription_fields(_w(until=NOW - timedelta(days=1)), NOW)["subscription_status"] == "expired"
    assert workshop_access.subscription_fields(_w(plan="subscription", until=NOW + timedelta(days=30)), NOW)["subscription_status"] == "active"
    assert workshop_access.subscription_fields(_w(plan="convenio"), NOW)["subscription_status"] == "active"


# --- compuerta (lógica pura) ---

def test_compuerta_rechaza_funcion_que_el_tipo_no_incluye():
    with pytest.raises(HTTPException) as e:
        workshop_gate.check(_w(kind="concesionario", until=NOW + timedelta(days=99999)), "ordenes", "GET")
    assert e.value.status_code == 403 and e.value.detail == "capability_not_available"


def test_compuerta_vencido_deja_leer_pero_no_escribir():
    vencido = _w(until=datetime(2020, 1, 1, tzinfo=timezone.utc))
    workshop_gate.check(vencido, "ordenes", "GET")  # solo lectura: pasa
    for method in ("POST", "PUT", "PATCH", "DELETE"):
        with pytest.raises(HTTPException) as e:
            workshop_gate.check(vencido, "ordenes", method)
        assert e.value.status_code == 402 and e.value.detail == "access_expired"


def test_compuerta_vigente_permite_escribir():
    workshop_gate.check(_w(until=datetime(2999, 1, 1, tzinfo=timezone.utc)), "ordenes", "POST")


# --- compuerta montada en los routers (HTTP real) ---

@pytest.mark.anyio
async def test_concesionario_no_puede_usar_ordenes_ni_siquiera_leerlas(client, monkeypatch):
    async def _load(*_a, **_k):
        return _w(kind="concesionario", until=datetime(2999, 1, 1, tzinfo=timezone.utc))
    monkeypatch.setattr("app.services.workshop_gate._load_workshop", _load)
    resp = await client.get("/api/workshops/me/work-orders")
    assert resp.status_code == 403 and resp.json()["detail"] == "capability_not_available"


@pytest.mark.anyio
async def test_taller_con_acceso_vencido_recibe_402_al_escribir(client, monkeypatch):
    async def _load(*_a, **_k):
        return _w(kind="taller", until=datetime(2020, 1, 1, tzinfo=timezone.utc))
    monkeypatch.setattr("app.services.workshop_gate._load_workshop", _load)
    resp = await client.post("/api/workshops/me/inventory", json={"name": "Filtro"})
    assert resp.status_code == 402 and resp.json()["detail"] == "access_expired"


def test_todos_los_routers_del_panel_tienen_compuerta():
    panel = [r for r in app.routes if getattr(r, "path", "").startswith("/api/workshops/me/") and r.path != "/api/workshops/me/dashboard"]
    sin = [r.path for r in panel if not any(getattr(d.call, "__qualname__", "").startswith("workshop_gate") for d in r.dependant.dependencies)]
    assert not sin, f"rutas del panel sin compuerta: {sin}"
