# Plan de migración: TallerPro → CarLink (sección Taller/Empresa)

_Creado: 2026-08-04. Estado: **borrador para aprobación** — nada de este plan se ha ejecutado todavía._

## 0. Resumen del problema

`tallerpro/` es una app standalone (React + Vite + Express, generada en AI Studio) que simula un
SaaS de gestión de talleres: órdenes de trabajo, citas, inventario, notificaciones, rentabilidad,
diagnóstico IA, generador de documentos y ficha pública de taller. **Todos sus datos son mock en
`localStorage`**, su paleta es Tailwind slate/ámbar (no la de CarLink), y llama a Gemini con la
API key expuesta en un servidor Express aparte.

CarLink hoy modela "taller" como un **rol que ve la ficha de UN vehículo a la vez** (el que tiene
activo, típicamente porque escaneó su llavero NFC o es su vehículo de prueba). No existe el
concepto de "cartera de clientes propios del taller" — eso es exactamente lo que aporta TallerPro
y lo que hay que construir.

**Conclusión de arquitectura:** no se puede "pegar" TallerPro dentro de una tab existente. Hay que
construir un **panel de negocio nuevo, aditivo**, con su propio modelo de datos en Postgres, reusando
la lógica de negocio de TallerPro pero reescrita con el sistema visual de CarLink (mismos colores,
mismas variables CSS, misma librería de componentes/estilo inline). Las tabs actuales de taller
(Ficha, Taller, Diagnóstico, Partes, Config) **no se tocan** salvo lo puntual indicado en la Fase 5.

## 1. No-negociables

- [ ] No tocar nada del flujo NFC/QR/activación de llaveros (`nfc.py`, `nfc_provisioning.py`,
      `QrCodePanel.tsx`, tablas `nfc_*`) — es la parte más probada y reciente del sistema.
- [ ] No romper las tabs actuales de un `account_type='taller'` (Ficha, Taller, Diagnóstico,
      Partes, Config/Promoción) ni sus endpoints (`/workshops/me`, `/service-logs`, `/parts`, etc.).
- [ ] Cero datos quemados en producción: toda cifra, catálogo, nombre de mecánico, plantilla de
      texto, etc. debe salir de la base de datos o de configuración del taller, no del código.
- [ ] Reutilizar el sistema visual existente (`var(--font-display)`, `var(--font-ui)`,
      `var(--surface)`, `var(--border)`, acento `#F5C518`, radios 11–22px, animaciones
      `sectionIn`/`textIn`) — nada de Tailwind ni de la paleta slate/ámbar de TallerPro.
- [ ] Ninguna API key de IA expuesta en el cliente. Si hay IA, pasa por el backend FastAPI.
- [ ] Cada fase debe quedar deployable y sin romper lo anterior (migraciones aditivas, endpoints
      nuevos, nada de renombrar/borrar columnas existentes).

## 2. Decisiones de arquitectura (recomendación — ver §8 para lo que sí requiere tu decisión)

| Tema | Decisión recomendada | Por qué |
|---|---|---|
| Dónde vive el panel nuevo | Ruta nueva `frontend/src/app/app/negocio/**` (o similar), accesible solo si `isBusinessAccount(accountType)` | Aísla el estado nuevo (multi-cliente) del estado actual de `/app` (un solo vehículo activo) sin reescribir `app/page.tsx` |
| Cómo se llega ahí | Nuevo ítem en `Sidebar.tsx` para cuentas taller/empresa: "Mi negocio" o "Panel del taller", junto a los tabs actuales | No quita nada existente, solo agrega una entrada |
| Modelo de datos | Tablas nuevas, todas con `workshop_id` FK a `workshops.id`, independientes de `vehicles`/`parts`/`maintenance_records` | Los clientes de un taller casi nunca son usuarios de CarLink; forzar el modelo actual rompería la ficha por-dueño |
| Vínculo con vehículos CarLink | `workshop_vehicles.linked_vehicle_id` (nullable) — si la placa coincide con un vehículo CarLink real, se enlaza; si no, el taller lo gestiona igual | Da lo mejor de los dos mundos sin bloquear al taller si el cliente no usa CarLink |
| IA de diagnóstico | Backend FastAPI, reusando `DEEPSEEK_API_KEY` ya configurado (mismo patrón que `ocr.py`), no Gemini | Ya existe la integración, la key ya está en Railway, evita añadir un segundo proveedor de IA y sacar la key al cliente |
| Notificaciones (WhatsApp/SMS) | Fase 1: solo *log* real en DB + envío real de **email** (ya existe `services/email.py`); WhatsApp/SMS quedan como "simulado, registrado" hasta decidir proveedor (Twilio, etc.) | Mismo criterio ya usado en el proyecto para "Solicitar llavero NFC" — no fingir una integración que no existe |
| Rentabilidad | Calculada on-the-fly con SQL agregando `work_orders`, no una tabla de snapshots mensuales | Evita datos derivados que se desincronizan (el propio TallerPro ya lo hacía con un array estático mockeado) |
| Cuenta `empresa` vs `taller` | Se tratan como equivalentes vía `isBusinessAccount()` (igual que hoy) | Ya es el criterio usado en el resto del código; no introducir una tercera categoría a mitad de camino |

