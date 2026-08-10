-- Vehicle expenses: receipts, invoices, fuel records, parts purchases
-- Supports OCR-scanned receipts with structured data per category

CREATE TABLE vehicle_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('fuel', 'parts', 'service', 'insurance', 'other')),
  title TEXT NOT NULL,
  vendor TEXT DEFAULT '',
  issue_date DATE,
  cost DECIMAL(12,2),
  currency TEXT DEFAULT 'COP',
  -- Fuel-specific
  fuel_type TEXT DEFAULT '',
  fuel_liters NUMERIC(8,2),
  price_per_liter NUMERIC(10,2),
  mileage_at_purchase INTEGER,
  -- Parts list (JSONB array of {name, brand, quantity, unit_price})
  items JSONB DEFAULT '[]',
  -- File attachment
  file_url TEXT DEFAULT '',
  ocr_raw TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vehicle_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read expenses of their vehicles"
  ON vehicle_expenses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM vehicles WHERE vehicles.id = vehicle_expenses.vehicle_id AND vehicles.owner_id = auth.uid()
  ));

CREATE POLICY "Users can insert expenses to their vehicles"
  ON vehicle_expenses FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM vehicles WHERE vehicles.id = vehicle_expenses.vehicle_id AND vehicles.owner_id = auth.uid()
  ));

CREATE POLICY "Users can update expenses of their vehicles"
  ON vehicle_expenses FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM vehicles WHERE vehicles.id = vehicle_expenses.vehicle_id AND vehicles.owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete expenses of their vehicles"
  ON vehicle_expenses FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM vehicles WHERE vehicles.id = vehicle_expenses.vehicle_id AND vehicles.owner_id = auth.uid()
  ));

CREATE INDEX idx_expenses_vehicle ON vehicle_expenses(vehicle_id);
CREATE INDEX idx_expenses_category ON vehicle_expenses(vehicle_id, category);
CREATE INDEX idx_expenses_date ON vehicle_expenses(vehicle_id, issue_date DESC);
