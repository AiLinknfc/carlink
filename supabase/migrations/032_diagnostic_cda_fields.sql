-- Fase 6 de la migración de tallerpro/ (docs/PLAN_MIGRACION_TALLERPRO.md) —
-- pero corrige un dato quemado preexistente de CarLink, no algo traído de
-- tallerpro: DiagnosticoTab.tsx generaba un código RTM con Math.random(), una
-- fecha de vencimiento fija a "hoy + 365 días" y una grilla de chequeos
-- siempre en "PASA", sin persistir nada real. Estas columnas permiten
-- registrar el resultado real de una revisión CDA/RTM sobre un Diagnostic
-- existente (alert_type='cda'), en vez de inventarlo en el cliente.

ALTER TABLE diagnostics
  ADD COLUMN IF NOT EXISTS cda_code TEXT,
  ADD COLUMN IF NOT EXISTS cda_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS cda_checks JSONB,
  ADD COLUMN IF NOT EXISTS cda_cert_url TEXT;

COMMENT ON COLUMN diagnostics.cda_code IS 'Código real del certificado RTM/CDA (ej. RTM-1234-2026) — solo tiene sentido cuando alert_type=''cda''';
COMMENT ON COLUMN diagnostics.cda_expiry_date IS 'Fecha real de vencimiento del certificado CDA';
COMMENT ON COLUMN diagnostics.cda_checks IS 'Array JSON [{"name": "Emisión de gases", "passed": true}, ...] con el resultado real por categoría';
COMMENT ON COLUMN diagnostics.cda_cert_url IS 'URL del certificado escaneado en R2 (antes se guardaba solo en localStorage del navegador, sin persistir en el servidor)';