## 3. Fases

### Fase 0 — Preparación (sin código de producto)
- [x] Aprobar este plan / ajustar decisiones de §5 (ver decisiones 2026-08-04).
- [x] Confirmar convención de nombres de tablas nuevas (prefijo `workshop_*` para lo propio del
      taller, `work_order_*` para el desglose de órdenes).
- [x] Crear rama de trabajo `feat/taller-empresa-panel`, no directo a `master`.

### Fase 1 — Modelo de datos (migraciones SQL en `supabase/migrations/`, empezando en `023_`)
- [x] `023_workshop_profile_extend.sql` — ampliar `workshops`: `slogan`, `workshop_type`, `email`,
      `business_hours`, `specialties text[]`, `manager_name`, `manager_role`, `manager_avatar`,
      `tax_rate_percent numeric default 0`, `certification_code`, `social_instagram`,
      `social_facebook`, `social_website`, `social_whatsapp`.
- [x] `024_workshop_mechanics.sql` — tabla `workshop_mechanics` (id, workshop_id, name, role,
      specialty, phone, active, avatar_url).
- [x] `025_workshop_service_items.sql` — tabla `workshop_service_items` (catálogo de precios/servicios
      del taller: name, category, estimated_price, estimated_hours, description).
- [x] `026_workshop_clients_vehicles.sql` — tablas `workshop_clients` y `workshop_vehicles`
      (`workshop_vehicles.linked_vehicle_id` FK opcional a `vehicles.id`).
- [x] `027_work_orders.sql` — tablas `work_orders`, `work_order_labor_items`, `work_order_parts`,
      `work_order_photo_evidence`.
- [x] `028_workshop_inventory.sql` — tabla `workshop_inventory_parts` (stock propio del taller;
      **no confundir** con la tabla `parts` existente, que es por-vehículo del dueño). Agrega la FK
      de `work_order_parts.part_id` hacia esta tabla (declarada sin FK en 027 por orden de creación).
- [x] `029_appointments.sql` — tabla `appointments` (agenda del taller).
- [x] `030_workshop_notifications_documents.sql` — tablas `workshop_notifications_log` y
      `workshop_issued_documents`.
- [x] `031_workshop_reviews.sql` — tabla `workshop_reviews` (para la ficha pública del taller).
- [x] RLS: mismo patrón que el resto del repo (`nfc_alerts`, `nfc_token_whitelist`, etc.) — RLS
      habilitado + policy `"Service role manages X" USING (true) WITH CHECK (true)`; el control de
      acceso real (que un taller no vea datos de otro) se aplica en los routers FastAPI de la
      Fase 2 comparando `workshop.owner_id` contra el usuario autenticado, igual que ya hace
      `workshops.py` hoy.
- [x] **Aplicar migraciones 023–031 contra la DB real** — aplicadas 2026-08-04 vía script Python
      (`asyncpg`, no había `psql` disponible localmente) y verificadas con una consulta directa a
      `information_schema`: 13 tablas nuevas + columnas nuevas en `workshops` + FK
      `work_order_parts.part_id → workshop_inventory_parts.id` confirmadas presentes. Lista `\i`
      de `docs/DEPLOY.md` actualizada (también se puso al día con 020–022, que faltaban ahí).

