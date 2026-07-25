-- Add encrypted URL storage for NFC token recovery
-- The raw token URL is AES-256-GCM encrypted before storage.
-- Only the token owner can decrypt it via authenticated endpoint.

ALTER TABLE nfc_tokens ADD COLUMN IF NOT EXISTS token_url_encrypted TEXT;
COMMENT ON COLUMN nfc_tokens.token_url_encrypted IS 'AES-256-GCM encrypted raw NFC URL for owner recovery';
