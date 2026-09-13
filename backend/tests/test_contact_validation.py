"""Validación del "contact" de waitlist_leads (correo o celular) — usada
para no dejar entrar leads inutilizables a la base de datos que se usa para
campañas de marketing (docs/PENDIENTES.md). Ver app/services/contact_validation.py."""

from app.services.contact_validation import classify_contact


def test_valid_email_normalized_lowercase_domain():
    assert classify_contact("ANDRES@Correo.COM") == ("email", "ANDRES@correo.com")


def test_email_with_surrounding_whitespace():
    assert classify_contact("  andres@correo.com  ") == ("email", "andres@correo.com")


def test_malformed_email_rejected():
    assert classify_contact("no-es-correo") is None
    assert classify_contact("a@@b.com") is None
    assert classify_contact("a@b") is None


def test_colombian_mobile_without_indicativo():
    # La forma más común en la que alguien escribe su propio celular — sin
    # el +57, porque para uno mismo el indicativo "se sobreentiende".
    assert classify_contact("3001234567") == ("phone", "+573001234567")


def test_colombian_mobile_with_various_formatting():
    for raw in ["300 123 4567", "300-123-4567", "+57 300 123 4567", "+573001234567"]:
        assert classify_contact(raw) == ("phone", "+573001234567")


def test_indicativo_without_plus_not_confused_with_national_number():
    # El caso que motivó el pedido: escribir el indicativo pegado sin "+"
    # (57 + el celular de 10 dígitos) no debe interpretarse como un número
    # nacional de 12 dígitos inválido — debe reconocerse igual que con "+".
    assert classify_contact("573001234567") == ("phone", "+573001234567")


def test_foreign_indicativo_respected_over_default_region():
    assert classify_contact("+1 305 555 0100") == ("phone", "+13055550100")


def test_too_short_phone_rejected():
    assert classify_contact("3001234") is None


def test_empty_and_blank_rejected():
    assert classify_contact("") is None
    assert classify_contact("   ") is None


def test_arbitrary_garbage_rejected():
    assert classify_contact("cualquier-cosa") is None
    assert classify_contact("12345") is None