### Fase 2 — Backend FastAPI — **COMPLETA** (2026-08-04), verificada end-to-end contra DB real
- [x] `app/schemas/schemas.py` — Pydantic schemas para cada entidad nueva (Create/Update/Out),
      más `WorkshopUpdate` (partial) y `WorkshopPublicOut` para la ficha pública enriquecida.
- [x] `app/models/models.py` — modelos SQLAlchemy correspondientes + relaciones a `Workshop`.
- [x] `app/dependencies.py` — helper `verify_workshop(user_id, db)`, mismo patrón que `verify_vehicle`.
- [x] Routers nuevos bajo `/workshops/...` (reusan `get_current_user` + `verify_workshop`):
  - [x] `workshop_mechanics.py`, `workshop_services.py` (catálogo de precios)
  - [x] `workshop_clients.py` (clientes + vehículos del taller, con búsqueda `?q=`)
  - [x] `work_orders.py` (CRUD + `/status` + descuento atómico de stock con `SELECT ... FOR UPDATE`
        al guardar partes usadas — transacción real, no el "merge en memoria" de TallerPro; editar
        una orden restaura el stock anterior antes de aplicar la lista nueva)
  - [x] `workshop_inventory.py` (CRUD de repuestos propios + `?low_stock_only=` + `/stock` rápido)
  - [x] `appointments.py` (CRUD + `/convert` — crea la orden **vacía** en vez de inventar mano de
        obra/tarifa fijas como hacía TallerPro; busca o crea cliente/vehículo por teléfono/placa)
  - [x] `workshop_notifications.py` (log + envío real por email vía `services/email.py`
        `send_generic_email` nuevo; WhatsApp/SMS quedan `status='simulado'` explícito)
  - [x] `workshop_documents.py` (numeración automática `DOC-{año}-{secuencia}`, con reintento ante
        colisión igual que el código de taller en `workshops.py`)
  - [x] `workshop_reviews.py` (alta manual + respuesta del taller + recalcula `workshops.rating`)
  - [x] `GET /workshops/{code}` (público) enriquecido con mecánicos activos, catálogo de servicios
        y reseñas — un solo response, `WorkshopPublicOut`.
  - [x] `PUT /workshops/me` — **bug preexistente encontrado y corregido**: aceptaba `WorkshopCreate`
        (exige `legal_id`/`name`), así que el guardado parcial de `WorkshopConfigTab.tsx`
        (solo `stamps_required`/`promotion_description`) fallaba con 422 que el frontend nunca
        mostraba (`apiPut` traga los no-2xx en `null`). Ahora acepta `WorkshopUpdate` (todo opcional).
- [x] `app/services/ai_diagnostics.py` — puerto de `tallerpro/server.ts` (`/api/gemini/diagnose`)
      usando DeepSeek (mismo proveedor que `services/ocr.py`, key ya en Railway) en vez de Gemini,
      mismo esquema JSON de salida. `POST /workshops/me/ai-diagnose` (`workshop_ai.py`), autenticado.
      _Rate limiting dedicado (como `nfc.py`) no se implementó — nice-to-have, el endpoint ya
      requiere sesión de taller autenticada, que acota bastante el riesgo de abuso vs. un endpoint
      público. Pendiente de decidir si vale la pena antes de producción._
- [ ] `app/services/ai_notifications.py` (opcional, generación de mensajes con IA para
      `NotificationsCenter.tsx`) — no implementado todavía, se hace junto al módulo 4.5 del frontend.
- [x] `GET /workshops/me/dashboard` — agrega en una sola llamada órdenes activas, citas de hoy,
      alertas de stock bajo, clientes totales, ingresos/ganancia/margen del mes (SQL agregado sobre
      `work_orders`, no snapshots).
- [ ] Tests backend con pytest (mock-DB, estilo `tests/conftest.py`) — **no hechos todavía**. En su
      lugar se corrió un E2E real (ver abajo) que cubre los mismos flujos críticos contra Postgres
      real; los pytest quedan pendientes para regresión en CI, no bloquean seguir con el frontend.

