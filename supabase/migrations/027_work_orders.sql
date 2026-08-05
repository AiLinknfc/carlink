-- Taller/Empresa panel — paso 5/9: órdenes de trabajo + desglose de mano de
-- obra, repuestos usados y evidencia fotográfica.

CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  workshop_vehicle_id UUID NOT NULL REFERENCES workshop_vehicles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES workshop_clients(id) ON DELETE CASCADE,
  mechanic_id UUID REFERENCES workshop_mechanics(id) ON DELETE SET NULL,
  entry_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  estimated_completion_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Pendiente',
  symptoms TEXT DEFAULT '',
  technical_notes TEXT DEFAULT '',
  category TEXT DEFAULT '',
  labor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  parts_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  final_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  payment_method TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workshop_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_work_orders_workshop ON work_orders(workshop_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(workshop_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_vehicle ON work_orders(workshop_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_client ON work_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_entry_date ON work_orders(workshop_id, entry_date DESC);

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages work_orders"
  ON work_orders FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS work_order_labor_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  rate_per_hour NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_order_labor_items_order ON work_order_labor_items(work_order_id);

ALTER TABLE work_order_labor_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages work_order_labor_items"
  ON work_order_labor_items FOR ALL
  USING (true)
  WITH CHECK (true);

-- part_id referencia el inventario propio del taller (workshop_inventory_parts,
-- creado en la migración 028); se declara sin FK aquí para no invertir el
-- orden de las migraciones y se agrega la FK al final de 028.
CREATE TABLE IF NOT EXISTS work_order_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  part_id UUID,
  part_name TEXT NOT NULL,
  sku TEXT DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_order_parts_order ON work_order_parts(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_parts_part ON work_order_parts(part_id);

ALTER TABLE work_order_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages work_order_parts"
  ON work_order_parts FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS work_order_photo_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  category TEXT DEFAULT '',
  uploaded_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_order_photo_evidence_order ON work_order_photo_evidence(work_order_id);

ALTER TABLE work_order_photo_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages work_order_photo_evidence"
  ON work_order_photo_evidence FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE work_orders IS 'Orden de trabajo de un taller sobre un vehículo de su cartera (workshop_vehicles) — totales calculados en backend usando workshops.tax_rate_percent, nunca una tasa fija en código';
COMMENT ON COLUMN work_orders.order_number IS 'Ej. OT-1001 — único por taller, no global';
