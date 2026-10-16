-- Ubicacion de las postulaciones de talleres (2026-10-16).
--
-- Aditiva: dos columnas nullable. La postulante confirma el pin en el mapa del formulario
-- (o el backend geocodifica la direccion); el mapa publico de /taller las cuenta y dibuja sin
-- esperar a que el admin las apruebe. Las rechazadas no se muestran.
-- La base es compartida entre local, staging y produccion (docs/CONTEXTO.md).
ALTER TABLE workshop_applications
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
