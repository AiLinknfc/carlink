-- Fase 3b de docs/PLAN_ALIADOS_NEGOCIO.md (2026-10-17): revisiones tecnico-mecanicas (RTM) del CDA, consignacion de llaveros
-- al concesionario y fotos de los vehiculos en venta. Requiere 077 a 080.
--
-- Aditiva, salvo DOS reemplazos de CHECK en odometer_readings (se amplian: ninguna fila existente cambia):
--   source admite 'cda_inspection'; certification_kind admite 'cda' (la lectura de la RTM, la de mayor peso).
--
-- rtm_inspections: revision registrada por un CDA habilitado. NO escribe nada en la cuenta del duenio del vehiculo: se entrega
--   al propietario con un codigo de un solo uso (solo el hash) y es EL quien la acepta (claim); asi un CDA nunca puede inyectar
--   kilometraje ni diagnosticos en un vehiculo ajeno por solo conocer la placa.
-- km_certify_attempts: tope de intentos por CDA y placa cada 24 h (el kilometraje se compara con el historial de la placa en
--   cualquier cuenta; sin tope, probar valores permitiria adivinarlo).
-- partners.workshop_id: el partner de aprovisionamiento (cupo de llaveros) que es, a la vez, un negocio concesionario; lo vincula el admin.
-- dealer_vehicles.photo_urls: fotos del vehiculo en venta (archivos subidos por el propio aliado).
ALTER TABLE odometer_readings DROP CONSTRAINT IF EXISTS odometer_readings_source_check;
ALTER TABLE odometer_readings
  ADD CONSTRAINT odometer_readings_source_check CHECK (source IN ('initial', 'service', 'periodic', 'dealer_delivery', 'cda_inspection'));
ALTER TABLE odometer_readings DROP CONSTRAINT IF EXISTS odometer_readings_certification_kind_check;
ALTER TABLE odometer_readings
  ADD CONSTRAINT odometer_readings_certification_kind_check CHECK (certification_kind IS NULL OR certification_kind IN ('dealer', 'dealer_declared', 'cda'));

CREATE TABLE IF NOT EXISTS rtm_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  plate TEXT NOT NULL,
  inspected_on DATE NOT NULL,
  expires_on DATE NOT NULL,
  certificate_code TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('approved', 'rejected')),
  mileage_km INTEGER NOT NULL CHECK (mileage_km >= 1),
  notes TEXT NOT NULL DEFAULT '',
  claim_code_hash TEXT UNIQUE,
  claim_expires_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  claimed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  claimed_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  share_with_cda BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_on > inspected_on),
  UNIQUE (workshop_id, certificate_code)
);
CREATE INDEX IF NOT EXISTS idx_rtm_inspections_workshop ON rtm_inspections(workshop_id, inspected_on DESC);
CREATE INDEX IF NOT EXISTS idx_rtm_inspections_plate ON rtm_inspections(plate);
ALTER TABLE rtm_inspections ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS km_certify_attempts (
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  plate TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (workshop_id, plate)
);
ALTER TABLE km_certify_attempts ENABLE ROW LEVEL SECURITY;

ALTER TABLE partners ADD COLUMN IF NOT EXISTS workshop_id UUID REFERENCES workshops(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_partners_workshop ON partners(workshop_id) WHERE workshop_id IS NOT NULL;

ALTER TABLE dealer_vehicles ADD COLUMN IF NOT EXISTS photo_urls TEXT[] NOT NULL DEFAULT '{}';
