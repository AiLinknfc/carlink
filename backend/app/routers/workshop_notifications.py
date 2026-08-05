from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_workshop
from app.models.models import WorkshopNotificationLog
from app.schemas.schemas import WorkshopNotificationCreate, WorkshopNotificationOut
from app.services.email import send_generic_email

router = APIRouter(prefix="/workshops/me/notifications", tags=["workshop-notifications"])

# Únicamente email tiene envío real hoy (usa services/email.py, ya configurado
# en producción). WhatsApp/SMS quedan registrados como 'simulado' hasta que se
# contrate un proveedor — decisión registrada en docs/PLAN_MIGRACION_TALLERPRO.md
# §5, para no fingir una integración que no existe.
_REAL_SEND_CHANNELS = {"Email"}


@router.get("", response_model=list[WorkshopNotificationOut])
async def list_notifications(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(100, le=300),
):
    workshop = await verify_workshop(user_id, db)
    result = await db.execute(
        select(WorkshopNotificationLog)
        .where(WorkshopNotificationLog.workshop_id == workshop.id)
        .order_by(WorkshopNotificationLog.sent_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


@router.post("", response_model=WorkshopNotificationOut, status_code=201)
async def send_notification(
    body: WorkshopNotificationCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    workshop = await verify_workshop(user_id, db)

    delivery_status = "simulado"
    if body.channel in _REAL_SEND_CHANNELS and body.recipient_email:
        subject = f"{workshop.name} — {body.notification_type}"
        html = f"""
        <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 20px; font-weight: 800; color: #111;">{workshop.name}</span>
          </div>
          <div style="background: #f9f9f9; border-radius: 16px; padding: 24px; border: 1px solid #eee;">
            <h2 style="font-size: 16px; color: #111; margin: 0 0 12px;">{body.notification_type}</h2>
            <p style="font-size: 14px; color: #333; line-height: 1.6; white-space: pre-line;">{body.message}</p>
          </div>
        </div>
        """
        sent = send_generic_email(body.recipient_email, subject, html)
        delivery_status = "enviado" if sent else "fallido"

    log = WorkshopNotificationLog(
        workshop_id=workshop.id,
        status=delivery_status,
        **body.model_dump(),
    )
    db.add(log)
    await db.flush()
    await db.refresh(log)
    return log
