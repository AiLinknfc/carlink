# Security Checklist — CarLink

_Última actualización: 2026-08-09 (RLS auditado y corregido de verdad — ver más abajo)._

## Antes de desplegar a producción

### Backend
- [x] Rate limiting vía Redis en `nfc.py` (`_check_rate`, `_check_activate_rate`), con fallback transparente si Redis no está disponible
- [x] `ADMIN_USER_ID` configurado en variables de entorno (Railway)
- [ ] CORS `allow_origins` en `main.py` incluye solo dominios de producción
- [x] **Supabase RLS — auditado de verdad contra la DB real (2026-08-09), no solo revisión de código.**
  El ítem venía marcado `[ ]` desde 2026-07-27 dando a entender que RLS estaba apagado — al
  consultar `pg_tables`/`pg_policies` directo resultó que ya estaba **habilitado** en `profiles`,
  `vehicles`, `vehicle_transfers`, `nfc_token_limits`, `nfc_access_logs`, `nfc_alerts`,
  `nfc_token_whitelist` (el checklist estaba desactualizado, no la DB). Lo que sí faltaba de
  verdad — y lo que importa, porque es el único código que depende de RLS para su seguridad — está
  en "Hallazgo: vulnerabilidad real en transferencia de vehículos" más abajo. Ver
  `supabase/migrations/041_rls_hardening.sql`.
- [ ] `SMTP_USER` y `SMTP_PASS` configurados (email service)
- [ ] Verificar que `ENVIRONMENT=production` en Railway (no `development`)

