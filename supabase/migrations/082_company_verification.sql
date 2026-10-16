-- Fase 4 de docs/PLAN_ALIADOS_NEGOCIO.md (2026-10-17): verificacion automatica de empresas contra el RUES.
--
-- Aditiva: una columna JSONB con default. Guarda el resultado de consultar el NIT en el dataset abierto del RUES
-- (Confecamaras, datos.gov.co, CC BY-SA 4.0): si existe, si esta ACTIVA, si renovo la matricula, si el digito de
-- verificacion coincide y, de forma orientativa, si el nombre y la actividad economica (CIIU) cuadran.
-- Es una AYUDA para el admin: la aprobacion sigue siendo manual (docs/PLAN_ALIADOS_NEGOCIO.md, seccion 17).
ALTER TABLE workshop_applications
  ADD COLUMN IF NOT EXISTS verification JSONB NOT NULL DEFAULT '{}'::jsonb;
