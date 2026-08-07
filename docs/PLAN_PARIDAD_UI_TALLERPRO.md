# Plan de paridad visual: tallerpro/ → Panel de negocio CarLink (/app/negocio)

_Creado: 2026-08-05. Estado: **borrador para aprobación** — nada de este plan se ha ejecutado
todavía. Complementa `docs/PLAN_MIGRACION_TALLERPRO.md` (que cubrió datos/backend/routing); este
plan es exclusivamente de **distribución visual** — mismos componentes, misma cantidad, misma
disposición de cards que el original, con el sistema visual de CarLink (no Tailwind)._

## 0. Qué pide el usuario, en concreto

1. El menú lateral debe tener **la misma cantidad de opciones** que `tallerpro/` (no más, no menos).
2. Dentro de cada opción del menú, la distribución interna de cards/paneles debe ser **la misma**
   que en `tallerpro/` (misma proporción de columnas, mismos bloques stat-row / lista+detalle).
3. Un botón de **perfil arriba a la derecha** que abra la configuración del taller con esa misma
   distribución (tallerpro: `WorkshopProfileModal.tsx`).
4. **Dos botones al lado** del botón de perfil (tallerpro los tiene: Diagnóstico IA y Nueva Orden).

## 1. Brecha actual — menú lateral

| # | tallerpro (`Navigation.tsx`) | CarLink hoy (`Sidebar.tsx` → `NAV_ITEMS`) | Estado |
|---|---|---|---|
| 1 | Vista General (`overview`) | Resumen (`resumen`) | ✅ 1:1 |
| 2 | Reparaciones & Órdenes (`work-orders`) | Órdenes de trabajo (`ordenes`) | ✅ 1:1 |
| 3 | Inventario Repuestos (`inventory`) | Inventario (`inventario`) | ✅ 1:1 |
| 4 | Citas Programadas (`appointments`) | Citas (`citas`) | ✅ 1:1 |
| 5 | Notificaciones Clientes (`notifications`) | Notificaciones (`notificaciones`) | ✅ 1:1 |
| 6 | Rentabilidad Mensual (`profitability`) | Rentabilidad (`rentabilidad`) | ✅ 1:1 |
| 7 | Ficha Digital & QR Taller (`public-profile`) | — **no existe en el menú** | ❌ falta |
| 8 | Perfil & Datos del Taller (sección "Administración", separada de los 7 tabs) | Perfil del taller (`perfil`) — mezclado como un tab más | ⚠️ existe pero mal ubicado |
| — | (no existe como tab; vive dentro de `work-orders`) | Clientes & Vehículos (`clientes`) | ➕ CarLink agregó esto de más |
| — | (no existe como tab; botón del Header) | Diagnóstico IA (`ia`) | ➕ CarLink lo puso en el menú, tallerpro lo puso en el Header |
| — | (no existe como tab; modal contextual desde una orden) | Documentos (`documentos`) | ➕ CarLink lo puso en el menú, tallerpro lo abre desde dentro de una orden |

**tallerpro tiene 8 entradas de menú en total** (7 tabs + 1 entrada de "Administración" separada
por una línea divisoria). **CarLink hoy tiene 10**, con 3 que tallerpro no trata como ítems de
menú sino como botones contextuales/del Header, y le falta 1 (la ficha pública).

Nota importante encontrada al revisar: la "Ficha Digital & QR Taller" de tallerpro (`PublicWorkshopCard.tsx`,
925 líneas) **ya tiene equivalente real en CarLink** — `frontend/src/app/(public)/taller/[code]/page.tsx`
(176 líneas, alimentada por `GET /workshops/{code}`, construida en la Fase 2 de la migración
original). No hay que crearla de cero: el ítem de menú nuevo debe apuntar ahí, no duplicar el
componente.

## 2. Brecha actual — distribución interna de cada sección

Comparación de tamaño (proxy de cuánta estructura visual tiene cada uno — no es 1:1 exacto pero
marca dónde está el trabajo grande):

