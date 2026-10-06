-- Origen y soporte de cada registro de mantenimiento (2026-10-05).
--
-- origin:
--   user     -> lo registro el dueno dentro de la ventana normal (30 dias)
--   workshop -> lo genero una orden de trabajo de un taller (verificado)
--   prior    -> historial anterior al alta del vehiculo en CarLink: declarado por el dueno, con
--               soporte obligatorio (support_url); no cuenta para sellos ni para vidas utiles
--
-- Aditiva: dos columnas con default. Los registros existentes quedan 'user', salvo los que ya
-- vienen de una orden de trabajo, que pasan a 'workshop'.
ALTER TABLE maintenance_records
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'user'
    CHECK (origin IN ('user', 'workshop', 'prior'));
ALTER TABLE maintenance_records
  ADD COLUMN IF NOT EXISTS support_url TEXT NOT NULL DEFAULT '';

UPDATE maintenance_records SET origin = 'workshop'
WHERE source_work_order_id IS NOT NULL AND origin = 'user';
