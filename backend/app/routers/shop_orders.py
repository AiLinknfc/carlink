from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.config import get_settings
from app.dependencies import get_current_admin, get_current_user, get_current_user_optional
from app.models.models import NfcTokenWhitelist, ShopOrder, WhatsappMessage
from app.schemas.schemas import (
    ShopOrderConfirm,
    ShopOrderCreate,
    ShopOrderCreateOut,
    ShopOrderDetailOut,
    ShopOrderFulfillmentUpdate,
    ShopOrderOut,
    ShopOrderStatsOut,
)
from app.services import email, whatsapp, wompi
from app.services.crypto import decrypt_url

logger = logging.getLogger("carlink")

router = APIRouter(prefix="/shop", tags=["shop"])

# Mismo precio que frontend/src/components/CartModal.tsx (`productPrice`) —
# el backend es quien manda de verdad (el monto de la orden nunca sale de lo
# que mande el cliente), así que si este número cambia hay que actualizar
# también el de la UI o el total mostrado quedará desalineado del cobrado.
PRODUCT_PRICE_COP = 49_900

# Estados que puede devolver Wompi (result.transaction.status del widget,
# data.transaction.status del webhook, o data.status de GET /transactions/{id})
# mapeados 1:1 a minúscula para la columna `status` de shop_orders.
_WOMPI_STATUS_MAP = {
    "PENDING": "pending",
    "APPROVED": "approved",
    "DECLINED": "declined",
    "VOIDED": "voided",
    "ERROR": "error",
}


async def _get_order_by_reference(reference: str, db: AsyncSession) -> ShopOrder:
    result = await db.execute(select(ShopOrder).where(ShopOrder.reference == reference))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


def _apply_transaction_data(order: ShopOrder, txn: dict) -> bool:
    """Aplica el estado de una transacción de Wompi a la orden, pero solo si
    la referencia y el monto coinciden con los de la orden guardada —
    defensa contra reportar el transaction_id de un pedido ajeno/barato para
    marcar como pagado uno caro. Devuelve False si no coincide (no toca la
    orden)."""
    if txn.get("reference") != order.reference:
        logger.warning(f"Wompi transaction reference mismatch: order={order.reference} txn={txn.get('reference')}")
        return False
    if txn.get("amount_in_cents") != order.amount_in_cents:
        logger.warning(
            f"Wompi transaction amount mismatch: order={order.reference} "
            f"expected={order.amount_in_cents} got={txn.get('amount_in_cents')}"
        )
        return False

    wompi_status = txn.get("status", "")
    order.status = _WOMPI_STATUS_MAP.get(wompi_status, order.status)
    order.wompi_transaction_id = txn.get("id") or order.wompi_transaction_id
    order.wompi_last_event = txn
    return True


async def _assign_activation_codes(order: ShopOrder, db: AsyncSession) -> list[str]:
    """Reserva hasta `order.quantity` códigos de activación ya provisionados
    (chip físico ya fabricado, sentado en inventario — ver migración 057)
    para este pedido, y devuelve los códigos en texto plano, descifrados al
    vuelo. Nunca se persisten en texto plano en ningún lado.

    Best-effort y parcial a propósito: si no hay stock elegible suficiente
    (todo lo provisionado antes de esta feature no tiene
    `activation_code_encrypted`, o simplemente no queda stock), asigna lo
    que haya — el resto de las unidades de ese pedido siguen el camino de
    siempre (código impreso en el paquete). Nunca bloquea la aprobación del
    pago por esto."""
    already = (await db.execute(
        select(func.count()).select_from(NfcTokenWhitelist).where(NfcTokenWhitelist.shop_order_id == order.id)
    )).scalar() or 0
    remaining = order.quantity - already
    if remaining <= 0:
        return []

    result = await db.execute(
        text(
            "UPDATE nfc_token_whitelist SET shop_order_id = :oid "
            "WHERE id IN ("
            "  SELECT id FROM nfc_token_whitelist "
            "  WHERE status = 'available' AND shop_order_id IS NULL "
            "    AND activation_code_encrypted IS NOT NULL AND provisioned_by_partner_id IS NULL "
            "  ORDER BY created_at LIMIT :n FOR UPDATE SKIP LOCKED"
            ") RETURNING activation_code_encrypted"
        ),
        {"oid": str(order.id), "n": remaining},
    )
    codes = [decrypt_url(row[0]) for row in result.all()]
    return [c for c in codes if c]


