-- Para que sirve el lubricante de un servicio "Aceite" (2026-10-05): motor, caja (de cambios) o transmision
-- (automatica, CVT, DCT, diferencial). Separa el aceite de motor de los demas, que no deben contar para la
-- cuenta regresiva ni el testigo de aceite del motor. Aditiva: columna con default 'motor' (todos los
-- registros existentes son de motor).
ALTER TABLE maintenance_records
  ADD COLUMN IF NOT EXISTS lubricant_use TEXT NOT NULL DEFAULT 'motor'
    CHECK (lubricant_use IN ('motor', 'caja', 'transmision'));
