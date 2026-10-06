/* Para qué sirve el lubricante de un servicio "Aceite": motor, caja de cambios o transmisión. Es el primer
   paso del wizard; cada caso pide sus propios datos y tiene su propia vida útil (y su propia pieza en
   Control de partes: 'Aceite de motor', 'Aceite de caja', 'Aceite de transmisión'). Todos los vehículos
   ofrecen los tres: una moto automática o un scooter usa aceite de transmisión (CVT) y desde los datos del
   vehículo no se puede distinguir de una moto de caja manual. SOLO el aceite de motor alimenta el conteo de
   kilómetros de la ficha técnica y los avisos de aceite. */
import type { VehicleKind } from '@/lib/filterCatalog'

export type LubricantUse = 'motor' | 'caja' | 'transmision'

export interface UseInfo {
  key: LubricantUse
  label: string
  desc: string
  /** Pieza (fluido) en Control de partes. */
  part: string
  category: string
  /** Vida útil por defecto del caso (el de motor sale de la viscosidad: lubricantRules.ts). */
  lifespanKm: number
  months: number
}

export const USE_INFO: Record<LubricantUse, UseInfo> = {
  motor: { key: 'motor', label: 'Motor', desc: 'Aceite del motor', part: 'Aceite de motor', category: 'Motor', lifespanKm: 5000, months: 6 },
  caja: { key: 'caja', label: 'Caja de cambios', desc: 'Caja manual (valvulina)', part: 'Aceite de caja', category: 'Transmisión', lifespanKm: 50000, months: 48 },
  transmision: { key: 'transmision', label: 'Transmisión', desc: 'Automática, CVT, DCT o diferencial', part: 'Aceite de transmisión', category: 'Transmisión', lifespanKm: 60000, months: 48 },
}

export function useOptions(_kind?: VehicleKind): UseInfo[] {
  return [USE_INFO.motor, USE_INFO.caja, USE_INFO.transmision]
}

export const isLubricantUse = (v: unknown): v is LubricantUse => v === 'motor' || v === 'caja' || v === 'transmision'

/* Caja manual: viscosidades de valvulina habituales. */
export const GEAR_VISCOSITIES = ['75W-90', '80W-90', '75W-85', '75W-80', '80W-140', '85W-140']
export const GEAR_SPECS = ['API GL-4', 'API GL-5', 'API GL-4/GL-5']

/* Transmisión: tipo de fluido, con su ciclo típico. */
export const TRANSMISSION_FLUIDS: { label: string; lifespanKm: number; months: number }[] = [
  { label: 'ATF Dexron VI', lifespanKm: 60000, months: 48 },
  { label: 'ATF Mercon LV', lifespanKm: 60000, months: 48 },
  { label: 'ATF+4', lifespanKm: 60000, months: 48 },
  { label: 'ATF Toyota WS', lifespanKm: 60000, months: 48 },
  { label: 'CVT', lifespanKm: 40000, months: 36 },
  { label: 'DCT / DSG', lifespanKm: 60000, months: 48 },
  { label: 'Diferencial 80W-90', lifespanKm: 50000, months: 48 },
  { label: 'Otro', lifespanKm: 50000, months: 48 },
]

/* Vida útil de un lubricante que NO es de motor (el de motor lo da la viscosidad). */
export function lifespanFor(use: LubricantUse, type?: string | null): { km: number; months: number } {
  if (use === 'transmision') {
    const f = TRANSMISSION_FLUIDS.find(x => x.label === type)
    if (f) return { km: f.lifespanKm, months: f.months }
  }
  const base = USE_INFO[use]
  return { km: base.lifespanKm, months: base.months }
}

/* Marcas habituales de lubricantes de caja y transmisión (se puede escribir cualquiera). */
export const DRIVETRAIN_BRANDS = ['Original (OEM)', 'Mobil', 'Shell', 'Castrol', 'Motul', 'Valvoline', 'TotalEnergies', 'Liqui Moly', 'Repsol', 'Gulf', 'Terpel', 'Ravenol', 'Aisin', 'ZF']

/* Frase de la descripción del servicio por caso. */
export function useSummary(use: LubricantUse): string {
  return use === 'caja' ? 'Aceite de caja' : use === 'transmision' ? 'Aceite de transmisión' : 'Aceite'
}
