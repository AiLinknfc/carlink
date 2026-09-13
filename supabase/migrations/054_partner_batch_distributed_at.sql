-- Lets a partner/admin mark exactly when a batch of provisioned keychains
-- physically left the building — the signal item 4 of docs/PENDIENTES.md
-- ("Alerta claimed_at vs. distribución del lote") needs to flag an
-- activation that happened before anyone confirmed the batch was ever
-- handed out. Detection only, not a barrier (see that item's write-up for
-- why a real barrier would be a separate "release gate", not built here).
ALTER TABLE nfc_token_whitelist ADD COLUMN IF NOT EXISTS distributed_at TIMESTAMPTZ NULL;
