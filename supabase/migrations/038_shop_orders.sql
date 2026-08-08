-- Órdenes reales del checkout del llavero NFC (CartModal.tsx). Reemplaza la
-- maqueta que solo guardaba el pedido en localStorage del navegador
-- (frontend/src/lib/shop.ts) — docs/PENDIENTES.md ítem 14. El monto
-- (amount_in_cents) lo calcula siempre el backend a partir de la cantidad,
-- nunca se confía en un precio mandado por el cliente. El estado final de
-- pago se confirma contra la API de Wompi (POST /shop/orders/{reference}/confirm
-- y/o el webhook de eventos), nunca por lo que reporte el navegador solo.
create table shop_orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined', 'voided', 'error')),
  plate_text text not null,
  plate_type text not null,
  plate_city text not null,
  quantity integer not null default 1,
  amount_in_cents integer not null,
  currency text not null default 'COP',
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  shipping_address text not null,
  shipping_city text not null,
  notes text not null default '',
  user_id uuid references profiles(id) on delete set null,
  wompi_transaction_id text,
  wompi_last_event jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_shop_orders_status on shop_orders(status);
create index idx_shop_orders_user on shop_orders(user_id);
