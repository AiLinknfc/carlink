# Arquitectura: Modelo Integrado de Servicios, Kilometraje y Partes

## 1. Modelo de Datos (DB)

### Tabla `maintenance_records`
| Campo | Tipo | Descripción |
|---|---|---|
| `service_type` | text | Tipo de servicio registrado: Aceite, Frenos, Llantas, etc. |
| `mileage` | int | **Kilometraje actual** del vehículo al momento del registro |
| `next_service_mileage` | int? | Kilometraje estimado del **próximo servicio de este tipo** (`currentKm + lifespan_km`) |
| `lubricant_brand` | text | Marca del aceite (solo servicios Aceite) |
| `lubricant_type` | text | Tipo/viscosidad del aceite (solo servicios Aceite) |
| `lubricant_product` | text | Producto exacto del catálogo elegido en el wizard de Aceite (ej. "Mobil 1 ESP 5W-30"), o `''` si se escribió marca/viscosidad libre. Migración 052. Solo lo usa el propio formulario (vista previa) — historial, ficha y escaneo NFC siguen mostrando `lubricant_brand`/`lubricant_type` como siempre |

### Tabla `parts`
| Campo | Tipo | Descripción |
|---|---|---|
| `name` | text | Nombre de la parte (ej. "Aceite de motor", "Pastillas de freno") |
| `mileage_installed` | int? | Kilometraje cuando se instaló |
| `lifespan_mileage` | int? | Vida útil en km de la parte |

---

## 2. Flujo de Registro de Servicio

```
Usuario selecciona tipo → Ingresa datos específicos → Ingresa kilometraje
                                                         ↓
                                              Se auto-cálcula:
                                              next_service = currentKm + lifespan_km
                                                         ↓
                                              POST /api/maintenance
                                                         ↓
                                              Backend crea MaintenanceRecord
                                              Backend crea/actualiza Part(s) asociadas
                                              Backend invalida cache del vehículo
```

**Caso especial: Aceite (2026-09-12).** En vez del formulario plano de arriba, `ServiceFormModal.tsx`
muestra un wizard corto de 3 pasos solo para este tipo de servicio — el resto sigue con el formulario
plano de siempre:

1. **Producto** — Marca (autocomplete con logo contra `frontend/src/lib/oilCatalog.ts`, generado desde
   un catálogo real de 40 productos de motor / 12 marcas) → Producto/línea (autocomplete filtrado por
   la marca, opcional) → Tipo/viscosidad (se autocompleta solo al elegir un producto, o se escribe
   libre como antes). El filtro de aceite ya no es parte de este wizard: se registra en el
servicio "Filtros".

**Servicio Filtros (2026-10-05, rehecho).** Mismo wizard de 3 pasos. El paso 1 muestra **una card por filtro y la
elección es exclusiva** (un filtro por registro): cada filtro tiene su propio ciclo de vida útil y el próximo
servicio nunca se mezcla entre filtros. Las opciones dependen del tipo de vehículo, **detectado solo**
(`lib/filterCatalog.ts`: moto si la clase o la categoría de placa es moto; todo lo demás usa las opciones de carro),
de más a menos popular:

| Vehículo | Filtros (vida útil típica) |
|---|---|
| Carro | aceite (10.000 km), aire del motor (15.000), habitáculo / A/C (15.000), combustible (20.000), transmisión (60.000, "si aplica"), partículas / DPF (100.000, solo diésel o combustible sin definir) |
| Moto | aceite (5.000), aire (10.000), combustible (20.000, "motos de inyección") |

Al elegir el filtro se abren, **en el mismo paso 1** (sin pasos nuevos), la **marca** (sugerencias) y la
**referencia**, ambas opcionales: viajan en `replaced_parts` (`brand`, `part_number`) y quedan en la pieza, que
Control de partes ya mostraba como "marca · referencia". Un cambio sin esos datos no borra los que la pieza ya tenía.

Cada filtro renueva solo su pieza en Control de partes (`Filtro de aceite`, `Filtro de aire`, `Filtro de
habitáculo`, `Filtro de combustible`, `Filtro de transmisión`, `Filtro de partículas`) con la vida útil de su
tipo de vehículo, y el próximo servicio se predice con ese filtro. "Flujo de aire verificado" solo aparece con
el filtro de aire. El servicio "Combustible" quedó solo con la revisión de inyección.

