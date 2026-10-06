/* Reglas de lubricante: viscosidad → vida útil en km y meses. Compartidas entre el formulario de
   servicio (predicción del próximo cambio) y la Ficha (cuenta regresiva del cambio de aceite). */
export interface LubricantRule {
  lifespanKm: number
  lifespanMonths: number
  label: string
}
export const LUBRICANT_RULES: Record<string, LubricantRule> = {
  /* Sintéticos */
  '0W-20':  { lifespanKm: 10000, lifespanMonths: 12, label: 'Sintético premium' },
  '0W-30':  { lifespanKm: 10000, lifespanMonths: 12, label: 'Sintético premium' },
  '0W-40':  { lifespanKm: 10000, lifespanMonths: 12, label: 'Sintético premium' },
  '5W-20':  { lifespanKm: 8000,  lifespanMonths: 10, label: 'Sintético' },
  '5W-30':  { lifespanKm: 8000,  lifespanMonths: 10, label: 'Sintético' },
  '5W-40':  { lifespanKm: 8000,  lifespanMonths: 10, label: 'Sintético' },
  /* Semi-sintéticos */
  '10W-30': { lifespanKm: 7000,  lifespanMonths: 8,  label: 'Semi-sintético' },
  '10W-40': { lifespanKm: 6000,  lifespanMonths: 7,  label: 'Semi-sintético' },
  '10W-50': { lifespanKm: 6000,  lifespanMonths: 7,  label: 'Semi-sintético' },
  '15W-40': { lifespanKm: 5000,  lifespanMonths: 6,  label: 'Mineral mejorado' },
  '15W-50': { lifespanKm: 5000,  lifespanMonths: 6,  label: 'Mineral mejorado' },
  /* Minerales */
  '20W-40': { lifespanKm: 4000,  lifespanMonths: 5,  label: 'Mineral' },
  '20W-50': { lifespanKm: 4000,  lifespanMonths: 5,  label: 'Mineral' },
  '25W-50': { lifespanKm: 4000,  lifespanMonths: 5,  label: 'Mineral' },
  '25W-60': { lifespanKm: 4000,  lifespanMonths: 5,  label: 'Mineral' },
  '30':     { lifespanKm: 4000,  lifespanMonths: 5,  label: 'Mineral' },
  '40':     { lifespanKm: 4000,  lifespanMonths: 5,  label: 'Mineral' },
  '50':     { lifespanKm: 4000,  lifespanMonths: 5,  label: 'Mineral' },
  '60':     { lifespanKm: 3500,  lifespanMonths: 4,  label: 'Mineral' },
}

export function getLubricantRule(type?: string): LubricantRule | null {
  if (!type) return null
  const key = type.trim().toUpperCase()
  return LUBRICANT_RULES[key] || null
}

