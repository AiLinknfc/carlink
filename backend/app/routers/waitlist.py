from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin
from app.models.models import WaitlistLead
from app.schemas.schemas import WaitlistLeadCreate, WaitlistLeadOut

router = APIRouter(prefix="/waitlist", tags=["waitlist"])


@router.post("", response_model=WaitlistLeadOut, status_code=status.HTTP_201_CREATED)
async def create_waitlist_lead(
    body: WaitlistLeadCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Público — cualquiera puede dejar su contacto para el aviso de próximo lote."""
    lead = WaitlistLead(contact=body.contact.strip(), source=body.source)
    db.add(lead)
    await db.flush()
    await db.refresh(lead)
    return lead


@router.get("", response_model=list[WaitlistLeadOut])
async def list_waitlist_leads(
    user_id: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Admin-only — lista de contactos en espera del próximo lote."""
    result = await db.execute(
        select(WaitlistLead).order_by(WaitlistLead.created_at.desc())
    )
    return result.scalars().all()
