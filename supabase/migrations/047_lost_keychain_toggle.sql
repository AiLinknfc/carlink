-- Controls whether the "lost keychain" accordion appears on the public NFC page.
-- Owner decides this from the NFC panel (llavero section).

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS lost_keychain_enabled BOOLEAN NOT NULL DEFAULT false;
