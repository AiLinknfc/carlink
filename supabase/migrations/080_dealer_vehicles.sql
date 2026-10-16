-- Fase 3 de docs/PLAN_ALIADOS_NEGOCIO.md (2026-10-16): vehiculos del aliado (concesionario / compraventa),
-- ficha publica con QR, kilometraje certificado y entrega al comprador.
--
-- Aditiva, salvo UN cambio de restriccion: odometer_readings.source admite 'dealer_delivery' (se reemplaza el CHECK por
-- uno que incluye los valores anteriores; ninguna fila existente cambia).
--
-- dealer_vehicles: inventario del aliado. NO es la tabla `vehicles` (que es de un duenio con cuenta): asi un concesionario
-- con decenas de unidades no choca con la reserva de placas ni con el cupo de llaveros; el vehiculo pasa a `vehicles`
-- solo cuando el comprador lo recibe (claim).
-- workshops.can_certify_odometer: permiso APARTE de la aprobacion (lo da el admin a mano); aprobar da el panel, no el
--   poder de certificar kilometraje.
-- odometer_readings.certified_by_workshop_id / certification_kind: quien certifico la lectura y con que peso
--   (dealer = concesionario; dealer_declared = compraventa verificada, "declarado", peso menor).
ALTER TABLE odometer_readings DROP CONSTRAINT IF EXISTS odometer_readings_source_check;
ALTER TABLE odometer_readings
  ADD CONSTRAINT odometer_readings_source_check CHECK (source IN ('initial', 'service', 'periodic', 'dealer_delivery'));
ALTER TABLE odometer_readings
  ADD COLUMN IF NOT EXISTS certified_by_workshop_id UUID REFERENCES workshops(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS certification_kind TEXT CHECK (certification_kind IN ('dealer', 'dealer_declared'));

ALTER TABLE workshops ADD COLUMN IF NOT EXISTS can_certify_odometer BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS dealer_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  plate TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  year INTEGER,
  color TEXT NOT NULL DEFAULT '',
  vehicle_class TEXT NOT NULL DEFAULT '',
  mileage_declared INTEGER NOT NULL DEFAULT 0 CHECK (mileage_declared >= 0),
  price_cop BIGINT CHECK (price_cop IS NULL OR price_cop >= 0),
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'delivered')),
  is_listed BOOLEAN NOT NULL DEFAULT FALSE,
  public_slug TEXT NOT NULL UNIQUE,
  certified_km INTEGER CHECK (certified_km IS NULL OR certified_km >= 0),
  certified_at TIMESTAMPTZ,
  certification_kind TEXT CHECK (certification_kind IN ('dealer', 'dealer_declared')),
  -- Control antifraude: maximo 3 intentos de certificar por vehiculo cada 24 h (evita adivinar el km de otro vehiculo).
  certify_attempts INTEGER NOT NULL DEFAULT 0,
  certify_window_start TIMESTAMPTZ,
  -- Entrega: solo el hash del codigo; el codigo en claro viaja unicamente en el enlace/QR que ve el aliado al generarlo.
  delivery_code_hash TEXT UNIQUE,
  delivery_expires_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  delivered_to_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  delivered_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  share_with_dealer BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workshop_id, plate)
);

CREATE INDEX IF NOT EXISTS idx_dealer_vehicles_workshop ON dealer_vehicles(workshop_id, created_at DESC);
-- Solo el backend la lee y escribe (RLS sin politicas), igual que el resto de tablas del panel.
ALTER TABLE dealer_vehicles ENABLE ROW LEVEL SECURITY;
