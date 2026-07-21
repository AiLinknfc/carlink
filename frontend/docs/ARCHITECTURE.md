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
| Aire | `Aire` | `Filtro de aire` | — |
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