**Verificación E2E real (2026-08-04)** — script desechable con `httpx.AsyncClient` +
`ASGITransport`, `get_current_user` mockeado a un usuario real de Supabase Auth creado vía Admin
API (`@carlink.test`, borrado al final), **`get_db` real (Postgres de producción sin mockear)**:
registro de taller → `WorkshopUpdate` parcial → mecánico → catálogo de servicios → cliente →
vehículo (placa se normaliza a mayúsculas) → repuesto en inventario (stock=10) → orden de trabajo
con mano de obra + 2 unidades del repuesto → **IVA calculado con `tax_rate_percent`=19 real, no
hardcodeado** (17100 = 19% de 90000) → **stock descontado 10→8** → editar la orden a 1 unidad →
**stock restaurado y re-descontado 8→9** → cambio de estado a "Entregado" fija `completed_date` →
dashboard agregado correcto → cita → conversión a orden **sin inventar mano de obra/tarifas** →
notificación por WhatsApp registrada como `simulado` (sin proveedor) → documento con numeración
automática → reseña → ficha pública enriquecida (mecánicos/catálogo/reseñas/rating recalculado) →
**aislamiento entre talleres**: un segundo taller no ve clientes del primero. 34/34 checks OK.

**Regresión**: `pytest tests/` sigue en 24 passed / 9 failed exactamente igual que en `master` antes de
esta migración (confirmado corriendo el mismo comando contra el working tree revertido con
`git stash`) — los 9 fallos son preexistentes (`test_admin.py`, `test_nfc.py`), no los causa este
trabajo. `app.main` sigue exponiendo los 91 endpoints (82 previos + 9 nuevos routers) sin errores
de import/wiring.

**Bug real encontrado y corregido por el E2E** (no por revisión de código): `WorkshopVehicle.work_orders`
no tenía `cascade="all, delete-orphan"` — al borrar un vehículo del taller, SQLAlchemy intentaba
poner `work_orders.workshop_vehicle_id` en `NULL` en vez de borrar la orden (comportamiento default
de `relationship()` sin cascade explícito), y chocaba contra la columna `NOT NULL`. La primera
corrida del E2E lo confirmó con una `NotNullViolationError` real; se corrigió en `models.py` y se
re-corrió limpio. Se verificó además, con consultas directas a la DB, que no quedó ningún dato de
prueba huérfano tras la limpieza (incluyendo un residuo de la primera corrida fallida, detectado y
eliminado manualmente).

**Revisión manual posterior (2026-08-04)** — antes de pasar a Fase 3, encontré y corregí 2 gaps de
robustez adicionales (ninguno bloqueante, pero real):
1. `POST /workshops/me/appointments/{id}/convert` generaba `order_number` sin el reintento ante
   colisión que sí tenía `POST /workshops/me/work-orders` — dos conversiones casi simultáneas en el
   mismo taller podían chocar contra `UNIQUE(workshop_id, order_number)` y devolver 500. Extraído a
   `_insert_order_with_unique_number()` compartido entre ambos endpoints.
2. `_next_doc_number()` contaba **todos** los documentos históricos del taller sin filtrar por año,
   así que `DOC-{año}-NNN` no reiniciaba en 001 al cruzar de año — solo seguía la cuenta global con
   el año nuevo pegado encima. Corregido para contar solo documentos cuyo `doc_number` ya empieza
   con `DOC-{año actual}-`.

Ambos fixes re-verificados con el mismo E2E completo (34/34 OK, incluyendo `order_number = OT-1002`
en la cita convertida y `doc_number = DOC-2026-001`) y sin dejar datos de prueba en la DB real.

### Fase 3 — Frontend: fundación — **COMPLETA** (2026-08-04)
- [x] `frontend/src/lib/types.ts` — tipos nuevos (`Workshop` ampliado + `WorkshopMechanic`,
      `WorkshopServiceItem`, `WorkshopClient`, `WorkshopVehicle`, `WorkOrder` (+ labor/parts/photos),
      `WorkshopInventoryPart`, `Appointment`, `WorkshopNotification`, `WorkshopDocument`,
      `WorkshopReview`, `WorkshopDashboard`, `WorkshopPublic`, `AiDiagnoseResult` + sus Create/Update).
- [x] `frontend/src/lib/api.ts` — `workOrdersApi`, `workshopMechanicsApi`, `workshopServicesApi`,
      `workshopClientsApi`, `workshopVehiclesApi`, `workshopInventoryApi`, `appointmentsApi`,
      `workshopNotificationsApi`, `workshopDocumentsApi`, `workshopReviewsApi`, y `workshopApi`
      ampliado con `getDashboard`/`getPublic`/`aiDiagnose` — mismo patrón `request<T>()` existente.