| Sección | tallerpro | CarLink hoy | Patrón de grid en tallerpro (Tailwind) | Patrón en CarLink hoy |
|---|---|---|---|---|
| Resumen | `DashboardOverview.tsx` — 426 líneas | inline en `page.tsx` — ~50 líneas | stat-row `grid-cols-4` + sección inferior `grid-cols-3` (contenido 2/3 + actividad 1/3) | stat-row `1fr` auto-fit + una sola card "Este mes" |
| Órdenes | `WorkOrdersManager.tsx` — 1274 líneas | `OrdenesModule.tsx` — 283 líneas | filtros + tabla, panel de detalle con grids `2x4`/`3` para línea de mano de obra/repuestos/totales | tabla de filas fijas, sin panel de detalle expandido igual de rico |
| Inventario | `InventoryManager.tsx` — 512 líneas | `InventarioModule.tsx` — 134 líneas | tarjetas `grid-cols-2` + filtros `grid-cols-3` | tabla de filas fijas |
| Citas | `AppointmentsManager.tsx` — 385 líneas | `CitasModule.tsx` — 136 líneas | formulario `grid-cols-2` + listado `grid-cols-3` | tabla de filas fijas |
| Notificaciones | `NotificationsCenter.tsx` — 350 líneas | `NotificacionesModule.tsx` — 113 líneas | selector de tipo `grid-cols-3` + layout `grid-cols-3` (form 2/3 + historial 1/3) | formulario + lista simple |
| Rentabilidad | `ProfitabilityReports.tsx` — 333 líneas | `RentabilidadModule.tsx` — 115 líneas | stat-row `grid-cols-4` + `grid-cols-3` (gráfico + desglose) | tabla de filas + un stat-row |
| Perfil del taller | `WorkshopProfileModal.tsx` — 1234 líneas, **con sub-tabs** (General / Mecánicos / Servicios) | `PerfilModule.tsx` — 276 líneas, **una sola página plana** | 3 sub-secciones con sus propios grids | todo junto, sin sub-navegación |
| Diagnóstico IA | `AiDiagnosticsModal.tsx` — 252 líneas (modal) | `DiagnosticoIAModule.tsx` — 125 líneas (tab de página completa) | grid de síntomas rápidos `2x4` | formulario simple |
| Documentos | `DocumentGeneratorModal.tsx` — 633 líneas (modal contextual desde una orden) | `DocumentosModule.tsx` — 115 líneas (tab de página completa) | selector de tipo + vista previa a 2 columnas | formulario + lista |

En resumen: los módulos de CarLink ya funcionan (datos reales, endpoints conectados) pero son
versiones **muy comprimidas** — filas de tabla en vez de las cards/paneles de tallerpro. Iguales en
funcionalidad, distintos en distribución visual — que es justo lo que pediste ajustar.

## 3. Botón de perfil + 2 botones compañeros

Confirmado en `tallerpro/src/components/Header.tsx` — de izquierda a derecha en el lado derecho:

1. Botón cuadrado **Diagnóstico IA** (ícono robot) → abre `AiDiagnosticsModal`.
2. Botón cuadrado **Nueva Orden** (ícono +) → va a la sección de órdenes / abre creación.
3. **Botón de perfil** (avatar con inicial + nombre del encargado + tipo de taller) → abre
   `WorkshopProfileModal`.
4. (Hay un 4to botón "Restablecer datos de ejemplo" — es un reset de `localStorage` para la demo
   mock de tallerpro. **No aplica a CarLink** porque ya usamos datos reales de la base; se
   descarta, salvo que confirmes lo contrario.)

**Corrección tras revisar `/app` (persona) — CarLink no usa un `<header>` de barra completa en
ninguna parte de la app.** El patrón real y consistente en todo CarLink es un **cluster
`topbar-actions`**: un grupo de botones flotante arriba-a-la-derecha, superpuesto al contenido
(`position: absolute`, no una barra que empuja el contenido hacia abajo), con botones circulares de
42px (`topBtn()`, `topBtnHover`, `topBtnLeave` en `frontend/src/app/app/page.tsx:150`) y un botón de
perfil final tipo píldora (avatar + nombre + chevron, `profileBtnBg`/`profileBtnBorder`/`profileBtnColor`).
`/app/negocio` reutiliza exactamente ese patrón — mismos helpers de estilo, no un header nuevo —
para quedar consistente con el resto de la app en vez de copiar la barra Tailwind de tallerpro.

