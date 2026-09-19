-- Dos columnas nuevas, mismo batch de trabajo (2026-09-18):
--
-- 1. profiles.verification_doc_url_back — la tarjeta de propiedad tiene 2
--    caras; hasta ahora la verificación de identidad sólo pedía el frente
--    (verification_doc_url). Ambas quedan obligatorias para poder enviar a
--    revisión (backend/app/routers/auth.py, POST /auth/me/verification).
--
-- 2. vehicles.body_type — `type` en vehicles ya se usaba para la categoría
--    de placa (particular/moto/publico/... — StepVehiculo.tsx, valida el
--    formato de la placa) pero el panel de perfil (app/page.tsx) también lo
--    usaba para la carrocería (Sedán/SUV/Moto/...) elegida por el usuario,
--    pisando la categoría real de la placa cada vez que se guardaba el
--    perfil. Se separa en una columna propia — ver comentario en
--    backend/app/schemas/schemas.py VehicleCreate.body_type.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_doc_url_back TEXT NOT NULL DEFAULT '';
ALTER TABLE vehicles  ADD COLUMN IF NOT EXISTS body_type TEXT NOT NULL DEFAULT '';
