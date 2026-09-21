-- Mensajes automáticos de WhatsApp (Cloud API de Meta): log de cada envío y
-- su estado de entrega (sent -> delivered -> read | failed), actualizado por
-- el webhook POST /api/webhooks/whatsapp. También guarda el consentimiento
-- explícito del comprador (checkbox en el checkout) en el pedido.
--
-- RLS activado SIN políticas: solo el backend (rol dueño) lee/escribe.
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES shop_orders(id) ON DELETE SET NULL,
    to_phone TEXT NOT NULL,
    template TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    provider_message_id TEXT NULL,
    error TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_order ON whatsapp_messages(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_messages_provider_id
  ON whatsapp_messages(provider_message_id) WHERE provider_message_id IS NOT NULL;

ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE;
