/* Vida útil consumida de una pieza según el kilometraje actual del vehículo. Mismos umbrales que
   el tablero de la ficha (FichaTab.tsx): naranja desde media vida, rojo con 15 % o menos restante. */
export type PartLifeState = 'ok' | 'worn' | 'critical' | 'expired' | 'unknown'

export interface PartLife {
  /** 0..1 de la vida útil ya consumida (0 sin datos). */
  usedFraction: number
  remainingKm: number | null
  state: PartLifeState
}

export function partLife(
  installedKm: number | null | undefined,
  lifespanKm: number | null | undefined,
  currentKm: number | null | undefined,
): PartLife {
  if (installedKm == null || !lifespanKm || lifespanKm <= 0 || currentKm == null) {
    return { usedFraction: 0, remainingKm: null, state: 'unknown' }
  }
  const used = Math.max(0, currentKm - installedKm)
  const usedFraction = Math.min(1, used / lifespanKm)
  const remainingKm = Math.max(0, lifespanKm - used)
  const remainingFraction = remainingKm / lifespanKm
  let state: PartLifeState
  if (used >= lifespanKm) state = 'expired'
  else if (remainingFraction <= 0.15) state = 'critical'
  else if (remainingFraction <= 0.5) state = 'worn'
  else state = 'ok'
  return { usedFraction, remainingKm, state }
}

export const PART_LIFE_COLOR: Record<PartLifeState, string> = {
  ok: '#22c55e', worn: '#f59e0b', critical: '#ef4444', expired: '#ef4444', unknown: '#7c786e',
}
export const PART_LIFE_LABEL: Record<PartLifeState, string> = {
  ok: 'Óptimo', worn: 'Media vida', critical: 'Urgente', expired: 'Vencida', unknown: 'Sin datos',
}