async def _send_order_whatsapp(order: ShopOrder, codes: list[str], db: AsyncSession) -> WhatsappMessage | None:
    """WhatsApp automático tras aprobarse el pago. Solo si el comprador dio
    consentimiento (`whatsapp_opt_in`), hay códigos digitales asignados y el
    celular es válido. Mismo criterio de seguridad que el correo: con cuenta
    CarLink solo se avisa que el código está en "Mis pedidos" (nunca el
    código); invitado (sin cuenta) lo recibe en el mensaje. Best-effort: deja
    una fila en whatsapp_messages con el resultado, jamás lanza."""
    if not (order.whatsapp_opt_in and codes and whatsapp.is_configured()):
        return None
    to = whatsapp.normalize_co_phone(order.customer_phone)
    settings = get_settings()
    first_name = order.customer_name.split(" ")[0] or "cliente"
    if order.user_id is None:
        # Plantilla Authentication (Meta clasifica cualquier mensaje con un
        # código como Authentication: formato fijo, un código por mensaje,
        # botón "Copy code"). Un mensaje por unidad del pedido.
        sends = [(settings.whatsapp_template_code, [c], c) for c in codes]
    else:
        sends = [(settings.whatsapp_template_ready, [first_name, order.reference], None)]
    last: WhatsappMessage | None = None
    for template, params, copy_code in sends:
        msg = WhatsappMessage(order_id=order.id, to_phone=to or order.customer_phone, template=template)
        if not to:
            msg.status, msg.error = "failed", "celular no valido para WhatsApp (se espera celular colombiano)"
        else:
            message_id, error = await run_in_threadpool(
                lambda t=template, p=params, c=copy_code: whatsapp.send_template(to, t, p, copy_code=c)
            )
            msg.provider_message_id = message_id
            msg.status, msg.error = ("sent", "") if message_id else ("failed", error)
            if error:
                logger.error(f"whatsapp send failed for {order.reference}: {error}")
        db.add(msg)
        await db.flush()
        last = msg
        if not to:
            break
    return last


async def _notify_order_approved(order: ShopOrder, db: AsyncSession) -> None:
    """Correo al cliente ("pago confirmado") + al admin ("hay que
    despachar"), disparado una sola vez por orden — el caller solo debe
    llamar esto cuando detecta la transición a 'approved' (was_approved era
    False, ahora order.status == 'approved'), nunca en cada webhook/confirm
    repetido. Best-effort: un fallo de SMTP nunca debe tumbar la
    confirmación del pago, por eso el try/except acá adentro.

    email.send_* es smtplib bloqueante (sync) — correrlo directo acá
    congelaría el event loop entero (no solo este request) si Hostinger
    tarda o no responde. run_in_threadpool lo saca a un hilo aparte."""
    codes = await _assign_activation_codes(order, db)
    # Con cuenta CarLink (order.user_id): el código se ve en "Mis pedidos",
    # el correo solo avisa que está listo — nunca lo incluye en texto
    # plano. Compra de invitado (sin cuenta, order.user_id es null): no hay
    # ningún otro canal donde mostrárselo, así que el correo sí lo incluye
    # — es el único lugar al que el comprador tiene acceso.
    try:
        await run_in_threadpool(
            email.send_order_confirmed_email,
            customer_email=order.customer_email,
            customer_name=order.customer_name,
            reference=order.reference,
            plate_text=order.plate_text,
            quantity=order.quantity,
            amount_in_cents=order.amount_in_cents,
            currency=order.currency,
            activation_codes_ready_in_app=bool(codes) and order.user_id is not None,
            guest_activation_codes=codes if (codes and order.user_id is None) else None,
        )
    except Exception as e:
        logger.error(f"send_order_confirmed_email failed for {order.reference}: {e}")

    try:
        await _send_order_whatsapp(order, codes, db)
    except Exception as e:
        logger.error(f"_send_order_whatsapp failed for {order.reference}: {e}")

    try:
        await run_in_threadpool(
            email.send_order_admin_notification_email,
            reference=order.reference,
            plate_text=order.plate_text,
            quantity=order.quantity,
            amount_in_cents=order.amount_in_cents,
            currency=order.currency,
            customer_name=order.customer_name,
            customer_phone=order.customer_phone,
            customer_email=order.customer_email,
            shipping_address=order.shipping_address,
            shipping_city=order.shipping_city,
        )
    except Exception as e:
        logger.error(f"send_order_admin_notification_email failed for {order.reference}: {e}")


