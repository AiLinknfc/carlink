# Pendientes de CarLink (documento único)

_Última actualización: 2026-09-09 (auditoría de arquitectura/organización, fix de deuda de
tests real, CI ejecuta tests, limpieza de raíz, modelo de ramas)._

**Ejecutado en la duodécima pasada** (auditoría técnica pedida por el usuario — "evalúa las
funciones repetidas, revisa cobertura de tests, por qué hay archivos de DB sueltos, organiza
archivos, proponé ramas para proteger producción"; verificado contra sistemas reales, no solo
código — `pytest`, `vitest` y consulta directa a la Supabase real):

- **✅ Deuda de tests real encontrada y arreglada — la cifra "41/41" de la pasada anterior
  quedó vieja.** `pytest tests/` daba 43 passed / **4 failed**, no 0. Verificado contra la
  Supabase real que no era un bug de producción: la migración `049_georeference_workshops.sql`
  ya está aplicada (`vehicles.georeference_enabled` es `NOT NULL DEFAULT false` en la DB real) —
  los 4 fallos eran el patrón ya conocido de mocks (`MagicMock(spec=Model)`) que no se
  actualizaron cuando `049` agregó la columna y cuando `nfc.py::access_via_nfc` ganó una query
  nueva (historial de servicio para la ficha pública). Arreglados los mocks de
  `test_vehicles.py` y `test_nfc.py` — suite completa ahora en **47/47**.
- **✅ CI nunca ejecutaba los tests — cerrado.** `.github/workflows/ci.yml` solo corría
  lint/typecheck/build; los 47 tests de backend y el test de frontend (`plate.test.ts`, 29
  assertions) nunca corrían en CI, solo cuando alguien se acordaba de correrlos a mano — así
  pasó desapercibido el punto anterior. Se agregaron los steps `pytest tests/ -v` y
  `npx vitest run` al workflow.
- **✅ `backend/migrations/`-style artefacto muerto encontrado — `backend/carlink.db` (SQLite
  vacío, gitignored, no referenciado en ningún lugar del código) borrado.** No es el mismo caso
  que la carpeta huérfana de migraciones ya documentada en `DEPLOY.md` (esa ya se había
  resuelto) — este era un archivo suelto de un experimento temprano antes de fijar
  Supabase/Postgres como única DB.
- **✅ Duplicados/clutter de raíz reorganizados**: `llavero.png` (raíz) era un duplicado
  byte-idéntico de `frontend/public/llavero.png` sin ninguna referencia de código — borrado.
  `check_braces.js` (script de debug de un solo uso) → `scripts/`.
  `PRESENTATION_FUNDRAISING.md`/`PRESENTATION_M&A.md` (material de negocio, no docs de
  desarrollo) → siguen en `docs/` (es la convención ya existente del proyecto — plano, sin
  subcarpetas, con prefijo por tipo de documento igual que `PLAN_*`), pero el segundo se
  renombró a `PRESENTATION_M_AND_A.md` — el `&` sin escapar en un nombre de archivo rompió un
  comando (`git mv`) durante esta misma auditoría, mala práctica confirmada en la práctica, no
  solo en teoría. `Kit.PNG`/`EmpaqueFinal.png` (fotos de referencia sin versionar, en la raíz) se
  compararon visualmente contra `frontend/public/kit-final.png`/`empaque-final.png` — son la
  misma foto, solo en mayor resolución sin optimizar; como la app ya usa las versiones
  optimizadas (`LandingSections.tsx`), las de mayor resolución se descartaron en vez de
  archivarlas en `docs/` — no había necesidad real de mantener una copia de referencia aparte.
- **✅ `docs/DEPLOY.md` desincronizado con `supabase/migrations/` — cerrado.** El checklist de
  `\i` llegaba hasta la `046`; le faltaban las líneas de `047`/`048`/`049` (violando su propia
  regla de "cada migración nueva suma su línea en el mismo PR"). Confirmado contra la DB real que
  las tres ya estaban aplicadas — se agregaron las líneas faltantes, sin volver a correrlas.
- **✅ Se encontró y arregló una carpeta `Plataforma/` (canvas de Claude Design, 21 archivos:
  `.dc.html`, bundles JS, manual de marca) committeada en el repo (`ba8ef1b`, 2026-09-07) pero
  ya borrada del disco** — quedaba como 21 borrados sin confirmar en `git status`. Al menos un
  archivo (`CarLink Landing.html`) ya se había adaptado al código real (comentario en
  `shop/page.tsx`), así que cumplió su propósito. Confirmado con el usuario y comiteado el
  borrado, no restaurada.
- **Revisión de duplicación funcional — sin hallazgos nuevos.** Los helpers de autorización
  (`_has_ficha_access`, `verify_vehicle`, `verify_workshop`) y los wrappers de API del frontend
  (`api.ts`/`upload.ts`) ya están centralizados, no reimplementados por módulo. El único caso de
  duplicación conceptual (`CITIES` compartida entre "ciudad de la placa" y "ciudad de envío") ya
  estaba anotado en el ítem 14 de abajo — no es código repetido, es una decisión de producto.
- **Modelo de ramas `master` protegido + `develop` documentado y adoptado** — ver
  `docs/DEPLOY.md` → "Modelo de ramas". Rama `develop` creada localmente. Activar la protección
  real en GitHub (Settings → Branches) y pushear `develop` requiere que lo haga el usuario (acceso
  admin al repo, no disponible desde este entorno) — pasos exactos en `DEPLOY.md`. Esto es
  independiente y no bloqueado por la separación de ambientes del ítem 9 de abajo (que sigue
  bloqueada en que el usuario cree un proyecto Supabase nuevo).
- **Cobertura de tests medida (no solo contada por archivo)**: backend 8 archivos de test para
  57 módulos en `app/` (9 routers de taller/empresa sin ningún test unitario, ver ítem 10);
  frontend 1 archivo (`plate.test.ts`, 29 tests) para 108 archivos en `src/` — 0% de cobertura de
  componentes/hooks. Sin `--cov` corriendo en ningún lado; recomendado correr
  `pytest --cov=app --cov-report=term-missing` una vez antes de priorizar más tests, para tener
  una cifra real por gap en vez de intuición (no ejecutado en esta pasada).

**Ejecutado en la undécima pasada**:

- **`nfc_active` default cambiado a `False`** (migración `048`): antes, todo vehículo nuevo nacía
  con `nfc_active=True`, making the "Publicar mi perfil" toggle show as ON even without a keychain.
  Ahora el default es `False` — el usuario activa explícitamente. La migración también puso
  `nfc_active=False` en vehículos existentes que tenían `True` pero ningún token activo (AKT SDF-45G,
  Chevrolet KLM-456, etc.). Vehículos con token activo (Bajaj ZYM-35C, Kia BDT-762) mantuvieron
  `True`.
- **Frontend guard `isNfcPublished`**: derivado de `vehicle.nfc_active` + `nfcTokens.some(t =>
  t.is_active)` — el toggle solo muestra ON si la DB dice True Y hay al menos un token activo.
  Previene estados stale donde la DB dice True pero no hay llavero.
