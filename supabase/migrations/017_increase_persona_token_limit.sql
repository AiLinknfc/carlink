-- Allow 2 NFC keychains per vehicle for persona accounts
UPDATE nfc_token_limits SET max_tokens_per_vehicle = 2 WHERE account_type = 'persona';
