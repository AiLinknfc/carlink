"""Código de alianza y descuento de llaveros (docs/PLAN_ALIADOS_NEGOCIO.md, sección 5).

El código es el TLR-XXXXX de la ficha del negocio. Todo se decide en el servidor: el cliente solo manda el código y el
servidor calcula el descuento, lo valida y lo deja guardado en el pedido (atribución lista para una futura comisión)."""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.models import ShopOrder, Workshop
from app.services import workshop_access

CODE_RE = re.compile(r"^TLR-[A-Z0-9]{5}$")
PENDING_WINDOW = timedelta(hours=48)   # un pedido pendiente cuenta para el tope solo este tiempo
CAP_WINDOW = timedelta(days=30)


def normalize(code: str | None) -> str | None:
    """'tlr-ab12c ' -> 'TLR-AB12C'; None si no tiene la forma de un código de taller."""
    c = (code or "").strip().upper()
    return c if CODE_RE.match(c) else None


@dataclass
class Resolved:
    workshop: Workshop
    code: str
    discount_per_unit_cop: int
    discount_cop: int


class AllianceError(Exception):
    """`reason`: invalid | inactive | self | limit (mismos valores que AllianceCheckOut.reason)."""
    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


def discount_for(quantity: int, unit_price_cop: int) -> tuple[int, int]:
    """(descuento por unidad, descuento total) en COP; nunca deja el pedido por debajo de cero."""
    per_unit = min(get_settings().alliance_discount_per_keychain_cop, unit_price_cop)
    return per_unit, per_unit * quantity


def _counted_units():
    """Pedidos que cuentan para el tope: pagados (30 días) o pendientes recientes (48 h)."""
    now = datetime.now(timezone.utc)
    return or_(
        and_(ShopOrder.status == "approved", ShopOrder.created_at >= now - CAP_WINDOW),
        and_(ShopOrder.status == "pending", ShopOrder.created_at >= now - PENDING_WINDOW),
    )


async def units_last_30d(db: AsyncSession, workshop_id) -> int:
    return (await db.execute(
        select(func.coalesce(func.sum(ShopOrder.quantity), 0)).where(ShopOrder.alliance_workshop_id == workshop_id, _counted_units())
    )).scalar() or 0


def eligibility(workshop: Workshop) -> str | None:
    """None si el negocio puede dar descuento; si no, la razón (not_verified | access_expired)."""
    if not workshop.is_verified:
        return "not_verified"
    if not workshop_access.is_active(workshop):
        return "access_expired"
    return None


async def resolve(db: AsyncSession, raw_code: str, quantity: int, unit_price_cop: int, buyer_user_id=None) -> Resolved:
    """Valida el código para este pedido y calcula el descuento. Lanza AllianceError si no aplica."""
    code = normalize(raw_code)
    if code is None:
        raise AllianceError("invalid")
    workshop = (await db.execute(select(Workshop).where(Workshop.code == code))).scalar_one_or_none()
    if workshop is None or not workshop.is_verified:
        raise AllianceError("invalid")        # mismo mensaje para "no existe" y "no verificado": no se enumeran negocios
    if not workshop_access.is_active(workshop):
        raise AllianceError("inactive")
    if buyer_user_id is not None and str(workshop.owner_id) == str(buyer_user_id):
        raise AllianceError("self")           # nadie se da descuento con su propio código
    if await units_last_30d(db, workshop.id) + quantity > get_settings().alliance_monthly_cap_units:
        raise AllianceError("limit")
    per_unit, total = discount_for(quantity, unit_price_cop)
    return Resolved(workshop=workshop, code=code, discount_per_unit_cop=per_unit, discount_cop=total)
