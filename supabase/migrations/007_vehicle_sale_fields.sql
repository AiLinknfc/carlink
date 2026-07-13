-- Add sale fields to vehicles
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS sell_enabled boolean DEFAULT false;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS sell_price text DEFAULT '';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS sell_city text DEFAULT '';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS sell_zip text DEFAULT '';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS sell_phone text DEFAULT '';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS sell_description text DEFAULT '';
