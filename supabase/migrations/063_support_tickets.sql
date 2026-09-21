-- Tickets de soporte enviados desde el modal "Soporte Técnico" (público, sin sesión obligatoria).
-- `number` es el consecutivo visible ("C-10001") que se le muestra a quien lo envía.
-- RLS activado SIN políticas (mismo criterio que analytics_events / workshop_applications):
-- solo el backend (rol dueño) lee y escribe. Aditiva: la base es compartida entre ambientes.
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number BIGINT GENERATED ALWAYS AS IDENTITY (START WITH 10001) UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    plate TEXT NOT NULL DEFAULT '',
    diagnostic_id TEXT NOT NULL DEFAULT '',
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_support_tickets_status_created ON support_tickets(status, created_at DESC);
