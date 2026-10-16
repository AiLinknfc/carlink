-- Fase 2 de docs/PLAN_ALIADOS_NEGOCIO.md (2026-10-16): codigo de alianza y descuento por llavero.
--
-- Aditiva: columnas con default. Un pedido sin codigo queda exactamente como hoy.
--
-- alliance_workshop_id: negocio aliado que recomendo la compra (el codigo es el TLR-XXXXX de su ficha).
--   ON DELETE SET NULL: si el negocio se borra, el pedido y su descuento se conservan.
-- alliance_code:        el codigo tal como se uso (normalizado).
-- discount_cents:       descuento total aplicado al pedido. amount_in_cents ya es el monto COBRADO (con descuento):
--                       la verificacion de monto de Wompi y los reportes de ingresos siguen usando esa columna.
-- Atribucion lista para una futura comision; hoy solo descuenta al comprador.
ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS alliance_workshop_id UUID REFERENCES workshops(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS alliance_code TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0);

CREATE INDEX IF NOT EXISTS idx_shop_orders_alliance
  ON shop_orders(alliance_workshop_id, created_at DESC) WHERE alliance_workshop_id IS NOT NULL;
