# Pendientes de CarLink (documento único)

_Última actualización: 2026-08-07 (segunda pasada — "implementa todo")._

**Ejecutado en la segunda pasada de esta sesión** (commits locales, sin pushear — ver #2): limpieza
de `TRIAL_ACCOUNT_TYPES`, barrido completo de emojis en la UI (19 archivos), suite `pytest` a 0
fallos (arreglado `test_admin.py`, agregado `test_workshop_clients.py`), ramas locales obsoletas
borradas, "Historial de clientes" investigado y cerrado. Detalle de cada uno en su ítem. Lo que
**no** se tocó y por qué también está explicado en el lugar correspondiente — nada se marcó "hecho"
sin decirlo explícitamente.

Este es el **único** lugar donde se lleva la lista de qué falta. Antes estaba repartida entre
este archivo, las secciones "Pendiente" de `CONTEXTO.md`, `DEPLOY.md`, `TESTS_PLAN.md` (ahora
fusionado aquí y borrado) y los tres planes de taller/empresa — se consolidó todo acá a pedido
del usuario (2026-08-07) porque esa dispersión ya había hecho que un pendiente resuelto
(`nfc_token_limits.empresa`, ver más abajo) siguiera repitiéndose sin que nadie notara que estaba
basado en una premisa falsa.

Los documentos de plan (`PLAN_MIGRACION_TALLERPRO.md`, `PLAN_PARIDAD_UI_TALLERPRO.md`,
`PLAN_FACTURACION_AUTOMATICA.md`) y `CONTEXTO.md`/`DEPLOY.md` siguen existiendo para el **detalle
histórico** de cómo se construyó cada cosa (verificaciones, bugs encontrados, decisiones) — pero
ya no repiten listas de pendientes, solo enlazan aquí.

---

## 🔴 Prioridad alta

1. **`DEEPSEEK_API_KEY` no está configurada en Railway** (confirmado por el usuario, 2026-08-07).
   El Diagnóstico IA del taller (`POST /workshops/me/ai-diagnose`, módulo "Diagnóstico IA" del
   panel de negocio) va a fallar en producción hasta que se agregue — mismo patrón/variable que ya
   usa `services/ocr.py`. Acción: agregarla en el dashboard de Railway (requiere que lo hagas vos,
   ningún agente puede hacer `railway login`).
2. **No pushear a `origin/master` sin autorización explícita y fresca del usuario** — estándar ya
   existente del proyecto, reafirmado 2026-08-07 ("no hagas push todavía, quiero arreglar todo
   desde local primero"). Nota importante: el código de la migración tallerpro **ya está
   desplegado** en producción desde el 6 de agosto — esta regla aplica a los cambios *nuevos* que
   se hagan a partir de ahora (fixes de docs/tests/arquitectura de esta sesión en adelante).
3. **Auto-sincronización de facturación escribe en cuentas de terceros sin confirmación por
   transacción** (`work_orders.py`, `_sync_client_records_if_linked`) — cuando un taller marca una
   orden de un vehículo vinculado como pagada + entregada, se crea automáticamente un
   `MaintenanceRecord` y una `Part` **en la cuenta real del cliente**, sin que el cliente apruebe
   ese registro puntual. Esto es inconsistente con la decisión explícita de la Fase 5 de la
   migración original, que rechazó dejar que una cuenta taller escriba en la cartera de otra cuenta
   sin acción explícita del dueño. El vínculo por placa (`/workshops/me/vehicles/{id}/link`) es una
   autorización única y genérica ("sí, soy yo") — no una autorización por cada registro que se le
   va a escribir después. **No es un bug de código, es una decisión de producto que falta tomar
   explícitamente**: ¿el vínculo por placa ya es suficiente consentimiento continuo, o cada
   documento/registro debería requerir alguna confirmación del cliente (o al menos ser reversible/
   visible como "pendiente de aceptar")? Ver más contexto en `PLAN_FACTURACION_AUTOMATICA.md` Paso 3.
   **Deliberadamente no tocado en la segunda pasada** ("implementa todo", 2026-08-07): es
   comportamiento ya desplegado en producción, no un ítem del backlog — cambiarlo sin que decidas
   la pregunta de arriba primero sería tomar la decisión de producto por vos.

## 🟡 Prioridad media

4a. **Barrido de emojis existentes en la UI — ✅ hecho (2026-08-07).** Los ~48 usos en 19 archivos
   listados en la pasada anterior de este documento quedaron reemplazados: 16 por iconos SVG nuevos
   agregados a `frontend/src/lib/icons_new.tsx` (el sistema de iconos que ya existía en el proyecto
   — `Lock`, `Truck`, `Zap`, `Palette`, `Pencil`, `CreditCard`, `Phone`, `Shield`, `Handshake`,
   `Hourglass`, `Package`, `Smartphone`, `Bank`, `MessageCircle`, más un componente `RatingStars`
   nuevo para las calificaciones con estrellas de reseñas — reemplaza `'★'.repeat(rating)`), y el
   resto por texto plano donde el emoji era puramente decorativo (checkmarks de "Agregado"/"Copiado"
   ya comunicados por color, `<option>` de un `<select>` que no admite SVG, mensajes de WhatsApp/chat
   salientes). `npx tsc --noEmit` limpio y `npx vitest run` sin nuevas fallas (el único test que
   falla, `plate.test.ts`, ya fallaba antes — no relacionado). **No verificado visualmente en
   navegador** — ningún entorno de agente tuvo Chromium disponible en esta sesión; los iconos nuevos
   (sobre todo `Palette` y `Handshake`, los de trazo más complejo) valen una revisión visual tuya
   antes de darlos por definitivos.

4. **Confirmar el cierre de la caída de producción del 6 de agosto.** El bump del health check a
   `1.0.2` (`88a375e`) fue un marcador para diagnosticarla; ahora mismo `api.carlink.com.co/api/health`
   responde sano en esa versión, pero nadie dejó escrito **qué la causó** (candidato más probable:
   el "reset accidental" que sacó los commits `21f68ff`/`687f7c7` de `master` en otra sesión, ver
   commit `bcf7038`). Revisar logs de deploy de Railway de esa tarde (15:53–19:15) y anotar la causa
   raíz aquí para cerrar el caso con certeza, no por inferencia del health check actual.
5. **Verificar visualmente los PDF de factura** — tanto el de `DocumentosModule.tsx` (taller) como
   el de la nueva sección "Facturas y certificados" de `DocumentosTab.tsx` (persona), y el modal
   "Emitir documento" de dos pasos con vista previa. Todo esto corre en el navegador
   (`html2canvas`+`jsPDF`) y solo se validó con `tsc --noEmit`, nunca abierto en un navegador real
   (ningún entorno de agente tuvo Chromium disponible en esas sesiones). Ver `PLAN_FACTURACION_AUTOMATICA.md`.
6. **Fila `empresa` en `nfc_token_limits` — cerrado por hallazgo de arquitectura, no por trabajo;
   la limpieza cosmética se aplicó (2026-08-07).** Este pendiente se repitió sin resolverse desde
   2026-07-27 en al menos 4 documentos. Al revisar el código se confirmó que **`'empresa'` nunca
   puede ser un valor real de `profiles.account_type`** — la tabla tiene
   `CHECK (account_type IN ('persona', 'taller'))` desde la migración `003_multi_tenant.sql`, nunca
   alterada. `'empresa'`/`'business'` solo existen como estado transitorio de la UI de registro/
   login (`LoginModal.tsx`), nunca llegan a la base (ver comentario en
   `frontend/src/lib/constants.ts:38-41`, que ya lo documentaba). No hay ninguna fila que agregar —
   el límite de negocio para cuentas de taller ya se aplica vía la fila `taller` existente.
   `TRIAL_ACCOUNT_TYPES` en `backend/app/services/nfc_provisioning.py` se redujo de
   `{"taller", "empresa", "business"}` a `{"taller"}` (los otros dos nunca podían ocurrir) —
   sin cambio de comportamiento, comentario agregado explicando por qué.
7. **"Historial de clientes" de taller/empresa sin el mismo gate de trial — investigado y cerrado
   (2026-08-07), no era un endpoint sin identificar.** Este pendiente venía del plan de QR/trial de
   2026-07-29, **anterior** a que existiera el panel `/app/negocio` — en ese momento no había ningún
   "historial de clientes" del taller como tal. Hoy esa función vive en `ClientesModule.tsx` /
   `workshop_clients.py`, gateada por `verify_workshop` (autenticación + dueño del taller) — un
   modelo de datos totalmente distinto al de la ficha pública NFC/QR que protege `_has_ficha_access`
   (`workshop_clients`/`workshop_vehicles` nunca pasan por ese gate, ni tendría sentido que lo
   hicieran: no son datos públicos). La protección equivalente ya existe y es más completa de lo que
   pedía el pendiente original: `/app/negocio` entero (los 10 módulos, incluido Clientes) se bloquea
   con `SubscriptionExpiredCard` vía `isSubscriptionValid()` cuando el trial vence sin llavero
   reclamado — verificado en navegador real en la Fase 5 de `PLAN_MIGRACION_TALLERPRO.md`.
8. **Rol admin sigue siendo un solo UUID hardcodeado** (`ADMIN_USER_ID` / `NEXT_PUBLIC_ADMIN_USER_ID`),
   no un rol basado en `account_type`. No escala a más de un administrador. **No implementado en
   esta sesión** — es un cambio de modelo de autorización (nueva tabla de roles o columna +
   migración de todos los checks `user_id != admin_id`), con impacto en seguridad si se hace a las
   apuradas; mejor con una conversación corta primero sobre cuántos admins reales necesitás y si
   todos deben tener el mismo nivel de acceso.
9. **Separación de ambientes** — local/staging/producción comparten la misma instancia de Supabase.
   Causa raíz documentada de varios bugs de producción pasados. **No implementado en esta sesión** —
   requiere crear un proyecto Supabase nuevo, que solo vos podés hacer (acceso a tu cuenta de
   Supabase); una vez creado, avisame y hago la parte de configurar `local`/`staging` para apuntar
   ahí. Ver plan de 3 pasos en `docs/DEPLOY.md` → "Pendiente: separación de ambientes".
10. **Suite `pytest` para los routers nuevos de taller/empresa — arrancada, no completa
    (2026-08-07).** Se agregó `tests/test_workshop_clients.py` (5 tests) cubriendo el límite de
    aislamiento más importante — un taller no puede leer ni editar un cliente de otro taller — sobre
    el router `workshop_clients.py`. **A propósito no se hizo lo mismo para `work_orders.py`**
    (el más complejo: descuento de stock, numeración de orden con reintento, facturación
    automática, sync a cuentas de cliente) — mockear esa cadena de pasos a ciegas es exactamente el
    patrón que causó la deuda de tests de esta misma sesión (ver hallazgo de arquitectura #3 más
    abajo); mejor seguir con scripts E2E contra DB real para esa lógica, como ya se ha hecho. Quedan
    sin ningún test unitario: `work_orders.py`, `appointments.py`, `workshop_inventory.py`,
    `workshop_services.py`, `workshop_mechanics.py`, `workshop_notifications.py`,
    `workshop_documents.py`, `workshop_reviews.py`, `workshop_ai.py`.
11. **`test_admin.py` — ✅ arreglado (2026-08-07), ya no preexistente.** Los 5 fallos eran los test
    doubles mal tipados (`MagicMock` auto-generando corrutinas donde el código real usa métodos
    síncronos de `Result`) — mismo patrón que los 7 de `test_maintenance.py`/`test_nfc.py`
    arreglados en la primera pasada de esta sesión. La suite completa de backend queda en
    **38/38 pasando, 0 fallos**.
12. **Frontend: cero tests más allá de `plate.test.ts`** — no implementado en esta sesión (fuera del
    alcance de "implementa todo" dado el tiempo disponible: componentes/hooks/E2E son un esfuerzo
    grande aparte). Ver checklist heredado de `TESTS_PLAN.md` en la sección de abajo.

## 🟢 Prioridad baja / opcional

13. **Fase D de la paridad visual** (`PLAN_PARIDAD_UI_TALLERPRO.md`) — alinear
    `/(public)/taller/[code]/page.tsx` con la distribución completa de `PublicWorkshopCard.tsx` de
    tallerpro (925 líneas, selector de tema + formulario de calificación). Marcada explícitamente
    como opcional/fuera del alcance inmediato — el QR + toggle de publicación de esa misma fase ya
    se adelantó y está hecho. No implementado en esta sesión.
14. **Carrito "Solicitar llavero NFC"** (`CartModal.tsx`) sigue siendo una maqueta de UI — al pagar
    solo cierra el modal y muestra un toast, sin crear ninguna orden real ni cobrar de verdad.
    **No implementado en esta sesión** — necesita elegir un proveedor de pagos real (Stripe/Wompi/
    PSE) antes de que tenga sentido construir el backend de pedidos; es una decisión de negocio, no
    solo técnica.
15. **Rama `feat/taller-empresa-v2` — ✅ borrada (2026-08-07)**, junto con `feat/taller-empresa-panel`
    (ambas locales, nunca llegaron a `origin` — confirmado con `git ls-remote`). Estaban
    completamente contenidas en `master`, sin nada único que perder.
16. **Rotación de credenciales tras el incidente de 2026-07-27** — confirmar que no queden
    variables de entorno con la contraseña/clave de DB viejas en ningún ambiente (local, Railway,
    backups). Ver `docs/DEPLOY.md`. **No verificable por un agente** — requiere entrar a los
    dashboards de Railway/Vercel/Supabase con tu cuenta.

---

## Hallazgo de esta sesión: deuda de tests (arreglado)

Al correr `pytest tests/` (2026-08-07) salió **12 fallos**, no los 9 "preexistentes" que el plan de
migración daba por sentado. Investigados los 7 nuevos: **ninguno era una regresión real** — eran
fixtures de test (`MagicMock(spec=Model)`) que nunca se actualizaron cuando trabajo *posterior y no
relacionado* agregó campos a los modelos que esos tests mockean:

- `test_maintenance.py::test_update_maintenance` — faltaba mockear `source_work_order_id`
  (agregado por la migración `034`, facturación automática).
- `test_nfc.py` (4 tests) — faltaba mockear los campos de marketplace (`sell_price`, `sell_city`,
  etc., del commit `9198c95`) y toda la cadena de queries que agregó `_has_ficha_access` (owner,
  token personal, y las que hace `access_via_nfc` después de conceder acceso) — además uno de ellos
  esperaba el código de estado viejo (`404`) de antes de que el endpoint pasara a `410 Gone` para
  "ficha desactivada por el dueño", cambio que el frontend sí tiene aplicado correctamente
  (`nfc/[token]/page.tsx` maneja `410`) pero el test nunca se actualizó.

Los 7 se corrigieron en la primera pasada de esta sesión. En la segunda pasada se arreglaron
también los 5 de `test_admin.py` (mismo patrón: `MagicMock` sin `spec=AsyncSession` en sus hijos
auto-generados, así que un `db.execute(...)` sin mockear a mano devolvía un `result.scalars()`
async en vez de sync). **La suite completa queda en 38/38, 0 fallos** — todo commiteado localmente,
sin pushear.

**Por qué importa más allá de estos 7 tests:** esto confirma que el patrón `MagicMock(spec=Model)`
con cada campo mockeado a mano es frágil ante evolución de schema — revienta en silencio semanas
después de un cambio no relacionado, y nadie lo nota hasta que alguien corre la suite completa. Ver
sugerencia en `## Hallazgos de arquitectura` más abajo.

---

## Hallazgos de arquitectura (para decidir, no ejecutados)

Revisión pedida explícitamente por el usuario (2026-08-07): "revisa la arquitectura del negocio por
si encuentras algo que no suele funcionar de esa manera, para que me hagas sugerencias — qué quita
complejidad y qué la aumenta".

### 1. El trial gratuito de llavero — confirmado: NO quitarlo

El usuario preguntó si quitar la opción de que taller/empresa consiga un llavero gratis (trial de 7
días) simplificaría el sistema, porque "implica más validaciones". Revisado: **no simplificaría
nada, y sí perdería algo real.**

- `_has_ficha_access()` (`nfc.py`) ya es una única función centralizada con 3 salidas: llavero
  personal reclamado (acceso vitalicio) → trial vigente → denegado. Quitar el trial no borra esta
  función ni sus validaciones — solo elimina una de las 3 ramas; la función seguiría teniendo la
  misma forma (llavero personal vs. denegado). La complejidad de validación no baja.
- Lo que sí se pierde: es el único momento en que un taller/empresa puede **mostrar y usar** el
  producto (ficha pública con QR) antes de pagar por un llavero físico. Sin eso, un taller nuevo no
  tiene forma de evaluar el producto ni de convencer a un cliente de escanear algo — es la palanca
  de conversión pre-compra, no una validación de más.
- Simplificación real disponible, sin tocar el comportamiento: `TRIAL_ACCOUNT_TYPES` en
  `nfc_provisioning.py` lista `{"taller", "empresa", "business"}`, pero **solo `"taller"` puede
  ocurrir de verdad** (ver pendiente #6 — `account_type` en la DB solo admite `'persona'`/`'taller'`
  por constraint). Reducir el set a `{"taller"}` no cambia ningún comportamiento y elimina una
  fuente de confusión que ya generó un pendiente fantasma repetido 4 veces en la documentación.

### 2. Auto-facturación escribe en cuentas ajenas sin fricción por transacción

Ver pendiente #3 arriba — es el hallazgo con más riesgo real de este repaso. Vale la pena decidirlo
explícitamente en vez de dejarlo como comportamiento implícito de `_sync_client_records_if_linked`.

### 3. Tests basados en mocks profundos son frágiles ante evolución de schema

Ver "Hallazgo de esta sesión" arriba. Sugerencia: para los routers nuevos (pendiente #10), en vez de
profundizar el patrón `MagicMock(spec=Model)` campo por campo, seguir con lo que el proyecto ya hace
de facto y ha probado más confiable — scripts E2E contra una DB real desechable (Supabase con datos
`@carlink.test`, borrados al final) — y dejar esos como los tests de regresión que sí corren en CI,
en vez de expandir los mocks unitarios.

### 4. El health-check-version-bump como marcador de deploy funcionó, pero no está documentado

Se usó dos veces (bump a `1.0.1` y a `1.0.2`) como forma de confirmar que un deploy de Railway
realmente aterrizó, en vez de asumirlo por tiempo transcurrido — coincide con la advertencia ya
existente en `docs/DEPLOY.md` sobre redeploys lentos/confusos de Railway. Vale la pena promover esto
de "truco puntual" a **procedimiento documentado** en `docs/DEPLOY.md` ("después de cada deploy,
bumpear `version` en `/api/health` y confirmar contra el dominio real antes de dar el deploy por
terminado"), ya que demostró servir para diagnosticar un problema real de producción.

---

## Checklist de tests pendientes (fusionado desde `TESTS_PLAN.md`, borrado — vivía duplicado)

### Backend (pytest) — no existen todavía
- [ ] `test_auth.py` — validación JWT contra tokens de Supabase
- [ ] `test_nfc_activation.py` — flujo completo de provisión + activación (admin rechaza `tag_uid`
      duplicado, código usado/inválido da 404 genérico, reclamo concurrente solo gana uno, rate
      limit de `/nfc/activate` bloquea el 6to intento, respeta `nfc_token_limits` por `account_type`)
- [ ] `test_vehicles.py` — CRUD de vehículos con auth
- [ ] `test_found_requests.py` — endpoints públicos y autenticados
- [ ] `test_api_health.py`, `test_cors.py`, `test_rate_limit.py` — integración
- [ ] RLS policies, cascade deletes, trigger `on_auth_user_created` — tests contra DB real
- [ ] Cobertura de los 9 routers nuevos de taller/empresa (ver pendiente #10)

_Ya existen (no repetir):_ `test_maintenance.py`, `test_nfc.py`, `test_admin.py` (los 3 recién
arreglados, 0 fallos), `test_certificates.py`, `test_ocr.py`, `test_workshop_clients.py` (nuevo,
2026-08-07 — aislamiento entre talleres, ver pendiente #10).

### Frontend (Vitest) — no existen todavía
- [ ] Componentes: `FichaTab`, `Sidebar`, `ServiceFormModal`, `PartFormModal`
- [ ] Hooks: `hooks.test.ts` (`useMaintenance`, `useParts`, `useVehicle`), `api.test.ts`
- [ ] Integración: login → crear vehículo → agregar servicio; NFC crear token → ficha pública; tema
      persiste en localStorage
- [ ] E2E (Playwright/Cypress): login Google OAuth, registro de vehículo, token NFC, formulario de
      llavero perdido

_Ya existe:_ `plate.test.ts` (único test de frontend en todo el repo).

### Cómo correr lo que sí existe
```bash
cd backend && pytest tests/ -v                 # o --cov=app --cov-report=html
cd frontend && npx vitest run                  # o --coverage
```