Elegir un producto del catálogo autocompleta viscosidad y `lubricant_product` a la vez; si la marca no
está en el catálogo o el usuario prefiere texto libre, ambos campos se comportan como antes (no bloquea
nada). El cálculo de vida útil sigue dependiendo solo de `lubricant_type` (viscosidad) vía
`LUBRICANT_RULES` — el catálogo no cambia esa lógica, solo ayuda a completar los campos.

### Integridad del historial (2026-10-05)

`POST`/`PUT /api/maintenance` validan en el servidor (`app/services/maintenance_rules.py`, funciones puras
con sus pruebas); antes solo el navegador comprobaba el kilometraje:

- **Fecha:** sin fecha = hoy; no puede ser futura (tolerancia de 1 día por zona horaria) ni anterior a
  30 días. Al editar, dejar la fecha como estaba siempre vale.
- **Kilometraje:** no puede ser menor al de un servicio anterior ni mayor al de uno posterior (por fecha),
  ni saltar más de 100.000 km sobre el máximo registrado. Al editar solo se revalida si cambia km o fecha.
- **Costo:** entre 0 y 1.000.000.000.
- **`workshop_id`:** lo ignora el servidor en alta y edición de usuario; solo lo ponen las órdenes de
  trabajo del taller. Un registro con `workshop_id` o `source_work_order_id` no se edita ni se borra
  (403), y un registro no puede cambiar de vehículo (400).

### Odómetro (2026-10-05, migración 069)

Tabla `odometer_readings`, de solo agregar (`recorded_at` lo pone el servidor). El kilometraje actual
es el mayor valor visto. Fuentes (`source`):

- `initial` — km declarado al registrar el vehículo (obligatorio en el wizard y en "Agregar vehículo";
  `VehicleCreate.initial_mileage` es opcional en la API para no romper otros clientes). Se puede
  corregir durante 48 h mientras sea la única lectura (`POST /odometer/vehicle/{id}/initial`).
- `service` — la agrega el backend al crear un registro de mantenimiento (usuario u orden de trabajo).
  Si se edita el km del servicio, su lectura se actualiza con él; si se borra el servicio, la lectura queda.
- `periodic` — opcional, `POST /odometer/vehicle/{id}/periodic`; `GET /odometer/vehicle/{id}` devuelve
  `state`: `initial` (sin ninguna lectura), `periodic` (90 días sin lectura ni servicio) u `ok`.
  `OdometerPrompt` en Inicio lo muestra como aviso descartable, nunca bloqueante.

`check_mileage` compara servicios y lecturas: nada puede registrar menos km que una lectura anterior ni
más que una posterior, y ningún valor salta más de 100.000 km sobre el máximo.

### Historial anterior con soporte (2026-10-05, migración 070)

`maintenance_records.origin` (`user` | `workshop` | `prior`) y `support_url`. `POST /api/maintenance/prior`
(botón "Cargar historial anterior" en Historial, `PriorHistoryModal.tsx`) carga servicios hechos antes
del alta del vehículo en CarLink:

- Fecha obligatoria y estrictamente anterior al alta (`vehicles.created_at`); no más de 30 años atrás ni
  antes del año modelo. El kilometraje se compara con el resto del historial y las lecturas de odómetro
  (nunca mayor que la lectura inicial).
- **Soporte obligatorio:** archivo subido por el propio usuario a `/api/upload` (`check_support_url`).
- No genera lectura de odómetro, no sincroniza piezas, no fija próximo servicio y no cuenta para
  sellos. En el historial se ve como "Anterior declarado" con enlace "Ver soporte".
- No se edita; se puede eliminar durante las primeras 48 h. Los registros de orden de trabajo quedan
  `origin=workshop`.

### Datos de la tarjeta de propiedad (2026-10-05, migración 071)

Todos los campos de la licencia de tránsito son **obligatorios** para enviar el vehículo a revisión
(una tarjeta real los trae todos). Con columna propia: placa, ciudad, marca, línea, año, color, clase
(`body_type`), combustible, propietario. En `vehicles.card_data` (JSONB): número de licencia, documento del
propietario, VIN, motor, chasis, cilindraje, servicio, capacidad, puertas (no aplica a motos) y fecha de
matrícula. `app/services/vehicle_card.py` normaliza y valida (VIN de 17 caracteres sin I/O/Q en carros,
fecha de matrícula no futura ni anterior al año modelo, etc.).

- El OCR de la tarjeta (`/ocr/vehicle-card`) lee todos los campos; el registro y el perfil los prellenan
  sin pisar lo que el usuario ya corrigió.
