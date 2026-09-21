from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas.schemas import SUPPORT_TICKET_TYPES, SupportTicketCreate

_OK = dict(name="Ana", email="a@b.co", type="NFC_READ_ERROR", message="Mi llavero no abre la ficha.")


def test_valid_ticket():
    assert SupportTicketCreate(**_OK).type in SUPPORT_TICKET_TYPES


@pytest.mark.parametrize("patch", [{"message": "corto"}, {"name": "A"}, {"message": "x" * 2001}])
def test_invalid_ticket_rejected(patch):
    with pytest.raises(ValidationError):
        SupportTicketCreate(**{**_OK, **patch})
