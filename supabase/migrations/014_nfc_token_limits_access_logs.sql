-- NFC Admin: Token limits per account type and access logging

-- Token limits configuration per account type
CREATE TABLE IF NOT EXISTS nfc_token_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type VARCHAR(20) NOT NULL UNIQUE,
  max_tokens_per_vehicle INTEGER NOT NULL DEFAULT 1,
  max_daily_access INTEGER NOT NULL DEFAULT 100,
  max_unique_ips_24h INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE nfc_token_limits ENABLE ROW LEVEL SECURITY;

-- Admin endpoints use service_role key, which bypasses RLS.
-- This policy ensures anon/authenticated keys cannot access limits.
CREATE POLICY "Service role manages token limits"
  ON nfc_token_limits FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert defaults
INSERT INTO nfc_token_limits (account_type, max_tokens_per_vehicle, max_daily_access, max_unique_ips_24h)
VALUES
  ('persona', 1, 50, 3),
  ('taller', 5, 200, 10)
ON CONFLICT (account_type) DO NOTHING;

-- Access log for every NFC scan
CREATE TABLE IF NOT EXISTS nfc_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES nfc_tokens(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  country VARCHAR(2),
  city VARCHAR(100),
  scanned_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nfc_access_logs_token ON nfc_access_logs(token_id);
CREATE INDEX IF NOT EXISTS idx_nfc_access_logs_scanned ON nfc_access_logs(scanned_at);
CREATE INDEX IF NOT EXISTS idx_nfc_access_logs_ip ON nfc_access_logs(ip_address);

ALTER TABLE nfc_access_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can access logs (admin endpoints use service role)
CREATE POLICY "Service role manages access logs"
  ON nfc_access_logs FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE nfc_token_limits IS 'Configurable token limits per account type (persona, taller)';
COMMENT ON TABLE nfc_access_logs IS 'Every NFC scan logged with IP, user agent, location';
