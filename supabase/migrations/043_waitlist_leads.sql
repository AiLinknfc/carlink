-- Waitlist de "próximo lote": alguien indeciso sobre comprar el llavero NFC
-- (sección de la landing "¿Aún lo estás pensando?") deja su contacto para que
-- se le avise cuando salga el siguiente lote. Solo el backend (vía DATABASE_URL)
-- escribe/lee esta tabla; RLS + policy service_role por consistencia con el
-- resto del esquema.

CREATE TABLE IF NOT EXISTS waitlist_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'landing',
  notified BOOLEAN NOT NULL DEFAULT false,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE waitlist_leads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'service_role_all_on_waitlist_leads' AND polrelid = 'waitlist_leads'::regclass) THEN
    CREATE POLICY "service_role_all_on_waitlist_leads"
      ON waitlist_leads
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_waitlist_leads_notified ON waitlist_leads(notified) WHERE notified = false;
