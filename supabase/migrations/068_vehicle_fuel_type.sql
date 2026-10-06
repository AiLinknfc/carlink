-- vehicles.fuel_type (2026-10-05): tipo de combustible del vehiculo.
-- Valores canonicos: '' (sin definir), 'gasolina', 'diesel', 'gas', 'hibrido', 'electrico'.
-- Lo llena el OCR de la tarjeta de propiedad (campo COMBUSTIBLE), la card del
-- registro o el perfil. Sirve para decidir que servicios/piezas aplican (ej. filtro de
-- particulas solo en diesel). Aditiva, default '' => vehiculos existentes quedan sin
-- definir hasta que el usuario los complete.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_type TEXT NOT NULL DEFAULT '';
