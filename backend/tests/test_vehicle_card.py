from datetime import date
from types import SimpleNamespace

from app.services.vehicle_card import normalize_card_data, validate_card

TODAY = date(2026, 10, 5)

GOOD_CARD = {
    "license_number": "10012345678", "owner_document": "79123456", "vin": "3MZBN1V70KM123456",
    "engine_number": "PE12345678", "chassis_number": "3MZBN1V70KM123456", "cilindraje": "2000",
    "service": "particular", "capacity": "5", "doors": "4", "registration_date": "2019-03-15",
}


def _vehicle(**over):
    v = dict(plate="ABC-123", city="Envigado", brand="Mazda", model="3 Grand Touring", year=2019,
             color="Gris", body_type="Automóvil", type="particular", fuel_type="gasolina",
             owner_name="JUAN CARLOS PEREZ GOMEZ", card_data=dict(GOOD_CARD))
    v.update(over)
    return SimpleNamespace(**v)


def test_complete_card_has_no_errors():
    assert validate_card(_vehicle(), TODAY) == {}


def test_every_field_is_required():
    for f in GOOD_CARD:
        card = {k: v for k, v in GOOD_CARD.items() if k != f}
        assert f in validate_card(_vehicle(card_data=card), TODAY), f
    for attr, empty in (("brand", ""), ("model", ""), ("color", ""), ("city", ""), ("body_type", ""),
                        ("fuel_type", ""), ("owner_name", ""), ("year", 0)):
        assert attr in validate_card(_vehicle(**{attr: empty}), TODAY), attr


def test_vin_rules_car_vs_moto():
    assert "vin" in validate_card(_vehicle(card_data={**GOOD_CARD, "vin": "3MZBN1V70KM12345"}), TODAY)   # 16
    assert "vin" in validate_card(_vehicle(card_data={**GOOD_CARD, "vin": "3MZBN1V70KM12345O"}), TODAY)  # letra O
    moto = _vehicle(body_type="Moto", type="moto", card_data={**GOOD_CARD, "vin": "9C2KC1670AR123456"})
    assert "vin" not in validate_card(moto, TODAY)
    short = _vehicle(body_type="Moto", type="moto", card_data={**GOOD_CARD, "vin": "AB12"})
    assert "vin" in validate_card(short, TODAY)


def test_moto_does_not_need_doors_but_car_does():
    no_doors = {k: v for k, v in GOOD_CARD.items() if k != "doors"}
    assert "doors" not in validate_card(_vehicle(body_type="Moto", type="moto", card_data=no_doors), TODAY)
    assert "doors" in validate_card(_vehicle(card_data=no_doors), TODAY)


def test_numeric_and_date_bounds():
    bad = {**GOOD_CARD, "cilindraje": "10", "capacity": "0", "doors": "9", "license_number": "123",
           "owner_document": "12", "service": "taxi", "registration_date": "2030-01-01"}
    errors = validate_card(_vehicle(card_data=bad), TODAY)
    for f in ("cilindraje", "capacity", "doors", "license_number", "owner_document", "service", "registration_date"):
        assert f in errors, f
    assert "registration_date" in validate_card(_vehicle(card_data={**GOOD_CARD, "registration_date": "2017-06-01"}), TODAY)  # antes del año modelo (2019)
    assert "cilindraje" not in validate_card(_vehicle(fuel_type="electrico", card_data={**GOOD_CARD, "cilindraje": "0"}), TODAY)


def test_owner_name_needs_full_name():
    assert "owner_name" in validate_card(_vehicle(owner_name="JUAN"), TODAY)


def test_normalize_card_data():
    out = normalize_card_data({
        "vin": " 3mzbn1v70km123456 ", "license_number": "No. 1001-234", "owner_document": "79.123.456",
        "cilindraje": "1.998 cc", "service": "PARTICULAR", "registration_date": "15/03/2019",
        "capacity": "5 PSJ", "doors": "4", "junk": "x", "engine_number": " pe-123 ",
    })
    assert out == {
        "vin": "3MZBN1V70KM123456", "license_number": "1001234", "owner_document": "79123456",
        "cilindraje": "1998", "service": "particular", "registration_date": "2019-03-15",
        "capacity": "5", "doors": "4", "engine_number": "PE-123",
    }
    assert normalize_card_data(None) == {}
    assert normalize_card_data({"vin": ""}) == {}


def test_vehicle_class_is_captured_but_not_required():
    assert normalize_card_data({"vehicle_class": " AUTOMOVIL "}) == {"vehicle_class": "AUTOMOVIL"}
    # No entra en la validación: una tarjeta completa sin ese dato sigue sin errores.
    assert validate_card(_vehicle(), TODAY) == {}