- [x] `frontend/src/lib/hooks.ts` — `useMyWorkshop`, `useWorkshopDashboard`, `useWorkshopMechanics`,
      `useWorkshopServices`, `useWorkshopClients`, `useWorkshopVehicles`, `useWorkOrders`,
      `useWorkshopInventory`, `useAppointments`, `useWorkshopNotifications`, `useWorkshopDocuments`,
      `useWorkshopReviews` — mismo patrón load/reload que `useParts`/`useWorkshops`.
- [x] Ruta `frontend/src/app/app/negocio/page.tsx` — layout de navegación interna con los 10 módulos
      de la Fase 4 (Resumen, Clientes, Órdenes, Inventario, Citas, Notificaciones, Rentabilidad,
      Documentos, Diagnóstico IA, Perfil), reusando `Sidebar` (branding, colapso, banner de
      suscripción, logout) vía un `navItemsOverride` nuevo — sin Tailwind, con `style={{}}` +
      variables CSS de CarLink. Módulo **Resumen ya funcional de punta a punta** (dashboard real vía
      `useWorkshopDashboard`); el resto muestra un placeholder honesto "Próximamente" (nunca datos
      inventados) hasta que se construyan en la Fase 4.
- [x] Nuevo ítem "Mi negocio" en `Sidebar.tsx`, visible solo si `isBusinessAccount(accountType)`.
- [x] Refactor de `Sidebar.tsx`: el bloque inferior (avatar + nombre + logout) estaba acoplado a
      `vehicle?.owner`, así que una página sin vehículo activo (como `/app/negocio`) se quedaba sin
      botón de salir. Se desacopló con un prop `userName` nuevo, sin cambiar el comportamiento de
      `/app` (sigue pasando `vehicle`, `userName` es opcional).
- [x] `SubscriptionExpiredCard` extraído de `app/page.tsx` a `components/SubscriptionExpiredCard.tsx`
      (estaba duplicado inline) para reusarlo también en `/app/negocio`.
- [x] Verificado: `npx tsc --noEmit` limpio (0 errores) y `npx vitest run` sin nuevas fallas — el
      único test que falla (`plate.test.ts › parses unformatted plate`) ya fallaba antes, no
      relacionado con esta migración.
- [x] **Verificado en navegador real (2026-08-04)** — backend (uvicorn) + frontend (`next dev`)
      levantados en local, cuenta desechable de Supabase Auth creada y logueada a través del
      formulario real de login (no inyección de sesión), datos sembrados vía la API real. Chromium
      manejado con Playwright (sin `chromium-cli` disponible en este entorno; se usó el paquete
      cacheado por `npx` + el binario de Chromium ya descargado).
  - Confirmado sin regresión: las tabs Ficha/Taller/Diagnóstico/Control de partes/Promoción de
    `/app` siguen funcionando para una cuenta taller.
  - Confirmado en vivo el fix del bug de `WorkshopConfigTab.tsx` (Fase 2): guardar la promoción
    ahora sí persiste y muestra el banner de confirmación (antes 422 silencioso).
  - **Bug real encontrado y corregido**: `/app/negocio` rebotaba a cualquier cuenta taller/empresa
    de vuelta a `/app` por una condición de carrera — `profile` (de donde sale `account_type`)
    llega en un fetch aparte que termina después de que `authLoading` ya bajó a `false`, así que el
    guard leía `profile` todavía en `null` y redirigía. Corregido: solo redirige por falta de sesión;
    si el perfil no ha cargado o no es cuenta de negocio, se muestra un estado inline en vez de
    redirigir. Commit aparte (`b2865c1`).
  - Con el fix, flujo completo verificado: login → Sidebar muestra "Mi negocio" → `/app/negocio` →
    Resumen con números reales de la DB sembrada (1 orden activa, 1 cita hoy, 1 alerta de stock
    bajo, 1 cliente, $145.775 ingresos / $92.500 ganancia / 63.5% margen — matemática con IVA 19%
    verificada a mano) → los 9 módulos "Próximamente" renderizan sin errores de consola.
  - Datos de prueba (perfil, taller, cliente, vehículo, orden, cita, usuario de Supabase Auth)
    creados y **eliminados por completo** al terminar — verificado con consultas directas a la DB
    real, cero residuos.
  - **2 hallazgos preexistentes, no relacionados con esta migración, sin corregir (fuera de
    alcance)**: (1) varios 404 de recursos estáticos en la landing (`/`); (2)
    `GET /workshops/search?q=` responde 422 por un `Query("", min_length=1)` contradictorio en
    `workshops.py` — afecta el selector de taller de `FichaTab.tsx` en cada carga (fallo silencioso,
    `apiGet` lo traga). Reportado al usuario, pendiente de decisión sobre si corregirlo.

