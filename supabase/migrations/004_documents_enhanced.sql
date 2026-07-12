-- CarLink: Enhanced Documents Table
-- Adds status tracking, expiry dates, and document numbers

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS expires_at DATE,
  ADD COLUMN IF NOT EXISTS doc_number TEXT DEFAULT '';

-- Document status constraint
ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_status_check;
ALTER TABLE documents
  ADD CONSTRAINT documents_status_check
  CHECK (status IN ('vigente', 'por_vencer', 'vencido', 'pendiente'));

-- Index for document status queries
CREATE INDEX IF NOT EXISTS idx_documents_vehicle_status
  ON documents (vehicle_id, status);

-- Add document order for sorting
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Enhancement: Certificates with document reference
ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS amount TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'factura';

-- Gallery enhancements: upload timestamps and file metadata
ALTER TABLE gallery_images
  ADD COLUMN IF NOT EXISTS file_size INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS file_type TEXT DEFAULT '';

-- Add diagnostic file_url for CDA certificates
ALTER TABLE diagnostics
  ADD COLUMN IF NOT EXISTS file_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS result_code TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- Workshop enhancement: social links
ALTER TABLE workshops
  ADD COLUMN IF NOT EXISTS instagram_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Service Log enhancement: link to maintenance record
ALTER TABLE service_logs
  ADD COLUMN IF NOT EXISTS maintenance_record_id UUID REFERENCES maintenance_records(id) ON DELETE SET NULL;

-- Vehicle enhancement: additional useful fields
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS vin TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS engine_number TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS current_mileage INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_service_mileage INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plate_type TEXT DEFAULT 'particular';

-- Enable RLS on all tables (idempotent)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;

-- RLS policies for documents
DROP POLICY IF EXISTS "Users can manage their own documents" ON documents;
CREATE POLICY "Users can manage their own documents" ON documents
  FOR ALL USING (
    vehicle_id IN (SELECT id FROM vehicles WHERE owner_id = auth.uid())
  );

-- RLS policies for service_logs
DROP POLICY IF EXISTS "Users can manage their own service logs" ON service_logs;
CREATE POLICY "Users can manage their own service logs" ON service_logs
  FOR ALL USING (
    vehicle_id IN (SELECT id FROM vehicles WHERE owner_id = auth.uid())
  );
