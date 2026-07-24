-- NFC Admin: Alerts and whitelist

-- Alert system for suspicious behavior
CREATE TABLE IF NOT EXISTS nfc_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES nfc_tokens(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) DEFAULT 'warning',
  message TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nfc_alerts_token ON nfc_alerts(token_id);
CREATE INDEX IF NOT EXISTS idx_nfc_alerts_resolved ON nfc_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_nfc_alerts_type ON nfc_alerts(alert_type);

ALTER TABLE nfc_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages alerts"
  ON nfc_alerts FOR ALL
  USING (true)
  WITH CHECK (true);

-- Whitelist of physical NFC chip UIDs
CREATE TABLE IF NOT EXISTS nfc_token_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_uid VARCHAR(32) NOT NULL UNIQUE,
  label TEXT DEFAULT '',
  added_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nfc_whitelist_uid ON nfc_token_whitelist(tag_uid);

ALTER TABLE nfc_token_whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages whitelist"
  ON nfc_token_whitelist FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE nfc_alerts IS 'Automated alerts for suspicious NFC behavior (frequent scans, multiple IPs, nighttime)';
COMMENT ON TABLE nfc_token_whitelist IS 'Approved physical NFC chip UIDs that can be programmed';