## 4. Fases propuestas

### Decisiones ya confirmadas (2026-08-05)
- **Clientes & Vehículos se queda en el menú** — CarLink queda en 9 entradas en vez de las 8 de
  tallerpro; es la única diferencia deliberada.
- **Perfil del taller mantiene los dos accesos de tallerpro**: sigue en el menú lateral (como
  sección aparte, con línea divisoria, no mezclada con los 7 tabs principales) Y se agrega el botón
  de perfil en el `topbar-actions`. Dos caminos al mismo lugar, igual que el original.
- **No se construye un header nuevo** — se reutiliza el patrón `topbar-actions` que ya usa `/app`
  (ver §3), para quedar consistente con el resto de CarLink.

### Fase A — `topbar-actions` con botón de perfil + 2 acompañantes — **Complejidad: Baja — ✅ hecho (2026-08-05)**
- [x] En `/app/negocio/page.tsx`, agregar el mismo cluster `topbar-actions` de `/app` (mismos
      helpers `topBtn()`/`topBtnHover`/`topBtnLeave`, mismo `position: absolute` arriba-derecha).
- [x] Botón "Diagnóstico IA" → abre `DiagnosticoIAModule` en un `AdminModal` (sigue existiendo
      también como tab en el sidebar por ahora — se saca de ahí en la Fase B).
- [x] Botón "Nueva Orden" → cambia a la tab "Órdenes" y dispara la apertura del modal de nueva
      orden que ya vivía dentro de `OrdenesModule` (prop `autoNewSignal`, contador que solo abre en
      valores >0 para no disparar en el montaje inicial).
- [x] Botón de perfil (píldora: avatar con inicial del `manager_name`/nombre del taller + chevron)
      → abre `PerfilModule` en un `AdminModal` (sigue existiendo también como tab por ahora — ver
      Fase C.7 para la reestructuración interna con sub-tabs, y Fase B para sacarlo del sidebar
      principal y moverlo a su sección "Administración").
- Probado: `tsc --noEmit` limpio, backend (`:8000`) y frontend (`:3000`) locales corriendo.
  Pendiente que el usuario lo confirme visualmente en el navegador antes de seguir con la Fase B.

### Fase B — Reordenar el menú lateral a 9 entradas — **Complejidad: Baja-Media — ✅ hecho (2026-08-05)**
- [x] Sacar "Diagnóstico IA" y "Documentos" del `NAV_ITEMS` principal. IA queda solo en el botón del
      `topbar-actions`. Documentos ahora se abre **desde el detalle de una orden** (botón "Generar
      documento" en el footer del modal de `OrdenesModule`, igual que tallerpro:
      `WorkOrdersManager` → `DocumentGeneratorModal`) vía `onOpenDocumentGenerator`, con
      `DocumentosModule` aceptando `prefillOrderId` para abrir el formulario con esa orden ya
      seleccionada.
- [x] Agregar entrada "Ficha Digital & QR" que enlaza a `/taller/{workshop.code}` (adelantada en el
      mismo commit que el fix de modales — el usuario reportó no verla en el menú). `Sidebar.tsx`
      ahora soporta items con `href` (se renderizan como `<a target="_blank">` en vez de botón de
      tab), y el item solo aparece una vez que se conoce `workshop.code`.
- [x] Mover "Perfil del taller" a una sección separada del menú (línea divisoria + etiqueta
      "Administración", nuevo prop `navItemsSecondary` en `Sidebar.tsx`) — se mantiene en el menú Y
      en el `topbar-actions`, dos accesos como tallerpro.
- [x] "Clientes & Vehículos" se queda tal cual está (decisión confirmada).
- Menú final: Resumen, Clientes & Vehículos, Órdenes, Inventario, Citas, Notificaciones,
  Rentabilidad, Ficha Digital & QR (8, sección principal) + Perfil del taller (1, sección
  "Administración") = 9 entradas totales.
- Probado: `tsc --noEmit` limpio, frontend local compilando en caliente sin errores.

