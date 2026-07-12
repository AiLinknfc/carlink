-- Certificate cost
-- Migration 004 added `certificates.amount` (TEXT, unused) intending to track invoice
-- amounts but it was never wired into the app. This repurposes that column as a proper
-- numeric cost field (used by the Quick Register OCR flow and Certificados tab) instead
-- of introducing a second, overlapping column.

ALTER TABLE certificates ALTER COLUMN amount DROP DEFAULT;
ALTER TABLE certificates ALTER COLUMN amount TYPE NUMERIC(12,2) USING NULLIF(trim(amount), '')::numeric;
