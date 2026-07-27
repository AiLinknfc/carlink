# Pendientes de Implementación

_Última actualización: 2026-07-27._

## ~~Rate Limiting con Redis~~ — Hecho

Ya implementado en `backend/app/routers/nfc.py` (`_check_rate`, `_check_activate_rate`) usando `services/cache.py`, con fallback transparente si Redis no está disponible.

## Llavero NFC — pendientes del rediseño (2026-07-27)

**Prioridad alta**
1. **Límites de `empresa` en `nfc_token_limits`**: la tabla solo tiene semillas para `persona` y `taller` (migración 014). Las cuentas `empresa` caen al default de código (1 llavero), no a una condición de negocio real. Agregar migración con la fila `empresa`.
2. **Carrito "Solicitar llavero NFC"**: sigue siendo una maqueta de UI — al pagar solo cierra el modal y muestra un toast, sin crear ninguna orden real. Decidir si se conecta a un backend de pedidos antes de vender llaveros de verdad.

**Prioridad media**
3. **Rol admin no escalable**: hoy es un solo UUID hardcodeado (`ADMIN_USER_ID` / `NEXT_PUBLIC_ADMIN_USER_ID`), no un rol basado en `account_type`. Migrar a un modelo de roles si se necesita más de un administrador.
4. **Separación de ambientes**: local/staging/producción comparten la misma base de Supabase. Ver sección "Pendiente: separación de ambientes" en `docs/DEPLOY.md`.

## Seguridad

5. **Rotación de credenciales tras el incidente de 2026-07-27**: confirmar que no queden variables de entorno con la contraseña/clave viejas en ningún ambiente (local, Railway, backups). Ver `docs/DEPLOY.md`.