### Bug fuera de plan — modales anidados descentrados (encontrado y arreglado 2026-08-05)
`AdminModal.tsx` anima su panel con `transform` (Framer Motion, y/scale). Cuando un modal se abre
DESDE DENTRO de otro (ej. "+ Agregar mecánico" dentro del modal de Perfil que ahora se abre desde
el `topbar-actions`), el modal hijo quedaba anidado bajo ese `transform` — el navegador computa su
`position: fixed` relativo a ese ancestro en vez del viewport, así que aparecía descentrado/recortado
en vez de centrado en pantalla. Corregido con un React Portal (`createPortal` a `document.body`) en
`AdminModal.tsx` — el nodo real del modal ya no queda anidado bajo ningún ancestro con `transform`,
sin importar desde dónde se abra. Arregla el problema para todos los usos actuales y futuros de
`AdminModal`, no solo Perfil.

### Fase C — Paridad de distribución interna, módulo por módulo — **Complejidad: la parte grande — ✅ 9/9 hecho (2026-08-05)**
Mismo criterio en todos: mantener los hooks/llamadas a la API ya existentes (no se re-arquitectura
el data-fetching, solo el JSX/layout), traducir cada `grid-cols-N` de Tailwind a
`gridTemplateColumns` inline con los mismos quiebres responsive, mismo acento `#F5C518`/`var(--font-display)`.

1. [x] **Resumen** — Media — ✅ hecho (2026-08-05). Nuevo `ResumenModule.tsx` (antes vivía inline en
       `page.tsx`): banner con los 2 accesos rápidos (mismos botones que el topbar-actions),
       stat-row de 4 tarjetas clicables que navegan a su tab, y grid principal 2/3 (órdenes activas +
       banner de IA) + 1/3 (citas de hoy con botón "Crear OT" + alertas de stock). `WorkOrder`/
       `Appointment` solo traen IDs de cliente/vehículo/mecánico (a diferencia del mock de
       tallerpro) — se arman mapas por id con `useWorkshopClients`/`useWorkshopVehicles`/
       `useWorkshopMechanics` para resolver los nombres a mostrar. Click en una orden navega a
       "Órdenes" y abre su detalle directo (nuevo prop `openOrderId` en `OrdenesModule`).
2. [x] **Órdenes de trabajo** — **Alta**, el módulo más grande de tallerpro (1274 líneas) — lista y
       filtros ✅ hechos (2026-08-05), panel de detalle queda con la distribución ya existente
       (funcional pero más simple que el de tallerpro — ver nota abajo). Agregado: buscador por
       placa/cliente/#OT/modelo, filtro de categoría (antes solo había filtro de estado), y la lista
       pasó de 5 columnas compactas a una tabla real de 8 columnas con encabezado (Orden #,
       Vehículo/Placa, Cliente, Categoría, Mecánico, Estado, Total, Pago) — mismas columnas que la
       tabla de tallerpro. Mismos mapas por id que Resumen para resolver placa/cliente/mecánico.
       **Pendiente si se quiere ir más lejos**: el panel de detalle de tallerpro tiene una galería de
       evidencia fotográfica más grande y un widget de "historial por placa" en la parte inferior de
       la lista — no se replicaron (fuera del alcance de "distribución de cards", más
       funcionalidad nueva que layout).
3. [x] **Inventario** — Media — ✅ hecho (2026-08-05). Banner de alerta de stock bajo con costo
       estimado de reabastecimiento (igual que tallerpro), búsqueda + filtro de categoría + filtro
       de nivel de stock, y la lista pasó a tabla de 8 columnas con encabezado (SKU/Repuesto,
       Categoría, Ubicación, Stock, Costo, Venta, Margen %, Acciones) — el margen % es nuevo,
       calculado igual que tallerpro.
4. [x] **Citas** — Media — ✅ hecho. Pasó de lista de filas a **grid de cards** (no lista) — igual
       que tallerpro: cada card con hora/fecha + estado, placa/modelo/cliente/teléfono, categoría de
       servicio con notas, y toolbar de acciones (Avisar por WhatsApp real vía `wa.me`, Convertir a
       orden). Se agregaron los filtros rápidos por fecha (Todas/Hoy/Mañana) + búsqueda.
