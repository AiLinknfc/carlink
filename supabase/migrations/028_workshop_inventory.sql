-- Taller/Empresa panel — paso 6/9: inventario/stock propio del taller.
-- OJO: no confundir con la tabla `parts` existente (partes instaladas en UN
-- vehículo, del lado del dueño) — esto es el stock de repuestos que el taller
-- compra y vende, independiente de cualquier vehículo puntual.

CREATE TABLE IF NOT EXISTS workshop_inventory_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  sku TEXT DEFAULT '',
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Otros',
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  retail_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  location TEXT DEFAULT '',
  compatible_models TEXT[] DEFAULT '{}',
  last_restock_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workshop_inventory_parts_workshop ON workshop_inventory_parts(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_inventory_parts_sku ON workshop_inventory_parts(workshop_id, sku);
CREATE INDEX IF NOT EXISTS idx_workshop_inventory_parts_low_stock ON workshop_inventory_parts(workshop_id) WHERE stock <= min_stock;

ALTER TABLE workshop_inventory_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages workshop_inventory_parts"
  ON workshop_inventory_parts FOR ALL
  USING (true)
  WITH CHECK (true);

ALTER TABLE work_order_parts
  ADD CONSTRAINT fk_work_order_parts_inventory
  FOREIGN KEY (part_id) REFERENCES workshop_inventory_parts(id) ON DELETE SET NULL;

COMMENT ON TABLE workshop_inventory_parts IS 'Stock de repuestos propio de cada taller (compra/venta) — distinto de la tabla `parts` (componentes instalados en un vehículo puntual)';
