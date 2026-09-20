-- Analítica propia (first-party) de uso de la app: visitas, pasos del
-- wizard, embudo del checkout. Sin terceros, sin PII: anon_id es un id
-- aleatorio por navegador (localStorage), session_id uno por pestaña
-- (sessionStorage). user_id solo se completa si quien dispara el evento ya
-- tiene sesión. Público de escritura (POST /api/analytics/events, con rate
-- limit), solo el admin lee (GET /api/analytics/summary).
--
-- RLS activado SIN políticas a propósito: el backend conecta con el rol
-- dueño (bypassea RLS), pero la anon key de Supabase no puede leer ni
-- escribir esta tabla vía PostgREST.
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anon_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    event TEXT NOT NULL,
    path TEXT NOT NULL DEFAULT '',
    props JSONB NOT NULL DEFAULT '{}'::jsonb,
    referrer TEXT NOT NULL DEFAULT '',
    utm_source TEXT NOT NULL DEFAULT '',
    utm_medium TEXT NOT NULL DEFAULT '',
    utm_campaign TEXT NOT NULL DEFAULT '',
    device TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_created ON analytics_events(event, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_anon ON analytics_events(anon_id);
