-- Taller/Empresa panel (migración de tallerpro/) — paso 1/9: ampliar el
-- perfil del taller. Todo nullable/con default para no romper los talleres
-- ya registrados; ninguna columna existente se toca.

ALTER TABLE workshops
  ADD COLUMN IF NOT EXISTS slogan TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS workshop_type TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS business_hours TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS manager_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS manager_role TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS manager_avatar TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS tax_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS certification_code TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_instagram TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_facebook TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_website TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_whatsapp TEXT DEFAULT '';

COMMENT ON COLUMN workshops.tax_rate_percent IS 'IVA/impuesto aplicado por este taller en sus órdenes de trabajo — reemplaza cualquier tasa fija en código (ver docs/PLAN_MIGRACION_TALLERPRO.md Fase 6)';
COMMENT ON COLUMN workshops.specialties IS 'Ej. {"Frenos","Suspensión","Diagnóstico electrónico"} — mostrado en la ficha pública del taller';
