-- Lets an admin pause a partner's already-generated, not-yet-claimed
-- activation codes without deleting them. Before this, suspending a partner
-- (partners.status='suspended') only blocked *future* provisioning
-- (get_current_partner requires status='active') — it never touched rows
-- already sitting in nfc_token_whitelist with status='available'. Those
-- stayed claimable forever via POST /nfc/activate, which never checks the
-- partner's status at all. See docs/PENDIENTES.md, item 3 ("Suspensión de
-- partner no revoca su cupo ya emitido; sin acción reversible en bloque").
--
-- suspended_at (nullable, not a new `status` value) so a suspended-then-
-- reactivated code keeps its original status ('available') untouched — no
-- regeneration, same hashes, same token_url_encrypted/qr_slug.
ALTER TABLE nfc_token_whitelist ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_nfc_whitelist_suspended
  ON nfc_token_whitelist(provisioned_by_partner_id, suspended_at)
  WHERE suspended_at IS NOT NULL;
