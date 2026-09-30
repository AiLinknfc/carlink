-- Seccion "Seguridad" de la app: elementos de seguridad del vehiculo (extintor, botiquin, kit de
-- carretera y otros) con sus fechas de compra/vencimiento/recarga/revision/reposicion. Un
-- vehiculo puede tener varios elementos (incluso del mismo tipo). Aditiva: tabla nueva.

CREATE TABLE IF NOT EXISTS vehicle_safety_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('extintor', 'botiquin', 'kit_carretera', 'otro')),
  name TEXT NOT NULL DEFAULT '',
  purchase_date DATE,
  expiry_date DATE,
  recharge_date DATE,
  review_date DATE,
  restock_date DATE,
  -- botiquin: lista de elementos faltantes ["gasas", "alcohol", ...]
  missing_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- kit de carretera: {"gato": true, "llave_ruedas": false, ...} (true = lo tiene)
  checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- datos leidos de la etiqueta: marca, capacidad, agente extintor, etc.
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  file_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_safety_items_vehicle ON vehicle_safety_items(vehicle_id);

ALTER TABLE vehicle_safety_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'service_role_all_on_vehicle_safety_items' AND polrelid = 'vehicle_safety_items'::regclass) THEN
    CREATE POLICY "service_role_all_on_vehicle_safety_items"
      ON vehicle_safety_items
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
