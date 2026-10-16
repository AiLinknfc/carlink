-- Fase 1 de docs/PLAN_ALIADOS_NEGOCIO.md (2026-10-16): periodo de acceso de los negocios.
--
-- Hasta hoy el "periodo de prueba" de 7 dias se calculaba en el navegador desde profiles.created_at y el
-- backend no guardaba ni bloqueaba nada. Ahora cada negocio tiene su plan y su vencimiento reales.
--
-- Aditiva. Requiere la migracion 077 aplicada antes (el programa de acceso se concede al usar la invitacion).
--
-- workshops.access_plan:  trial (7 dias, alta sin invitacion) | founder (año gratis por invitacion) |
--                         subscription (pago vigente) | convenio (sin vencimiento, por acuerdo)
-- workshops.access_until: fin del acceso. NULL solo es "sin vencimiento" para el plan convenio; en los demas
--                         planes NULL se interpreta como access_granted_at + 7 dias (nunca bloquea de golpe).
-- workshops.access_granted_at: cuando empezo el acceso (la creacion de la cuenta con la invitacion).
-- workshop_applications.grant_plan / grant_days: lo que el admin concede al aprobar (por defecto un año).
--   Se aplica al crear la cuenta, no al aprobar.
ALTER TABLE workshops
  ADD COLUMN IF NOT EXISTS access_plan TEXT NOT NULL DEFAULT 'trial'
    CHECK (access_plan IN ('trial', 'founder', 'subscription', 'convenio')),
  ADD COLUMN IF NOT EXISTS access_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS access_granted_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Negocios que ya existian (solo la cuenta de pruebas del 2026-10-14): un año desde su creacion, para que
-- ningun negocio actual se bloquee al estrenar este modelo.
UPDATE workshops
   SET access_plan = 'founder', access_until = created_at + INTERVAL '365 days', access_granted_at = created_at
 WHERE access_until IS NULL AND access_plan = 'trial';

ALTER TABLE workshop_applications
  ADD COLUMN IF NOT EXISTS grant_plan TEXT NOT NULL DEFAULT 'founder'
    CHECK (grant_plan IN ('founder', 'convenio')),
  ADD COLUMN IF NOT EXISTS grant_days INTEGER NOT NULL DEFAULT 365
    CHECK (grant_days BETWEEN 1 AND 1095);
