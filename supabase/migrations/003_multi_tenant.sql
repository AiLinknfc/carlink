-- CarLink Multi-tenant: Talleres + Account Types
-- Run in Supabase SQL Editor after 001_schema.sql

-- 1. Add account_type to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'persona';
ALTER TABLE profiles ADD CONSTRAINT chk_account_type CHECK (account_type IN ('persona', 'taller'));

-- 2. Workshops table
CREATE TABLE workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  legal_id TEXT NOT NULL UNIQUE,
  code VARCHAR(9) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_workshops_owner ON workshops(owner_id);
CREATE INDEX idx_workshops_code ON workshops(code);
CREATE INDEX idx_workshops_city ON workshops(city);

ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read workshops"
  ON workshops FOR SELECT USING (true);

CREATE POLICY "Owners can insert their workshop"
  ON workshops FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their workshop"
  ON workshops FOR UPDATE USING (auth.uid() = owner_id);

-- 3. Link maintenance to workshop
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS workshop_id UUID REFERENCES workshops(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_maintenance_workshop ON maintenance_records(workshop_id);

-- 4. Update the auto-profile trigger to include account_type
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
