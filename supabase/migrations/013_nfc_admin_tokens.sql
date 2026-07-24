-- NFC Admin: Extend nfc_tokens with admin fields
-- Adds tag_uid (physical chip UID), status, and token_type

ALTER TABLE nfc_tokens
ADD COLUMN IF NOT EXISTS tag_uid VARCHAR(32),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS token_type VARCHAR(20) DEFAULT 'personal';

CREATE INDEX IF NOT EXISTS idx_nfc_tokens_status ON nfc_tokens(status);
CREATE INDEX IF NOT EXISTS idx_nfc_tokens_tag_uid ON nfc_tokens(tag_uid);

COMMENT ON COLUMN nfc_tokens.tag_uid IS 'Physical NFC chip UID (whitelisted before programming)';
COMMENT ON COLUMN nfc_tokens.status IS 'Token status: active, revoked, expired, lost';
COMMENT ON COLUMN nfc_tokens.token_type IS 'Token type: personal (1 per vehicle), workshop (configurable limits)';
