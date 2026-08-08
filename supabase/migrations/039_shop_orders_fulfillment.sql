-- Estado de envío de una orden del checkout de llavero NFC, separado del
-- estado de pago (shop_orders.status, que ya es real desde la migración 038).
-- Lo mueve un admin a mano desde "Mis pedidos" (PATCH /shop/orders/{reference}/fulfillment)
-- — nada de simulación con setInterval como en la versión anterior de
-- OrderTrackingModal.tsx.
alter table shop_orders
  add column if not exists fulfillment_status text not null default 'unfulfilled'
    check (fulfillment_status in ('unfulfilled', 'shipped', 'delivered')),
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists tracking_note text not null default '';
