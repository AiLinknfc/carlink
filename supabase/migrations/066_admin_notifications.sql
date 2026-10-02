-- Buzon de notificaciones del administrador (campana de Admin y de la app). Una fila por evento
-- que requiere atencion: venta, pedido contraentrega, ticket de soporte, postulacion de taller o
-- empleo, llavero encontrado, verificacion de tarjeta pendiente, alerta de seguridad NFC.
--   seen_at     NULL = sin ver (cuenta en la campana); fecha = ya la vio.
--   resolved_at NULL = pendiente de atender; fecha = atendida.
-- RLS activado SIN politicas (solo el backend lee y escribe). Aditiva: la base es compartida.
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    ref TEXT NOT NULL DEFAULT '',
    link TEXT NOT NULL DEFAULT '',
    seen_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_unseen ON admin_notifications(created_at DESC) WHERE seen_at IS NULL;

-- Las alertas de seguridad NFC (nfc_alerts) tambien distinguen "sin ver" de "resuelta".
ALTER TABLE nfc_alerts ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ;
