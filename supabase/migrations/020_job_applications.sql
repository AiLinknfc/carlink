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

-- Only the backend (service role) can read/write via API.
-- RLS enabled but no user-facing policies — admin-only through the API layer.
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Permissive policy for service_role (backend uses service key for admin reads)
CREATE POLICY "service_role_all_on_job_applications"
  ON job_applications
  FOR ALL
  USING (true)
  WITH CHECK (true);
