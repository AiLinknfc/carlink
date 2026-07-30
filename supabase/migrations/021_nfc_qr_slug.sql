-- Short QR slug for printable keychain QR codes.
--
-- The NFC chip is written with the long token URL (no size limit on the
-- chip), but a QR meant to be printed small on a keychain needs a short
-- payload to stay at a low version even at high error correction (so it can
-- survive scratches/dirt on the physical keychain). qr_slug is a short,
-- public, re-showable code that resolves to the same ficha via
-- GET /nfc/q/{slug} — it is not a secret like the activation code.

ALTER TABLE nfc_tokens
  ADD COLUMN IF NOT EXISTS qr_slug TEXT UNIQUE;

ALTER TABLE nfc_token_whitelist
  ADD COLUMN IF NOT EXISTS qr_slug TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_nfc_tokens_qr_slug ON nfc_tokens(qr_slug);
CREATE INDEX IF NOT EXISTS idx_nfc_whitelist_qr_slug ON nfc_token_whitelist(qr_slug);

COMMENT ON COLUMN nfc_tokens.qr_slug IS 'Short public code encoded in the printable keychain QR, resolves via GET /nfc/q/{slug}';
COMMENT ON COLUMN nfc_token_whitelist.qr_slug IS 'Short public QR code generated at provisioning time, copied to nfc_tokens on claim';
