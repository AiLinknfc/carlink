"""Historial publico de la ficha NFC: en modo privado (georeference_enabled=False) no sale ningun taller."""
import asyncio
from datetime import date
from types import SimpleNamespace
from uuid import uuid4

from app.routers.nfc import _build_service_history


class _Result:
    def __init__(self, rows):
        self._rows = rows

    def scalars(self):
        return self

    def all(self):
        return self._rows


class _FakeDb:
    def __init__(self, workshops):
        self._workshops = workshops

    async def execute(self, _stmt):
        return _Result(self._workshops)


def _ws():
    return SimpleNamespace(
        id="w-uuid", name="Taller Real", latitude=4.6, longitude=-74.0, address="Cra 1 # 2-3", city="Bogota",
        phone="3000000000", description="", business_hours="", specialties=[], rating=4.5, is_verified=True,
        email="t@x.co", social_website="", social_whatsapp="", social_instagram="", social_facebook="",
    )


def _rec(service_type, workshop):
    return SimpleNamespace(id=uuid4(), date=date(2026, 10, 14), service_type=service_type, workshop=workshop, workshop_id=None)


RECORDS = [_rec("Aire", "Taller Real"), _rec("Combustible", "Taller Real"), _rec("Aceite", "Otro")]


def test_publico_con_georeferencia_mantiene_nombre_coordenadas_y_perfil():
    history, profiles = asyncio.run(_build_service_history(RECORDS, _FakeDb([_ws()]), private=False))
    assert history[0]["workshop_name"] == "Taller Real"
    assert history[0]["latitude"] == 4.6
    assert "Taller Real" in profiles


def test_privado_no_expone_nombre_coordenadas_ni_perfiles():
    history, profiles = asyncio.run(_build_service_history(RECORDS, _FakeDb([_ws()]), private=True))
    assert profiles == {}
    for item in history:
        assert item["workshop_name"] == ""
        assert item["latitude"] is None and item["longitude"] is None


def test_privado_conserva_la_clave_opaca_para_contar_sellos_por_taller():
    history, _ = asyncio.run(_build_service_history(RECORDS, _FakeDb([_ws()]), private=True))
    assert history[0]["workshop_key"] == history[1]["workshop_key"] != history[2]["workshop_key"]