- **Plate3D `fontScale` prop**: texto de la placa escala proporcionalmente en pantallas chicas.
  Calculado desde `window.innerWidth` vs ancho natural (448px). Las esquinas curvas se restauraron
  quitando `overflow: hidden` del wrapper padre.
- **Skill `nfc-token-system` actualizada**: sección nueva "UI/UX patterns the user repeatedly
  requests" captura toggles, colores, reglas de la ficha pública, y consistencia de datos.

**Ejecutado en la décima pasada** (plan de 7 puntos, ver `/home/andres/.claude/plans/cuddly-petting-cloud.md`
para el detalle completo de investigación/decisiones):

- **Contraentrega arreglado**: `payment_method` nuevo en `shop_orders` (migración `046`) + endpoint
  admin `POST /shop/orders/{reference}/mark-paid` + correo de "pedido recibido". Antes un pedido
  contraentrega quedaba en `pending` para siempre, sin ningún botón para cerrarlo. Verificado
  contra la base real (orden de prueba creada y borrada) y contra el backend local corriendo.
- **Indicador de gastos del tablero conectado**: sumaba solo `maintenance`, nunca `expenses`
  (recibos escaneados) — y el modal para escanear un recibo (`ExpenseScanModal.tsx`) no estaba
  conectado a ninguna pantalla. Detalle en `docs/CONTEXTO.md` → "Sistema de gastos...".
  **Pendiente real, no resuelto**: no hay deduplicación entre un `MaintenanceRecord` (servicio
  registrado a mano) y un `VehicleExpense` (recibo escaneado) del mismo evento — si se solapan,
  el total los cuenta dos veces. No hay mecanismo para esto todavía.
- **Guía de Mantenimiento**: PDF subido a R2, el `.html` se descartó. Correo armado
  (`send_guide_email`) y **verificado con un envío real en producción** (ver nota SMTP abajo).
- **Banner de WhatsApp** en `/shop` después del FAQ (la pregunta de agua/caídas ya existía, no
  hubo que agregarla).
- **SEO/IA**: `robots.txt`, `sitemap.xml`, `llms.txt`, JSON-LD (`Organization`/`Product`/`FAQPage`),
  metadata específica de `/shop` (antes heredaba el title/description genérico de todo el sitio).

