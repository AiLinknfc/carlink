# Plan: factura automática al entregar y cobrar una orden

_Creado: 2026-08-05. Complementa `docs/PLAN_PARIDAD_UI_TALLERPRO.md` (que cubrió el panel de
negocio en sí); esto es un sistema nuevo que conecta el panel de negocio (taller) con el modo
persona (cliente). Se ejecuta por pasos con checkpoint, a pedido del usuario — ver §4._

## Decisiones confirmadas por el usuario (2026-08-05)
1. "Facturas" vive **dentro de la tab "Documentos"** existente en modo persona (no un tab nuevo).
2. El repuesto (`Part`) a actualizar se decide **por lo realmente usado en la orden**
   (`work_order_parts` → categoría del repuesto de inventario), no por la categoría general de la
   orden.
3. El disparo es **100% automático** (pagada + entregada, sin botón de por medio).
4. Se construye **por pasos, con checkpoint entre cada uno** — no todo de una.

## Paso 1 — ✅ hecho y verificado contra el sistema real (2026-08-05)
- [x] Backend: `_auto_invoice_if_delivered_and_paid()` en `work_orders.py`, llamado al final de
      `PUT /work-orders/{id}` y `PUT /work-orders/{id}/status`. Cuando la orden resultante queda
      `status == "Entregado" AND is_paid == true`, emite un `WorkshopIssuedDocument` tipo
      "Factura de compra" (reusa `_next_doc_number` de `workshop_documents.py`, ya no duplica esa
      lógica). **Idempotente**: no vuelve a crear otra factura si la orden se re-guarda.
  - Nota técnica: el intento de insert va en un `db.begin_nested()` (SAVEPOINT), no en
    `db.rollback()` liso como hace el endpoint manual — acá corre en medio de una transacción que ya
    tiene los cambios de la orden sin commitear, y un rollback completo se los habría llevado puestos
    si el número de documento chocaba.
  - **Verificado end-to-end contra la base y el backend reales** (no solo lectura de código): login
    real con la cuenta demo (`taller.demo@carlink.com.co`), creé una orden de prueba
    (`OT-1005`, cliente "Pedro Salazar", uno de los clientes demo — no una cuenta con datos
    personales reales), la marqué pagada + Entregado vía `PUT`, y confirmé que apareció
    `DOC-2026-003` tipo "Factura de compra" con los datos correctos (cliente, placa, modelo, monto,
    taller emisor) y `work_order_id` enlazado. Volví a guardar el estado (`PUT .../status`) y
    confirmé que **no** se duplicó. Limpié la orden y el documento de prueba por SQL directo al
    terminar (no hay endpoint DELETE para ninguno de los dos).
- [x] Frontend (taller): botón "Descargar PDF" en cada fila de `DocumentosModule.tsx` — genera un
      PDF real (no solo la imagen PNG que ya usaba `DiagnosticoTab.tsx` para el certificado CDA):
      misma técnica de `html2canvas` para rasterizar una plantilla HTML de factura, pero ahora
      empotrada en una página A4 con `jsPDF` (ya era dependencia del proyecto, usada en
      `PolicyModal.tsx`) y descargada como `.pdf` de verdad.
  - **No verificado visualmente** — html2canvas/jsPDF corren en el navegador, no hay uno disponible
    en este entorno para confirmar cómo se ve el PDF generado. `tsc --noEmit` limpio y el patrón es
    el mismo que ya funciona en producción para el certificado CDA, pero falta que lo pruebes vos.

## Paso 2 — ✅ hecho y verificado contra el sistema real (2026-08-05)
- [x] Backend: nuevo router `vehicle_invoices.py` (`GET /invoices/vehicle/{vehicle_id}`, mismo
      patrón que `documents.py`/`maintenance.py` — `verify_vehicle` primero, confirma dueño). Junta
      `WorkshopIssuedDocument → WorkOrder → WorkshopVehicle.linked_vehicle_id == vehicle_id → Workshop`
      y devuelve `VehicleInvoiceOut` con `workshop_is_cda` calculado de `workshop_type` (sin
      inventar una revisión CDA real — esa sigue siendo aparte, en `diagnostics.cda_checks`).
- [x] Frontend: nueva sub-sección **"Facturas y certificados"** al final de `DocumentosTab.tsx`
      (persona) — solo lectura (sin crear/editar/borrar), con botón "Descargar PDF" por factura.
      Plantilla de PDF **compartida** con el lado taller — se sacó a `lib/invoicePdf.ts` para no
      duplicarla entre `DocumentosModule.tsx` (taller) y `DocumentosTab.tsx` (persona).
