-- Taller/Empresa panel — paso 7/9: agenda de citas del taller.

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_phone TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  vehicle_plate TEXT DEFAULT '',
  vehicle_model TEXT DEFAULT '',
  service_category TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  appointment_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'Pendiente',
  converted_to_work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_workshop ON appointments(workshop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(workshop_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(workshop_id, status);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages appointments"
  ON appointments FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE appointments IS 'Agenda de citas de un taller; conversión 1-click a work_orders vía converted_to_work_order_id';
