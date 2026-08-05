-- Taller/Empresa panel — paso 3/9: catálogo propio de servicios/precios del taller.

CREATE TABLE IF NOT EXISTS workshop_service_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT '',
  estimated_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  estimated_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workshop_service_items_workshop ON workshop_service_items(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_service_items_category ON workshop_service_items(workshop_id, category);

ALTER TABLE workshop_service_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages workshop_service_items"
  ON workshop_service_items FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE workshop_service_items IS 'Catálogo de servicios y precios de referencia de cada taller, usado al armar órdenes de trabajo y mostrado en su ficha pública';