- **Verificado end-to-end contra la base y el backend reales**, con la cuenta demo actuando de
  ambos lados (taller Y dueño de un vehículo real que ya tenía, placa `DEM123`):
  1. Vinculé temporalmente un `workshop_vehicle` demo a ese vehículo real (`linked_vehicle_id`).
  2. Creé una orden de prueba ya pagada, la marqué Entregado → la factura se emitió sola (Paso 1).
  3. Consulté `GET /invoices/vehicle/{DEM123}` **como el dueño real del vehículo** → la factura
     apareció con los datos correctos y `workshop_is_cda: false`.
  4. Marqué el taller como CDA (`workshop_type` con "CDA"), volví a consultar → `workshop_is_cda: true`
     — branching confirmado sin tocar ninguna cuenta ni dato real más allá del propio test.
  5. Revertí el `workshop_type`, borré la orden/documento de prueba y desvinculé el
     `workshop_vehicle` — sin rastro de la prueba al terminar.

## Paso 3 — ✅ hecho y verificado contra el sistema real (2026-08-05)
- [x] Migración `034_parts_workshop_attribution.sql` — `parts.workshop_id`, `parts.source_work_order_id`,
      `maintenance_records.source_work_order_id` (esta tabla ya tenía `workshop_id` desde antes).
      Aplicada y verificada contra la base real.
- [x] Backend: `_sync_client_records_if_linked()` en `work_orders.py`, llamada junto a la factura
      automática (mismos dos call sites). Si `workshop_vehicle.linked_vehicle_id` existe:
      - Crea un `MaintenanceRecord` (historial) con `workshop_id` + `source_work_order_id`.
      - Por cada `work_order_parts` con un repuesto de inventario real vinculado (`part_id`, no
        líneas de texto libre), crea un `Part` nuevo — no edita uno viejo, un repuesto reemplazado
        es una pieza física nueva — con categoría mapeada desde la categoría del repuesto de
        inventario del taller (`_INVENTORY_TO_PERSONA_PART_CATEGORY`, ej. "Neumáticos" → "Llantas").
      - Ambos idempotentes por `source_work_order_id` — no duplica si la orden se re-guarda.
- [x] **Vínculo manual taller ↔ cuenta CarLink real** — pieza que faltaba desde el Paso 2 (el
      usuario reportó no tener cómo probarlo). Nuevos endpoints
      `POST /workshops/me/vehicles/{id}/link` y `.../unlink` en `workshop_clients.py`: el link
      busca por **placa exacta** contra la tabla `vehicles` — el taller nunca fija un
      `linked_vehicle_id` a mano ni ve/elige entre vehículos de otras cuentas, solo confirma si la
      placa que ya cargó tiene o no cuenta CarLink. Botón "Vincular" (o badge "CarLink ✓" con opción
      de desvincular) en cada fila de vehículo de `ClientesModule.tsx`.
- [x] Frontend, solo lectura: `HistoryStack.tsx` (persona) ya no muestra el botón de editar cuando
      `record.workshop_id` está presente — badge "Del taller" en su lugar. `PartesTab.tsx` **no
      necesitó cambios**: ya gateaba toda edición de partes a `isBusinessAccount(accountType)`
      (cuentas persona nunca pudieron editar Partes, con o sin este cambio — hallazgo al revisar el
      código, no algo que hubiera que construir).
- **Verificado end-to-end contra la base y el backend reales**, con la cuenta demo (taller Y dueña
  del vehículo real `DEM123`):
  1. Probé el endpoint `/link` con la placa real del vehículo de prueba (`GHI789`, sin match) →
     404 correcto ("No hay ninguna cuenta CarLink registrada con esta placa").
  2. Cambié esa placa temporalmente a `DEM123`, llamé `/link` → vinculó correctamente.
  3. Creé una orden con un repuesto real de inventario ("Pastillas de freno delanteras", categoría
     Frenos), la marqué pagada + Entregado.
  4. Confirmé el historial (`GET /maintenance/vehicle/{DEM123}`) y la parte nueva
     (`GET /parts/vehicle/{DEM123}`) — ambos con los datos correctos, `workshop_id`, y
     `source_work_order_id` enlazado; la categoría mapeó bien (Frenos → Frenos).
  5. Re-guardé el estado de la orden → confirmé que **no se duplicó** ni el historial ni la parte.
  6. Limpié todo: desvinculé, revertí la placa, restauré el stock de inventario que la orden había
     descontado, y borré la orden/documento/parte/historial de prueba — sin rastro al terminar.

**Los 3 pasos del plan de facturación automática están completos.**

## Ajustes post-Paso 3 (2026-08-06, pedido del usuario)

