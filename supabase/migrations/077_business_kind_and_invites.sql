-- Fase 0 de docs/PLAN_ALIADOS_NEGOCIO.md (2026-10-16): tipo de organizacion + invitacion de registro.
--
-- Aditiva: columnas con default o nullable. Nada existente cambia de comportamiento: todo taller actual
-- queda con business_kind = 'taller'. La base es compartida entre local, staging y produccion.
--
-- business_kind: taller | cda | concesionario | compraventa | repuestos  (aseguradora queda fuera por ahora).
--   'cda' = Centro de Diagnostico Automotor (nivel de confianza alto; docs/PLAN_ALIADOS_NEGOCIO.md seccion 10).
--   workshops.business_kind decide, mas adelante (Fase 1), que modulos del panel y que reglas aplican.
--   workshop_applications.business_type sigue siendo el SUBTIPO y solo aplica a los talleres.
-- checks: lista de chequeo manual del admin (documento revisado, NIT confirmado, contacto confirmado, ubicacion).
--   A futuro una API de verificacion de empresas agrega sus propias llaves aqui.
-- invite_*: enlace de un solo uso que se envia al aprobar. Solo se guarda el hash; el token crudo viaja
--   unicamente en el correo. Une la aprobacion con el registro (el NIT debe coincidir).
ALTER TABLE workshops
  ADD COLUMN IF NOT EXISTS business_kind TEXT NOT NULL DEFAULT 'taller'
    CHECK (business_kind IN ('taller', 'cda', 'concesionario', 'compraventa', 'repuestos'));

ALTER TABLE workshop_applications
  ADD COLUMN IF NOT EXISTS business_kind TEXT NOT NULL DEFAULT 'taller'
    CHECK (business_kind IN ('taller', 'cda', 'concesionario', 'compraventa', 'repuestos')),
  ADD COLUMN IF NOT EXISTS checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS invite_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invite_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invite_used_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workshop_applications_invite_hash
  ON workshop_applications(invite_token_hash) WHERE invite_token_hash IS NOT NULL;
