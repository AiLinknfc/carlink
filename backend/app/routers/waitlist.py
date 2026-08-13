from __future__ import annotations

import logging
import re
from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_admin
from app.models.models import WaitlistLead
from app.schemas.schemas import WaitlistLeadCreate, WaitlistLeadOut
from app.services import email

logger = logging.getLogger("carlink")

router = APIRouter(prefix="/waitlist", tags=["waitlist"])

# El campo "contact" del formulario (shop/page.tsx, sección Guía de
# Mantenimiento) acepta correo O WhatsApp indistintamente, sin distinguirlos
# — no se tocó ese formulario acá, solo se detecta cuál de los dos es antes
# de intentar mandar un correo. Si es un teléfono, no se envía nada por
# ahora (ver docs/PENDIENTES.md si se quiere forzar el campo correo).
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Key fija en R2 donde vive el PDF de la guía — subido una sola vez, ver
# docs/CONTEXTO.md. Si se reemplaza el PDF, se sube con la misma key.
_GUIDE_PDF_KEY = "guides/mantenimiento-preventivo-carlink.pdf"


@router.post("", response_model=WaitlistLeadOut, status_code=status.HTTP_201_CREATED)
async def create_waitlist_lead(
    body: WaitlistLeadCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Público — cualquiera puede dejar su contacto para el aviso de próximo lote."""
    contact = body.contact.strip()
    lead = WaitlistLead(contact=contact, source=body.source)
    db.add(lead)
    await db.flush()
    await db.refresh(lead)

    if body.source == "shop_guia_mantenimiento" and _EMAIL_RE.match(contact):
        # Best-effort: un fallo de SMTP nunca debe tumbar el guardado del
        # lead. email.send_guide_email es smtplib bloqueante — sin
        # run_in_threadpool, un Hostinger lento congela el event loop
        # entero, no solo este request (visto en vivo: ~2 min de hang).
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
