/* Campos de la tarjeta de propiedad que viven en vehicles.card_data (backend:
   services/vehicle_card.py CARD_FIELDS). Los demás campos de la tarjeta (placa, ciudad, marca,
   línea, año, color, clase, combustible, propietario) tienen columna propia en el vehículo. */
export const CARD_FIELD_DEFS = [
  { key: 'license_number', label: 'Número de licencia de tránsito', placeholder: 'Ej. 10012345678', numeric: true },
  { key: 'owner_document', label: 'Documento del propietario', placeholder: 'Cédula o NIT, solo números', numeric: true },
  { key: 'vin', label: 'VIN / serie', placeholder: '17 caracteres' },
  { key: 'engine_number', label: 'Número de motor', placeholder: 'Ej. PE12345678' },
  { key: 'chassis_number', label: 'Número de chasis', placeholder: 'Ej. 3MZBN1V70KM123456' },
  { key: 'cilindraje', label: 'Cilindraje (cc)', placeholder: 'Ej. 2000', numeric: true },
  { key: 'capacity', label: 'Capacidad (pasajeros o kg)', placeholder: 'Ej. 5', numeric: true },
  { key: 'doors', label: 'Puertas', placeholder: 'Ej. 4', numeric: true },
  { key: 'registration_date', label: 'Fecha de matrícula', placeholder: '', date: true },
] as const

export type CardKey = typeof CARD_FIELD_DEFS[number]['key'] | 'service'

export const SERVICE_OPTIONS = [
  { value: 'particular', label: 'Particular' },
  { value: 'publico', label: 'Público' },
  { value: 'oficial', label: 'Oficial' },
  { value: 'diplomatico', label: 'Diplomático' },
  { value: 'especial', label: 'Especial' },
]

/* Nombres de los campos que NO están en card_data, para mostrar el estado de cada uno. */
export const TOP_FIELD_LABELS: Record<string, string> = {
  plate: 'Placa', city: 'Organismo de tránsito (ciudad)', brand: 'Marca', model: 'Línea / modelo',
  year: 'Año modelo', color: 'Color', body_type: 'Clase de vehículo', fuel_type: 'Combustible',
  owner_name: 'Propietario',
}

/* `vehicle_class` se guarda tal cual lo leyó el OCR (no se muestra ni se valida: ver vehicle_card.py). */
const CARD_KEYS = [...CARD_FIELD_DEFS.map(d => d.key), 'service', 'vehicle_class'] as string[]

/* Extrae de un escaneo solo los campos de card_data que traen valor; el servidor los normaliza. */
export function cardDataFromScan(scan: Record<string, any> | null | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!scan) return out
  const src: Record<string, any> = { ...scan, owner_document: scan.document_number }
  for (const k of CARD_KEYS) {
    const v = src[k]
    if (v !== null && v !== undefined && String(v).trim() !== '') out[k] = String(v).trim()
  }
  return out
}

/* Mezcla sin pisar: lo que ya hay gana sobre lo escaneado (el usuario puede haberlo corregido). */
export function mergeCardData(base: Record<string, string>, incoming: Record<string, string>): Record<string, string> {
  const out = { ...incoming }
  for (const [k, v] of Object.entries(base)) if (v) out[k] = v
  return out
}
