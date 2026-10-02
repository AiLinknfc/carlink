-- Canales de venta (experimentos de venta: Shopify, Mercado Libre, etc.). NO son partners:
-- un partner es un aliado que vende productos de CarLink; un canal es una prueba para medir como
-- se comportan los llaveros vendidos por esa via (enviados, activados).
--   nfc_token_whitelist.channel_id NULL = llavero de la web o de un partner (comportamiento de siempre).
--   Un llavero de canal NUNCA entra al inventario de ventas web (shop_orders.WEB_STOCK_WHERE).
-- Aditiva y sin tocar filas existentes: la base es compartida con produccion.
-- RLS activado SIN politicas (solo el backend lee y escribe).
CREATE TABLE IF NOT EXISTS sales_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL DEFAULT 'otro' CHECK (kind IN ('marketplace', 'tienda_propia', 'otro')),
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sales_channels ENABLE ROW LEVEL SECURITY;

ALTER TABLE nfc_token_whitelist
    ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES sales_channels(id) ON DELETE SET NULL;

-- Un llavero pertenece a la web, a un partner o a un canal, nunca a mas de uno.
-- (Todas las filas actuales tienen channel_id NULL, asi que el CHECK las cumple.)
ALTER TABLE nfc_token_whitelist
    ADD CONSTRAINT nfc_whitelist_single_owner CHECK (channel_id IS NULL OR provisioned_by_partner_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_nfc_whitelist_channel ON nfc_token_whitelist(channel_id) WHERE channel_id IS NOT NULL;
