/* Tipos de batería según el vehículo (el tipo de vehículo se detecta solo, ver filterCatalog.ts).
   Cada tipo tiene su propia vida útil en meses —la batería envejece sobre todo por tiempo—, de la que sale
   el próximo servicio y el testigo de la Ficha. La vida típica es una referencia, no una garantía. */
import type { VehicleKind } from '@/lib/filterCatalog'

export interface BatteryOption {
  key: string
  label: string
  /** Voltaje y tecnología, en una línea. */
  spec: string
  months: number
  note?: string
}

const OTHER: BatteryOption = { key: 'other', label: 'Otra / no sé', spec: 'Tipo sin identificar', months: 24 }

const CAR: BatteryOption[] = [
  { key: 'car_mf', label: 'Sin mantenimiento (MF)', spec: '12 V · Carro / camioneta', months: 36 },
  { key: 'car_conv', label: 'Convencional', spec: '12 V · Carro / camioneta', months: 24, note: 'Requiere revisar el nivel de agua' },
  { key: 'car_agm', label: 'AGM / EFB', spec: '12 V · Start-Stop', months: 48, note: 'Vehículos con Start-Stop' },
  { key: 'car_hybrid', label: 'Híbrido / eléctrico', spec: 'Auxiliar o de tracción', months: 48, note: 'Auxiliar 12 V o de tracción' },
]
const MOTO: BatteryOption[] = [
  { key: 'moto_mfagm', label: 'MF / AGM', spec: '12 V · Moto', months: 36 },
  { key: 'moto_conv', label: 'Convencional', spec: '12 V · Moto', months: 24 },
  { key: 'moto_lithium', label: 'Litio', spec: 'Motos de alto desempeño', months: 60 },
]
const HEAVY: BatteryOption[] = [
  { key: 'heavy_mf', label: 'Sin mantenimiento (MF)', spec: '12 V / 24 V · Camión / bus', months: 36 },
]

export function batteryOptions(kind: VehicleKind): BatteryOption[] {
  return [...(kind === 'moto' ? MOTO : kind === 'pesado' ? HEAVY : CAR), OTHER]
}

export const ALL_BATTERY_OPTIONS = [...CAR, ...MOTO, ...HEAVY, OTHER]
export const batteryOptionByKey = (key?: string | null) => ALL_BATTERY_OPTIONS.find(o => o.key === key)

/* Una batería que solo se revisa (sin cambiarla) se vuelve a mirar en unos meses. */
export const BATTERY_REVIEW_MONTHS = 6
export const DEFAULT_BATTERY_MONTHS = 24

/* Lectura del voltaje en reposo. Más de 18 V se interpreta como sistema de 24 V. */
export type VoltageState = 'ok' | 'aceptable' | 'baja' | 'descargada' | 'invalida'
export function interpretVoltage(volts: number): VoltageState {
  if (!Number.isFinite(volts) || volts < 5 || volts > 30) return 'invalida'
  const v = volts > 18 ? volts / 2 : volts
  if (v >= 12.6) return 'ok'
  if (v >= 12.4) return 'aceptable'
  if (v >= 12.0) return 'baja'
  return 'descargada'
}
export const VOLTAGE_LABEL: Record<VoltageState, string> = {
  ok: 'Carga completa', aceptable: 'Carga aceptable', baja: 'Carga baja', descargada: 'Descargada', invalida: 'Valor no válido',
}

export function parseVoltage(raw: string | undefined): number {
  return parseFloat(String(raw || '').replace(',', '.').replace(/[^\d.]/g, ''))
}

/* La vida útil (meses) que se guardó en la pieza ("Vida útil: 36 meses · ..."); sin dato, el valor por defecto. */
export function batteryMonthsFromNotes(notes?: string | null): number {
  const m = /Vida útil: (\d+) meses/.exec(notes || '')
  return m ? parseInt(m[1], 10) : DEFAULT_BATTERY_MONTHS
}
