from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user, verify_workshop
from app.models.models import ShopOrder
from app.schemas.schemas import WorkshopAllianceOut
from app.routers.shop_orders import PRODUCT_PRICE_COP
from app.services import alliances
from app.services.workshop_gate import workshop_gate

# Código de alianza del negocio (docs/PLAN_ALIADOS_NEGOCIO.md, sección 5): lo que comparte con sus clientes y cuánto ha
# recomendado. Solo cantidades agregadas: nunca el nombre, contacto ni dirección de quien compró.
router = APIRouter(prefix="/workshops/me/alliance", tags=["workshop-alliance"], dependencies=[Depends(workshop_gate("alianza"))])


@router.get("", response_model=WorkshopAllianceOut)
async def my_alliance(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    workshop = await verify_workshop(user_id, db)
    settings = get_settings()
    approved = (ShopOrder.alliance_workshop_id == workshop.id, ShopOrder.status == "approved")
    units_total, orders_total = (await db.execute(
        select(func.coalesce(func.sum(ShopOrder.quantity), 0), func.count(ShopOrder.id)).where(*approved)
    )).one()
    return WorkshopAllianceOut(
        code=workshop.code,
        share_url=f"{settings.frontend_url}/?ref={workshop.code}",
        eligible=alliances.eligibility(workshop) is None,
        reason=alliances.eligibility(workshop),
        discount_per_unit_cop=alliances.discount_for(1, PRODUCT_PRICE_COP)[0],
        monthly_cap_units=settings.alliance_monthly_cap_units,
        units_30d=await alliances.units_last_30d(db, workshop.id),
        units_total=int(units_total or 0),
        orders_total=int(orders_total or 0),
    )
