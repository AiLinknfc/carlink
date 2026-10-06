/* Salud del vehículo a partir de los testigos del tablero.

   - El porcentaje es el promedio de los testigos ENCENDIDOS (con servicios registrados); los
     "sin datos" no cuentan.
   - Pero un promedio diluye un riesgo grave (5 testigos al 100 % y el aceite vencido darían 83 %,
     verde). Por eso el nivel nunca puede ser mejor que el peor testigo en rojo:
       · cualquier testigo rojo fuerza como mínimo "Atención";
       · un testigo rojo de los que dañan el vehículo (CRITICAL_TELLTALES) fuerza "Crítico". */

export type HealthLevel = 'sin-datos' | 'optimo' | 'atencion' | 'critico'

/* Aceite, frenos, refrigeración y llantas: si uno de ellos está vencido, el vehículo está en riesgo. */
export const CRITICAL_TELLTALES = ['oil', 'brakes', 'temp', 'tire'] as const

export interface HealthInput {
  iconKey: string
  /** Fracción de vida restante, 0..1. */
  pct: number
  tracked: boolean
  /** Urgente o vencido (testigo en rojo). */
  critical: boolean
}

export interface HealthSummary {
  tracked: boolean
  /** Promedio de los testigos encendidos, 0..1 (0 sin datos). */
  average: number
  level: HealthLevel
}

const RANK: Record<HealthLevel, number> = { 'sin-datos': 0, optimo: 1, atencion: 2, critico: 3 }
const worse = (a: HealthLevel, b: HealthLevel): HealthLevel => (RANK[a] >= RANK[b] ? a : b)

export function healthSummary(items: HealthInput[]): HealthSummary {
  const lit = items.filter(i => i.tracked)
  if (lit.length === 0) return { tracked: false, average: 0, level: 'sin-datos' }
  const average = lit.reduce((a, i) => a + i.pct, 0) / lit.length
  let level: HealthLevel = average > 0.5 ? 'optimo' : average > 0.25 ? 'atencion' : 'critico'
  for (const i of lit) {
    if (!i.critical) continue
    level = worse(level, (CRITICAL_TELLTALES as readonly string[]).includes(i.iconKey) ? 'critico' : 'atencion')
  }
  return { tracked: true, average, level }
}