- [x] **Bug real: "Nueva orden" se reabría sola.** `autoNewSignal`/`openOrderId` (señales del topbar
      y de Resumen hacia `OrdenesModule`, Fase A/C del plan de paridad) nunca se reseteaban en el
      padre tras consumirse — así que volver a la tab "Órdenes" por el sidebar (sin tocar el botón
      "+") reabría el modal de nueva orden o el detalle de la última orden vista, solo, con la señal
      vieja todavía en pie. Arreglado con callbacks `onAutoNewHandled`/`onOpenOrderHandled` que
      resetean la señal en el padre apenas `OrdenesModule` la consume.
- [x] **Generador de documentos con vista previa e impresión, igual que tallerpro** — antes CarLink
      generaba el PDF a ciegas (sin verlo hasta descargarlo). Ahora el modal "Emitir documento" tiene
      el mismo flujo de dos pasos que `DocumentGeneratorModal.tsx`: "1. Configurar datos" / "2. Vista
      previa e imprimir" (nuevo componente `InvoiceDocumentPreview.tsx`, la misma "hoja" que ya usaba
      la descarga de PDF pero ahora visible en vivo mientras se completa el formulario), botón
      WhatsApp (`wa.me` sin número fijo, como tallerpro), plantilla de "Detalle" autogenerada por
      tipo de documento (se regenera hasta que el taller edita el campo a mano), y "Emitir & Guardar"
      ya no cierra el modal solo — se queda en la vista previa para poder imprimir/compartir el
      documento recién emitido, como en tallerpro.
  - De paso, un bug preexistente encontrado al tocar este código: `applyOrder` guardaba el UUID de
    `workshop_vehicle_id` directo en el campo "Placa" en vez de la placa real — nunca se veía la
    placa correcta al vincular una orden. Corregido resolviendo el vehículo real vía
    `useWorkshopVehicles()`.
  - **No verificado visualmente** — igual que el PDF del Paso 1, esto corre en el navegador y no
    hay uno disponible en este entorno. `tsc --noEmit` limpio y reusa la misma plantilla ya probada
    por el usuario para la descarga; falta que lo veas vos.


## 0. Qué pide el usuario, en concreto

Cuando una orden de trabajo queda **pagada** (`is_paid=true`) y en estado **Entregado**:
1. Se genera automáticamente un documento tipo "Factura de compra" del taller/empresa.
2. El taller debe poder **descargarlo en PDF**.
3. Si el cliente de esa orden es una cuenta CarLink real (vehículo vinculado), el documento debe
   **llegarle a una sección de facturas** en su modo persona.
4. Los repuestos reemplazados y el historial de mantenimiento del cliente se actualizan
   **automáticamente**, según el tipo de servicio realizado — **sin que el cliente pueda editarlo**.
5. Excepción: si el taller es un **CDA**, el documento va a "Documentos del vehículo" (no a
   "Facturas") — ahí es donde ya viven SOAT/RTM/tarjeta de propiedad.

## 1. Qué ya existe (para no duplicar)

| Pieza | Dónde vive | Relevancia |
|---|---|---|
| Generación manual de documentos del taller | `DocumentosModule.tsx` / `workshop_documents.py` / tabla `workshop_issued_documents` | Ya emite "Factura de compra" — falta el disparo **automático** y el PDF |
| Vínculo cliente-taller ↔ cuenta CarLink real | `WorkshopVehicle.linked_vehicle_id` (nullable, migración 026) | Así se sabe si "el cliente está registrado en la app" |
| Historial de mantenimiento del cliente | tabla `maintenance_records`, tab `HistorialTab.tsx` (persona) | Hoy 100% creado a mano por el dueño — nunca por un taller externo |
| Repuestos del vehículo del cliente | tabla `parts`, tab `PartesTab.tsx` (persona), categorías fijas: `Frenos, Motor, Suspensión, Eléctrico, Filtros, Transmisión, Enfriamiento, Llantas, Otros` (`lib/part-categories.ts`) | Hoy 100% creado/editado a mano — nunca por un taller externo |
| Documentos legales del vehículo | tabla `documents`, tab `DocumentosTab.tsx` (persona): SOAT, RTM, tarjeta de propiedad, póliza | Encaja bien para el caso CDA (certificados oficiales) |
| **"Sección de facturas" en modo persona** | — | **No existe todavía.** Hay que crearla. |
| PDF real desde HTML | `html2canvas` + `jspdf` (ya son dependencias del proyecto — usadas para el certificado CDA en `DiagnosticoTab.tsx`) | Se reutiliza la misma técnica, no hay que instalar nada nuevo |
| Categorías de servicio de la orden (`WorkOrder.category`) | `Mantenimiento Preventivo, Sistema de Frenos, Motor y Transmisión, Suspensión y Dirección, Sistema Eléctrico y Diagnóstico, Climatización, Neumáticos y Alineación, Desabolladura y Pintura, Estética y Limpieza` (`SERVICE_CATEGORIES`) | No calzan 1:1 con las categorías de `Part` — ver decisión abierta #2 |