@router.post("/orders", response_model=ShopOrderCreateOut, status_code=status.HTTP_201_CREATED)
async def create_shop_order(
    body: ShopOrderCreate,
    user_id: Annotated[str | None, Depends(get_current_user_optional)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Checkout del llavero NFC — público (no requiere sesión, igual que el
    resto de este carrito), pero si hay un usuario logueado la orden queda
    linkeada a su cuenta. El monto SIEMPRE se calcula acá, nunca se confía en
    un precio mandado por el cliente."""
    reference = f"CLK-{uuid.uuid4().hex[:16].upper()}"
    amount_in_cents = PRODUCT_PRICE_COP * body.quantity * 100

    order = ShopOrder(
        reference=reference,
        status="pending",
        payment_method=body.payment_method,
        plate_text=body.plate_text.strip().upper(),
        plate_type=body.plate_type,
        plate_city=body.plate_city,
        quantity=body.quantity,
        amount_in_cents=amount_in_cents,
        currency="COP",
        customer_name=body.customer_name.strip(),
        customer_email=body.customer_email.strip(),
        customer_phone=body.customer_phone.strip(),
        shipping_address=body.shipping_address.strip(),
        shipping_city=body.shipping_city.strip(),
        notes=body.notes.strip(),
        whatsapp_opt_in=body.whatsapp_opt_in,
        user_id=uuid.UUID(user_id) if user_id else None,
    )
    db.add(order)
    await db.flush()
    await db.refresh(order)

    if order.payment_method == "cod":
        # Best-effort: un fallo de SMTP nunca debe tumbar la creación del
        # pedido — mismo criterio que _notify_order_approved más abajo.
        try:
            await run_in_threadpool(
                email.send_order_received_email,
                customer_email=order.customer_email,
                customer_name=order.customer_name,
                reference=order.reference,
                plate_text=order.plate_text,
                quantity=order.quantity,
                amount_in_cents=order.amount_in_cents,
                currency=order.currency,
            )
        except Exception as e:
            logger.error(f"send_order_received_email failed for {order.reference}: {e}")

    signature = wompi.compute_integrity_signature(reference, amount_in_cents, "COP")

    return ShopOrderCreateOut(
        order_id=order.id,
        reference=reference,
        amount_in_cents=amount_in_cents,
        currency="COP",
        integrity_signature=signature,
    )


@router.get("/orders", response_model=list[ShopOrderDetailOut])
async def list_shop_orders(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """'Mis pedidos' en modo cliente — requiere sesión (a diferencia del
    resto de este carrito, que es público a propósito), pero siempre
    devuelve solo las órdenes de quien pregunta, sin excepción por cuenta
    admin. Ver /shop/admin/orders para la cola completa de despacho."""
    result = await db.execute(
        select(ShopOrder)
        .where(ShopOrder.user_id == uuid.UUID(user_id))
        .order_by(ShopOrder.created_at.desc())
        .limit(200)
    )
    orders = list(result.scalars().all())

    codes_by_order: dict[uuid.UUID, list[str]] = {}
    order_ids = [o.id for o in orders]
    if order_ids:
        rows = await db.execute(
            select(NfcTokenWhitelist.shop_order_id, NfcTokenWhitelist.activation_code_encrypted)
            .where(NfcTokenWhitelist.shop_order_id.in_(order_ids))
        )
        for oid, encrypted in rows.all():
            code = decrypt_url(encrypted) if encrypted else None
            if code:
                codes_by_order.setdefault(oid, []).append(code)

    out = []
    for o in orders:
        detail = ShopOrderDetailOut.model_validate(o)
        detail.activation_codes = codes_by_order.get(o.id, [])
        out.append(detail)
    return out


@router.get("/admin/orders", response_model=list[ShopOrderDetailOut])
async def list_all_shop_orders(
    admin_user_id: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Cola de despacho — modo administrador (panel Admin NFC), separada a
    propósito de GET /orders (modo cliente): acá sí se ven las órdenes de
    todo el mundo, incluidas las de compradores que no iniciaron sesión."""
    result = await db.execute(select(ShopOrder).order_by(ShopOrder.created_at.desc()).limit(200))
    return result.scalars().all()


@router.get("/admin/stats", response_model=ShopOrderStatsOut)
async def shop_order_stats(
    admin_user_id: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Agregado para la pestaña Dashboard de Admin NFC."""
    total = await db.scalar(select(func.count()).select_from(ShopOrder)) or 0
    paid = await db.scalar(select(func.count()).select_from(ShopOrder).where(ShopOrder.status == "approved")) or 0
    pending_shipment = await db.scalar(
        select(func.count()).select_from(ShopOrder)
        .where(ShopOrder.status == "approved", ShopOrder.fulfillment_status == "unfulfilled")
    ) or 0
    shipped_count = await db.scalar(
        select(func.count()).select_from(ShopOrder).where(ShopOrder.fulfillment_status == "shipped")
    ) or 0
    delivered_count = await db.scalar(
        select(func.count()).select_from(ShopOrder).where(ShopOrder.fulfillment_status == "delivered")
    ) or 0
    revenue = await db.scalar(
        select(func.coalesce(func.sum(ShopOrder.amount_in_cents), 0)).where(ShopOrder.status == "approved")
    ) or 0

    return ShopOrderStatsOut(
        total_orders=total,
        paid_orders=paid,
        pending_shipment=pending_shipment,
        shipped_count=shipped_count,
        delivered_count=delivered_count,
        revenue_in_cents=revenue,
    )


@router.get("/orders/{reference}", response_model=ShopOrderOut)
async def get_shop_order(reference: str, db: Annotated[AsyncSession, Depends(get_db)]):
    return await _get_order_by_reference(reference, db)


@router.post("/orders/{reference}/mark-paid", response_model=ShopOrderDetailOut)
async def mark_shop_order_paid(
    reference: str,
    admin_user_id: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Botón admin en el panel (pestaña "Pedidos") para cerrar el ciclo de un
    pedido contraentrega — hasta ahora un pedido `payment_method='cod'` se
    quedaba en `status='pending'` para siempre, porque la única otra vía a
    'approved' es la confirmación real de Wompi (confirm_shop_order /
    wompi_webhook, más abajo). Rechaza explícitamente los pedidos `wompi`:
    un pedido con pasarela real NUNCA se debe poder marcar pagado a mano acá
    — eso sería un bypass del cobro real, la única forma legítima de
    aprobarlo es que Wompi lo confirme."""
    order = await _get_order_by_reference(reference, db)
    if order.payment_method != "cod":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo pedidos contraentrega se pueden marcar pagados manualmente",
        )
    if order.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Order status is '{order.status}', not 'pending'")

    order.status = "approved"
    await _notify_order_approved(order, db)

    await db.flush()
    await db.refresh(order)
    return order


@router.post("/orders/{reference}/whatsapp-resend")
async def resend_order_whatsapp(
    reference: str,
    admin_user_id: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Admin — reenvía el WhatsApp de un pedido aprobado (ej. el primero
    falló). Reusa los códigos ya asignados al pedido (descifrados al vuelo),
    no reserva códigos nuevos. Respeta el consentimiento del comprador."""
    order = await _get_order_by_reference(reference, db)
    if order.status != "approved":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El pedido no esta aprobado")
    if not order.whatsapp_opt_in:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El comprador no acepto WhatsApp")
    rows = await db.execute(
        select(NfcTokenWhitelist.activation_code_encrypted).where(NfcTokenWhitelist.shop_order_id == order.id)
    )
    codes = [c for c in (decrypt_url(r[0]) for r in rows.all() if r[0]) if c]
    msg = await _send_order_whatsapp(order, codes, db)
    if msg is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sin codigos digitales asignados o WhatsApp no configurado")
    return {"status": msg.status, "error": msg.error}


@router.patch("/orders/{reference}/fulfillment", response_model=ShopOrderDetailOut)
async def update_shop_order_fulfillment(
    reference: str,
    body: ShopOrderFulfillmentUpdate,
    admin_user_id: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Botón admin en el panel Admin NFC (pestaña "Pedidos") para marcar un
    pedido como enviado o entregado — nunca desde 'Mis pedidos' en modo
    cliente, que es de solo lectura. Solo tiene sentido sobre un pedido ya
    pagado."""
    order = await _get_order_by_reference(reference, db)
    if order.status != "approved":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order is not paid yet")

    now = datetime.now(timezone.utc)
    order.fulfillment_status = body.status
    if body.tracking_note:
        order.tracking_note = body.tracking_note

    if body.status == "shipped":
        order.shipped_at = now
        try:
            await run_in_threadpool(
                email.send_order_shipped_email,
                customer_email=order.customer_email,
                customer_name=order.customer_name,
                reference=order.reference,
                plate_text=order.plate_text,
                tracking_note=order.tracking_note,
            )
        except Exception as e:
            logger.error(f"send_order_shipped_email failed for {order.reference}: {e}")
    elif body.status == "delivered":
        order.delivered_at = now

    await db.flush()
    await db.refresh(order)
    return order


@router.post("/orders/{reference}/confirm", response_model=ShopOrderOut)
async def confirm_shop_order(
    reference: str,
    body: ShopOrderConfirm,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """El frontend llama esto apenas el widget de Wompi devuelve un
    transaction_id — no se confía en el status que reporta el navegador, se
    vuelve a preguntar a Wompi directamente con la llave privada. Esta es la
    vía principal de confirmación (el webhook de más abajo es el respaldo
    para producción; en local Wompi no puede pegarle a localhost)."""
    order = await _get_order_by_reference(reference, db)
    was_approved = order.status == "approved"

    txn = await wompi.fetch_transaction(body.transaction_id)
    if txn is None:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not verify transaction with Wompi")

    if not _apply_transaction_data(order, txn):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Transaction does not match this order")

    if not was_approved and order.status == "approved":
        await _notify_order_approved(order, db)

    await db.flush()
    await db.refresh(order)
    return order


@router.post("/webhooks/wompi", status_code=status.HTTP_200_OK)
async def wompi_webhook(request: Request, db: Annotated[AsyncSession, Depends(get_db)]):
    """Sin auth — lo llama Wompi, no un usuario de CarLink. La única prueba
    de que el evento es legítimo es el checksum (ver services/wompi.py).
    Responde 200 rápido en cualquier caso salvo checksum inválido: Wompi
    reintenta hasta 3 veces en 24h si no recibe 200."""
    payload = await request.json()

    if not wompi.verify_webhook_checksum(payload):
        logger.warning("Wompi webhook: checksum inválido, ignorado")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid checksum")

    txn = (payload.get("data") or {}).get("transaction")
    if not txn or not txn.get("reference"):
        return {"ok": True}

    result = await db.execute(select(ShopOrder).where(ShopOrder.reference == txn["reference"]))
    order = result.scalar_one_or_none()
    if not order:
        logger.warning(f"Wompi webhook: orden no encontrada para reference={txn.get('reference')}")
        return {"ok": True}

    was_approved = order.status == "approved"
    _apply_transaction_data(order, txn)
    if not was_approved and order.status == "approved":
        await _notify_order_approved(order, db)
    await db.flush()
    return {"ok": True}