### Fase 4 — Frontend: módulos funcionales — **COMPLETA** (2026-08-04)
- [x] 4.1 Clientes & Vehículos del taller — `ClientesModule.tsx` (roster propio, búsqueda, maestro-detalle cliente→vehículos, alta rápida).
- [x] 4.2 Órdenes de trabajo — `OrdenesModule.tsx` (listado con filtro por estado, formulario con mano
      de obra + repuestos dinámicos, selección desde inventario, evidencia fotográfica, total
      estimado en vivo con el IVA real del taller).
- [x] 4.3 Inventario propio del taller — `InventarioModule.tsx` (stock, ajuste rápido +/-, alerta de mínimo, filtro "solo stock bajo").
- [x] 4.4 Citas — `CitasModule.tsx` (agenda, conversión 1-click a orden de trabajo contra la DB real).
- [x] 4.5 Notificaciones — `NotificacionesModule.tsx` (log real, envío real por email, WhatsApp/SMS marcados `simulado`).
- [x] 4.6 Rentabilidad — `RentabilidadModule.tsx` (agregado client-side sobre `work_orders` reales —
      no una tabla de snapshots; por mes y por categoría de servicio).
- [x] 4.7 Documentos emitidos — `DocumentosModule.tsx` (numerados automáticamente, opcionalmente ligados a una orden de trabajo).
- [x] 4.8 Diagnóstico IA — `DiagnosticoIAModule.tsx`, contra el endpoint DeepSeek del backend (nunca
      Gemini) — **probado con una respuesta real de la IA** en la verificación en navegador.
- [x] 4.9 Resumen/Dashboard — hecho en la Fase 3, agrega los contadores del endpoint de Fase 2.
- [x] 4.10 Perfil del taller — `PerfilModule.tsx` (datos del taller, mecánicos, catálogo de
      servicios, tarifa de IVA, redes sociales, **y reseñas** — registro manual + respuesta del
      taller, capacidad que ya existía en el backend `workshop_reviews.py` pero no tenía UI).
      `WorkshopConfigTab.tsx` (sellos de fidelidad) **no se tocó**, sigue siendo el acceso rápido
      existente dentro de `/app`.
- [x] 4.11 Ficha pública del taller — `frontend/src/app/(public)/taller/[code]/page.tsx`, contra el
      `GET /workshops/{code}` ya enriquecido en Fase 2 (mecánicos, catálogo, reseñas, redes sociales).

**Verificado en navegador real (2026-08-04)** — flujo completo con una cuenta desechable: crear
cliente → agregar su vehículo → crear repuesto de inventario → agregar mecánico + servicio al
catálogo + registrar una reseña (Perfil) → crear una orden de trabajo real con mano de obra y un
repuesto del inventario → crear una cita y convertirla 1-click en otra orden → enviar una
notificación → ver Rentabilidad agregada → emitir un documento → **generar un diagnóstico real con
la IA** (DeepSeek respondió con un diagnóstico completo y coherente) → Resumen con los números
finales → ficha pública en `/taller/{code}` mostrando todo lo cargado. Cero errores de red o de
consola atribuibles al código nuevo (los únicos 404 son de assets estáticos de la landing,
preexistentes).

**3 bugs reales encontrados y corregidos por la prueba en navegador** (ninguno visible con
`tsc`/`vitest` solos):
1. `RentabilidadModule.tsx` no esperaba a que cargaran los datos antes de calcular los totales —
   la primera renderización (antes de que `useWorkOrders()` resolviera) mostraba "$0" en todo.
   Corregido con un guard de `loading` explícito, igual que `ResumenModule`.
2. `GET /workshops/me/dashboard` contaba "citas de hoy" con `date.today()` (hora **local** del
   proceso de Python) contra `appointment_date` (guardado en UTC) — en este entorno el servidor
   corría casi un día detrás de la fecha real en UTC, así que las citas de hoy siempre daban 0
   cerca de la medianoche UTC. Corregido usando `func.current_date()` de Postgres (UTC,
   consistente con cómo se guarda todo lo demás) en vez de la fecha local de Python.
