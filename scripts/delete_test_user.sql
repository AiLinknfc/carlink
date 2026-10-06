-- ============================================================
-- Script: Eliminar usuario de prueba carlink.nfc@gmail.com
-- Fecha: 2026-09-14
-- 
-- INSTRUCCIONES:
-- 1. Ejecutar primero el SELECT para verificar qué tiene el usuario
-- 2. Revisar los resultados con el usuario
-- 3. Ejecutar el DELETE solo después de confirmar
--
-- NOTA: Este script usa CASCADE para eliminar todos los datos
-- relacionados (profiles, vehicles, nfc_tokens, maintenance_records, etc.)
-- ============================================================

-- PASO 1: Verificar qué tiene el usuario (EJECUTAR PRIMERO)
SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    p.account_type,
    p.verification_status,
    v.id as vehicle_id,
    v.plate,
    v.brand,
    v.model,
    v.nfc_active,
    (SELECT COUNT(*) FROM nfc_tokens nt WHERE nt.vehicle_id = v.id) as nfc_tokens_count,
    (SELECT COUNT(*) FROM maintenance_records mr WHERE mr.vehicle_id = v.id) as maintenance_count
FROM profiles p
LEFT JOIN vehicles v ON v.owner_id = p.id
WHERE p.email = 'carlink.nfc@gmail.com';

-- PASO 2: Eliminar usuario (CONFIRMAR ANTES DE EJECUTAR)
-- Esto elimina en cascada: profiles, vehicles, nfc_tokens, 
-- maintenance_records, parts, certificates, documents, etc.
DELETE FROM auth.users WHERE email = 'carlink.nfc@gmail.com';

-- PASO 3: Verificar que no quedaron datos huérfanos (OPCIONAL)
-- SELECT COUNT(*) FROM profiles WHERE id NOT IN (SELECT id FROM auth.users);