- `GET /vehicles/{id}/card-check` devuelve los errores por campo; la sección "Detalles del vehículo"
  (`VehicleCardDetails.tsx`, dentro de la verificación del perfil) los muestra y permite completarlos.
- `POST /vehicles/{id}/verification` devuelve 422 con `detail.errors` si falta o está mal algún campo, así
  que el botón "Enviar a revisión" solo se habilita con la tarjeta completa (el servidor es quien manda).
- **El wizard ya no envía solo a revisión** (2026-10-05): lee y guarda todo lo capturado (columnas y
  `card_data`, incluida la clase tal cual la leyó el OCR en `vehicle_class`) y archiva las fotos en
  Documentos; la verificación completa de la tarjeta queda para una etapa posterior (al transferir o
  vender), desde "Detalles del vehículo" en el perfil. El combustible sí se lee y se pide en el wizard.

### Cifrado del documento y confirmación manual para vender (2026-10-05, migración 072)

- **Documento del propietario cifrado** (`card_data.owner_document`, AES-256-GCM, prefijo `enc1:`,
  `services/crypto.py`). A diferencia de las URLs de llavero, **falla cerrado**: sin `ENCRYPTION_KEY` el
  guardado responde 503, nunca se guarda en claro. Hacia el cliente sale enmascarado (`•••••456`); un
  valor enmascarado o ya cifrado que el cliente devuelve se ignora. Como local, staging y producción
  comparten la base, **todos deben usar la misma `ENCRYPTION_KEY`** o el documento no se podrá descifrar
  (se vería como faltante).
- **Confirmación manual:** `POST /vehicles/{id}/card-confirm` exige la tarjeta completa y todos los
  campos marcados uno a uno (`confirmed_fields`); guarda `card_confirmed_at` y una huella HMAC de los
  datos. Si se edita cualquier dato la huella no coincide y hay que confirmar de nuevo
  (`card-check.confirmed`).
- **Publicar en venta** (`PUT /vehicles/{id}` con `sell_enabled` de false a true) exige vehículo
  **verificado** y confirmación vigente: 403 / 409 en el servidor, no solo en la interfaz. No se
  desactiva automáticamente una venta ya publicada si luego cambian los datos (datos bloqueados mientras
  la tarjeta está en revisión o verificada).

### Aceite usado obligatorio y próximo servicio coherente (2026-10-05)

- Un cambio de aceite exige **marca y viscosidad** (`check_oil_used` en el servidor y `oilProblem` en el
  paso 1 del wizard): de ellas depende la vida útil predicha. El paso 1 usa `OilPicker.tsx`, pasarela
  visual de marcas (logo) y productos del catálogo `oilCatalog.ts`.
- `check_next_service`: el próximo servicio debe ser **mayor** al kilometraje actual (y no más de 150.000
  km adelante). Un registro con ambos iguales (error real de digitación) dejaba el intervalo en cero y
  rompía el testigo de aceite.

### Salud del vehículo, cuenta regresiva y partes vs fluidos (2026-10-05)

- **Salud** (`lib/vehicleHealth.ts`): el porcentaje es el promedio de los testigos **encendidos** (los
  "sin datos" no cuentan). El nivel nunca es mejor que el peor testigo en rojo: cualquier rojo fuerza al
  menos "Atención"; un rojo de **aceite, frenos, refrigeración o llantas** fuerza "Crítico" (un promedio
  diluye un riesgo grave). La etiqueta nombra el motivo ("Crítico · Aceite").
- **Aceite en el tablero:** testigo propio (gota) y entra en la salud.
- **Cuenta regresiva del cambio de aceite:** fecha estimada = la que llegue primero entre la de
  kilómetros (1.500 km/mes) y la de tiempo (fecha del último cambio + meses de la viscosidad,
  `lib/lubricantRules.ts`). Con 0 km restantes o plazo vencido: "cambio vencido" y contador en cero
  (antes caía a un "hoy + 90 días" inventado). Un registro con próximo servicio ≤ kilometraje es un dato
  inválido: la Ficha pide revisarlo y cuenta como vida 0, no como 100 %; la card del historial no muestra
  "0 km" de vida útil.
- **Partes vs fluidos** (`lib/fluids.ts`, por nombre, sin migración): son **fluidos** aceite de motor,
  refrigerante, líquido de frenos y aceite de transmisión; **partes** son las piezas físicas (frenos,
  llantas, batería, amortiguadores, filtros...). Control de partes tiene tres vistas: "Todo" (por defecto, con la
  categoría "Todas": partes y servicios juntos), "Partes" y "Servicios"; la **categoría manda** sobre la vista (`viewForCategory`): Motor, que solo tiene el
  aceite, abre Servicios; una categoría con piezas abre Partes. Los fluidos no cuentan como "partes reemplazadas".