3. Cosmético: `workshop.tax_rate_percent` llega del backend como string Decimal (`"19.00"`) y se
   mostraba tal cual en vez de como `19` en el resumen de IVA de la orden y en el input de Perfil.
   Envuelto en `Number(...)` donde se muestra como texto (el cálculo ya usaba `Number()` y era
   correcto).

Todos los datos de prueba (perfiles, talleres, clientes, vehículos, órdenes, citas, inventario,
notificaciones, documentos, reseñas, usuarios de Supabase Auth) fueron creados y **eliminados por
completo** al terminar — verificado con consultas directas a la DB real, cero residuos.

### Fase 5 — Integración con lo existente (sin romper nada)
- [ ] `WorkshopConfigTab.tsx`: decidir si se deja como acceso rápido a "sellos" y se linkea al
      perfil completo nuevo, o se fusiona — sin perder la función de sellos que ya está en producción.
- [ ] `ServiceFormModal.tsx` (búsqueda de taller al registrar mantenimiento): si el taller
      encontrado tiene también panel de negocio, evaluar (no obligatorio en v1) que la orden de
      trabajo se pueda originar desde ahí.
- [ ] `docs/PENDIENTES.md`: agregar la fila `empresa` en `nfc_token_limits` ya estaba pendiente —
      revisar si el panel nuevo depende de que esa cuenta tenga límites reales antes de lanzar.
- [ ] Confirmar que el gate de suscripción/trial (`isSubscriptionValid`) también protege el panel
      nuevo igual que protege hoy `TallerTab`/`WorkshopConfigTab`.

### Fase 6 — Auditoría de datos quemados (hallazgos ya confirmados a limpiar)
- [ ] `DiagnosticoTab.tsx`: `DEFAULT_CHECKS` (Emisión de gases, Frenos... todo "PASA" fijo),
      `cdaCode` generado con `Math.random()`, `cdaExpiry = hoy + 365 días` fijo — mover a datos
      reales del taller/CDA que hizo la revisión (nueva tabla o reutilizar `diagnostics`).
  - _Nota: esto es preexistente en CarLink, no viene de TallerPro, pero cae dentro del pedido
    explícito del usuario de "no dejar datos quemados"._
- [ ] TallerPro `WorkOrdersManager.tsx`: IVA fijo `0.19` (dos lugares) → usar
      `workshop.tax_rate_percent`.
- [ ] TallerPro: mecánico por defecto `"Mec. Fernando Ugarte"` hardcodeado en 4 lugares
      (`WorkOrdersManager.tsx`, `DocumentGeneratorModal.tsx`, `initialData.ts`, `App.tsx`
      `handleConvertAppointment`) → tomar de `workshop_mechanics` real del taller (o dejar vacío si
      no hay ninguno cargado).
- [ ] TallerPro `initialData.ts` completo (clientes, vehículos, partes, órdenes, citas,
      notificaciones, profits, perfil de ejemplo "AutoMundo Diagnósticos") → **no migra a
      producción**; solo sirve como referencia de forma/shape de los datos, y opcionalmente como
      seed de un ambiente de demo/staging separado si se pide explícitamente.
- [ ] Catálogos que sí vale la pena migrar como datos de referencia reales (no instancias): los
      `enum`/listas de `ServiceCategory`, `WorkshopType`, `DocumentType`, `NotificationType` de
      `tallerpro/src/types.ts` — evaluar cuáles suman valor sobre lo que ya existe en
      `frontend/src/lib/part-categories.ts` / categorías actuales, y agregarlas sin duplicar.
- [ ] `AiDiagnosticsModal.tsx` / `NotificationsCenter.tsx`: quitar todo texto/branding "Gemini" y
      la llamada directa a `/api/gemini/*` — pasa a backend propio (Fase 2).

### Fase 7 — QA y verificación contra sistemas reales
_(siguiendo la práctica ya establecida en el proyecto: verificar contra la DB/API real, no solo
revisión de código)_
- [ ] Probar cada módulo contra la base real con una cuenta `taller`/`empresa` de prueba
      (`@carlink.test`, eliminada al terminar — mismo criterio que la sesión de QR/trial).
