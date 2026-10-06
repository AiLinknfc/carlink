-- Confirmacion manual de los datos de la tarjeta antes de vender (2026-10-05).
-- El dueno revisa campo por campo que los datos coinciden con su tarjeta fisica; el servidor guarda
-- cuando lo hizo y una huella (HMAC) de los datos confirmados. Si despues se cambia cualquier dato,
-- la huella ya no coincide y hay que volver a confirmar. Publicar el vehiculo en venta exige una
-- confirmacion vigente. Aditiva: dos columnas con default.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS card_confirmed_at TIMESTAMPTZ;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS card_confirmed_digest TEXT NOT NULL DEFAULT '';