### Aceite: lubricante de motor, caja o transmisión (2026-10-05, migración 073)

El servicio Aceite arranca con un **paso inicial: ¿para qué es el lubricante?** (wizard de 4 pasos: Lubricante,
Producto, Datos generales, Confirmar). `maintenance_records.lubricant_use` = `motor` (por defecto) | `caja` |
`transmision`; las motos solo ofrecen motor y caja. Cada caso pide sus datos y tiene su vida útil y su pieza
(`lib/lubricantUse.ts`):

| Caso | Datos | Vida útil | Pieza (fluido) |
|---|---|---|---|
| Motor | pasarela de marcas/productos + viscosidad (como antes) | por viscosidad | Aceite de motor |
| Caja de cambios | marca, viscosidad (75W-90, 80W-90...), norma API GL-4/GL-5 opcional | 50.000 km / 48 meses | Aceite de caja |
| Transmisión | marca, tipo de fluido (ATF Dexron VI, Mercon LV, ATF+4, Toyota WS, CVT, DCT/DSG, diferencial), producto opcional | 60.000 km / 48 meses (CVT 40.000 / 36) | Aceite de transmisión |

Marca y tipo/viscosidad siguen siendo obligatorios en todos los casos. **Solo el aceite de motor** alimenta el
testigo, la cuenta regresiva y los avisos de aceite (Ficha, notificaciones, ficha pública); caja y transmisión
aparecen en Control de servicios como fluidos propios.

**Regla de no mezcla (acordada):** un aceite de caja o de transmisión solo (1) aporta su **kilometraje** al odómetro y
(2) aparece en **Control de servicios**. No toca nada más: ni el testigo, la cuenta regresiva y el próximo cambio de
aceite, ni los avisos, ni la marca/viscosidad de la ficha técnica y de la ficha pública (esa lee el último aceite de
motor, no el último servicio de cualquier tipo).

### Batería: tipos y wizard de 4 pasos (2026-10-05)

**Id sin tilde (corregido):** Inicio manda `Bateria`, `Suspension`, `Transmision`; el formulario y la base usan
`Batería`, `Suspensión`, `Transmisión`. Sin normalizar, el formulario abierto desde Inicio no reconocía el tipo
(sin campos ni wizard). `lib/serviceIds.ts` (`canonicalServiceId`, `sameService`) lleva ambas grafías al id
canónico en el formulario y en las comparaciones de Inicio.

El servicio Batería ahora es un wizard de **4 pasos**: 1 Tipo, 2 Medición, 3 Datos generales, 4 Confirmar
(Aceite y Filtros siguen con 3; los pasos se manejan por rol, `stepRolesFor` en `ServiceFormModal.tsx`).

- **Tipo** (`lib/batteryCatalog.ts`), según el vehículo detectado solo (`vehicleKindOf`: moto, pesado o carro):
  carro/camioneta → MF 12 V (36 meses), convencional 12 V (24), AGM/EFB Start-Stop (48), híbrido/eléctrico
  auxiliar o de tracción (48); moto → MF/AGM (36), convencional (24), litio alto desempeño (60); camión/bus →
  MF 12 V / 24 V (36). Todos con "Otra / no sé" (24).
- **Medición:** "Cambié la batería" o "Solo la revisé" (una revisión **no** renueva la pieza y vuelve a
  proponerse en 6 meses), voltaje en reposo opcional con lectura (≥ 12,6 V carga completa, < 12,0 V
  descargada; > 18 V se interpreta como 24 V) y "Batería verificada".
- La batería envejece por tiempo: los meses del tipo elegido definen el próximo servicio y se guardan en las
  notas de la pieza (`Vida útil: N meses · Tipo: ...`), de donde la Ficha toma el desgaste por tiempo del
  testigo (antes fijo en 24 meses). Al renovar la pieza, sus notas se actualizan.

### Qué no cuenta en las métricas (2026-10-05)

`services/analytics_scope.py`: el admin (`ADMIN_USER_ID`) y las cuentas con correo `@carlink.internal` (las
de prueba de `qa_test_account.py`) quedan fuera de `/analytics/summary`, de los clics de WhatsApp y de los
pedidos pagados del embudo. Sus eventos se siguen guardando (sirven para reconocer su navegador): las
consultas excluyen también las visitas **anónimas** de cualquier `anon_id` desde el que iniciaron sesión.
Límite: una visita del admin desde un navegador donde nunca inició sesión no se puede reconocer.