- [ ] Verificar RLS: una cuenta taller no puede ver/editar clientes, órdenes o inventario de otro
      taller.
- [ ] Verificar que crear una orden de trabajo con repuestos descuenta stock de forma atómica
      (probar condición de carrera simple: dos órdenes casi simultáneas sobre el mismo repuesto).
- [ ] Verificar responsive (el proyecto tiene breakpoints propios: ≤960, ≤860, ≤640, ≤380) en los
      módulos nuevos.
- [ ] Verificar que nada de lo existente (Ficha, Taller, Diagnóstico, Partes, Config, llavero NFC)
      cambió de comportamiento.

### Fase 8 — Despliegue
- [ ] Migraciones aplicadas manualmente contra Supabase real (procedimiento de `docs/DEPLOY.md`).
- [ ] Variables de entorno: confirmar que `DEEPSEEK_API_KEY` ya configurada en Railway cubre el
      nuevo uso (diagnóstico IA); no se necesita `GEMINI_API_KEY` en ningún lado.
- [ ] Actualizar `docs/PENDIENTES.md` y `docs/CONTEXTO.md` al cerrar cada fase.
- [ ] Marcar este archivo (`docs/PLAN_MIGRACION_TALLERPRO.md`) con las casillas cumplidas en cada
      PR/commit relevante.

## 4. Mapeo de features TallerPro → CarLink

| TallerPro | Pasa a CarLink como | Fase |
|---|---|---|
| `DashboardOverview.tsx` | `GET /workshops/me/dashboard` + nueva vista "Resumen" | 2, 4.9 |
| `WorkOrdersManager.tsx` | `work_orders` + módulo "Órdenes de trabajo" | 1, 2, 4.2 |
| `InventoryManager.tsx` | `workshop_inventory_parts` + módulo "Inventario" | 1, 2, 4.3 |
| `AppointmentsManager.tsx` | `appointments` + módulo "Citas" | 1, 2, 4.4 |
| `NotificationsCenter.tsx` | `workshop_notifications_log` + módulo "Notificaciones" | 1, 2, 4.5 |
| `ProfitabilityReports.tsx` | vistas SQL agregadas sobre `work_orders` + módulo "Rentabilidad" | 2, 4.6 |
| `DocumentGeneratorModal.tsx` | `workshop_issued_documents` + módulo "Documentos" | 1, 2, 4.7 |
| `AiDiagnosticsModal.tsx` | `POST /workshops/ai-diagnose` (DeepSeek) + módulo "Diagnóstico IA" | 2, 4.8 |
| `WorkshopProfileModal.tsx` | ampliación de `workshops` + `workshop_mechanics` + `workshop_service_items` + módulo "Perfil del taller" | 1, 2, 4.10 |
| `PublicWorkshopCard.tsx` | página pública `/(public)/taller/[code]` | 4.11 |
| `Header.tsx` / `Navigation.tsx` | reemplazados por el layout interno del panel "Mi negocio" (reskin, no copia) | 3 |
| `lib/storage.ts` (localStorage) | eliminado — todo pasa por API/DB | — |
| `data/initialData.ts` | no migra (ver Fase 6) | — |

## 5. Decisiones confirmadas (2026-08-04)

1. **Ruta del panel nuevo**: `frontend/src/app/app/negocio/**` (default razonable, sin objeción
   levantada — se puede renombrar en cualquier momento antes de exponerlo en el Sidebar).
2. **Alcance de notificaciones**: solo email real por ahora (servicio existente
   `services/email.py`). WhatsApp/SMS quedan registrados como `status='simulado'` en
   `workshop_notifications_log` hasta que se contrate un proveedor.
3. **Prioridad de módulos**: **todo en un solo release** — los 11 módulos de la Fase 4 se
   construyen antes de dar la migración por cerrada. Implica más fases antes de tener algo
   usable en producción; se ejecuta fase por fase igual, marcando casillas a medida que cada
   módulo queda listo y probado contra la DB real (Fase 7 no se salta por módulo).
4. **Datos de ejemplo**: sin decisión explícita — por defecto, producción arranca vacía (cero
   datos mock, alineado con el no-negociable de §1). Si más adelante se necesita un ambiente de
   demo para inversionistas, se trata como pedido aparte, no como parte de este release.
