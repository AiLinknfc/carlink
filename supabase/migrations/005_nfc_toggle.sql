-- NFC visibility toggle
-- Adds a column to vehicles to control whether the public NFC page is active

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS nfc_active BOOLEAN NOT NULL DEFAULT true;

-- Update RLS to allow reading nfc_active via the public NFC endpoint
-- The public endpoint already has its own access pattern via the nfc_tokens table
