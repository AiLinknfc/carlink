-- Verificación de identidad en el perfil. Confianza progresiva: el registro
-- es autodeclarado y basta para operar, pero vender o transferir exige un
-- perfil verificado por CarLink.
--   unverified -> pending (el usuario sube la tarjeta de propiedad) -> verified
--   rejected: revisado y devuelto; el usuario puede volver a subir.
-- Formaliza en supabase/migrations/ un cambio que vivía huérfano en
-- backend/migrations/005_profile_verification.sql (carpeta nunca
-- referenciada desde docs/DEPLOY.md) — ya estaba aplicado en la base
-- compartida, confirmado 2026-08-08 contra information_schema.columns
-- antes de escribir este archivo.
alter table profiles
  add column if not exists document_number text not null default '',
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists verification_doc_url text not null default '',
  add column if not exists verification_note text not null default '',
  add column if not exists verification_requested_at timestamptz null,
  add column if not exists verified_at timestamptz null;
