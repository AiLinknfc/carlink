-- CarLink NFC Tokens
-- Secure hash-stored tokens for NFC llavero chip access

CREATE TABLE nfc_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix VARCHAR(10) NOT NULL,
  label TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nfc_tokens_user ON nfc_tokens(user_id);
CREATE INDEX idx_nfc_tokens_vehicle ON nfc_tokens(vehicle_id);
CREATE INDEX idx_nfc_tokens_hash ON nfc_tokens(token_hash);

ALTER TABLE nfc_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own NFC tokens"
  ON nfc_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own NFC tokens"
  ON nfc_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own NFC tokens"
  ON nfc_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own NFC tokens"
  ON nfc_tokens FOR DELETE
  USING (auth.uid() = user_id);