### Frontend
- [ ] `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_API_URL` apuntan a producción (no tunnel ni localhost)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` son de producción
- [ ] `NEXT_PUBLIC_ADMIN_USER_ID` configurado en Vercel — **requiere rebuild sin caché para tomar efecto**, ver `docs/DEPLOY.md`
- [ ] Supabase Redirect URLs incluyen solo dominios de producción
- [x] No hay tokens raw en `localStorage` — desde el rediseño de activación (2026-07-27) el frontend nunca conoce el token crudo, solo el servidor lo cifra/descifra

### Llavero NFC (modelo de activación, 2026-07-27)
- [x] Un token solo se crea reclamando un llavero físico provisionado por admin (`POST /nfc/activate`), no por autogeneración
- [x] El código de activación se hashea (SHA-256) antes de guardarse; nunca se persiste en texto plano
- [x] `POST /nfc/activate` tiene rate limit propio (5 intentos/10 min por usuario + IP) y mensaje de error genérico (no distingue "no existe" de "ya usado")
- [x] El reclamo de un código es atómico (`UPDATE ... WHERE status='available'`) — resiste condiciones de carrera si el mismo código se reutiliza
- [ ] `ENCRYPTION_KEY` configurada en Railway — sin ella, "Copiar enlace" no puede recuperar la URL de ningún llavero (ya no hay respaldo en `localStorage`)
- [ ] Whitelist de UIDs físicos cargada antes de distribuir chips (`POST /admin/nfc/whitelist/provision`)
- [ ] Límites por `account_type` configurados en `nfc_token_limits` — falta la fila `empresa` (solo existen `persona` y `taller`)
- [ ] Alertas configuradas (escaneos frecuentes, múltiples IPs, horario nocturno)

### Infraestructura
- [ ] Variables de entorno configuradas tanto en Railway (backend) como en Vercel (frontend) — son dashboards separados, no se comparten
- [ ] Migraciones: confirmar que `019_nfc_activation_codes.sql` (y todo lo anterior) esté aplicado en la base real — ver checklist manual en `docs/DEPLOY.md`
- [ ] Redis accesible desde el backend (`REDIS_URL`)
- [ ] HTTPS habilitado en el dominio custom del backend (`api.carlink.com.co`) — verificar que el certificado TLS esté emitido, no solo el genérico de Railway

## Hallazgo: vulnerabilidad real en transferencia de vehículos (2026-08-09)

A raíz de la consulta sobre el modelo partner/franquicia (`docs/PLAN_PARTNER_MODEL.md`) se auditó
si había algún camino directo a Supabase fuera del backend de FastAPI (que conecta como `postgres`
y por lo tanto nunca depende de RLS). Se encontró uno: `frontend/src/app/api/vehicles/transfers/**`
y `frontend/src/app/api/vehicles/[id]/transfer/route.ts` — la única parte del código que usa
`@supabase/supabase-js` directo contra la tabla en vez de pasar por el backend. Ahí había **una
vulnerabilidad real de robo de vehículo**, más un bug que dejaba la función entera sin poder
funcionar en absoluto (no solo insegura — rota).

- **El bug de autorización (crítico)**: `accept/route.ts` solo verificaba la identidad del
  destinatario `if (transfer.to_user_id && transfer.to_user_id !== user.id)`. `to_user_id` queda
  `null` en el caso normal (se invita por email a alguien sin cuenta todavía, ver
  `[id]/transfer/route.ts`) — con `to_user_id` null, todo el chequeo se saltaba: **cualquier usuario
  autenticado de CarLink que supiera el id de una transferencia pendiente podía aceptarla y
  quedarse con el vehículo de otra persona**, sin que su email tuviera que coincidir con nada.
  Corregido: la verificación de identidad ahora corre siempre, nunca condicionada.
- **RLS no tenía ninguna política que dejara aceptar una transferencia** — ni el destinatario podía
  escribir `vehicles.owner_id` ni `vehicle_transfers.status` (solo existían políticas para el
  remitente). Sin esto, el fix de arriba habría sido cosmético: el bug de la app ya no dejaba pasar
  al atacante, pero la escritura legítima del destinatario real tampoco pasaba — la función estaba
  completamente rota, no solo insegura. Se agregaron políticas UPDATE para el destinatario en
  `vehicle_transfers` y `vehicles`, con la misma condición de identidad que ya verifica el código
  (doble capa: si el chequeo de la app se rompe de nuevo en el futuro, la base de datos igual lo
  bloquea).
- **`nfc_tokens` no tenía RLS habilitado en absoluto** — cualquier request con rol `anon`/
  `authenticated` que llegara a esa tabla (el paso final de `accept/route.ts` revoca el token viejo
  al aceptar una transferencia) podía leer o escribir cualquier fila, de cualquier vehículo, sin
  restricción. Se habilitó RLS con política de dueño (mismo patrón que `vehicles`).
- **`validate/route.ts` tenía un bug separado que lo dejaba sin devolver nunca una respuesta** (le
  faltaba el `return` del caso exitoso) — arreglado, y se le agregaron políticas de "vista previa"
  bien acotadas (`vehicle_transfers`/`vehicles`/`profiles`, solo filas `pending` y no vencidas) para
  que la pantalla de aceptar-antes-de-loguearse pueda mostrar qué vehículo es y quién lo transfiere
  — mismo modelo de seguridad que ya usa la ficha pública NFC: el id es un UUID no adivinable, esa
  es la protección, no el rol.
- **`transfers/route.ts` (listar) y `[id]/transfer/route.ts` (crear)** usaban el cliente singleton
  de `lib/supabase.ts` (solo anon key, sin el JWT del usuario) — bajo RLS esto significaba que
  corrían como `anon` sin `auth.uid()`, así que las políticas de dueño los bloqueaban siempre
  (listar transferencias devolvía vacío; crear una fallaba al leer el vehículo). Se corrigieron para
  construir un cliente por request reenviando el `Authorization` del caller, igual que ya hacían
  `accept/route.ts` y `cancel/route.ts`.

**Impacto real**: la tabla `vehicle_transfers` tenía **0 filas** en producción al momento de esta
auditoría — no hay evidencia de que se haya explotado. El botón "Transferir vehículo" además está
marcado "Próximamente" en la UI (`FichaTab.tsx`), así que no es una función que se haya promocionado
activamente — pero estaba completamente wireada y alcanzable (`/transfer/accept`, `TransferVehicleModal.tsx`)
para cualquier cuenta con perfil verificado.

**Verificado con simulación de rol real contra la base de producción** (transacción con
`SET LOCAL role authenticated` + `request.jwt.claims`, revertida al final, sin dejar datos): un
usuario ajeno a una transferencia pendiente no podía leer ni escribir el token NFC de otro, no
podía robar el vehículo simulando exactamente el escenario del bug (`to_user_id` null), y el
destinatario legítimo sí podía completar la aceptación real — confirmado en la misma corrida.

Ver `supabase/migrations/041_rls_hardening.sql` para el detalle completo de las políticas.

## Incidente: credenciales filtradas en el repo (2026-07-27)

Un commit (`desplegando ambientes en produccion`) subió `tests/test_nfc_flow.sh` con la contraseña real de Postgres y el `ENCRYPTION_KEY` de producción hardcodeados en texto plano, ya pusheado a GitHub. Se resolvió rotando ambos secretos (no se reescribió el historial de git — el usuario decidió que rotar era suficiente). Ver `docs/DEPLOY.md` para el detalle completo.

**Reglas para no repetirlo:**
- Nunca hardcodear secretos reales en `.env.example` (debe quedar siempre vacío/plantilla) ni en scripts dentro de `tests/`.
- Los archivos `.md` versionados (`CONTEXTO.md`, este archivo, etc.) tampoco son lugar para contraseñas o claves reales, aunque sea "solo para referencia rápida en desarrollo" — ya pasó una vez con la DB password en `CONTEXTO.md`.
- Si un secreto queda expuesto en un commit ya pusheado, rotarlo de inmediato es más importante que limpiar el historial de git.
