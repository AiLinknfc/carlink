-- Postulaciones de talleres, proveedores y negocios del sector desde la landing /taller
-- (sin cuenta). Quedan en 'pending' hasta que el admin las revise. Aprobar NO crea cuenta:
-- envía el enlace al registro real (/register?mode=empresa), donde se valida el NIT de verdad.
--
-- RLS activado SIN políticas (mismo criterio que analytics_events): el backend conecta con el
-- rol dueño; la anon key de Supabase no puede leer ni escribir esta tabla vía PostgREST.
-- Aditiva: la base es compartida entre local, staging y producción (docs/CONTEXTO.md).
CREATE TABLE IF NOT EXISTS workshop_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_type TEXT NOT NULL,
    name TEXT NOT NULL,
    legal_name TEXT NOT NULL DEFAULT '',
    nit TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_role TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    website TEXT NOT NULL DEFAULT '',
    instagram TEXT NOT NULL DEFAULT '',
    specialties TEXT NOT NULL DEFAULT '',
    monthly_volume TEXT NOT NULL DEFAULT '',
    logo_url TEXT NOT NULL,
    facade_url TEXT NOT NULL DEFAULT '',
    doc_url TEXT NOT NULL DEFAULT '',
    logo_authorized BOOLEAN NOT NULL DEFAULT FALSE,
    consent_version TEXT NOT NULL,
    consent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    source TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'approved', 'rejected')),
    admin_notes TEXT NOT NULL DEFAULT '',
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE workshop_applications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_workshop_applications_status_created ON workshop_applications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workshop_applications_nit ON workshop_applications(nit);
