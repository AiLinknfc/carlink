-- ============================================================================
-- RESET PARA PRUEBAS — borra TODOS los usuarios y sus datos. IRREVERSIBLE.
-- Correr en el SQL editor de Supabase (o psql) con rol de servicio.
-- ============================================================================

-- PASO 1 — Datos de la aplicación.
-- profiles y vehicles cascadean a todo lo demás, pero se listan todas las
-- tablas explícitamente por claridad. RESTART IDENTITY reinicia secuencias.
TRUNCATE TABLE
  found_requests,
  service_logs,
  diagnostics,
  gallery_images,
  documents,
  certificates,
  parts,
  maintenance_records,
  nfc_tokens,
  workshops,
  vehicles,
  profiles
RESTART IDENTITY CASCADE;

-- PASO 2 — Cuentas de autenticación de Supabase.
-- Necesario para poder volver a registrarte con los MISMOS correos.
-- Si profiles.id tiene FK a auth.users(id) ON DELETE CASCADE, esto también
-- limpiaría profiles; el PASO 1 ya lo dejó vacío de todas formas.
-- ⚠️ Descomenta solo si quieres borrar también los logins:
-- DELETE FROM auth.users;
