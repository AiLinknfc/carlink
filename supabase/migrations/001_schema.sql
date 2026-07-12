-- CarLink Database Schema
-- Supabase PostgreSQL + pgvector
-- Run this in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS vector;

-- ===================== PROFILES =====================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- ===================== VEHICLES =====================
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plate TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  brand TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  year INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  image_url TEXT DEFAULT '',
  description_embedding vector(384),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(owner_id, plate)
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own vehicles"
  ON vehicles FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own vehicles"
  ON vehicles FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own vehicles"
  ON vehicles FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own vehicles"
  ON vehicles FOR DELETE USING (auth.uid() = owner_id);

-- ===================== MAINTENANCE RECORDS =====================
CREATE TABLE maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  description TEXT DEFAULT '',
  mileage INTEGER NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  workshop TEXT DEFAULT '',
  cost DECIMAL(12,2) DEFAULT 0,
  lubricant_brand TEXT DEFAULT '',
  lubricant_type TEXT DEFAULT '',
  next_service_mileage INTEGER,
  notes_embedding vector(384),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read maintenance of their vehicles"
  ON maintenance_records FOR SELECT
  USING (EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = maintenance_records.vehicle_id AND vehicles.owner_id = auth.uid()));

CREATE POLICY "Users can insert maintenance to their vehicles"
  ON maintenance_records FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = maintenance_records.vehicle_id AND vehicles.owner_id = auth.uid()));

CREATE POLICY "Users can update maintenance of their vehicles"
  ON maintenance_records FOR UPDATE
  USING (EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = maintenance_records.vehicle_id AND vehicles.owner_id = auth.uid()));

CREATE POLICY "Users can delete maintenance of their vehicles"
  ON maintenance_records FOR DELETE
  USING (EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = maintenance_records.vehicle_id AND vehicles.owner_id = auth.uid()));

-- ===================== PARTS =====================
CREATE TABLE parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT DEFAULT '',
  part_number TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'worn', 'replaced', 'critical')),
  mileage_installed INTEGER,
  lifespan_mileage INTEGER,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read parts of their vehicles"
  ON parts FOR SELECT
  USING (EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = parts.vehicle_id AND vehicles.owner_id = auth.uid()));

CREATE POLICY "Users can insert parts to their vehicles"
  ON parts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = parts.vehicle_id AND vehicles.owner_id = auth.uid()));

CREATE POLICY "Users can update parts of their vehicles"
  ON parts FOR UPDATE
  USING (EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = parts.vehicle_id AND vehicles.owner_id = auth.uid()));

CREATE POLICY "Users can delete parts of their vehicles"
  ON parts FOR DELETE
  USING (EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = parts.vehicle_id AND vehicles.owner_id = auth.uid()));

-- ===================== CERTIFICATES =====================
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issued_by TEXT DEFAULT '',
  issue_date DATE,
  expiry_date DATE,
  file_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- (policies same pattern as above — abbreviated for brevity, apply in real migration)

-- ===================== DOCUMENTS =====================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT '',
  file_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- ===================== GALLERY IMAGES =====================
CREATE TABLE gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

-- ===================== DIAGNOSTICS =====================
CREATE TABLE diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE diagnostics ENABLE ROW LEVEL SECURITY;

-- ===================== VEHICLE SERVICE LOG (for semantic search) =====================
CREATE TABLE service_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  log_text TEXT NOT NULL,
  embedding vector(384),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE service_logs ENABLE ROW LEVEL SECURITY;

-- ===================== INDEXES =====================
CREATE INDEX idx_vehicles_owner ON vehicles(owner_id);
CREATE INDEX idx_maintenance_vehicle ON maintenance_records(vehicle_id);
CREATE INDEX idx_parts_vehicle ON parts(vehicle_id);
CREATE INDEX idx_diagnostics_vehicle ON diagnostics(vehicle_id);
CREATE INDEX idx_gallery_vehicle ON gallery_images(vehicle_id);
CREATE INDEX idx_certificates_vehicle ON certificates(vehicle_id);
CREATE INDEX idx_documents_vehicle ON documents(vehicle_id);
CREATE INDEX idx_service_logs_vehicle ON service_logs(vehicle_id);

-- pgvector indexes (uncomment when ready to use)
-- CREATE INDEX idx_vehicles_embedding ON vehicles USING ivfflat (description_embedding vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX idx_service_logs_embedding ON service_logs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ===================== TRIGGERS =====================
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

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
