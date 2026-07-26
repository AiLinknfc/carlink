-- Revert: persona accounts stay at 1 active NFC keychain per vehicle.
-- Migration 017 bumped this to 2 without a documented product reason.
-- Product decision (2026-07-25): keep the strict 1 token = 1 llavero model.
UPDATE nfc_token_limits SET max_tokens_per_vehicle = 1 WHERE account_type = 'persona';