## 2. Diseño propuesto

### Backend
- **Disparador**: en `PATCH /work-orders/{id}/status` y en `PUT /work-orders/{id}` (donde se puede
  marcar `is_paid`), cuando el estado resultante sea `status == "Entregado" AND is_paid == true` (y
  no lo era antes — no repetir en cada guardado posterior):
  1. Crear el `WorkshopIssuedDocument` tipo "Factura de compra" automáticamente (mismos datos que ya
     arma `DocumentFormModal`, pero disparado por el backend, no por el taller a mano).
  2. Si `workshop_vehicle.linked_vehicle_id` existe:
     - Si el taller **no** es CDA: el documento queda visible en la nueva sección "Facturas" del
       cliente (lectura de `workshop_issued_documents` filtrado por `linked_vehicle_id` — sin tabla
       nueva, solo una consulta nueva).
     - Si el taller **es** CDA (`workshop.workshop_type` contiene "CDA"): en vez de eso, se crea un
       registro en `documents` (tabla persona) con `type='rtm'` o similar, visible en
       "Documentos del vehículo".
     - Se crea un `MaintenanceRecord` (historial) con `workshop_id` seteado (a diferencia de los que
       crea el dueño a mano, que no lo tienen) — eso es lo que lo marca como "de un taller", no como
       editable libremente.
     - Se actualiza/crea el `Part` correspondiente según la categoría del servicio (ver decisión
       abierta #2), reseteando su "instalado en" al kilometraje/fecha de la orden.
- **Solo lectura para el cliente**: en el frontend, cualquier `MaintenanceRecord`/`Part` con
  `workshop_id` seteado se muestra sin botones de editar/eliminar en `HistorialTab.tsx`/`PartesTab.tsx`.

### Frontend — taller
- Botón "Descargar PDF" en `DocumentosModule.tsx` (o en el detalle de la orden) — genera el PDF con
  `html2canvas`+`jspdf` a partir de una plantilla HTML de factura (nueva, simple: datos del taller,
  del cliente, ítems de mano de obra/repuestos, IVA, total).

### Frontend — persona (cliente)
- **Nueva sección "Facturas"** — decisión abierta #1 (dónde vive en el menú).
- `HistorialTab.tsx`/`PartesTab.tsx`: mostrar de dónde viene cada registro ("Registrado por
  {nombre del taller}") y ocultar edición cuando `workshop_id` está presente.

## 3. Decisiones que necesito que confirmes antes de empezar

1. **¿Dónde vive "Facturas" en el menú de modo persona?** Hoy el sidebar de persona tiene: Ficha
   técnica, Historial, Control de partes, Galería, Certificados, Documentos. ¿Agrego "Facturas" como
   tab nuevo (7mo ítem), o la meto dentro de la tab "Documentos" existente como una sub-sección?
2. **¿Cómo mapeo "tipo de servicio" → qué `Part` actualizar?** Dos caminos:
   - (a) Por `WorkOrder.category` (la categoría general de la orden) con una tabla de equivalencia
     fija (ej. "Sistema de Frenos" → `Frenos`, "Neumáticos y Alineación" → `Llantas`) — simple,
     pero varias categorías de orden no tienen equivalente claro en `Part` (Climatización,
     Desabolladura y Pintura, Estética y Limpieza).
   - (b) Por los **repuestos realmente usados** en la orden (`work_order_parts` → categoría del
     repuesto de inventario del taller, que ya usa casi las mismas categorías que `Part`) — más
     preciso, actualiza exactamente lo que se cambió, pero una orden puede no tener repuestos
     (solo mano de obra) y en ese caso no habría nada que actualizar en Partes.
3. **¿El disparo es 100% automático o necesita que el taller lo confirme?** Tal como lo describiste
   (en cuanto quede pagada + entregada) sería automático, sin botón de por medio — ¿confirmás eso, o
   preferís un botón explícito "Emitir factura y notificar al cliente" para que el taller decida el
   momento exacto?
4. **Alcance de esta primera pasada**: esto es bastante grande (backend + PDF + tab nueva en modo
   persona + no-edición). ¿Lo hacemos completo de una, o preferís que lo parta en pasos más chicos
   (ej. primero el PDF y la factura automática del lado taller, después la sección "Facturas" del
   cliente, después el auto-historial/partes)?
