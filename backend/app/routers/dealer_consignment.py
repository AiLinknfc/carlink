from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_workshop
from app.models.models import NfcTokenWhitelist, Partner
from app.schemas.schemas import ConsignmentOut, ConsignmentRowOut
from app.services.workshop_gate import workshop_gate

# Llaveros que CarLink dejó en consignación al concesionario (docs/PLAN_ALIADOS_NEGOCIO.md, sección 16). Solo lectura: el admin los
# aprovisiona y los asigna al partner vinculado; el concesionario ve cuántos tiene y cuántos ya activaron sus compradores.
router = APIRouter(prefix="/workshops/me/consignment", tags=["consignment"], dependencies=[Depends(workshop_gate("consignacion"))])


@router.get("", response_model=ConsignmentOut)
async def my_consignment(user_id: Annotated[str, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    workshop = await verify_workshop(user_id, db)
    partner = (await db.execute(select(Partner).where(Partner.workshop_id == workshop.id))).scalar_one_or_none()
    if partner is None:
        return ConsignmentOut(linked=False)
    items = (await db.execute(
        select(NfcTokenWhitelist).where(NfcTokenWhitelist.provisioned_by_partner_id == partner.id).order_by(NfcTokenWhitelist.created_at.desc())
    )).scalars().all()
    available = sum(1 for i in items if i.status == "available")
    claimed = sum(1 for i in items if i.status == "claimed")
    return ConsignmentOut(
        linked=True, partner_name=partner.name, status=partner.status, quota_total=partner.quota_total,
        available=available, claimed=claimed, other=len(items) - available - claimed,
        # Nunca el código de activación ni quién lo activó; solo el prefijo para reconocer la unidad.
        rows=[ConsignmentRowOut(token_prefix=i.token_prefix, status=i.status, claimed_at=i.claimed_at, created_at=i.created_at) for i in items[:200]],
    )
