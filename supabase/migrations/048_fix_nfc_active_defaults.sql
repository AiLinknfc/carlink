-- 048: Fix nfc_active defaults
--
-- Problem: nfc_active defaulted to True for every vehicle, even those without
-- an active NFC token. This made the "Publicar mi perfil" toggle show as ON
-- for vehicles that have never had a keychain activated.
--
-- Fix: Set nfc_active=False for vehicles that currently have nfc_active=True
-- but no active entry in nfc_tokens. Vehicles WITH an active token keep their
-- current state.

UPDATE vehicles
SET nfc_active = false
WHERE nfc_active = true
  AND id NOT IN (
    SELECT DISTINCT vehicle_id
    FROM nfc_tokens
    WHERE is_active = true
      AND status = 'active'
  );

-- Also update the column default for future inserts
ALTER TABLE vehicles ALTER COLUMN nfc_active SET DEFAULT false;
