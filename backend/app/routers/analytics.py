from __future__ import annotations

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin, get_current_user_optional
from app.models.models import WhatsappClick
from app.schemas.schemas import WhatsappClickCreate, WhatsappClickOut, WhatsappClickSummaryOut

logger = logging.getLogger("carlink")

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.post("/whatsapp-click", response_model=WhatsappClickOut, status_code=status.HTTP_201_CREATED)
async def track_whatsapp_click(
    body: WhatsappClickCreate,
    user_id: Annotated[str | None, Depends(get_current_user_optional)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Público (no requiere sesión, igual que el resto de los botones de
    WhatsApp que dispara) — tracking mínimo de qué tan seguido se clickea
    cada uno de los links wa.me de la app y por qué motivo, para tener datos
    reales antes de decidir si vale la pena automatizar alguno con la API de
    WhatsApp Business (ver docs/PENDIENTES.md). Best-effort desde el
    frontend: un fallo acá nunca debe impedir que el link de WhatsApp se
    abra — por eso este endpoint no hace nada más que guardar la fila."""
    click = WhatsappClick(
        intent=body.intent,
        source=body.source,
        user_id=uuid.UUID(user_id) if user_id else None,
    )
    db.add(click)
    await db.flush()
    await db.refresh(click)
    return click


@router.get("/whatsapp-clicks/summary", response_model=WhatsappClickSummaryOut)
async def whatsapp_clicks_summary(
    admin_user_id: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Admin-only — conteo agregado, no la lista fila por fila (no hace falta
    todavía; si más adelante se necesita filtrar por fecha/usuario puntual,
    se agrega ahí, no acá)."""
    total = await db.scalar(select(func.count()).select_from(WhatsappClick)) or 0

    by_intent_rows = await db.execute(
        select(WhatsappClick.intent, func.count()).group_by(WhatsappClick.intent)
    )
    by_source_rows = await db.execute(
        select(WhatsappClick.source, func.count()).group_by(WhatsappClick.source)
    )

    return WhatsappClickSummaryOut(
        total=total,
        by_intent=dict(by_intent_rows.all()),
        by_source=dict(by_source_rows.all()),
    )
