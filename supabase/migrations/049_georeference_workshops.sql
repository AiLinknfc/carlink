-- 049: Add georeferencing support for workshops and vehicles
-- Workshop: latitude/longitude for map display
-- Vehicle: georeference_enabled toggle for public ficha

ALTER TABLE workshops
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS georeference_enabled BOOLEAN NOT NULL DEFAULT FALSE;