**SMTP de Hostinger — configurado y verificado en producción (2026-08-12)**: `SMTP_HOST/PORT/USER/PASS`,
`FROM_EMAIL`, `ADMIN_EMAIL` seteados en Railway (`smtp.hostinger.com:465`, cuenta
`business@carlink.com.co`). El código traía STARTTLS sin condicionar por puerto — el 465 es SSL
directo, no STARTTLS — arreglado con `_smtp_client()` en `email.py` (ver commit "Email: SMTP
Hostinger"). Primer intento de configuración tuvo un typo en `SMTP_USER`
(`465ss@carlink.com.co` en vez de `business@carlink.com.co`, mezclado con el valor del puerto al
escribir) — corregido. Verificado con envío real: log de Railway confirmó
`[email] Sent guide email to ailink.nfc@gmail.com` contra `POST /api/waitlist`
(`source=shop_guia_mantenimiento`) en producción. **Pendiente menor**: `FROM_EMAIL` quedó como
`business@carlink.com.co` pelado — debería ser `CarLink <business@carlink.com.co>` (con nombre de
marca) para que no le aparezca al destinatario la dirección cruda como remitente; no rompe el
envío, es solo estético.

**Pendiente — bloqueado en el usuario**:
- **PostHog**: falta que Andres cree la cuenta y pase el API key para instrumentar frontend
  (`posthog-js`) y backend (`posthog-python`) — nada de esto se construyó todavía.
- `DEEPSEEK_API_KEY` sigue sin estar en Railway (mencionado en pasadas anteriores) — sin ella, el
  escaneo de gastos funciona pero sin la estructuración automática por IA (degrada a que el usuario
  llene los campos a mano, no rompe nada).
- **`SMTP_PASS` falta en `backend/.env` local** (2026-09-08): agregué `SMTP_HOST/PORT/USER` de
  Hostinger al `.env` local (mismos valores que ya están en Railway), pero dejé `SMTP_PASS` vacío
  a propósito — no tengo esa contraseña ni debo inventarla. Sin ella, el envío de correos
  (guía de mantenimiento, notificaciones) se salta en silencio en local (`email_debug: "skipped..."`
  en la respuesta de `POST /api/waitlist`), aunque el lead sí se guarda. En producción (Railway) sí
  está configurado y verificado con un envío real. Completar con la contraseña de aplicación de
  `business@carlink.com.co` y reiniciar el backend si se quiere probar envíos reales en local.

**Ejecutado en la novena pasada**: responsive completo de la sección `/shop` y fix de overlap
hero/Wallet/"Cómo funciona" en pantallas medianas:

- **`shop/page.tsx`**: 4 breakpoints responsive nuevos (`@media` en `<style>` inline) para
  860px, 720px, 480px, 380px — cubren hero phone/NFC scaling, nav CTA, "Cómo funciona"
  grid, pricing cards, testimonials, FAQ, lead capture, dimensions, footer. 43 `data-r`
  attributes únicos para targeting CSS.
- **`CartDrawer.tsx`**: `className="cart-drawer"` + header/footer class hooks para responsive
  CSS (full-width en ≤480px, safe-area iOS).
- **`CheckoutClient.tsx`**: `className="shop-checkout"` + steps class hook (tighter padding
  en phones).
- **`OrdersClient.tsx`**: `className="shop-orders"` (tighter padding en phones).
- **`globals.css`**: reglas responsive nuevas para `.cart-drawer`, `.shop-checkout`,
  `.shop-orders`, `.grid2`, `.shop-cta-row` (stacking en ≤380px).
- **`LandingSections.tsx`**: fix de overlap `#h-como` — height-based media queries
  `@media(max-height:800px)` y `@media(max-height:680px)` que reducen el `marginTop: -115`
  en viewports medianos (ej. 1366x768).
- **Documentación**: `DESIGN_GUIDELINES.md` → "Responsive Design Patterns" (patrón `data-r`,
  height-based queries, CSS class hooks). `CONTEXTO.md` → sección Responsive actualizada.
- **Skill creada**: `.claude/skills/capture-thinking/SKILL.md` (referenciada en CLAUDE.md pero
  inexistente).
pedido explícito del usuario ("quiero poder hacer una gestión previa para descargar el QR, diseñar
el llavero y ya dejar el token asignado"):
- `GET /partners/me/tokens` — llaveros propios uno por fila (no agregados), con `qr_url` re-pedible
  en cualquier momento, filtrable por lote/campaña.
- `GET /admin/nfc/whitelist` ahora muestra de qué partner/campaña viene cada llavero, con filtro por
  origen.
- `QrCodePanel.tsx` — botón "Descargar las 3 variantes" (Simple/Estándar/Máxima resistencia).
- **"Ver código QR" se sacó por completo del modo persona** (`FichaTab.tsx` y "Mis llaveros" en
  `app/app/page.tsx`) — la generación/manipulación de QR quedó exclusiva de Admin NFC y `/partner`.
- **`POST /admin/nfc/whitelist/provision` ahora acepta un `partner_id` opcional** — el admin puede
  asignar un llavero a un partner directo, sin repartirle ninguna api key, con el mismo control de
  cupo (validado y verificado contra la DB real: cupo agotado → 400, partner suspendido → 400).
  Esto resuelve la confusión que reportó el usuario sobre cuáles de los tres botones parecidos
  ("+ Provisionar llavero" vs. "+ Agregar UID" vs. Inventario → "Registrar llavero escaneado")
  generan de verdad un token/QR usable — solo el primero lo hace, ahora con avisos explícitos en
  cada uno para no repetir la confusión.

Detalle completo, decisiones y verificación: `docs/PLAN_PARTNER_MODEL.md` (secciones "Ampliación").

**Ejecutado en la séptima pasada**: cerrando lo que quedó anotado en la sexta pasada — (1) NIT
colombiano validado de verdad en el registro de taller (dígito de verificación DIAN, no solo
unicidad) para el hallazgo del trial gratuito, y (2) auditoría real de RLS en Supabase que encontró
y arregló una vulnerabilidad concreta (no teórica) en `frontend/src/app/api/vehicles/transfers/**`:
un bug de autorización dejaba que cualquier usuario autenticado aceptara la transferencia pendiente
de otra persona y se quedara con su vehículo, y además faltaban las políticas RLS que hacían falta
para que la aceptación legítima funcionara en absoluto. Las dos capas (código + políticas) quedaron
arregladas y verificadas con simulación de rol real contra la base de producción (transacción
revertida, sin dejar datos). Detalle completo en `docs/SECURITY.md` → "Hallazgo: vulnerabilidad real
en transferencia de vehículos" y `supabase/migrations/041_rls_hardening.sql`.

**Ejecutado en la sexta pasada**: a partir de una consulta del usuario sobre si el modelo cerrado
actual podría abrirse a socios/aliados comerciales sin comprometer seguridad, se construyó un rol
**partner** nuevo y separado del admin único (`ADMIN_USER_ID`) — aprovisiona llaveros dentro de un
cupo asignado, sin visibilidad de nada ajeno a sus propios lotes, reusando exactamente la misma
ruta criptográfica que ya usaba el admin (`generate_nfc_token`/`generate_human_code`, sin cambios).
Esto también resuelve el pendiente #8 de abajo. Detalle completo, decisiones y verificación en
`docs/PLAN_PARTNER_MODEL.md`. Construido "listo para cuando el proyecto madure" — no se creó
ningún partner real, solo el sistema y un panel `/partner` de prueba.

**Ejecutado en la quinta pasada**: el campo "Documento de identidad" de `app/register/page.tsx`
**se eliminó por completo** (no solo se hizo opcional, como en la cuarta pasada) — el usuario
decidió que no lo requiere en absoluto en este flujo, ni por escritura manual ni por lo que
`handleScanCard` (OCR de la tarjeta de propiedad) llegara a leer. Se borró el estado
`regDocument`, el `<input>`, el autollenado desde el OCR, y el envío a `PUT /auth/me`. Los 4 campos
restantes (Nombre, Tipo, Año, Modelo) se reempacaron de una grilla de 3 filas (la última a ancho
completo) a 2 columnas × 2 filas sin huecos, manteniendo el mismo orden.

**Ejecutado en la cuarta pasada** (commits locales, sin pushear — ver #2): el registro de
vehículo ahora sugiere marca/modelo también para motos (antes solo autos), la placa cambia de
formato solo con el tipo (carro ABC-123 vs. moto ABC-12D — **el backend rechazaba el formato de
moto con 422, bug real encontrado y arreglado**), y las sugerencias de modelo/marca ya no son un
`<datalist>` nativo sin tema — hay un componente nuevo (`ThemedSuggestInput`) que sí respeta
claro/oscuro. Detalle completo en "Registro de vehículo: motos, placa y documento" más abajo.

**Ejecutado en la tercera pasada**: trial gratis de 7 días
ahora solo se otorga al primer vehículo de una cuenta taller/empresa (antes, cada vehículo nuevo
recibía uno propio sin límite); mensaje explicativo en el registro de taller aclarando que es una
cuenta exclusiva de negocio; documentos y facturas de antes del último traslado de un vehículo
ahora se ocultan detrás de un clic explícito ("Ver de todas formas") en vez de mostrarse directo,
porque pueden traer datos del dueño anterior; se encontraron y arreglaron dos gaps reales del
modelo ORM en el camino (ver "Hallazgos" más abajo). Detalle completo en el ítem de cada uno.

**Ejecutado en la segunda pasada** (commits locales, sin pushear — ver #2): limpieza
de `TRIAL_ACCOUNT_TYPES`, barrido completo de emojis en la UI (19 archivos + 1 más encontrado por
el usuario después), suite `pytest` a 0 fallos (arreglado `test_admin.py`, agregado
`test_workshop_clients.py`), ramas locales obsoletas borradas, "Historial de clientes" investigado
y cerrado. Lo que **no** se tocó y por qué también está explicado en el lugar correspondiente —
nada se marcó "hecho" sin decirlo explícitamente.

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
4. **✅ Bug crítico corregido (2026-08-12) — activación de llavero NFC ignoraba el vehículo
   seleccionado.** `POST /nfc/activate` (y `GET /nfc/limits/me`) resolvían "a qué vehículo" con
   `ORDER BY created_at DESC LIMIT 1` (el más reciente de la cuenta), sin recibir nunca un
   `vehicle_id` del cliente — cualquier cuenta con más de un vehículo corría el riesgo de que un
   llavero nuevo quedara pegado al vehículo equivocado, silenciosamente. Afectó a un usuario real en
   producción (`andresypm@gmail.com`): activó un llavero para su Bajaj Pulsar y quedó asociado a su
    AKT NKD 125 en cambio. **Dato de ese usuario ya corregido a mano** (verificado con consulta
    directa) y **causa raíz corregida en código**: `NfcActivateRequest` ahora exige `vehicle_id`,
    valida ownership con `verify_vehicle` (`dependencies.py`) en vez de adivinar; `GET /nfc/tokens`
    admite filtro `vehicle_id` y el panel "Mis llaveros" (`app/page.tsx`) queda scopeado al vehículo
    seleccionado en la barra lateral — un llavero por vista, se re-consulta al cambiar de vehículo.
    **✅ Seguimiento resuelto (2026-08-30)**: migración `048` puso `nfc_active=False` en vehículos
    que tenían el flag en True pero sin token activo (AKT, Chevrolet, etc.). El default del modelo
    también cambió a `False`. Frontend agrega guard `isNfcPublished` que verifica DB + tokens.
    **Sigue pendiente, fuera de alcance de este fix puntual**: un flujo real de "repuesto/duplicado"
   — hoy revocar + volver a activar ya es autoservicio sin ninguna marca ni aviso a nadie. Se agregó
   un mensaje ("¿necesitás un repuesto o duplicado? Contactanos" con link a WhatsApp de soporte,
   `SUPPORT_WHATSAPP`) cuando el vehículo ya tiene su llavero, pero no hay ningún label
   `duplicado`/`reposicion` en la base ni notificación automática a soporte — es una decisión de
   producto aparte (¿label nuevo en `nfc_tokens`? ¿requerir que soporte provisione el repuesto en
   vez de dejarlo 100% autoservicio?).
5. **✅ Reseñas: etiquetado por servicio/evento específico (2026-08-12).** Migración `045`
   (`reviews.context`, texto libre) — se reusa `AdminReviewOut.target_label` (antes solo lo tenía
   `workshop`, ahora también platform/product) en vez de agregar un campo nuevo. Los 4 disparadores
   de eventos (`app/page.tsx`, `OrderTrackingModal.tsx`) mandan su propio literal: "Aviso de
   llavero encontrado", "Milestone de uso", "Activación de llavero", "Proceso de compra". La
   calificación general desde `ResenasTab.tsx` no manda `context` (queda vacío, Admin la muestra
   sin sub-etiqueta). Como `context` vive en la misma fila con upsert por `(user_id, target_type)`,
   reenviar sin `context` (ej. editar después desde "Calificar") lo deja vacío — es el
   comportamiento esperado, no un bug: refleja el origen del envío más reciente, no un historial.
   Verificado con E2E desechable, 8/8 checks.

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
   no un rol basado en `account_type`. Sigue siendo así para el admin real — a propósito, no se
   tocó (seguir usando un único UUID para el dueño de la cuenta es lo correcto, no un gap). **Lo
   que sí se resolvió (2026-08-08)**: para el caso concreto que motivaba esto — dar acceso de
   aprovisionamiento a un tercero sin dárselo todo — se agregó un rol **partner** nuevo, separado,
   con cupo y sin visibilidad cruzada. Ver `docs/PLAN_PARTNER_MODEL.md`. No se creó ningún partner
   real todavía.
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
    **41/41 pasando, 0 fallos**.
12. **Frontend: cero tests más allá de `plate.test.ts`** — no implementado en esta sesión (fuera del
    alcance de "implementa todo" dado el tiempo disponible: componentes/hooks/E2E son un esfuerzo
    grande aparte). Ver checklist heredado de `TESTS_PLAN.md` en la sección de abajo.
12a. **29 errores de `mypy` pre-existentes, encontrados al abrir el primer PR real bajo el
    modelo de ramas nuevo (2026-09-09, PR #25 develop→master).** El `ruff check` del mismo PR
    también falló primero — 20 errores reales, ya arreglados en ese mismo commit (13
    auto-fixables + 7 `== True`/`== False` en filtros SQLAlchemy de `nfc.py`/`admin.py`,
    corregidos a mano y no con `--unsafe-fixes` porque uno de ellos, `NfcAlert.resolved ==
    False` → `not NfcAlert.resolved`, compila a `WHERE false` en vez de `WHERE NOT resolved`
    — confirmado compilando el SQL real antes de aplicar, no asumido; el fix correcto es
    `~NfcAlert.resolved`). mypy, en cambio, se dejó **temporalmente no bloqueante**
    (`continue-on-error: true` en `.github/workflows/ci.yml`) — arreglar 29 errores de tipos
    a las apuradas para destrabar un PR de un toggle de tema no es la forma correcta de
    pagar esta deuda. Pendiente real, con el detalle completo para la próxima pasada:
    - `app/database.py:25` — tipo de retorno de un generador async.
    - `app/services/ocr.py:63` — asignación de tipos incompatible (`Image` vs `ImageFile`).
    - `app/routers/workshops.py:106,306-308` — acceso a atributo de `Profile | None` sin
      chequear `None`; listas de modelos ORM pasadas donde se esperaba su `*Out` (Pydantic).
    - `app/routers/upload.py:29`, `app/routers/ocr.py:34,56`, `app/routers/expenses.py:39` —
      mismo patrón repetido: `str | None` pasado donde se espera `str` en `run_in_threadpool`.
    - **`app/routers/reviews.py:89,98,101,112,116,118,146,218` — el más sospechoso, amerita
      mirarlo con cuidado aparte**: mezcla los tipos `Review`/`WorkshopReview` en la misma
      variable (`WorkshopReview` sin los atributos `context`/`target_type`/`updated_at` que sí
      tiene `Review`) — podría ser solo un tipo de variable mal anotado, o el síntoma de una
      rama de código que trata dos tablas distintas como intercambiables. No investigado a
      fondo todavía.
    - `app/routers/found_requests.py:38,39,122,143,149` — `owner_name`/`owner_email`
      `str | None` vs `str`; y una variable local que pisa el tipo `Request` de FastAPI
      (línea 122) — revisar si es solo el nombre o hay una confusión real de tipos ahí.
    - `app/routers/admin.py:121,122,158,159,262,263` — mismo patrón `str | None` vs `str` en
      `user_email`/`user_name`/`claimed_by_email`/`claimed_by_name` de los `*Out` de NFC.
    **Acción**: revisar cada grupo con calma (no en bloque), arreglar, y solo entonces quitar
    `continue-on-error` de `ci.yml` para que mypy vuelva a ser bloqueante.
12b. **Causa raíz encontrada y corregida (misma sesión, mismo PR): `ci.yml` instalaba
    `ruff`/`mypy` sin fijar versión (`pip install ruff mypy` = siempre la última de PyPI en
    el momento del run) — por eso el ítem 12a se descubrió recién ahora, y por eso lo que se
    arregla localmente puede no predecir lo que pasa en CI.** Se reprodujo en vivo: el mismo
    PR pasó de fallar por 2 errores de lint (`app/config.py`/`app/main.py`) a fallar por
    **55** al simular la instalación exacta de CI (`ruff` `0.15.20` local → `0.16.6` en CI,
    resuelto el mismo día) — 24 `BLE001` (except genérico), 11 `I001` (imports), 10 `UP017`
    (`datetime.timezone.utc`), **4 `B008`** (esto es un falso positivo conocido en cualquier
    proyecto FastAPI real: marca `Depends(...)` como "llamada de función en argumento por
    defecto", que es el patrón obligatorio del framework — nunca debería estar habilitado
    acá), 3 `G201` (logging), 2 `DTZ*` (datetime sin timezone), 1 `UP011`. Ninguno era
    `E4`/`E7`/`E9`/`F` (el set que ya se había limpiado y verificado en el ítem anterior de
    esta misma pasada) — los 55 eran **categorías nuevas que ruff empezó a exigir por
    defecto solo por el número de versión**, no código que cambió. **Fix real (no un
    parche)**: `backend/pyproject.toml` ahora fija `[tool.ruff.lint] select = ["E4", "E7",
    "E9", "F"]` explícito — desacopla "qué reglas se exigen" de "qué versión instaló `pip`
    hoy" — y `ci.yml` fija `ruff==0.16.6 mypy==2.3.1` en vez de dejarlos flotantes. mypy
    con la versión nueva sigue dando los mismos 29 errores del ítem 12a (no cambió), así
    que ese pendiente queda igual. **Pendiente real que sigue abierto, a propósito**: las
    51 reglas nuevas de `ruff` que no son `B008` (`I001`/`UP017`/`UP011`/`BLE001`/`G201`/
    `DTZ*`) son mejoras legítimas de estilo/robustez, no ruido — vale la pena adoptarlas
    en una pasada dedicada (revisando cada categoría, no `--fix` en bloque), no como
    efecto secundario de un upgrade de versión.

## 🟢 Prioridad baja / opcional

13. **Fase D de la paridad visual** (`PLAN_PARIDAD_UI_TALLERPRO.md`) — alinear
    `/(public)/taller/[code]/page.tsx` con la distribución completa de `PublicWorkshopCard.tsx` de
    tallerpro (925 líneas, selector de tema + formulario de calificación). Marcada explícitamente
    como opcional/fuera del alcance inmediato — el QR + toggle de publicación de esa misma fase ya
    se adelantó y está hecho. No implementado en esta sesión.
14. **✅ Carrito "Comprar llavero NFC" cobra de verdad (2026-08-08)** — `CartModal.tsx` ya no es
    maqueta: crea una orden real (`shop_orders`, migración 038) y cobra con el widget embebido de
    Wompi (`app/services/wompi.py`, `app/routers/shop_orders.py`). El monto lo calcula siempre el
    backend; el estado final se confirma reconsultando a Wompi (nunca lo que reporte el
    navegador), con un webhook de respaldo para producción. Ver `docs/DEPLOY.md` (`WOMPI_*`).
    **✅ "Mis pedidos" real + notificaciones (2026-08-08)** — `OrderTrackingModal.tsx` ya no lee
    `localStorage`, usa `GET /shop/orders` (autenticado, siempre solo las órdenes propias de quien
    pregunta — modo cliente, de solo lectura: estado del pago + 3 pasos de envío, y "Comprar
    otro"). Solo se abre desde el botón "Mis pedidos" del topbar de `/app` — dejó de abrirse solo
    al cerrar el carrito. Gestión de envío (adjuntar guía, marcar etapas) vive aparte, exclusiva
    del panel **Admin NFC** (`/admin`, pestaña "Pedidos") vía `GET /shop/admin/orders` — cola
    completa de todo el mundo, con el botón "Marcar como enviado" ahí, no en "Mis pedidos" aunque
    quien mire sea la cuenta admin. Correo automático al cliente cuando se aprueba el pago + al
    admin para que sepa que hay que despachar; marcar como enviado dispara un segundo correo real
    (`app/services/email.py`, `PATCH /shop/orders/{reference}/fulfillment`, migración 039).
    **Requiere `SMTP_USER`/`SMTP_PASS` configurados para salir de verdad** — sin eso, cada envío
    queda logueado como "skipping" y no rompe nada, pero no llega ningún correo real; ver
    `backend/.env.example`.
    Pendiente nuevo que dejó esto: **"Mis pedidos" para compradores anónimos de la landing
    pública** — el checkout de `app/page.tsx` sigue sin requerir sesión (a propósito), pero una
    orden creada sin login (`user_id` null) no queda asociada a ninguna cuenta; si esa persona
    inicia sesión después, no hay forma de que `GET /shop/orders` la encuentre (no existe ninguna
    clave para unirlas). Si se quiere que un comprador anónimo pueda ver su pedido iniciando
    sesión después, hace falta diseñar cómo asociarlas (¿por email al hacer login? ¿un link mágico
    en el correo de confirmación?) — no es solo agregar el botón en la landing.
    **Mismo problema, un caso más (2026-08-11)**: el lead capture "Descargar Guía + Bono $5.000" de
    `/shop` (`waitlistApi.create(leadContact, 'shop_guia_mantenimiento')`) también es 100% anónimo
    — se evaluó enganchar ahí un aviso de calificar la plataforma (ver prompts de calificación por
    evento, `ResenasTab`/`RatingPrompt.tsx`) y se dejó fuera a propósito por la misma razón: no hay
    cuenta a la cual mostrarle nada en el momento. Si se resuelve la asociación por email de arriba,
    este caso se resuelve con el mismo mecanismo, no por separado.
    **Aviso del usuario (2026-08-08) — revisar `CITIES` (`lib/constants.ts`)**: hoy "Ciudad de la
    placa" (expedición RUNT) y "Ciudad de envío" (destino del paquete en `CartModal.tsx`) comparten
    la misma lista de ~32 departamentos con sus ciudades principales. Son conceptualmente listas
    distintas (los organismos de tránsito que expiden placas no son los mismos municipios donde
    puede vivir un comprador) — no verificado si esto ya causó un problema real, pero antes de
    confiar en `CITIES` para expedición de placas conviene chequear contra una lista oficial RUNT.
    "Ciudad de envío" ya tiene salida para pueblos fuera de la lista (commit `5105b81`); "Ciudad de
    la placa" sigue exigiendo selección exacta sin escape hatch.
15. **Rama `feat/taller-empresa-v2` — ✅ borrada (2026-08-07)**, junto con `feat/taller-empresa-panel`
    (ambas locales, nunca llegaron a `origin` — confirmado con `git ls-remote`). Estaban
    completamente contenidas en `master`, sin nada único que perder.
16. **Rotación de credenciales tras el incidente de 2026-07-27** — confirmar que no queden
    variables de entorno con la contraseña/clave de DB viejas en ningún ambiente (local, Railway,
    backups). Ver `docs/DEPLOY.md`. **No verificable por un agente** — requiere entrar a los
    dashboards de Railway/Vercel/Supabase con tu cuenta.
17. **Tres integraciones reales que el usuario confirmó (2026-08-08) que aún le faltan
    configurar** — reforzado acá aparte para no perderlo entre los demás ítems:
    - **Correo (SMTP)** — `SMTP_USER`/`SMTP_PASS` vacíos tanto en local como (asumido, no
      confirmado) en Railway. Sin esto, `app/services/email.py` loguea "skipping" en cada intento
      y no sale ningún correo real: ni el de pago confirmado/envío del checkout de Wompi (ver
      ítem 14), ni el de llavero encontrado, ni el de postulaciones. Ver plantilla en
      `backend/.env.example`.
    - **`DEEPSEEK_API_KEY` en Railway** — ya es el ítem 1 de esta lista (no duplicado, solo
      recordado): sin ella, el Diagnóstico IA del taller falla, y también degrada el escaneo OCR
      de la tarjeta de propiedad en el registro (`handleScanCard` → `POST /ocr/vehicle-card`,
      mismo servicio).
    - **"Funcionalidad real de escaneo"** — sin confirmar todavía a cuál de estos dos se refería
      exactamente (puede ser ambos): (a) el OCR de la tarjeta de propiedad de arriba — verifiqué
      que `backend/Dockerfile` sí instala `tesseract-ocr`/`tesseract-ocr-spa`, así que en
      producción (Railway, que usa ese Dockerfile) el binario debería estar; en **este entorno
      local** (`uvicorn` corriendo fuera de Docker) `tesseract` no está instalado — `which
      tesseract` no encuentra nada — así que el escaneo OCR falla acá con `OcrUnavailableError`
      aunque el código esté bien; o (b) el tap físico real de un llavero NFC contra un teléfono (la
      experiencia de escaneo NFC en sí, `/nfc/[token]/page.tsx`), que **no se puede probar sin un
      llavero físico provisionado** — un agente no tiene forma de verificar esto, requiere que el
      usuario lo pruebe con un chip real.
18. **Sistema de reseñas (plataforma/producto/taller) — fuera de alcance de la v1 (2026-08-11)**,
    servicio único `POST/GET /reviews` (+ `/admin/reviews`) ya en producción, verificado 26/26
    checks contra la Supabase real (E2E desechable) y con la sección "Calificar" en `/app`
    (`ResenasTab.tsx`) + tab "Reseñas" en Admin. Quedó fuera a propósito:
    - **Moderación/aprobación antes de publicar** — hoy una reseña queda visible apenas se envía
      (upsert directo, sin cola de revisión). Si se quiere un filtro antes de mostrarla en
      shop/landing o en la ficha pública del taller, hace falta agregar un estado
      (`pending`/`published`) y una acción de aprobar en Admin.
    - **Reseña de "producto" ligada a un pedido real** — se decidió que "producto" es singleton
      (calificás el llavero NFC/CarLink en general, sin `target_id`), no un `ShopOrder` puntual.
      La tabla `ShopOrder` ya existe si más adelante se quiere pedir la reseña específicamente
      después de la entrega de un pedido.
    - **Notificar al taller cuando recibe una reseña nueva** — no se integró con
      `NotificacionesModule.tsx`/el envío real de email; hoy el taller solo la ve si entra a
      Perfil → Reseñas.
    - **Rate-limit** más allá de `UNIQUE(user_id, target_type)` en `reviews` y el índice único
      parcial `(workshop_id, submitted_by_user_id)` en `workshop_reviews` (que ya evitan spam
      duplicado del mismo usuario, pero no limitan cuentas nuevas creadas en cadena).
    **Actualización (2026-08-11, misma sesión)**: el pedido de calificar ya no depende solo de
    entrar a "Calificar" — sale distribuido en 5 eventos reales (`RatingPrompt.tsx`,
    `useRatingPrompts.ts`): aviso de llavero encontrado leído, milestone de uso (30 días u
    onboarding), activación de llavero NFC, pedido entregado (modal) y alta de servicio con taller
    adjunto. Supresión por target (ya calificado o descartado), sin tabla ni notificaciones nuevas
    en el backend. El caso de la Guía+Bono quedó fuera, ver ítem 14.

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
async en vez de sync). **La suite completa queda en 41/41, 0 fallos (+3 con test_vehicles.py en la tercera pasada)** — todo commiteado localmente,
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

### 0. El trial de taller es la mayor grieta real del modelo "cerrado" — ✅ mitigado (2026-08-09)

A raíz de la consulta sobre partners/franquicia (ver `docs/PLAN_PARTNER_MODEL.md`), se revisó si el
modelo actual (solo se usan enlaces públicos con un llavero físico activado) tiene alguna forma de
uso sin control. La encontró: el trial gratuito de taller (punto 1 de abajo) ya genera una ficha
pública real y funcional — mismo `generate_nfc_token()` que un llavero pagado — sin ningún admin de
por medio, gratis, en el momento de registrar el primer vehículo. El único requisito era un
`legal_id` (NIT) que solo se validaba por **unicidad**, no contra ningún registro real — cualquier
cuenta taller nueva lo conseguía sin fricción ni límite de cuántas cuentas puede crear la misma
persona.

**Implementado (opción "b" de las tres que se habían anotado)**: `POST /workshops` ahora exige que
`legal_id` sea un NIT colombiano válido de verdad — formato con dígito de verificación (ej.
`900123456-7`, tal como ya sugería el placeholder del campo en el registro) y ese dígito verificado
con el algoritmo público de la DIAN (módulo 11, pesos `3,7,13,17,19,23,29,37,41,43,47,53,59,67,71`),
no solo "parece un NIT". Nuevo `app/services/colombian_nit.py` (verificado contra un ejemplo real
publicado, NIT `800197268-4`, no inventado) + `tests/test_colombian_nit.py` (6 casos). Rechaza con
400 y mensaje claro si no matchea.

**Qué sigue sin resolver, a propósito** — esto filtra el caso trivial ("escribir cualquier cosa
única") pero no a alguien decidido que calcule NITs válidos reales o use el de un tercero; las
opciones (a) trial por email/teléfono verificado y (c) verificación real de identidad siguen
anotadas como escalón siguiente si hace falta más adelante, no se implementaron — son fricción de
producto mayor, decisión pendiente del usuario si algún día se vuelve necesario.

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

## Modelo de cuentas taller/persona — decisiones confirmadas (2026-08-07)

Discusión completa con el usuario sobre cómo debe funcionar el acceso taller vs. persona. Decisiones
tomadas (no solo sugeridas — ya implementadas donde aplicaba código):

1. **Una cuenta de negocio (taller/empresa) es exclusiva para el negocio.** Si el dueño del taller
   también quiere una ficha personal para su propio carro, usa **otra cuenta** (otro correo) para
   eso — no se construye navegación puente entre `/app` y `/app/negocio` para la misma cuenta.
   Reflejado con un mensaje explicativo en el formulario de registro de taller (`app/register/page.tsx`)
   en el momento en que activan el checkbox de "vehículo de prueba".
2. **Un llavero NFC = un vehículo**, confirmado como ya es el modelo actual (`NfcToken.vehicle_id`
   es una FK fija) — no había nada que cambiar ahí.
3. **El trial gratis de taller/empresa es solo para el primer vehículo de la cuenta.** ✅
   Implementado (`backend/app/routers/vehicles.py::create_vehicle`) — antes, cada vehículo nuevo que
   creaba una cuenta taller recibía su propio trial de 7 días sin límite; ahora se cuenta cuántos
   vehículos ya tiene la cuenta antes de decidir si mintear el trial. Agregar un 2do+ vehículo (o
   "reemplazar" el vehículo por uno nuevo) requiere comprar y activar un llavero físico, igual que
   una cuenta persona. Cubierto por `tests/test_vehicles.py` (3 tests).
4. **Documentos/facturas de antes de un traslado de vehículo pueden traer datos del dueño
   anterior — no se ocultan del todo (a veces hacen falta para el traspaso legal), pero requieren
   un clic explícito para verlos.** ✅ Implementado: `DocumentOut`/`VehicleInvoiceOut` ahora traen
   `is_pre_transfer: bool` (`created_at` del documento/factura anterior a `vehicle.transferred_at`).
   `FileCard.tsx` (documentos: SOAT, RTM, tarjeta de propiedad, pólizas) y la sección "Facturas y
   certificados" de `DocumentosTab.tsx` muestran un estado bloqueado con el mensaje "Documento de
   antes del traslado — puede tener datos del dueño anterior" + botón "Ver de todas formas" en vez
   de mostrar el archivo/factura directo. El historial de mantenimiento y las partes (`parts`,
   `maintenance_records`) **no se tocaron** — a propósito, el usuario quiere que ese historial se
   valide y se vea siempre, es la diferencia explícita entre "historial técnico" (sin datos
   personales) y "documentos legales" (con datos personales) que él mismo trazó en la conversación.

### Hallazgos de arquitectura encontrados construyendo esto

- **El modelo ORM (`Vehicle` en `models.py`) le faltaban 4 columnas que la base de datos ya tenía**
  desde la migración `011_vehicle_transfers.sql` (`status`, `transferred_at`,
  `transferred_to_user_id`, `original_owner_id`) — nadie las había agregado al ORM cuando se creó esa
  migración, así que ningún endpoint de FastAPI podía leerlas (la función `complete_vehicle_transfer`
  las escribe por SQL directo vía RPC, por eso el traslado en sí nunca se rompió — pero cualquier
  otra parte del backend quedaba ciega a si un vehículo se había traspasado o no). Agregadas ahora
  porque el gate de documentos las necesita.
- **Al agregarlas, `Profile.vehicles` se rompió** (`AmbiguousForeignKeysError` — con 3 FKs de
  `vehicles` hacia `profiles.id`, SQLAlchemy ya no podía adivinar cuál usar para esa relación).
  Corregido con `foreign_keys=` explícito en ambos lados de la relación. Esto se habría roto en el
  primer arranque de la app en producción si no se hubiera detectado corriendo la suite de tests
  completa después del cambio — otro caso de "verificar contra el sistema real, no solo el diff".
- **UI de "agregar otro vehículo" — ✅ construida (2026-08-07, cuarta pasada).** No existía ninguna
  hasta ahora (`POST /vehicles` solo se llamaba una vez, desde el registro). Agregado:
  - `AddVehicleModal.tsx` (nuevo) — formulario compacto (placa, ciudad, marca, modelo, año, tipo,
    color), llama `POST /vehicles` directo. Al terminar, muestra si el vehículo recibió la ficha de
    prueba gratis (solo el primero de una cuenta taller/empresa) o si hace falta comprar un llavero
    — con un CTA a `/shop` en ese caso.
  - Selector de vehículo activo en `Sidebar.tsx` (`<select>`, solo aparece si la cuenta tiene más de
    uno) — dentro del bloque "Vehículo" del rail expandido. La selección persiste en `localStorage`
    (`carlink_active_vehicle_id`) entre recargas. El botón "Agregar vehículo" en sí se movió a
    `FichaTab.tsx` (ver siguiente ítem) y **ya no está siempre visible** — ver gating de abajo.
  - **Gating con llavero disponible — ✅ hecho (2026-08-08, sexta pasada).** El botón "Agregar
    vehículo" solo se habilita si `GET /vehicles/keychain-availability` devuelve `available > 0`
    (llaveros comprados vía `shop_orders` aprobados, menos los ya activados como `NfcToken
    token_type='personal'`); si no, queda atenuado y su clic abre el checkout (`CartModal`) en vez
    de `AddVehicleModal`. Mientras la disponibilidad carga (`null`), el botón queda bloqueado por
    defecto — nunca se habilita de más para luego corregirse. Verificado el endpoint contra la DB
    real (devolvió `3` para una cuenta con pedidos aprobados reales). Salió de una consulta más
    amplia sobre seguridad y un futuro modelo de socios — ver `docs/PLAN_PARTNER_MODEL.md`.
  - `app/app/page.tsx` ya no descarta el resto de los vehículos de la cuenta (`data[0]` a secas) —
    guarda la lista completa y expone el cambio de activo.
  - Solo aplica a cuentas `persona` en la práctica: `/app` ya redirige toda cuenta de negocio a
    `/app/negocio` antes de renderizar nada de esto (`isBusiness` check al inicio de la página) — lo
    cual además confirma que la separación taller/persona del punto 1 de arriba ya estaba forzada a
    nivel de código, no solo de convención.
  - **No verificado en navegador real** — mismo motivo de siempre (sin Chromium en este entorno).
    `tsc --noEmit` y `vitest run` limpios (sin nuevas fallas). Sí vale una pasada visual tuya,
    sobre todo el estado de "vehículo agregado, comprá un llavero" y el selector con 2+ vehículos.
  - **No incluido en esta pasada**: no hay forma de *editar* o *eliminar* un vehículo agregado desde
    esta UI (ya existe `PUT /vehicles/{id}`/`DELETE /vehicles/{id}` en el backend, pero nada nuevo se
    conectó a ellos) — la edición de datos del vehículo activo sigue siendo la única vía existente
    (modal de perfil dentro de `FichaTab`).
- **La misma necesidad de "ocultar contenido con datos de un dueño anterior" probablemente aplica a
  `Certificate`/`CertificadosTab.tsx`** (certificados con costo y fecha, mismo patrón que
  `documents.py`) — no se tocó en esta pasada, mismo mecanismo (`is_pre_transfer`) se podría
  replicar ahí si hace falta.

---

## Registro de vehículo: motos, placa y documento (2026-08-07, cuarta pasada)

Pedido del usuario tras usar el registro: el documento de identidad se pedía de entrada (invasivo),
no había sugerencias de marca/modelo para moto, la placa no cambiaba de formato con el tipo, y las
listas de sugerencias no respetaban el tema claro/oscuro.

- [x] **Documento de identidad — eliminado por completo del registro (quinta pasada, no solo
      opcional).** Primero se hizo opcional (cuarta pasada); el usuario decidió después que
      directamente no lo requiere en este flujo — se borró el campo, el estado, el autollenado
      desde `handleScanCard` (OCR de la tarjeta de propiedad) y el envío a `PUT /auth/me`. Los 4
      campos que quedan (Nombre, Tipo, Año, Modelo) se reempacaron en 2×2 sin huecos.
- [x] **Sugerencias de marca/modelo para moto** — antes `BRANDS`/`MODELS_BY_BRAND` solo tenían marcas
      y líneas de carro, así que elegir "Moto" como tipo dejaba ambos campos sin ninguna sugerencia
      (el propio código lo admitía en un comentario: "si aun así no hay nada (p. ej. Moto), devuelve
      vacío"). Agregado: `MOTO_BRANDS` (11 marcas — Yamaha, Honda, AKT, Bajaj, Suzuki, TVS, Kawasaki,
      KTM, Hero, Royal Enfield, Victory) y `MOTO_MODELS_BY_BRAND` (líneas reales por marca, mismo
      criterio de tipo+rango de años que ya usaban los autos). Marca y modelo ahora cambian solo con
      el tipo elegido (Auto → marcas de carro, Moto → marcas de moto), y si ya había una marca
      elegida que no aplica al nuevo tipo, se limpia sola (`useEffect` en `regType`/`wsType`) en vez
      de dejar una combinación imposible como "Chevrolet, Moto".
- [x] **Placa se ajusta al tipo — con un bug real de backend encontrado y arreglado en el camino.**
      `frontend/src/lib/plate.ts` ya sabía distinguir placa de carro (`ABC-123`) de placa de moto
      (`ABC-12D`, nomenclatura RUNT real), pero `app/register/page.tsx` nunca le pasaba el tipo
      seleccionado — siempre asumía carro, y el segundo campo de la placa solo aceptaba dígitos, así
      que era literalmente imposible escribir la letra final de una placa de moto. Corregido: el
      campo cambia de máscara/placeholder según el tipo, y `formatPlate(...)` recibe el tipo real.
      **Al probarlo de punta a punta se encontró que el backend igual la habría rechazado**:
      `VehicleCreate.validate_plate` en `backend/app/schemas/schemas.py` solo aceptaba el regex de
      carro, así que cualquier placa de moto real habría vuelto un `422` sin importar qué tan bien
      la armara el frontend. Corregido para aceptar ambos formatos — verificado con los 3 casos
      (moto válida, carro válido, placa inválida) más la suite completa (41/41 sigue en verde).
- [x] **`ThemedSuggestInput.tsx` (nuevo componente)** — reemplaza `<input list=".."/><datalist>` para
      el campo Modelo/línea (persona y taller) y el campo Marca de `AddVehicleModal.tsx`. El
      `<datalist>` nativo lo pinta el sistema operativo/navegador, no la app, así que en modo oscuro
      podía salir una lista de sugerencias con fondo claro — un combobox propio, chico y sin
      dependencias, sí usa los mismos tokens de color (`tk.inputBg`/`tk.inputBorder`/etc. en
      register, `var(--input-bg)`/etc. en `AddVehicleModal.tsx`) que el resto del formulario. La
      marca de `register/page.tsx` no necesitó este cambio — ya usaba tiles con estilo propio
      (`bg`/`border`/`fg` calculados a mano), nunca fue un `<datalist>`.
- [x] **`lib/vehicleBrands.ts` (nuevo)** — `CAR_BRANDS`/`MOTO_BRANDS`/`VEHICLE_TYPES`/`brandsForType`/
      `plateTypeFor` centralizados acá, usados tanto por `register/page.tsx` como por
      `AddVehicleModal.tsx` (la UI de "agregar vehículo" de la pasada anterior tenía exactamente el
      mismo problema — placa siempre carro, marcas solo de carro, `<datalist>` sin tema — corregido
      ahí también de una vez para no dejar la misma inconsistencia recién creada).
- **No verificado en navegador real** — mismo motivo de siempre (sin Chromium en este entorno).
  `tsc --noEmit`, `vitest run` (sin nuevas fallas) y la suite de backend (41/41) limpios. Vale una
  pasada visual tuya, en particular: el combobox de sugerencias abierto sobre el formulario, y
  registrar una moto de punta a punta contra el backend real.
- **No incluido en esta pasada**: los campos Tipo/Año/Ciudad siguen siendo `<select>` nativos (no
  `<datalist>`) — un `<select>` respeta razonablemente bien el tema en la mayoría de navegadores y
  es el patrón esperado para opciones fijas, así que no se tocaron; el pedido de "modales de
  sugerencia" se interpretó como las listas de autocompletado libre (marca/modelo), no los
  desplegables de opciones cerradas.

---

## Checklist de tests pendientes (fusionado desde `TESTS_PLAN.md`, borrado — vivía duplicado)

### Backend (pytest) — no existen todavía
- [ ] `test_auth.py` — validación JWT contra tokens de Supabase
- [ ] `test_nfc_activation.py` — flujo completo de provisión + activación (admin rechaza `tag_uid`
      duplicado, código usado/inválido da 404 genérico, reclamo concurrente solo gana uno, rate
      limit de `/nfc/activate` bloquea el 6to intento, respeta `nfc_token_limits` por `account_type`)
- [x] `test_vehicles.py` — CRUD de vehículos con auth: **hecho parcialmente (2026-08-07)**, 3 tests
      cubriendo la regla de trial gratis solo en el primer vehículo (ver arriba). Falta CRUD general
      (update/delete/lista), esos 3 no lo cubren.
- [ ] `test_found_requests.py` — endpoints públicos y autenticados
- [ ] `test_api_health.py`, `test_cors.py`, `test_rate_limit.py` — integración
- [ ] RLS policies, cascade deletes, trigger `on_auth_user_created` — tests contra DB real
- [ ] Cobertura de los 9 routers nuevos de taller/empresa (ver pendiente #10)

_Ya existen (no repetir):_ `test_maintenance.py`, `test_nfc.py`, `test_admin.py` (los 3 recién
arreglados, 0 fallos), `test_certificates.py`, `test_ocr.py`, `test_workshop_clients.py` (aislamiento
entre talleres), `test_vehicles.py` (gating del trial gratis — ambos nuevos, 2026-08-07).

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

---

## Fix: separación local/producción en URLs NFC (2026-08-30)

**Problema**: al hacer clic en "Ver ficha pública" desde el panel local, la app redirigía a
`https://carlink.com.co` (producción) en vez de mantenerse en `localhost:3000`. Raíz: la DB
compartida (Supabase Cloud) tiene tokens provisionados con `FRONTEND_URL=https://carlink.com.co`
grabado en `token_url_encrypted`. El backend local descifraba esa URL y la devolvía tal cual.

**Fix aplicado (Opción C — frontend-aware)**:

1. **`frontend/src/app/app/page.tsx`** — `openPublicar()` y `copyTokenUrl()` ahora reemplazan
   el dominio de la URL descifrada con `window.location.origin` antes de abrir/copiar:
   ```typescript
   const localUrl = data.url.replace(/^https?:\/\/[^/]+/, window.location.origin)
   ```
   Esto asegura que tokens provisionados en producción funcionen correctamente en local.

2. **`backend/.env`** — `FRONTEND_URL` cambiado de `https://carlink.com.co` a
   `http://localhost:3000` para que tokens nuevos provisionados desde local apunten a localhost.

3. **`frontend/.env`** — `NEXT_PUBLIC_SITE_URL` cambiado de `https://carlink.com.co` a
   `http://localhost:3000` para consistencia con `.env.local`.

**Deuda técnica pendiente (mejora futura)**: la lógica de reescritura de dominio debería vivir en
el backend, no en el frontend. Opciones:
- **Opción A**: que `get_token_url` detecte el entorno del request y reescriba el dominio antes
  de devolver la URL.
- **Opción B**: que `access_via_qr` recalcule la URL de redirect en tiempo de request en vez de
  depender de la URL encrypted en la DB.
Ambas requieren más testing y cambio en el contrato del endpoint. El fix actual es una solución
temporal segura que no rompe tokens existentes.
