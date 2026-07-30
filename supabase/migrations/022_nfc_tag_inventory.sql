-- NFC tag inventory: raw metadata captured from a physical scan of each
-- keychain (today done manually with an NFC reader app; the goal is to
-- eventually automate the scan-and-log step). This is deliberately separate
-- from nfc_token_whitelist — it's inventory/traceability data about the
-- physical chip itself, not the activation flow. Fields mirror the reader
-- app's own export columns as closely as possible so pasted data needs no
-- reshaping, and are kept as free text since real scans are inconsistent
-- (mixed date formats, blank fields, repurposed columns).

CREATE TABLE IF NOT EXISTS nfc_tag_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_type TEXT DEFAULT '',
  technologies TEXT DEFAULT '',
  serial_number TEXT,
  atqa TEXT DEFAULT '',
  sak TEXT DEFAULT '',
  signature TEXT DEFAULT '',
  password_protected TEXT DEFAULT '',
  memory_info TEXT DEFAULT '',
  data_format TEXT DEFAULT '',
  size_info TEXT DEFAULT '',
  writable TEXT DEFAULT '',
  read_only TEXT DEFAULT '',
  tag_content TEXT DEFAULT '',
  tag_password TEXT DEFAULT '',
  tag_created_date TEXT DEFAULT '',
  description TEXT DEFAULT '',
  linked_whitelist_id UUID REFERENCES nfc_token_whitelist(id) ON DELETE SET NULL,
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nfc_tag_inventory_serial ON nfc_tag_inventory(serial_number);
CREATE INDEX IF NOT EXISTS idx_nfc_tag_inventory_created_at ON nfc_tag_inventory(created_at DESC);

COMMENT ON TABLE nfc_tag_inventory IS 'Raw metadata scanned off each physical NFC keychain, for inventory/traceability — separate from the activation flow in nfc_token_whitelist';
COMMENT ON COLUMN nfc_tag_inventory.serial_number IS 'Chip serial/UID as reported by the scanner, e.g. 04:C9:C8:5C:C1:2A:81 — not normalized, may or may not match nfc_token_whitelist.tag_uid';
COMMENT ON COLUMN nfc_tag_inventory.linked_whitelist_id IS 'Optional manual link to the matching nfc_token_whitelist entry once/if it is provisioned';
