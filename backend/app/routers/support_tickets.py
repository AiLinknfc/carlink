from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin, get_current_user_optional
from app.models.models import SupportTicket
from app.schemas.schemas import (
    SUPPORT_TICKET_TYPES,
    SupportTicketCreate,
    SupportTicketOut,
    SupportTicketUpdate,
)
from app.services import email
from app.services.cache import get_redis
from app.services.contact_validation import classify_contact

logger = logging.getLogger("carlink")

router = APIRouter(prefix="/support-tickets", tags=["support"])
admin_router = APIRouter(prefix="/admin/support-tickets", tags=["support"])

_RATE_WINDOW = 3600
_RATE_MAX = 5  # tickets por hora por IP


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def _rate_ok(ip: str) -> bool:
    r = await get_redis()
    if r is None:
        return True
    key = f"rate:support:{ip}"
    count = await r.incr(key)
    if count == 1:
        await r.expire(key, _RATE_WINDOW)
    return count <= _RATE_MAX


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_ticket(
    body: SupportTicketCreate,
    request: Request,
    user_id: Annotated[str | None, Depends(get_current_user_optional)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Público (sesión opcional). Devuelve solo el número de ticket."""
    if body.website_confirm.strip():
        return {"number": 0}  # bot: respuesta de éxito falsa, no se guarda
    if not await _rate_ok(_client_ip(request)):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="rate_limited")
    if body.type not in SUPPORT_TICKET_TYPES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="type_invalid")
    classified = classify_contact(body.email)
    if classified is None or classified[0] != "email":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="email_invalid")

    ticket = SupportTicket(
        name=body.name.strip(), email=classified[1], type=body.type, message=body.message.strip(),
        plate=body.plate.strip().upper(), diagnostic_id=body.diagnostic_id.strip(),
        user_id=uuid.UUID(user_id) if user_id else None,
    )
    db.add(ticket)
    await db.flush()
    await db.refresh(ticket)

    # Best-effort: un fallo de correo nunca debe perder el ticket (ya quedó guardado).
    try:
        email.send_support_ticket_admin_email(ticket)
        email.send_support_ticket_ack_email(ticket.email, ticket.name, ticket.number)
    except Exception:
        logger.exception("support ticket email failed")
    return {"number": ticket.number}


@admin_router.get("", response_model=list[SupportTicketOut])
async def list_tickets(
    _: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    status_filter: str | None = None,
):
    q = select(SupportTicket).order_by(SupportTicket.created_at.desc()).limit(200)
    if status_filter:
        q = q.where(SupportTicket.status == status_filter)
    return (await db.execute(q)).scalars().all()


@admin_router.patch("/{ticket_id}", response_model=SupportTicketOut)
async def update_ticket(
    ticket_id: uuid.UUID,
    body: SupportTicketUpdate,
    _: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if body.status not in ("open", "resolved"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="status_invalid")
    row = await db.get(SupportTicket, ticket_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="not_found")
    row.status = body.status
    row.resolved_at = datetime.now(timezone.utc) if body.status == "resolved" else None
    await db.flush()
    await db.refresh(row)
    return row