5. [x] **Notificaciones** — Media — ✅ hecho. Pasó de "botón que abre modal" a **compositor inline**
       (2/3 formulario + 1/3 historial en la misma pantalla, sin modal) — igual que tallerpro.
       Agregadas las 5 plantillas rápidas de tallerpro (Recordatorio Cita, Vehículo Listo, Inicio
       Mantención, Preventivo Pendiente, Presupuesto) y el envío por WhatsApp abre `wa.me` con el
       mensaje ya armado.
6. [x] **Rentabilidad** — Media — ✅ hecho, actualizado 2026-08-05 con gráficos reales. Se instaló
       `recharts@^3.10.1` (misma librería y versión que usa tallerpro) — antes se habían dejado
       barras horizontales caseras por no tener la dependencia; ahora hay **gráfico de barras**
       agrupado (Facturación/Costo/Ganancia por mes) y **gráfico circular** (ingresos por
       categoría) igual que `ProfitabilityReports.tsx`, más una tabla real de detalle histórico
       mensual (Periodo/Facturación/Mano de obra/Repuestos/Costo/Ganancia/Margen — sin "Gastos
       Fijos", CarLink no modela costos fijos de taller). Paleta categórica validada con la skill
       `dataviz` (`scripts/validate_palette.js`, 3 slots — todos los checks en PASS, un WARN de
       contraste en modo claro mitigado con leyenda de etiquetas directas + la tabla de abajo). La
       torta se limita a top-3 categorías + "Otros" en gris neutro (más de 3 series en una forma
       "all-pairs" como la torta no pasa los checks de la skill sin plegar a "Otros").
7. [x] **Perfil del taller** — **Alta** — ✅ hecho. Se introdujeron los sub-tabs (General /
       Mecánicos / Servicios / Reseñas) que tallerpro sí tiene y CarLink no — antes todo vivía en
       una sola página larga sin segmentar. Mismo contenido de antes, ahora navegable por tabs.
8. [x] **Diagnóstico IA** — Baja-Media — ✅ ya estaba bien. Revisado contra
       `AiDiagnosticsModal.tsx`: CarLink ya usa un layout de 2 columnas (formulario + resultado lado
       a lado) mientras que tallerpro apila todo en una sola columna dentro de un modal — la
       versión de CarLink no necesitaba cambios, ya iguala o mejora la distribución del original.
       Ahora además se abre como modal desde el `topbar-actions` (Fase A).
9. [x] **Documentos** — Media — ✅ hecho. El selector de tipo de documento pasó de `<select>` a un
       **grid de cards de 2 columnas** (con punto de color + descripción corta), igual que
       tallerpro. Ya se abre como modal contextual desde el detalle de una orden (Fase B).
       **No replicado** (fuera de alcance de "distribución"): la vista previa de documento
       estilo impreso que tiene tallerpro (`DocumentGeneratorModal`, 633 líneas) — es una
       funcionalidad nueva (renderizar un documento imprimible), no un cambio de layout.

### Fase D (opcional / fuera del alcance inmediato) — Ficha pública `/taller/[code]`
- [ ] Alinear `frontend/src/app/(public)/taller/[code]/page.tsx` con la distribución completa de
      `PublicWorkshopCard.tsx` de tallerpro (925 líneas — el componente más grande de todos, incluye
      selector de tema claro/oscuro/CDA y formulario de calificación con distribución de estrellas).
      Es un salto grande de tamaño; se deja como fase aparte para no bloquear el resto.
- [x] **QR de la ficha + toggle de publicación** — ✅ hecho (2026-08-05, adelantado a pedido del
      usuario, no se esperó a decidir el resto de la Fase D):
  - Migración `033_workshop_ficha_public_toggle.sql` — `workshops.is_published boolean default true`.
    Aplicada y verificada contra la base real (columna confirmada + probado el flujo completo:
    apagar el toggle por SQL → `GET /api/workshops/{code}` responde 404 con
    `detail: "Workshop profile is not published"` → revertido a `true` → vuelve a responder 200).
  - `GET /workshops/{code}` (router) devuelve ese 404 específico si `is_published` es falso — el
    frontend lo distingue de "taller no encontrado" con un mensaje propio.
  - `/taller/[code]/page.tsx` ya no usa el helper compartido `request()` (traga el `detail` de los
    errores) — hace su propio `fetch` para poder distinguir ambos casos de 404.
  - Nuevo componente `FichaQr` en esa misma página: QR real (misma librería `qr-code-styling` que ya
    usa `QrCodePanel.tsx` para los llaveros NFC, pero **flujo separado** — este QR solo codifica el
    link a la ficha pública, nada de tokens/activación NFC) + botón de descarga PNG.
  - `PerfilModule.tsx` (sección General) — toggle "Ficha pública" con aplicación inmediata (no
    espera al botón "Guardar cambios" del resto del formulario), badge PUBLICADA/OCULTA, y enlace
    directo "Ver ficha ↗" cuando está publicada.

### Ajustes de sidebar y nombre del taller (2026-08-05, pedido del usuario, fuera de las fases numeradas)
- [x] Botón "Mi negocio" retirado de `Sidebar.tsx` (era un link a `/app/negocio` — redundante estando
      ya parado ahí) — su borde/color dorado pasó a la sección "Administración" completa (antes solo
      tenía una línea divisoria + label gris).
- [x] Tab "Resumen" renombrado a "Mi taller" (mismo `id: 'resumen'` interno, solo cambia el label).
- [x] `PerfilModule.tsx` — nuevo campo editable "Nombre del taller" (primero del formulario General).
      `WorkshopUpdate.name` ya existía en el backend desde antes; no había ningún input en el
      frontend para editarlo — el nombre solo se fijaba una vez, al registrarse. Ahora alimenta el
      título de `/app/negocio`, el sidebar y la ficha pública/QR.

### Ícono de Diagnóstico IA + reorganización de "Administración" (2026-08-05, pedido del usuario)
- [x] Ícono del botón "Diagnóstico IA" del topbar-actions cambiado al `Bot` de lucide-react (el mismo
      que usa tallerpro en su `Header.tsx`) — CarLink no tiene lucide instalado, se replicó el path
      del ícono a mano.
- [x] "Perfil del taller" salió del sidebar de `/app/negocio` — quedó redundante con el botón de
      perfil del topbar (Fase A). En su lugar, la sección "Administración" ahora agrupa "Admin NFC"
      (antes aparecía suelto arriba del rail, sin agrupar, y **nunca se mostraba en `/app/negocio`**
      porque esa página no le pasaba `isAdmin` al `Sidebar` — bug preexistente corregido de paso).
      Confirmado con el usuario: "Admin NFC" solo es visible para la cuenta admin de la plataforma
      (`NEXT_PUBLIC_ADMIN_USER_ID`) — un taller normal ve la sección "Administración" vacía/oculta,
      decisión aceptada explícitamente. `/app` (persona) no se tocó: sigue mostrando "Admin NFC"
      suelto arriba, como siempre.
- [x] Confirmado con el usuario que "dejar ambos botones con el mismo estilo" se refería solo al
      look & feel del botón de perfil del topbar entre `/app` y `/app/negocio` (misma píldora,
      mismo lugar) — cada uno sigue abriendo su propio contenido (ficha del vehículo vs. perfil del
      taller); no se construyó un componente de perfil unificado entre persona y taller.

### Títulos por sección, impresión en Rentabilidad, Convertir a Orden y Emisión de Documentos (2026-08-06, pedido del usuario)

- [x] **Títulos dinámicos por pestaña.** El header estático ("Panel de negocio · Taller Central
      CarLink · Código público TLR-LD3AI · Medellín", igual sin importar la pestaña) se reemplazó
      por un mapa `SECTION_HEADER` en `negocio/page.tsx` con eyebrow/título/subtítulo por tab,
      tomados de los encabezados reales de cada pantalla de tallerpro (`DashboardOverview`,
      `WorkOrdersManager`, `InventoryManager`, `AppointmentsManager`, `NotificationsCenter`,
      `ProfitabilityReports`, `WorkshopProfileModal`) y traducidos, no inventados.
- [x] **"Imprimir informe" en Rentabilidad.** `RentabilidadModule` ahora recibe `workshop` como prop
      y agrega un botón `window.print()` (igual que tallerpro's `ProfitabilityReports`), con CSS de
      impresión nuevo en `globals.css` (`.print-area` / `.no-print` / `.print-only-header`) que oculta
      todo menos el contenido del informe al imprimir, con un encabezado impreso propio (nombre del
      taller + fecha).
- [x] **"Emisión de Documentos & Recibos" general en Órdenes.** Antes `DocumentosModule` solo se
      abría desde el botón "Generar documento" de una orden puntual (dentro del detalle). Se agregó
      el botón general de tallerpro (`WorkOrdersManager` → `onOpenDocumentGenerator()` sin argumento,
      al lado de "+ Nueva Orden de Trabajo") en `OrdenesModule.tsx`. `documentoPrefillOrderId` en
      `negocio/page.tsx` ahora acepta el sentinel `'general'` para distinguir "sin orden
      preseleccionada" de `null` (modal cerrado). `DocumentosModule` se abre siempre con el
      formulario de creación visible (`useState(true)` en vez de `useState(!!prefillOrderId)`) porque
      ya solo se monta a través de este flujo disparador — nunca como tab propio.
- [x] **"Convertir a Orden" con datos completos.** El botón de `CitasModule` seguía llamando
      `convertAppointment(id)` en silencio y luego solo cambiaba de pestaña — sin mostrar nada. Ahora,
      igual que tallerpro (`AppointmentsManager` → `App.handleConvertAppointment` → navega a
      Órdenes y abre el detalle de la orden recién creada), `onConverted` recibe el `id` de la orden
      creada y `negocio/page.tsx` lo pasa a `openOrderId` — reutilizando el mecanismo que ya existía
      para "click en una orden desde `ResumenModule`" — así que el detalle/edición de la orden se abre
      solo, de inmediato. El backend (`POST /appointments/{id}/convert`) ya resolvía/creaba
      cliente+vehículo reales a partir de los datos de la cita (decisión previa documentada en el
      propio endpoint: sin inventar mano de obra/tarifas como sí hacía tallerpro).
  - **Info que faltaba al abrir ese modal ("información importante"):** `WorkOrderFormModal` en
      `OrdenesModule.tsx` nunca mostraba los datos de cliente/vehículo al editar una orden ya
      existente (solo aparecían como selects al crear una nueva). Se agregó una ficha de solo lectura
      "Datos del vehículo / Datos del cliente" — igual que la tarjeta de tallerpro en el modal de
      detalle (`WorkOrdersManager`, sección "Client & Vehicle Card") — visible siempre que `order`
      existe.
  - **Fotos:** ya existía la sección "Evidencia fotográfica" en `WorkOrderFormModal` para órdenes
      existentes (sube a Supabase Storage vía `useUpload` + `workOrdersApi.addPhoto`), a diferencia
      de tallerpro que adjunta fotos en memoria antes de crear la orden — acá no es posible porque el
      backend requiere el id de la orden ya creada para asociar la foto. Como la conversión ya crea
      la orden real de inmediato (ver arriba), la sección de fotos queda disponible apenas se abre el
      modal de revisión — mismo resultado práctico, distinto orden de operaciones por restricción real
      del backend.
  - Verificado end-to-end contra la base real: cita de prueba creada → `POST .../convert` → orden
      `OT-1008` en estado `Pendiente` con `symptoms`/`category` tomados de la cita → cliente y
      vehículo reales creados con los mismos datos que resuelve la ficha nueva del modal → todo
      limpiado después (`DELETE` directo en `work_orders`, `appointments`, `workshop_vehicles`,
      `workshop_clients`).
- [x] **"Mejorar con IA" en Notificaciones + toggle de contraste en el topbar de negocio.**
      (Pedido aparte del usuario, 2026-08-06, mismo día — se documenta acá para no fragmentar el
      historial de esta fase.)
  - **"Mejorar con IA":** tallerpro (`NotificationsCenter.tsx`) tiene un botón junto al compositor
      que llama a `/api/gemini/notification` (Gemini) para redactar/pulir el mensaje. Se implementó
      el mismo botón en `NotificacionesModule.tsx`, pero por el DeepSeek propio de CarLink — nuevo
      endpoint `POST /workshops/me/ai-notification-message` (`workshop_ai.py` +
      `services/ai_diagnostics.py::generate_ai_notification_message`, mismo patrón que
      `/ai-diagnose` ya existente: la key nunca sale del backend). Si hay un borrador en el textarea
      (propio o de una plantilla), la IA lo pule; si está vacío, redacta desde cero con el tipo de
      aviso + cliente + placa como contexto. Nunca inventa datos que no se le pasan (números de
      orden, montos) — instrucción explícita en el system prompt.
      Verificado con una llamada real: borrador "su carro esta listo pase por el" → IA devolvió
      "Hola Andrés, te informamos que tu vehículo (placa ABC123) ya está listo. Puedes pasar a
      retirarlo cuando te sea conveniente. ¡Gracias por confiar en nosotros!".
  - **Toggle de contraste (claro/oscuro) en el topbar de negocio:** existía en `/app` (persona) desde
      siempre (`topbar-actions`, botón "Cambiar apariencia", ícono sol/luna) pero nunca se agregó al
      topbar de `/app/negocio` — quedó fuera cuando se armó ese cluster en la Fase A. Se agregó el
      mismo botón, mismo ícono, mismo comportamiento (`toggleTheme` de `useTheme()`), primero en el
      cluster.
- [x] **"Consulta de Historial por Placa" al pie de Órdenes.** Faltaba por completo — tallerpro
      (`WorkOrdersManager`) tiene esta herramienta como tarjeta oscura con acento ámbar al fondo de la
      sección, independiente del buscador/filtros de la tabla de arriba (busca sobre **todas** las
      órdenes del taller, sin importar el filtro de estado/categoría activo). Se agregó en
      `OrdenesModule.tsx` con el mismo comportamiento — input de placa/cliente, listado de tarjetas
      con # de orden, vehículo, síntomas, mecánico y total — usando el gradiente oscuro
      `linear-gradient(155deg,#1c1708,#141414)` que CarLink ya usa en `ResumenModule` para este tipo
      de tarjeta "siempre oscura con acento dorado" (mismo lenguaje visual que tallerpro's
      slate-900→800 + amber-400, pero con la paleta propia de CarLink). Cada tarjeta de resultado es
      clickeable y abre el detalle de esa orden (mejora sobre tallerpro, que las deja solo
      informativas — consistente con que el resto de filas de la tabla de Órdenes ya son clickeables).

## 5. No-negociables (heredados del plan original, siguen aplicando)

- Mismo sistema visual CarLink: nada de Tailwind, `style={{}}` inline + variables CSS
  (`var(--font-display)`, `var(--font-ui)`, acento `#F5C518`).
- No tocar el flujo NFC/QR de llaveros.
- No reintroducir datos mock/`localStorage` — todo sigue viniendo de los endpoints reales ya
  conectados; esta fase es solo de layout.
- Cada módulo debe quedar probado en local (como ya se hizo en la migración original) antes de
  darlo por cerrado.

## 6. Estimación de complejidad global

**Alta en volumen, no en dificultad técnica individual.** No hay nada arquitectónicamente difícil
—es traducir ~9 layouts de Tailwind a inline-style manteniendo proporciones y breakpoints—, pero
son 9 módulos + `topbar-actions` + Sidebar + (opcional) ficha pública, y el de Órdenes y el de Perfil
por sí solos son grandes (1274 y 1234 líneas de referencia respectivamente). Estimado en orden de
magnitud: `topbar-actions` + Sidebar es una sesión corta; cada módulo "Media" es un módulo por
sesión; Órdenes y Perfil probablemente necesiten más de una pasada cada uno.

## 7. Orden de ejecución sugerido

`topbar-actions` (Fase A) → Sidebar (Fase B) → Resumen → Órdenes (el más grande, mejor temprano para
detectar problemas de patrón) → Inventario/Citas/Notificaciones/Rentabilidad/Diagnóstico
IA/Documentos (en cualquier orden, son independientes entre sí) → Perfil (con sub-tabs) → Fase D
si se decide incluirla. Cada módulo se prueba en local antes de pasar al siguiente, igual que en la
migración original.
