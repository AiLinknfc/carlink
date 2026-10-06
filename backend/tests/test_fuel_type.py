import pytest

from app.schemas.schemas import VehicleCardResult, VehicleCreate, VehicleUpdate, normalize_fuel_type


@pytest.mark.parametrize("raw,expected", [
    ("GASOLINA", "gasolina"),
    ("Gasolina - Gas", "gasolina"),
    ("DIESEL", "diesel"),
    ("DIÉSEL", "diesel"),
    ("ACPM", "diesel"),
    ("GAS", "gas"),
    ("GNV", "gas"),
    ("GAS NATURAL", "gas"),
    ("HÍBRIDO", "hibrido"),
    ("ELÉCTRICO", "electrico"),
    ("", ""),
    ("   ", ""),
    ("kerosene", ""),
])
def test_normalize_fuel_type(raw, expected):
    assert normalize_fuel_type(raw) == expected


def test_normalize_none_is_preserved():
    assert normalize_fuel_type(None) is None


def test_create_defaults_and_normalizes():
    base = {"plate": "ABC-123"}
    assert VehicleCreate(**base).fuel_type == ""
    assert VehicleCreate(**base, fuel_type="DIESEL").fuel_type == "diesel"
    assert VehicleCreate(**base, fuel_type="algo raro").fuel_type == ""


def test_update_distinguishes_missing_from_cleared():
    assert "fuel_type" not in VehicleUpdate().model_dump(exclude_unset=True)
    assert VehicleUpdate(fuel_type="Diésel").model_dump(exclude_unset=True)["fuel_type"] == "diesel"
    assert VehicleUpdate(fuel_type="").model_dump(exclude_unset=True)["fuel_type"] == ""


def test_card_result_unknown_fuel_is_none():
    assert VehicleCardResult(fuel_type="ACPM", raw_text="x").fuel_type == "diesel"
    assert VehicleCardResult(fuel_type="???", raw_text="x").fuel_type is None