Pendiente de las fases siguientes del plan: sello de origen (`origin`), auditoría de ediciones y la
ventana de edición de 48 horas.

### Cálculo automático del próximo servicio

**Fórmula:** `next_service_mileage = currentKm + lifespan_km`

El `lifespan_km` se obtiene de:
1. **Seleccionado por el usuario** en el formulario (campo "Vida útil (km)")
2. **Predefinido por SERVICE_TYPES** como fallback:
   - Aceite: 5,000 km
   - Aire: 10,000 km
   - Combustible: 20,000 km
   - Frenos: 20,000 km
   - Refrigerante: 30,000 km
   - Llantas: 40,000 km
   - Suspensión: 25,000 km
   - Batería: 36,000 km
   - Transmisión: 40,000 km

**Lógica en `ServiceFormModal`:**
```typescript
// Auto-calc when user selects a part lifespan or uses default
const autoNext = mileage + (lifespan_km || DEFAULT_LIFESPAN[serviceType])
setField('next_service_mileage', autoNext)
```

---

## 3. Ficha Técnica: Activación por Tipo de Servicio

### Regla: Solo el servicio registrado ese día se activa en la ficha

Cada tipo de servicio tiene un **chip** en la ficha. La activación depende de:

| Condición | Chip | Indicador |
|---|---|---|
| Hay registro de este tipo Y el `next_service_mileage > currentKm` | ✅ Activo (amarillo) | "Activo · vence en X km" |
| Hay registro pero `next_service_mileage <= currentKm` | 🔴 Vencido | "Vencido · por servicio" |
| No hay registro O nunca se registró | ⚪ Inactivo | "Sin registro" |

### Header de la ficha
- **Si el último servicio es tipo "Aceite"**: muestra `{lubricant_brand} {lubricant_type}` (ej. "MotUL 3000 10W-40")
- **Si no es aceite**: muestra nombre del tipo de servicio

### Próximo servicio en la ficha
- **Solo se muestra el tipo relevante** del último servicio registrado
- Si el último servicio fue "Aceite", se muestra "Próximo servicio: aceite"
- Si fue "Frenos", se muestra "Próximo servicio: frenos"
- Otros tipos NO muestran su próximo servicio en la ficha (solo actualizan `currentKm`)

---

## 4. Integración Partes ↔ Servicios

### Flujo bidireccional

```
┌─────────────────────────────────────────────────┐
│  SERVICIO REGISTRADO                            │
│  service_type: "Aceite"                         │
│  mileage: 60000                                 │
│  lifespan_km: 4500                              │
│  next_service_mileage: 64500                    │
└───────────┬─────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────┐
│  PARTES CREADAS/ACTUALIZADAS                    │
│  name: "Aceite de motor"                        │
│  mileage_installed: 60000                       │
│  lifespan_mileage: 4500                         │
│  status: "ok"                                   │
└───────────┬─────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────┐
│  PRÓXIMO SERVICIO CALCULADO                     │
│  currentKm + lifespan_km = 64500                │
│  → Se guarda en MaintenanceRecord               │
│  → Se muestra en ficha                          │
└─────────────────────────────────────────────────┘
```

### Predicción de reemplazo de partes

Las partes en `PartesTab` predicen cuándo necesitan reemplazo:
```
remaining = lifespan_mileage - (currentKm - mileage_installed)
pct = remaining / lifespan_mileage
```

Esto alimenta:
1. **Ficha**: Gauge de vida del aceite, indicadores telltale
2. **Tablero**: Indicadores de cada sistema (ABS, frenos, llantas, batería, etc.)
3. **Partes**: Barra de progreso por componente

---

## 5. Tablero: Alineación de Indicadores

Los indicadores del tablero (telltale) deben alinearse con:

### Fuentes de datos por indicador

| Indicador | Fuente principal | Fuente secundaria |
|---|---|---|
| ABS / Frenos | `parts['Pastillas de freno']` | `maintenance_records` tipo "Frenos" |
| Freno de mano | `parts['Pastillas de freno']` | — |
| Llantas | `parts['Llantas']` | `maintenance_records` tipo "Llantas" |
| Batería | `parts['Batería']` | `maintenance_records` tipo "Batería" |
| Revisión motor | `worstOf('Aceite de motor', 'Bujías', 'Correa', 'Refrigerante')` | `maintenance_records` tipo "Aceite" |
| Combustible | Cálculo cíclico (550 km) | — |

