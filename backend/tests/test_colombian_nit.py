"""Validador de NIT colombiano (docs/PENDIENTES.md, "El trial de taller es
la mayor grieta real del modelo cerrado" — filtra el caso trivial de
inventar un legal_id único para conseguir otra cuenta taller con trial
gratis). El caso 800197268-4 es un ejemplo real publicado, no inventado —
ver el comentario en app/services/colombian_nit.py."""

from app.services.colombian_nit import is_valid_colombian_nit


def test_real_published_example():
    assert is_valid_colombian_nit("800197268-4") is True


def test_accepts_dots_and_spaces():
    assert is_valid_colombian_nit("800.197.268-4") is True
    assert is_valid_colombian_nit(" 800197268-4 ") is True


def test_wrong_check_digit_rejected():
    assert is_valid_colombian_nit("800197268-5") is False


def test_missing_check_digit_rejected():
    assert is_valid_colombian_nit("800197268") is False


def test_arbitrary_string_rejected():
    # El caso que motivó esto: hoy cualquier string único pasaba.
    assert is_valid_colombian_nit("cualquier-cosa-unica-123") is False
    assert is_valid_colombian_nit("12345678-9") is False


def test_empty_rejected():
    assert is_valid_colombian_nit("") is False
