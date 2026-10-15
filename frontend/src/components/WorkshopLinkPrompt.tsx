'use client'

/* Aviso del vínculo taller-conductor dentro de /app (docs/PLAN_VINCULO_TALLER_CONDUCTOR.md). Un solo modal a la
   vez, y solo si el servidor tiene el vínculo encendido:
   - pendiente por QR del taller (escenario A) o por enlace de reclamo (escenario B): confirmar y aceptar;
   - sugerencia de taller (escenario C): "¿este es tu taller?" para servicios escritos a mano.
   Siempre decide la persona: nada se vincula sin su clic, y puede dejar el WhatsApp sin compartir. */
import { useEffect, useRef, useState } from 'react'
import { apiUrl } from '@/lib/supabase'
import {
  candidateKey, claimInfo, clearPending, dismissCandidate, dismissedCandidates, linksApi, linksEnabled, maskPlate, readPending,
  type Candidate,
} from '@/lib/workshopLinks'

interface VehicleLite { id: string; plate: string; brand?: string; model?: string }
type View =
  | { kind: 'ref'; code: string; name: string }
  | { kind: 'claim'; token: string; name: string; plateHint: string }
  | { kind: 'candidate'; c: Candidate }

export default function WorkshopLinkPrompt({ vehicles, currentVehicleId, theme, onDone }: {
  vehicles: VehicleLite[]; currentVehicleId?: string; theme: 'light' | 'dark'; onDone: (message: string) => void
}) {
  const [view, setView] = useState<View | null>(null)
  const [vehicleId, setVehicleId] = useState('')
  const [share, setShare] = useState(false)
  const [alsoLink, setAlsoLink] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ran = useRef(false)
  // Solo se cancela al desmontar. Si se cancelara en cada cambio de `vehicles`/`currentVehicleId` (cleanup del efecto),
  // la primera corrida moriria a medias y `ran` impediria reintentar: el aviso nunca saldria (en desarrollo, React StrictMode
  // monta, desmonta y vuelve a montar, asi que la marca se reinicia al montar).
  const unmounted = useRef(false)
  useEffect(() => { unmounted.current = false; return () => { unmounted.current = true } }, [])

  useEffect(() => {
    if (ran.current || vehicles.length === 0) return
    ran.current = true
    const cancelled = () => unmounted.current
    ;(async () => {
      if (!(await linksEnabled()) || cancelled()) return
      const pending = readPending()
      if (pending?.kind === 'ref') {
        try {
          const res = await fetch(apiUrl(`/workshops/${encodeURIComponent(pending.code)}`))
          if (!res.ok) { clearPending(); return }
          const w = await res.json()
          if (!cancelled()) { setVehicleId(currentVehicleId || vehicles[0].id); setView({ kind: 'ref', code: pending.code, name: w.name }) }
        } catch { /* sin red: se deja el pendiente para la proxima vez */ }
        return
      }
      if (pending?.kind === 'claim') {
        const info = await claimInfo(pending.token)
        if (info === 'invalid') { clearPending(); return }
        if (!info || cancelled()) return
        const match = vehicles.find(v => maskPlate(v.plate) === info.plate_hint)
        setVehicleId(match?.id ?? '')
        setView({ kind: 'claim', token: pending.token, name: info.workshop_name, plateHint: info.plate_hint })
        return
      }
      const list = await linksApi.candidates()
      const dismissed = dismissedCandidates()
      const next = (list || []).find(c => !dismissed.includes(candidateKey(c.workshop_id, c.vehicle_id)))
      if (next && !cancelled()) setView({ kind: 'candidate', c: next })
    })()
  }, [vehicles, currentVehicleId])

  if (!view) return null

  const dark = theme === 'dark'
  const ink = dark ? '#f5f3ec' : '#17171a'
  const muted = dark ? '#a8a396' : '#5c584e'
  const close = () => { if (view.kind !== 'candidate') clearPending(); setView(null); setError('') }

  const accept = async () => {
    setBusy(true); setError('')
    let ok = false
    if (view.kind === 'ref') ok = !!(await linksApi.create(view.code, vehicleId, share))
    else if (view.kind === 'claim') ok = !!(await linksApi.claim(view.token, vehicleId, share))
    setBusy(false)
    if (!ok) {
      setError(view.kind === 'claim' ? 'No se pudo vincular. Revisa que elegiste el vehículo con la placa del enlace, o pide un enlace nuevo.' : 'No se pudo vincular. Inténtalo de nuevo.')
      return
    }
    clearPending(); setView(null)
    onDone(`Vinculado con ${view.kind === 'candidate' ? '' : view.name}`.trim())
  }

  const confirmCandidate = async (yes: boolean) => {
    if (view.kind !== 'candidate') return
    const key = candidateKey(view.c.workshop_id, view.c.vehicle_id)
    if (!yes) { dismissCandidate(key); setView(null); return }
    setBusy(true); setError('')
    const res = await linksApi.confirmCandidate(view.c.workshop_id, view.c.vehicle_id, alsoLink ? share : null)
    setBusy(false)
    if (!res) { setError('No se pudo guardar. Inténtalo de nuevo.'); return }
    dismissCandidate(key); setView(null)
    onDone(`Taller confirmado: ${view.c.workshop_name}`)
  }

  const btn = (primary: boolean): React.CSSProperties => ({
    padding: '11px 18px', borderRadius: 11, fontWeight: 800, fontSize: 13, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
    border: primary ? 'none' : `1px solid ${dark ? 'rgba(255,255,255,0.18)' : 'rgba(17,17,17,0.18)'}`,
    background: primary ? '#F5C518' : 'transparent', color: primary ? '#111' : ink,
  })
  const needsVehicle = view.kind !== 'candidate'

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(4,4,4,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420, borderRadius: 18, padding: 22, background: dark ? '#14141a' : '#ffffff', color: ink, border: '1px solid rgba(245,197,24,0.3)' }}>
        {view.kind === 'candidate' ? (
          <>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>¿Este es tu taller?</div>
            <p style={{ fontSize: 13.5, color: muted, lineHeight: 1.55, margin: '0 0 10px' }}>
              Escribiste {view.c.typed_names.map(n => `"${n}"`).join(', ')} en {view.c.record_count} {view.c.record_count === 1 ? 'servicio' : 'servicios'}.
              Hay un taller con un nombre parecido en CarLink: <strong style={{ color: ink }}>{view.c.workshop_name}</strong>{view.c.workshop_city ? ` (${view.c.workshop_city})` : ''}.
            </p>
            <p style={{ fontSize: 12, color: muted, lineHeight: 1.5, margin: '0 0 12px' }}>
              Si confirmas, tus servicios quedan asociados a ese taller como declarados por ti. No cambian su estado ni se marcan como verificados.
            </p>
            <label style={{ display: 'flex', gap: 8, fontSize: 13, color: ink, marginBottom: 8, alignItems: 'flex-start' }}>
              <input type="checkbox" checked={alsoLink} onChange={e => setAlsoLink(e.target.checked)} style={{ marginTop: 3, accentColor: '#F5C518' }} />
              <span>Vincularme también como cliente de este taller (verá mi nombre y la placa)</span>
            </label>
            {alsoLink && (
              <label style={{ display: 'flex', gap: 8, fontSize: 13, color: ink, marginBottom: 8, alignItems: 'flex-start', paddingLeft: 22 }}>
                <input type="checkbox" checked={share} onChange={e => setShare(e.target.checked)} style={{ marginTop: 3, accentColor: '#F5C518' }} />
                <span>Compartir también mi WhatsApp</span>
              </label>
            )}
          </>
        ) : (
          <>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>Vincular con {view.name}</div>
            <p style={{ fontSize: 13.5, color: muted, lineHeight: 1.55, margin: '0 0 12px' }}>
              El taller verá tu nombre y la placa del vehículo que elijas, para asociar tus servicios con ellos. Puedes quitar el vínculo cuando quieras.
              {view.kind === 'claim' && view.plateHint ? ` El enlace corresponde a la placa ${view.plateHint}.` : ''}
            </p>
            {vehicles.length > 1 || !vehicleId ? (
              <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, marginBottom: 10, background: 'transparent', color: ink, border: `1px solid ${dark ? 'rgba(255,255,255,0.18)' : 'rgba(17,17,17,0.18)'}` }}>
                <option value="">Elige el vehículo</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate}{v.brand ? ` - ${v.brand} ${v.model || ''}` : ''}</option>)}
              </select>
            ) : (
              <div style={{ fontSize: 13, marginBottom: 10 }}>Vehículo: <strong>{vehicles.find(v => v.id === vehicleId)?.plate}</strong></div>
            )}
            <label style={{ display: 'flex', gap: 8, fontSize: 13, color: ink, marginBottom: 8, alignItems: 'flex-start' }}>
              <input type="checkbox" checked={share} onChange={e => setShare(e.target.checked)} style={{ marginTop: 3, accentColor: '#F5C518' }} />
              <span>Compartir también mi WhatsApp con el taller</span>
            </label>
          </>
        )}
        {error && <div style={{ fontSize: 12.5, color: '#ff4d6a', margin: '4px 0 8px' }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14, flexWrap: 'wrap' }}>
          {view.kind === 'candidate' ? (
            <>
              <button onClick={() => confirmCandidate(false)} disabled={busy} style={btn(false)}>No es mi taller</button>
              <button onClick={() => confirmCandidate(true)} disabled={busy} style={btn(true)}>Sí, es mi taller</button>
            </>
          ) : (
            <>
              <button onClick={close} disabled={busy} style={btn(false)}>Ahora no</button>
              <button onClick={accept} disabled={busy || (needsVehicle && !vehicleId)} style={btn(true)}>{busy ? 'Vinculando…' : 'Vincular'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
