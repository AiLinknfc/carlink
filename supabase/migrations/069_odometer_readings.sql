-- Lecturas de odometro del vehiculo (2026-10-05). Tabla de solo agregar: el backend nunca
-- actualiza ni borra lecturas (salvo la correccion de la lectura inicial dentro de 48 h, que la
-- reemplaza mientras sea la unica). `recorded_at` lo pone el servidor; el usuario solo declara el km.
--
-- source:
--   initial  -> km declarado al registrar el vehiculo (o la primera vez, en vehiculos anteriores)
--   service  -> km de un servicio (lo agrega el backend al crear el registro de mantenimiento)
--   periodic -> lectura opcional cuando pasan varios meses sin servicio
--
-- Aditiva: tabla nueva + backfill de una lectura por cada mantenimiento existente.
CREATE TABLE IF NOT EXISTS odometer_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  mileage INTEGER NOT NULL CHECK (mileage >= 0),
  source TEXT NOT NULL CHECK (source IN ('initial', 'service', 'periodic')),
  maintenance_record_id UUID REFERENCES maintenance_records(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_odometer_readings_vehicle ON odometer_readings(vehicle_id, recorded_at DESC);
-- Un mantenimiento genera como maximo una lectura (idempotencia del backfill y del backend).
CREATE UNIQUE INDEX IF NOT EXISTS uq_odometer_readings_record
  ON odometer_readings(maintenance_record_id) WHERE maintenance_record_id IS NOT NULL;

-- Solo el backend la lee y escribe, igual que el resto de tablas nuevas.
ALTER TABLE odometer_readings ENABLE ROW LEVEL SECURITY;

-- Backfill: una lectura por mantenimiento ya registrado, con la fecha en que se creo el registro.
INSERT INTO odometer_readings (vehicle_id, mileage, source, maintenance_record_id, recorded_at)
SELECT m.vehicle_id, m.mileage, 'service', m.id, m.created_at
FROM maintenance_records m
WHERE m.mileage >= 0
  AND NOT EXISTS (SELECT 1 FROM odometer_readings o WHERE o.maintenance_record_id = m.id);
