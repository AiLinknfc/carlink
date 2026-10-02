-- Migration 020: job_applications table
-- Stores job applications submitted via the "Trabaja con nosotros" page.

CREATE TABLE job_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  area TEXT NOT NULL,
  message TEXT,
  cv_url TEXT,
  offer_title TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Solo el backend (rol dueño de la base, que no pasa por RLS) lee y escribe. RLS activado SIN políticas.
-- (2026-10-02: la versión original traía una política FOR ALL USING (true) sin "TO service_role", que habría
-- dejado leer y escribir las postulaciones, con nombre, correo y teléfono, a cualquiera con la llave anon de
-- Supabase. Esta migración nunca se había aplicado; se corrige antes de aplicarla.)
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
