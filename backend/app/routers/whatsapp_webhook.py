from __future__ import annotations

import json
import logging
import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.models import NfcTokenWhitelist, ShopOrder, WhatsappMessage
from app.services import whatsapp
from app.services.crypto import decrypt_url

logger = logging.getLogger("carlink")

router = APIRouter(prefix="/webhooks", tags=["whatsapp"])

# Un estado solo avanza, nunca retrocede (Meta puede entregar webhooks fuera
# de orden: 'read' antes que 'delivered'). 'failed' siempre gana.
_RANK = {"queued": 0, "sent": 1, "delivered": 2, "read": 3}


_REFERENCE_RE = re.compile(r"CLK-[A-Fa-f0-9]{16}")
_MAX_REPLIES_PER_ORDER = 5  # tope de reenvíos del código por pedido

_NOT_FOUND = "No encontramos un pedido pagado asociado a este numero. Escribinos por el canal de soporte de CarLink si necesitas ayuda."


async def _reply_activation_code(sender: str, text: str, inbound_id: str, db: AsyncSession) -> None:
    """Plan B (plantillas de Meta aún sin aprobar): el comprador le escribe
    primero al número de CarLink con su referencia de pedido — eso abre la
    ventana de 24 h en la que sí se puede responder texto libre — y acá se le
    devuelve su código. Seguridad: el código SOLO se entrega si quien escribe
    (número verificado por WhatsApp, no por lo que diga el texto) coincide
    con el celular del pedido; ante cualquier otra cosa se responde un mensaje
    genérico que no revela si el pedido existe."""
    if (await db.execute(
        select(WhatsappMessage.id).where(WhatsappMessage.provider_message_id == inbound_id)
    )).first():
        return  # Meta reintentó este mismo webhook — ya se procesó
    m = _REFERENCE_RE.search(text or "")
    order = None
    if m:
        order = (await db.execute(
            select(ShopOrder).where(ShopOrder.reference == m.group(0).upper())
        )).scalar_one_or_none()

    db.add(WhatsappMessage(
        order_id=order.id if order else None, to_phone=sender, template="inbound",
        status="received", provider_message_id=inbound_id,
    ))
    await db.flush()
    if not m:
        return  # mensaje sin referencia: no es de este flujo, no se responde

    body = _NOT_FOUND
    template = "text:not_found"
    if order and order.status == "approved" and whatsapp.normalize_co_phone(order.customer_phone) == sender:
        replies = await db.scalar(
            select(func.count()).select_from(WhatsappMessage)
            .where(WhatsappMessage.order_id == order.id, WhatsappMessage.template == "text:activation")
        ) or 0
        codes = [c for c in (decrypt_url(r[0]) for r in (await db.execute(
            select(NfcTokenWhitelist.activation_code_encrypted).where(NfcTokenWhitelist.shop_order_id == order.id)
        )).all() if r[0]) if c]
        first_name = (order.customer_name.split(" ")[0] or "").strip()
        if replies >= _MAX_REPLIES_PER_ORDER:
            body, template = "Ya te enviamos tu codigo varias veces. Si lo perdiste, escribinos por soporte.", "text:limit"
        elif not codes:
            body, template = f"Hola {first_name}, tu pago esta confirmado. Tu llavero viene en camino y el codigo de activacion va impreso en el empaque.", "text:no_code"
        elif order.user_id is not None:
            body, template = f"Hola {first_name}, tu pago esta confirmado. Tu codigo de activacion esta en Mis pedidos, dentro de tu cuenta en carlink.com.co/app.", "text:activation_ready"
        else:
            listado = "\n".join(codes)
            body, template = (
                f"Hola {first_name}, tu pago esta confirmado. Tu codigo de activacion del llavero CarLink:\n\n{listado}\n\n"
                "Activalo en carlink.com.co/app. Guardalo, es de un solo uso.",
                "text:activation",
            )
    message_id, error = await run_in_threadpool(whatsapp.send_text, sender, body)
    db.add(WhatsappMessage(
        order_id=order.id if order else None, to_phone=sender, template=template,
        status="sent" if message_id else "failed", provider_message_id=message_id, error=error,
    ))
    await db.flush()


@router.get("/whatsapp")
async def verify_webhook(
    mode: Annotated[str | None, Query(alias="hub.mode")] = None,
    token: Annotated[str | None, Query(alias="hub.verify_token")] = None,
    challenge: Annotated[str | None, Query(alias="hub.challenge")] = None,
):
    """Handshake de registro del webhook en Meta."""
    expected = get_settings().whatsapp_verify_token
    if mode == "subscribe" and expected and token == expected and challenge:
        return Response(content=challenge, media_type="text/plain")
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verification failed")


@router.post("/whatsapp", status_code=status.HTTP_200_OK)
async def whatsapp_webhook(request: Request, db: Annotated[AsyncSession, Depends(get_db)]):
    """Estados de entrega de los mensajes salientes. Sin firma HMAC válida
    (App Secret) no se toca nada."""
    raw = await request.body()
    if not whatsapp.verify_signature(raw, request.headers.get("x-hub-signature-256")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")
    try:
        payload = json.loads(raw)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON")

    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value") or {}
            for im in value.get("messages", []) or []:
                if im.get("type") == "text" and im.get("id") and im.get("from"):
                    try:
                        await _reply_activation_code(im["from"], (im.get("text") or {}).get("body", ""), im["id"], db)
                    except Exception as e:  # nunca romper el 200 a Meta (reintentaría en bucle)
                        logger.error(f"whatsapp inbound handling failed: {e}")
            for st in value.get("statuses", []) or []:
                mid, new = st.get("id"), st.get("status")
                if not mid or new not in ("sent", "delivered", "read", "failed"):
                    continue
                msg = (await db.execute(
                    select(WhatsappMessage).where(WhatsappMessage.provider_message_id == mid)
                )).scalar_one_or_none()
                if msg is None:
                    continue
                if new == "failed":
                    errs = st.get("errors") or [{}]
                    msg.status = "failed"
                    msg.error = f"{errs[0].get('code', '')}: {errs[0].get('title') or errs[0].get('message', '')}"[:300]
                elif msg.status != "failed" and _RANK[new] > _RANK.get(msg.status, 0):
                    msg.status = new
    return {"ok": True}
