-- Verificación pasa de ser por cuenta (profiles) a ser por vehículo
-- (vehicles) — 2026-09-19, bug real encontrado por el usuario: con
-- verification_status en profiles, verificar UNA tarjeta habilitaba
-- transferir/vender TODOS los vehículos de esa cuenta, no sólo el que se
-- revisó. También se suma owner_name (el nombre que trae la tarjeta
-- escaneada, separado de profiles.full_name — no necesariamente la misma
-- persona: puede ser el auto de otra persona, o uno todavía no traspasado).
--
-- Aditiva — no se tocan/borran las columnas viejas de profiles.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_name TEXT NOT NULL DEFAULT '';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS verification_doc_url TEXT NOT NULL DEFAULT '';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS verification_doc_url_back TEXT NOT NULL DEFAULT '';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS verification_note TEXT NOT NULL DEFAULT '';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS verification_requested_at TIMESTAMPTZ;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Dato real migrado a mano (confirmado por el usuario, 2026-09-19): la única
-- verificación aprobada hoy en toda la base es la cuenta andresypm@gmail.com,
-- y correspondía específicamente al vehículo ZYM-35C (id
-- b7272a24-df8f-4e1c-8539-76e9c69c51d9), no a los otros 3 vehículos de esa
-- cuenta. Se traslada sólo a ese vehículo puntual — el resto arranca
-- 'unverified' y necesita subir su propia tarjeta.
UPDATE vehicles v
SET verification_status = 'verified',
    verified_at = p.verified_at,
    verification_doc_url = p.verification_doc_url,
    verification_doc_url_back = p.verification_doc_url_back
FROM profiles p
WHERE v.owner_id = p.id
  AND v.plate = 'ZYM-35C'
  AND p.email = 'andresypm@gmail.com';
-- Nota 2026-09-18: la versión original filtraba por un id de vehículo equivocado y no afectó
-- ninguna fila (sin error). Se corrigió a placa+dueño al verificar contra la base real.
