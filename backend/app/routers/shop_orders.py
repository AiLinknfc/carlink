from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_admin, get_current_user, get_current_user_optional
from app.models.models import ShopOrder
from app.schemas.schemas import (
    ShopOrderConfirm,
    ShopOrderCreate,
    ShopOrderCreateOut,
    ShopOrderDetailOut,
    ShopOrderFulfillmentUpdate,
    ShopOrderOut,
)
from app.services import email, wompi

logger = logging.getLogger("carlink")
settings = get_settings()

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


def _notify_order_approved(order: ShopOrder) -> None:
    """Correo al cliente ("pago confirmado") + al admin ("hay que
    despachar"), disparado una sola vez por orden — el caller solo debe
    llamar esto cuando detecta la transición a 'approved' (was_approved era
    False, ahora order.status == 'approved'), nunca en cada webhook/confirm
    repetido. Best-effort: un fallo de SMTP nunca debe tumbar la
    confirmación del pago, por eso el try/except acá adentro."""
    try:
        email.send_order_confirmed_email(
            customer_email=order.customer_email,
            customer_name=order.customer_name,
            reference=order.reference,
            plate_text=order.plate_text,
            quantity=order.quantity,
            amount_in_cents=order.amount_in_cents,
            currency=order.currency,
        )
    except Exception as e:
        logger.error(f"send_order_confirmed_email failed for {order.reference}: {e}")

    try:
        email.send_order_admin_notification_email(
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
        user_id=uuid.UUID(user_id) if user_id else None,
    )
    db.add(order)
    await db.flush()
    await db.refresh(order)

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
    """'Mis pedidos' — requiere sesión (a diferencia del resto de este
    carrito, que es público a propósito): acá sí hace falta saber quién
    pregunta. La cuenta admin ve todas las órdenes (cola de despacho);
    cualquier otra cuenta ve solo las suyas."""
    is_admin = bool(settings.admin_user_id) and user_id == settings.admin_user_id
    query = select(ShopOrder).order_by(ShopOrder.created_at.desc()).limit(200)
    if not is_admin:
        query = query.where(ShopOrder.user_id == uuid.UUID(user_id))
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/orders/{reference}", response_model=ShopOrderOut)
async def get_shop_order(reference: str, db: Annotated[AsyncSession, Depends(get_db)]):
    return await _get_order_by_reference(reference, db)


@router.patch("/orders/{reference}/fulfillment", response_model=ShopOrderDetailOut)
async def update_shop_order_fulfillment(
    reference: str,
    body: ShopOrderFulfillmentUpdate,
    admin_user_id: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Botón admin en 'Mis pedidos' para marcar un pedido como enviado o
    entregado. Solo tiene sentido sobre un pedido ya pagado."""
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
            email.send_order_shipped_email(
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
        _notify_order_approved(order)

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
        _notify_order_approved(order)
    await db.flush()
    return {"ok": True}
