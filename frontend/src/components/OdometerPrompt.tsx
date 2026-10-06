'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

/* Aviso discreto en Inicio para pedir el kilometraje:
   - 'initial': el vehículo no tiene ninguna lectura (registrado antes del odómetro, sin servicios).
   - 'periodic': pasaron varios meses sin servicio ni lectura (el backend decide cuándo, ver
     services/odometer.py REMINDER_AFTER_DAYS).
   No bloquea nada y se puede descartar; si se descarta, no vuelve a aparecer en esta sesión del
   navegador. El valor se valida en el servidor (nunca baja, sin saltos absurdos). */

interface OdometerStatus {
  state: 'initial' | 'periodic' | 'ok'
  current_mileage: number | null
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response | null> {
  try {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) return null
    return await fetch(`/api${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
    })
  } catch {
    return null
  }
}

const dismissKey = (vehicleId: string) => `carlink_odometer_dismissed_${vehicleId}`
function wasDismissed(vehicleId: string): boolean {
  try { return sessionStorage.getItem(dismissKey(vehicleId)) === '1' } catch { return false }
}
function markDismissed(vehicleId: string) {
  try { sessionStorage.setItem(dismissKey(vehicleId), '1') } catch { /* sin almacenamiento: no pasa nada */ }
}

export default function OdometerPrompt({ vehicleId, theme, refreshKey }: { vehicleId?: string; theme: 'light' | 'dark'; refreshKey?: number }) {
  const [status, setStatus] = useState<OdometerStatus | null>(null)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [hidden, setHidden] = useState(false)
  const isDark = theme !== 'light'

  useEffect(() => {
    setStatus(null); setValue(''); setError(''); setHidden(false)
    if (!vehicleId) return
    if (wasDismissed(vehicleId)) { setHidden(true); return }
    let cancelled = false
    authedFetch(`/odometer/vehicle/${vehicleId}`).then(async res => {
      if (cancelled || !res?.ok) return
      setStatus(await res.json())
    })
    return () => { cancelled = true }
  }, [vehicleId, refreshKey])

  const save = useCallback(async () => {
    if (!vehicleId || !status) return
    const km = parseInt(value, 10)
    if (!Number.isFinite(km) || km < 0) { setError('Ingresa el kilometraje que marca el tablero.'); return }
    setSaving(true); setError('')
    const res = await authedFetch(`/odometer/vehicle/${vehicleId}/${status.state === 'initial' ? 'initial' : 'periodic'}`, {
      method: 'POST', body: JSON.stringify({ mileage: km }),
    })
    setSaving(false)
    if (!res) { setError('No pudimos guardar. Revisa tu conexión e intenta de nuevo.'); return }
    if (!res.ok) {
      let msg = 'No pudimos guardar el kilometraje.'
      try { const d = (await res.json())?.detail; if (typeof d === 'string') msg = d } catch { /* sin detalle */ }
      setError(msg)
      return
    }
    setStatus(await res.json())
  }, [vehicleId, status, value])

  if (hidden || !vehicleId || !status || status.state === 'ok') return null

  const isInitial = status.state === 'initial'
  const text = isDark ? '#f5f3ec' : '#17171a'
  const muted = isDark ? '#a9a496' : '#6b665a'

  return (
    <div role="region" aria-label="Kilometraje del vehículo" style={{
      marginBottom: 16, padding: '12px 14px', borderRadius: 12,
      background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.3)',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 3 }}>
        {isInitial ? 'Registra el kilometraje de tu vehículo' : 'Actualiza el kilometraje de tu vehículo'}
      </div>
      <div style={{ fontSize: 12, color: muted, lineHeight: 1.5, marginBottom: 10 }}>
        {isInitial
          ? 'Es el punto de partida de su historial: ingresa el que marca el tablero hoy. No se puede bajar después.'
          : `Hace meses que no registras un servicio${status.current_mileage != null ? ` (último: ${status.current_mileage.toLocaleString()} km)` : ''}. Ingresa lo que marca el tablero hoy para mantener al día tus próximos servicios.`}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="number" inputMode="numeric" min={0} value={value} placeholder="Ej. 52000"
          aria-label="Kilometraje actual"
          onChange={e => { setValue(e.target.value); setError('') }}
          onKeyDown={e => { if (e.key === 'Enter') void save() }}
          style={{
            flex: '1 1 140px', minWidth: 0, padding: '10px 12px', borderRadius: 10, fontSize: 14, outline: 'none',
            border: `1px solid ${error ? '#ff4d6a' : 'rgba(245,197,24,0.35)'}`,
            background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', color: text,
          }}
        />
        <button type="button" onClick={() => void save()} disabled={saving || !value} style={{
          padding: '10px 18px', borderRadius: 10, border: 'none', cursor: saving || !value ? 'not-allowed' : 'pointer',
          background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 13, opacity: saving || !value ? 0.55 : 1,
        }}>
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button type="button" onClick={() => { markDismissed(vehicleId); setHidden(true) }} style={{
          padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent',
          color: muted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          Ahora no
        </button>
      </div>
      {error && <div style={{ fontSize: 12, color: '#ff4d6a', marginTop: 8 }}>{error}</div>}
    </div>
  )
}
