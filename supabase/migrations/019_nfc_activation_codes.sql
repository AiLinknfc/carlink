-- Physical keychain provisioning + activation codes.
--
-- Until now, any authenticated user could self-mint an NFC token out of thin
-- air (the browser generated a random token client-side and the backend just
-- stored its hash) — with no relationship to a real physical keychain.
--
-- From now on, a token can only become active by claiming a keychain that
-- CarLink provisioned in advance: the physical chip is pre-programmed with a
-- fixed URL, and an activation code is printed on its packaging. The end
-- user proves possession of the physical item by entering that code.

ALTER TABLE nfc_token_whitelist
  ADD COLUMN IF NOT EXISTS activation_code_hash TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS token_hash TEXT,
  ADD COLUMN IF NOT EXISTS token_prefix TEXT,
  ADD COLUMN IF NOT EXISTS token_url_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claimed_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_nfc_whitelist_activation_code ON nfc_token_whitelist(activation_code_hash);
CREATE INDEX IF NOT EXISTS idx_nfc_whitelist_status ON nfc_token_whitelist(status);

COMMENT ON COLUMN nfc_token_whitelist.activation_code_hash IS 'SHA-256 of the human-entered activation code printed on the physical keychain packaging';
COMMENT ON COLUMN nfc_token_whitelist.token_hash IS 'SHA-256 of the raw token pre-written to the physical chip at provisioning time';
COMMENT ON COLUMN nfc_token_whitelist.status IS 'available (provisioned, not yet claimed) | claimed | blocked';
