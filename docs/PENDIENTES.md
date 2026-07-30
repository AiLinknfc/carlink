# Pendientes de Implementación

_Última actualización: 2026-07-29._

## QR de llavero + ficha de prueba 7 días (2026-07-29)

Plan completo en el historial de conversación (sesión 2026-07-29). **Migración aplicada y flujo completo verificado end-to-end contra la base de datos real de producción** (mismo Supabase que usa Railway — no hay ambiente separado, ver "Llavero NFC — pendientes del rediseño" más abajo).

### Hecho y verificado en esta sesión

1. **QR corto e imprimible**: columna `qr_slug` en `nfc_tokens` y `nfc_token_whitelist` — migración `supabase/migrations/021_nfc_qr_slug.sql` **aplicada contra la base de datos real**. El QR ya no codifica la URL larga del NFC, sino un enlace corto `{frontend}/nfc/q/{slug}` que redirige (302) a `/nfc/{token}`.
2. Endpoint público `GET /nfc/q/{slug}` en `backend/app/routers/nfc.py` — mismo rate limit que `GET /nfc/{token}`, descifra `token_url_encrypted` y redirige. **Probado con tráfico HTTP real**: confirma 302 con la URL larga correcta, tanto para un token de prueba (trial) como para uno personal reclamado.
3. Helper compartido `backend/app/services/nfc_provisioning.py` (`generate_nfc_token`, `generate_human_code`, `TRIAL_DAYS`, `TRIAL_ACCOUNT_TYPES`) usado tanto por la provisión admin (`admin.py`) como por el minteo automático de prueba (`vehicles.py`).
4. `qr_url` expuesto en: `NfcWhitelistProvisionOut`, `NfcWhitelistOut`, `NfcTokenAdminOut`, y en la respuesta de `GET /nfc/tokens/{id}/url`. **Confirmado en la respuesta real** de `POST /admin/nfc/whitelist/provision`.
5. Componente `frontend/src/components/QrCodePanel.tsx` (librería `qr-code-styling`, nueva dependencia) — selector de forma (cuadrados/redondeado/puntos/clásico) y nivel de protección (M/Q/H), descarga PNG. Verificado solo con `tsc --noEmit` — **falta abrirlo en un navegador real** (ver pendiente #2).
6. Integrado en: tarjeta "Vinculado a llavero NFC" (`FichaTab.tsx`), modal de llavero (`app/page.tsx`), panel de provisión + tabla de whitelist (`admin/page.tsx`).
7. **Ficha de prueba de 7 días (taller/empresa)**: minteo automático de un `NfcToken(token_type='trial')` al crear el primer vehículo (`vehicles.py`), sin llavero físico. Persona nunca la recibe. **Probado con una cuenta taller real de prueba**: al crear el vehículo aparece el token trial con `qr_slug` y URL cifrada.
8. Función centralizada `_has_ficha_access()` en `nfc.py`, **probada con los 3 escenarios reales**:
   - Trial vigente (< 7 días) → ficha pública accesible (`GET /nfc/{token}`, `GET /nfc/q/{slug}`, `GET /nfc/my-preview` → 200).
   - Llavero personal reclamado, aunque el trial de ese mismo vehículo se retrase artificialmente >7 días → sigue dando acceso (vitalicio, gana sobre el trial vencido).
   - Solo trial, retrasado >7 días, sin llavero reclamado → `403 {"reason":"trial_expired", "message":"..."}`.
9. Pantalla "Esta ficha está en pausa" en `frontend/src/app/nfc/[token]/page.tsx` para el `403 trial_expired`/`no_keychain` — el contrato de la API (403 + esa forma del body) quedó confirmado por la prueba end-to-end; la pantalla en sí no se abrió en navegador (ver pendiente #2).
10. Todos los datos de prueba (perfiles, vehículos, tokens, entrada de whitelist, usuarios de Supabase Auth) fueron creados con emails `@carlink.test` desechables y **eliminados por completo** al terminar — no queda rastro en la base de datos real.

### Hallazgo durante la prueba (no relacionado al QR, pero relevante)

`ADMIN_EMAIL` en `.env` (`business@carlink.com.co`) **no corresponde** al usuario que realmente pasa la verificación de `get_current_admin` — ese chequeo compara contra `ADMIN_USER_ID`, cuyo dueño real es `andresypm@gmail.com`. Si `business@carlink.com.co` alguna vez necesita acceso al panel admin, hay que agregar su UUID real a la lógica de admin (hoy es un solo UUID hardcodeado, ver pendiente #3 de la sección de abajo).

### Pendiente — antes de dar esto por terminado

**Prioridad alta**
1. **"Historial de clientes" de taller/empresa**: el plan pedía bloquearlo también sin llavero reclamado tras vencer el trial, pero su endpoint no se identificó ni se tocó en esta sesión. Localizarlo y aplicarle `_has_ficha_access` (o el criterio equivalente).
2. **Probar `QrCodePanel` en un navegador real** (local o producción): abrir el panel, cambiar forma/protección, descargar el PNG y escanearlo con el teléfono para confirmar que llega al enlace corto correcto. Solo se validó el contrato de API/DB, no la UI en sí.
3. **Persistencia real de suscripción**: `Profile.subscription_status` / `trial_ends_at` siguen sin columna en DB (son solo campos del frontend, ver `docs/CONTEXTO.md`). La regla "mientras no se retire de la suscripción" para taller/empresa sin llavero depende de que ese estado sea real — hoy no lo es.
4. Agregar un CTA ("Comprar llavero") en la pantalla "ficha en pausa" del frontend público — hoy solo tiene el mensaje, sin enlace de acción.

**Prioridad media**
5. Revisar si el token de prueba debe contar contra `nfc_token_limits.max_tokens_per_vehicle` (hoy sí cuenta; para `taller` el límite es 5, así que no bloquea en la práctica, pero no se decidió explícitamente si es el comportamiento deseado).
6. Sigue pendiente agregar la fila `empresa` en `nfc_token_limits` (ver pendiente ya existente más abajo) — ahora más relevante porque `TRIAL_ACCOUNT_TYPES` ya contempla `empresa`/`business` a futuro.

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
