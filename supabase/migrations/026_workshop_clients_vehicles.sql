-- Taller/Empresa panel — paso 4/9: cartera propia de clientes y vehículos del
-- taller. Deliberadamente separada de `vehicles` (que es del dueño del
-- vehículo, no del taller): la mayoría de clientes de un taller nunca abren
-- CarLink. `linked_vehicle_id` es un enlace opcional cuando la placa sí
-- corresponde a un vehículo CarLink real.

CREATE TABLE IF NOT EXISTS workshop_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  document_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workshop_clients_workshop ON workshop_clients(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_clients_name ON workshop_clients(workshop_id, name);

ALTER TABLE workshop_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages workshop_clients"
  ON workshop_clients FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS workshop_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES workshop_clients(id) ON DELETE CASCADE,
  linked_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  license_plate TEXT NOT NULL,
  brand TEXT DEFAULT '',
  model TEXT DEFAULT '',
  year INTEGER,
  vin TEXT DEFAULT '',
  mileage INTEGER NOT NULL DEFAULT 0,
  fuel_type TEXT DEFAULT '',
  color TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workshop_vehicles_workshop ON workshop_vehicles(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_vehicles_client ON workshop_vehicles(client_id);
CREATE INDEX IF NOT EXISTS idx_workshop_vehicles_plate ON workshop_vehicles(workshop_id, license_plate);
CREATE INDEX IF NOT EXISTS idx_workshop_vehicles_linked ON workshop_vehicles(linked_vehicle_id);

ALTER TABLE workshop_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages workshop_vehicles"
  ON workshop_vehicles FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE workshop_clients IS 'Cartera de clientes propia de cada taller — independiente de profiles/vehicles de CarLink';
COMMENT ON COLUMN workshop_vehicles.linked_vehicle_id IS 'Enlace opcional al vehículo real de CarLink cuando la placa coincide; null si el cliente del taller no usa CarLink';