### Categorías consistentes

Las categorías en **historial**, **partes** y **tablero** deben ser idénticas:

| Categoría | Historial `service_type` | Partes `name` | Tablero `iconKey` |
|---|---|---|---|
| Motor/Aceite | `Aceite` | `Aceite de motor`, `Bujías`, `Correa de accesorios`, `Refrigerante` | `engine` |
| Frenos | `Frenos` | `Pastillas de freno` | `abs`, `handbrake` |
| Llantas | `Llantas` | `Llantas` | `tire` |
| Batería | `Batería` | `Batería` | `battery` |
| Filtros | `Aire` | `Filtro de aceite`, `Filtro de aire`, `Filtro de habitáculo`, `Filtro de combustible`, `Filtro de transmisión`, `Filtro de partículas` (uno por registro) | — |
| Combustible | `Combustible` | `Filtro de combustible` | `fuel` |
| Transmisión | `Transmisión` | `Transmisión` | — |
| Suspensión | `Suspensión` | `Amortiguadores` | — |

---

## 6. Control de Partes: Permisos

### Rol de Usuario (persona)
- **Solo puede ver** las partes de su vehículo
- **Puede agregar info complementaria** (notas, observaciones)
- **NO puede editar** nombre, marca, vida útil, status
- **NO puede eliminar** partes

### Rol de Taller (empresa)
- **Puede crear, editar, eliminar** partes
- **Puede cambiar status** (ok, worn, critical)
- **Puede cambiar vida útil** y kilometraje de instalación
- **Configura promociones** (stamps_required, promotion_description)

### Implementación
```tsx
// PartesTab.tsx
const isWorkshop = profile?.account_type === 'empresa'

// Botón "Agregar parte" solo visible para talleres
{isWorkshop && <button onClick={onAdd}>Agregar parte</button>}

// Click en parte: talleres abren modal editable, usuarios abren vista de solo lectura
onClick={() => isWorkshop ? onEdit(part) : onViewPart(part)}
```

---

## 7. Historial: Columnas Requeridas

Cada registro en el historial debe mostrar:

| Campo | Descripción |
|---|---|
| `service_type` | Tipo de servicio |
| `date` | Fecha del registro |
| `mileage` | **Kilometraje actual** al momento del registro |
| `next_service_mileage` | **Próximo servicio estimado** para este tipo |
| `workshop` | Taller donde se realizó |
| `cost` | Costo del servicio |
| `lubricant_brand` | Marca del aceite (si aplica) |
| `description` | Descripción del servicio |

### Visual en HistoryStack
```
┌──────────────────────────────────────┐
│ [icon] ACEITE                        │
│        CarLink Service Record        │
│                                      │
│ 62,000 KM                            │
│ Próximo: 66,500 km                   │
│                                      │
│ Taller: Tecnicentro La 80            │
│ Costo: $120,000                      │
│ Lubricante: MotUL 3000 · 10W-40     │
│                          CarLink     │
└──────────────────────────────────────┘
```

---

## 8. Cambios de Código Requeridos

### ServiceFormModal.tsx
1. Auto-calcular `next_service_mileage` cuando cambia `mileage` o `lifespan_km`
2. Mostrar cálculo en tiempo real ("Próximo servicio estimado: XX,XXX km")
3. Mantener `next_service_mileage` como campo editable pero con valor sugerido

### FichaTab.tsx
1. Determinar tipo de servicio más reciente por `service_type`
2. Solo activar chip del tipo registrado si `next_service_mileage > currentKm`
3. Mostrar marca de aceite en header si último servicio es "Aceite"
4. Mostrar "Próximo servicio: {tipo}" solo para el tipo del último registro

### HistorialTab.tsx / HistoryStack.tsx
1. Agregar columna "Próximo servicio" con `next_service_mileage`
2. Mostrar ambos valores: actual + próximo

### PartesTab.tsx
1. Verificar `account_type` del usuario
2. Ocultar botón "Agregar parte" si no es taller
3. Hacer click en parte → vista de solo lectura para usuarios
4. Mantener edit modal solo para talleres

### Tablero (FichaTab telltales)
1. Usar datos reales de `parts` para cada indicador
2. Asegurar que categorías coincidan con SERVICE_TYPES
3. Calcular `pct` y `rem` desde `parts` table (no hardcoded)
