from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_admin
from app.models.models import WaitlistLead
from app.schemas.schemas import WaitlistLeadCreate, WaitlistLeadOut
from app.services import email
from app.services.contact_validation import classify_contact

logger = logging.getLogger("carlink")

router = APIRouter(prefix="/waitlist", tags=["waitlist"])

# Ambos orígenes disparan el mismo correo — antes solo se chequeaba
# "shop_guia_mantenimiento", así que un lead dejado desde la landing
# (source="landing_guia_mantenimiento") se guardaba pero nunca recibía el
# correo con el PDF, aunque el frontend igual mostraba "enviado con éxito".
_GUIDE_SOURCES = {"shop_guia_mantenimiento", "landing_guia_mantenimiento"}

# Key fija en R2 donde vive el PDF de la guía — subido una sola vez, ver
# docs/CONTEXTO.md. Si se reemplaza el PDF, se sube con la misma key.
_GUIDE_PDF_KEY = "guides/mantenimiento-preventivo-carlink.pdf"


@router.post("", response_model=WaitlistLeadOut, status_code=status.HTTP_201_CREATED)
async def create_waitlist_lead(
    body: WaitlistLeadCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Público — cualquiera puede dejar su contacto para el aviso de próximo lote.

    Estos leads se usan para seguimiento y campañas de marketing (no solo
    para avisar del próximo lote) — por eso el contacto se valida y
    normaliza acá en vez de guardarse tal cual lo escribió la persona
    (ver app/services/contact_validation.py): un typo sin detectar hoy es un
    lead inutilizable después. Rechaza con 422 si no matchea ni como correo
    ni como celular real (con o sin indicativo)."""
    classified = classify_contact(body.contact)
    if classified is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="contact_invalid",
        )
    contact_type, contact = classified

    lead = WaitlistLead(contact=contact, contact_type=contact_type, source=body.source)
    db.add(lead)
    await db.flush()
    await db.refresh(lead)

    if body.source in _GUIDE_SOURCES and contact_type == "email":
        # Best-effort: un fallo de envío nunca debe tumbar el guardado del
        # lead. run_in_threadpool porque email.send_guide_email hace una
        # llamada HTTP bloqueante (API de Resend, ver app/services/email.py).
        try:
            settings = get_settings()
            guide_url = f"{settings.frontend_url}/api/upload/files/{_GUIDE_PDF_KEY}"
            await run_in_threadpool(email.send_guide_email, contact, guide_url)
        except Exception as e:
            logger.error(f"send_guide_email failed for lead {lead.id}: {e}")

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
