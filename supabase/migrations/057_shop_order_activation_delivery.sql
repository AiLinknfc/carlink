-- Entrega digital del código de activación para el llavero individual del
-- shop, en vez de solo impreso en el empaque — docs/PENDIENTES.md item 5.
-- Confirmado con el usuario (2026-09-13): reemplaza lo impreso, no es
-- opcional junto a él.
--
-- activation_code_encrypted (AES-256-GCM vía app/services/crypto.py,
-- mismo mecanismo que ya usa token_url_encrypted para "Copiar enlace") se
-- guarda a partir de ahora en TODO llavero que se provisione — el hash
-- (activation_code_hash) sigue siendo la única fuente de verdad para
-- reclamar el código en POST /nfc/activate; el campo encriptado es solo
-- para poder volver a mostrárselo al comprador después, sin romper la
-- regla de "nunca texto plano en DB". Los llaveros ya provisionados antes
-- de esta migración quedan con esta columna en NULL — no hay forma de
-- rellenarla retroactivamente (nunca se guardó el código crudo), así que
-- la entrega digital solo aplica al stock provisionado de acá en adelante.
--
-- shop_order_id liga un llavero pre-provisionado (chip físico ya
-- fabricado/cargado, sentado en inventario) al pedido que lo reclamó al
-- aprobarse el pago — no cambia en nada el proceso de fabricación/encoding
-- físico, solo mueve CUÁNDO se le muestra el código al comprador.
ALTER TABLE nfc_token_whitelist ADD COLUMN IF NOT EXISTS activation_code_encrypted TEXT NULL;
ALTER TABLE nfc_token_whitelist ADD COLUMN IF NOT EXISTS shop_order_id UUID NULL REFERENCES shop_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_nfc_whitelist_shop_order
  ON nfc_token_whitelist(shop_order_id) WHERE shop_order_id IS NOT NULL;

-- Candidatos elegibles para asignación automática al aprobar un pedido:
-- disponibles, no asignados a ningún pedido todavía, con código
-- re-mostrable (provisionados después de esta migración), y NO reservados
-- para un partner/campaña — el inventario de un partner es para su propio
-- evento, no para surtir el checkout general.
CREATE INDEX IF NOT EXISTS idx_nfc_whitelist_available_for_shop
  ON nfc_token_whitelist(created_at)
  WHERE status = 'available' AND shop_order_id IS NULL AND activation_code_encrypted IS NOT NULL
    AND provisioned_by_partner_id IS NULL;
