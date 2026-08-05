-- Taller/Empresa panel — paso 2/9: mecánicos del taller.

CREATE TABLE IF NOT EXISTS workshop_mechanics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT '',
  specialty TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workshop_mechanics_workshop ON workshop_mechanics(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_mechanics_active ON workshop_mechanics(workshop_id, active);

ALTER TABLE workshop_mechanics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages workshop_mechanics"
  ON workshop_mechanics FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE workshop_mechanics IS 'Mecánicos/técnicos de un taller — reemplaza nombres hardcodeados como "Fernando Ugarte" en tallerpro (ver docs/PLAN_MIGRACION_TALLERPRO.md Fase 6)';
