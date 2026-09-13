-- Tracking mínimo de clicks en los botones de WhatsApp (soporte/ventas) —
-- hoy esos links (wa.me) no dejan ningún rastro en la base, así que no hay
-- forma de saber cuántos mensajes llegan ni por qué motivo antes de que
-- alguien conteste a mano. Pensado para la primera campaña de publicidad
-- (docs/PENDIENTES.md) — la idea es medir volumen real por intent antes de
-- decidir si vale la pena automatizar alguno con la API de WhatsApp
-- Business, en vez de adivinar el guion de un bot sin datos.
--
-- Público (cualquiera puede loguear un click, sin sesión) — mismo criterio
-- que waitlist_leads. user_id es opcional: solo se completa cuando quien
-- clickea ya tiene sesión (ej. "repuesto/duplicado" dentro de /app).
CREATE TABLE IF NOT EXISTS whatsapp_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intent TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT '',
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_clicks_intent ON whatsapp_clicks(intent);
CREATE INDEX IF NOT EXISTS idx_whatsapp_clicks_created_at ON whatsapp_clicks(created_at);
