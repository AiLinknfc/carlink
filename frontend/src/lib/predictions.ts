export interface PartPrediction {
  remaining_km: number
  life_pct: number
  mileage_next: number
  status: 'ok' | 'worn' | 'critical' | 'replaced'
  label: string
  color: string
}

export function predictPart(
  part: { mileage_installed?: number | null; lifespan_mileage?: number | null; status?: string },
  currentKm: number,
): PartPrediction {
  if (part.status === 'replaced') {
    return { remaining_km: 0, life_pct: 0, mileage_next: 0, status: 'replaced', label: 'Reemplazado', color: '#7c786e' }
  }

  const installed = part.mileage_installed ?? 0
  const lifespan = part.lifespan_mileage ?? 50000
  const kmSinceInstalled = Math.max(0, currentKm - installed)
  const remaining = Math.max(0, lifespan - kmSinceInstalled)
  const pct = lifespan > 0 ? Math.min(100, (kmSinceInstalled / lifespan) * 100) : 0
  const nextMileage = installed + lifespan

  let status: 'ok' | 'worn' | 'critical' = 'ok'
  if (pct >= 90) status = 'critical'
  else if (pct >= 70) status = 'worn'

  if (part.status === 'critical') status = 'critical'
  else if (part.status === 'worn') status = 'worn'

  const label = status === 'critical' ? 'Urgente' : status === 'worn' ? 'Próximo' : 'Bien'
  const color = status === 'critical' ? '#ef4444' : status === 'worn' ? '#f59e0b' : '#22c55e'

  return { remaining_km: remaining, life_pct: pct, mileage_next: nextMileage, status, label, color }
}
