-- Wallet background customization fields for vehicles
-- Run this migration to add wallet personalization columns

ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS wallet_bg_preset_id VARCHAR(20) DEFAULT 'noche',
ADD COLUMN IF NOT EXISTS wallet_bg_custom_url TEXT,
ADD COLUMN IF NOT EXISTS wallet_logo_url TEXT;

-- Index for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_vehicles_wallet_bg_preset ON vehicles(wallet_bg_preset_id);

COMMENT ON COLUMN vehicles.wallet_bg_preset_id IS 'ID of selected wallet background preset (noche, ambar, humo, destello, nitro, nfc, blanco, papel, nieve)';
COMMENT ON COLUMN vehicles.wallet_bg_custom_url IS 'Custom uploaded background image URL for wallet card';
COMMENT ON COLUMN vehicles.wallet_logo_url IS 'Custom uploaded logo image URL for wallet card';