-- Migration: Identity verification on profiles
-- Run this against your Supabase/PostgreSQL database
--
-- Confianza progresiva: el registro es autodeclarado y basta para operar, pero
-- vender o transferir exige un perfil verificado por CarLink.
--   unverified -> pending (el usuario sube la tarjeta de propiedad) -> verified
--   rejected: revisado y devuelto; el usuario puede volver a subir.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS document_number TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verification_doc_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS verification_note TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS verification_requested_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ NULL;
