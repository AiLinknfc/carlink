'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/store/auth'
import { supabase, apiUrl } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

/* ── helpers ── */
async function apiGet(path: string) {
  const token = (await supabase.auth.getSession()).data.session?.access_token
  if (!token) return null
  const res = await fetch(apiUrl(path), { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return null
  return res.json()
}

async function apiPut(path: string, body: any) {
  const token = (await supabase.auth.getSession()).data.session?.access_token
  if (!token) return null
  const res = await fetch(apiUrl(path), {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) return null
  return res.json()
}

/* ── Color presets ── */
const COLOR_PRESETS: Record<string, { bg: string; muted: string; ink: string; soft: string; chipBg: string; chip: string; border: string }> = {
  Blanco: { bg: 'linear-gradient(145deg,#1a1a1e,#2c2c30)', muted: '#6b6b7b', ink: '#f5f3ec', soft: '#a8a4b6', chipBg: 'rgba(255,255,255,0.1)', chip: 'rgba(255,255,255,0.5)', border: 'rgba(245,197,24,0.25)' },
  Negro: { bg: 'linear-gradient(145deg,#0a0a0c,#1a1a1e)', muted: '#5c5c6a', ink: '#e8e6e0', soft: '#9a96a8', chipBg: 'rgba(255,255,255,0.06)', chip: 'rgba(255,255,255,0.35)', border: 'rgba(245,197,24,0.2)' },
  Plateado: { bg: 'linear-gradient(145deg,#1e1e24,#2e2e34)', muted: '#727284', ink: '#f0eee8', soft: '#b0acbe', chipBg: 'rgba(255,255,255,0.08)', chip: 'rgba(255,255,255,0.45)', border: 'rgba(245,197,24,0.22)' },
  Gris: { bg: 'linear-gradient(145deg,#141418,#242428)', muted: '#646474', ink: '#eceae4', soft: '#a4a0b2', chipBg: 'rgba(255,255,255,0.07)', chip: 'rgba(255,255,255,0.4)', border: 'rgba(245,197,24,0.2)' },
  Rojo: { bg: 'linear-gradient(145deg,#1e0c0c,#2e1414)', muted: '#8a4c4c', ink: '#f5e8e8', soft: '#c09090', chipBg: 'rgba(220,38,38,0.12)', chip: 'rgba(220,38,38,0.5)', border: 'rgba(220,38,38,0.3)' },
  Azul: { bg: 'linear-gradient(145deg,#0c1420,#142030)', muted: '#4c6a8a', ink: '#e8eef5', soft: '#90aac0', chipBg: 'rgba(37,99,235,0.1)', chip: 'rgba(37,99,235,0.5)', border: 'rgba(37,99,235,0.3)' },
  Verde: { bg: 'linear-gradient(145deg,#0c1a10,#142818)', muted: '#4c7a5c', ink: '#e8f5ec', soft: '#90bca0', chipBg: 'rgba(22,163,74,0.1)', chip: 'rgba(22,163,74,0.5)', border: 'rgba(22,163,74,0.3)' },
  Dorado: { bg: 'linear-gradient(145deg,#1e1808,#2e240c)', muted: '#8a7a3c', ink: '#f5f0d8', soft: '#c0b080', chipBg: 'rgba(202,138,4,0.14)', chip: 'rgba(202,138,4,0.55)', border: 'rgba(202,138,4,0.35)' },
  Naranja: { bg: 'linear-gradient(145deg,#1e1004,#2e1808)', muted: '#8a6a3c', ink: '#f5ecd8', soft: '#c0a880', chipBg: 'rgba(234,88,12,0.12)', chip: 'rgba(234,88,12,0.5)', border: 'rgba(234,88,12,0.3)' },
  Marrón: { bg: 'linear-gradient(145deg,#141008,#1e180c)', muted: '#6a5a3c', ink: '#ece4d0', soft: '#a89878', chipBg: 'rgba(120,50,15,0.1)', chip: 'rgba(120,50,15,0.4)', border: 'rgba(120,50,15,0.25)' },
}
function getPreset(color: string) {
  return COLOR_PRESETS[color] || COLOR_PRESETS.Negro
}

/* ── Countdown hook ── */
function useCountdown(targetMs: number) {
  const [cd, setCd] = useState({ d: 0, h: 0, m: 0, s: 0 })
  useEffect(() => {
    if (!targetMs) return
    function tick() {
      const diff = Math.max(0, targetMs - Date.now())
      setCd({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetMs])
  return cd
}

/* ── Tab components ── */

function FichaTab({ vehicle }: { vehicle: any }) {
  if (!vehicle) return <_empty msg="Registra un vehículo primero" />

  const [flipped, setFlipped] = useState(false)
  const [maintenance, setMaintenance] = useState<any[]>([])
  const [latest, setLatest] = useState<any>(null)
  const [loadingData, setLoadingData] = useState(true)
  const p = getPreset(vehicle.color)

  useEffect(() => {
    if (!vehicle?.id) return
    setLoadingData(true)
    Promise.all([
      apiGet(`/maintenance/vehicle/${vehicle.id}`).then(d => { if (d) setMaintenance(d) }),
      apiGet(`/maintenance/vehicle/${vehicle.id}/latest`).then(d => { if (d) setLatest(d) }),
    ]).finally(() => setLoadingData(false))
  }, [vehicle?.id])

  const totalServ = maintenance.length
  const currentKm = latest?.mileage
  const nextServiceKm = latest?.next_service_mileage
  const kmToNext = nextServiceKm != null && currentKm != null ? Math.max(0, nextServiceKm - currentKm) : null
  const progWidth = nextServiceKm != null && currentKm != null ? `${Math.min(100, (currentKm / nextServiceKm) * 100)}%` : '0%'
  const hasCountdown = latest?.next_service_mileage != null && currentKm != null
  const cd = useCountdown(hasCountdown ? Date.now() + 7 * 86400000 : 0)

  const stamps = ['Aceite', 'Filtros', 'Frenos', 'Llantas', 'Suspensión', 'Batería'].map(label => ({
    label,
    on: maintenance.some(r => r.service_type?.toLowerCase().includes(label.toLowerCase().slice(0, -1)) || r.service_type?.toLowerCase().includes(label.toLowerCase())),
  }))

  const latestDate = latest?.date ? new Date(latest.date).toLocaleDateString() : null

  const vehicleColor = (vehicle.color?.toLowerCase() || 'negro') as string
  const bgGradients: Record<string, string> = {
    blanco: 'radial-gradient(ellipse at 20% 20%,rgba(245,197,24,0.08) 0%,transparent 60%),radial-gradient(ellipse at 80% 80%,rgba(255,255,255,0.03) 0%,transparent 50%)',
    negro: 'radial-gradient(ellipse at 20% 20%,rgba(245,197,24,0.06) 0%,transparent 60%),radial-gradient(ellipse at 80% 80%,rgba(255,255,255,0.02) 0%,transparent 50%)',
    rojo: 'radial-gradient(ellipse at 20% 20%,rgba(245,197,24,0.08) 0%,transparent 60%),radial-gradient(ellipse at 80% 80%,rgba(220,38,38,0.06) 0%,transparent 50%)',
    azul: 'radial-gradient(ellipse at 20% 20%,rgba(245,197,24,0.08) 0%,transparent 60%),radial-gradient(ellipse at 80% 80%,rgba(37,99,235,0.06) 0%,transparent 50%)',
  }
  const bgGradient = bgGradients[vehicleColor] || 'radial-gradient(ellipse at 20% 20%,rgba(245,197,24,0.06) 0%,transparent 60%)'

  return (
    <div style={{ animation: 'sectionIn .55s cubic-bezier(0.22,1,0.36,1) both', maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ marginBottom: 22, animation: 'textIn .5s .04s both' }}>
        <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>Ficha técnica digital</div>
        <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: 'clamp(30px,3.8vw,46px)', letterSpacing: '.01em', margin: '8px 0 8px', textTransform: 'uppercase' }}>Estado del vehículo</h1>
        <p style={{ color: '#b6b2a6', margin: '0 0 16px', maxWidth: '60ch', fontSize: 14 }}>Tarjeta viva de mantenimiento. Se actualiza sola con cada servicio.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderRadius: 14, background: '#141414', border: '1px solid rgba(245,197,24,0.22)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
            <span style={{ width: 38, height: 38, flex: '0 0 auto', borderRadius: 10, background: 'rgba(245,197,24,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5C518' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            </span>
            <div>
              <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 30, lineHeight: 1 }}>{totalServ}</div>
              <div style={{ fontSize: 12, color: '#7c786e' }}>servicios registrados</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderRadius: 14, background: '#141414', border: '1px solid rgba(245,197,24,0.22)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
            <span style={{ width: 38, height: 38, flex: '0 0 auto', borderRadius: 10, background: 'rgba(245,197,24,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5C518' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            </span>
            <div>
              <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 30, lineHeight: 1 }}>{currentKm != null ? currentKm.toLocaleString() : '—'}</div>
              <div style={{ fontSize: 12, color: '#7c786e' }}>km recorridos con CarLink</div>
            </div>
          </div>
        </div>
      </div>

      {/* Countdown: only when next_service_mileage is set */}
      {hasCountdown && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '16px 20px', borderRadius: 16, marginBottom: 18, background: 'linear-gradient(135deg,rgba(245,197,24,0.16),rgba(20,20,20,0.55))', border: '1px solid rgba(245,197,24,0.3)', animation: 'textIn .5s .06s both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.8" style={{ flex: '0 0 auto' }}><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: '#a8a496', fontWeight: 700 }}>Próximo mantenimiento</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{nextServiceKm?.toLocaleString()} km · faltan {kmToNext?.toLocaleString()} km</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['d', 'h', 'm', 's'].map(k => (
              <div key={k} style={{ textAlign: 'center', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(245,197,24,0.25)', borderRadius: 11, padding: '8px 12px', minWidth: 56 }}>
                <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 26, color: '#F5C518', lineHeight: 1 }}>{(cd as any)[k]}</div>
                <div style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e' }}>{k === 'd' ? 'días' : k === 'h' ? 'hrs' : k === 'm' ? 'min' : 'seg'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,0.85fr)', gap: 22, alignItems: 'start' }}>
        {/* Flip card */}
        <div style={{ animation: 'textIn .5s .1s both', perspective: 2200 }}>
          <div style={{
            position: 'relative', minHeight: 486,
            transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d',
            transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            willChange: 'transform',
          }}>
            {/* FRONT */}
            <div style={{
              position: 'relative', minHeight: 486,
              backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
              borderRadius: 24, overflow: 'hidden',
              border: `1px solid ${p.border}`,
              padding: 24, display: 'flex', flexDirection: 'column',
              background: p.bg,
              boxShadow: flipped ? '0 16px 50px rgba(0,0,0,0.35)' : '0 24px 70px rgba(0,0,0,0.45)',
              transition: 'box-shadow .5s',
            }}>
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: bgGradient }} />
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
                {/* Fidelity mini-card: always visible, shows real data when available */}
                <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: '15px 17px', background: 'linear-gradient(115deg,#0f0f0f 0%,#241b05 55%,#0d0d0d 100%)', border: '1px solid rgba(245,197,24,0.4)', boxShadow: '0 10px 26px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.08)' }}>
                  <div style={{ position: 'absolute', top: '-40%', left: '-10%', width: '55%', height: '200%', background: 'linear-gradient(115deg,transparent 30%,rgba(255,255,255,.14) 48%,transparent 66%)', transform: 'skewX(-18deg)', pointerEvents: 'none' }} />
                  <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{ width: 42, height: 42, flex: '0 0 auto', borderRadius: 10, overflow: 'hidden', background: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111', border: '1.5px solid rgba(245,197,24,.6)' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-3 4-6 7-6 11a6 6 0 0 0 12 0c0-4-3-7-6-11z"/></svg>
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 800 }}>CarLink Club · Socio</div>
                        <div style={{ fontSize: 19, fontWeight: 800, color: '#fff', lineHeight: 1.1, marginTop: 2 }}>
                          {latest?.lubricant_brand || '—'}
                        </div>
                        <div style={{ fontSize: 12, color: '#d8c98a' }}>
                          {latest?.lubricant_type || 'Sin datos de lubricante'}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setFlipped(f => !f)} title="Dar vuelta a la ficha" style={{ flex: '0 0 auto', width: 38, height: 38, borderRadius: 11, border: '1px solid rgba(245,197,24,0.45)', background: 'rgba(245,197,24,0.12)', color: '#F5C518', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .18s' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
                    </button>
                  </div>
                  <div style={{ position: 'relative', marginTop: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {stamps.map((st, i) => (
                        <span key={i} title={st.label} style={{ width: 17, height: 17, borderRadius: '50%', background: st.on ? 'rgba(245,197,24,0.3)' : 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(245,197,24,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111' }}>
                          {st.on && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700 }}>{totalServ} sellos · Nivel Oro</div>
                  </div>
                </div>

                {/* Status badge: only when there's maintenance data */}
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {latest && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 13px', borderRadius: 999, background: 'rgba(245,197,24,0.14)', border: '1px solid rgba(245,197,24,0.4)', color: '#c99a00', fontSize: 12, fontWeight: 700 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#F5C518', boxShadow: '0 0 8px #F5C518' }}></span>
                      Mantenimiento al día
                    </span>
                  )}
                  {latestDate && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: p.muted, fontWeight: 600 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                      {latestDate}
                    </span>
                  )}
                </div>

                {/* Mileage: always visible, shows — when no data */}
                <div style={{ margin: '18px 0 4px' }}>
                  <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: p.muted, fontWeight: 700 }}>Kilometraje actual</div>
                  <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 54, letterSpacing: '.01em', lineHeight: 1, color: p.ink }}>
                    {currentKm != null ? currentKm.toLocaleString() : '—'}<span style={{ fontSize: 20, color: p.muted, fontFamily: "'Inter'", fontWeight: 600 }}> km</span>
                  </div>
                </div>

                {/* Progress bar: only when next_service_mileage exists */}
                {hasCountdown && (
                  <div style={{ margin: '12px 0 6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: p.soft, marginBottom: 7 }}>
                      <span>Próximo servicio</span>
                      <span style={{ color: p.ink, fontWeight: 600 }}>{nextServiceKm?.toLocaleString()} km · faltan {kmToNext?.toLocaleString()} km</span>
                    </div>
                    <div style={{ height: 9, borderRadius: 6, background: p.chipBg, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: progWidth, background: 'linear-gradient(90deg,#8a6a00,#F5C518,#FFD84D)', borderRadius: 6, transition: 'width .7s cubic-bezier(0.22,1,0.36,1)' }} />
                    </div>
                  </div>
                )}

                {/* Service history grid: shows only when records exist */}
                {maintenance.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: p.muted, fontWeight: 700, margin: '16px 0 7px' }}>Servicios realizados · pasa el cursor para el detalle</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
                      {maintenance.slice(0, 6).map((r, i) => (
                        <div key={i} style={{ padding: '8px 10px', borderRadius: 10, background: p.chipBg, border: '1px solid rgba(255,255,255,0.06)', cursor: 'default', transition: 'all .15s' }}
                          title={`${r.service_type}: ${r.description || ''}\n${r.mileage?.toLocaleString()} km · ${r.workshop || ''}`}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: p.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.service_type}</div>
                          <div style={{ fontSize: 10, color: p.soft }}>{r.mileage?.toLocaleString()} km</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* BACK */}
            <div style={{
              position: 'absolute', inset: 0,
              backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              borderRadius: 24, overflow: 'hidden',
              border: `1px solid ${p.border}`,
              padding: 24, display: 'flex', flexDirection: 'column',
              background: p.bg,
            }}>
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.02em' }}>Detalle de servicios</div>
                  <button onClick={() => setFlipped(f => !f)} title="Volver" style={{ width: 38, height: 38, borderRadius: 11, border: '1px solid rgba(245,197,24,0.45)', background: 'rgba(245,197,24,0.12)', color: '#F5C518', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {maintenance.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#7c786e', fontSize: 13 }}>Sin servicios registrados</div>
                  ) : maintenance.map((r, i) => (
                    <div key={i} style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: p.ink }}>{r.service_type}</div>
                        <span style={{ fontSize: 11, color: p.muted, whiteSpace: 'nowrap' }}>{new Date(r.date).toLocaleDateString()}</span>
                      </div>
                      {r.description && <div style={{ fontSize: 12, color: p.soft, marginTop: 4 }}>{r.description}</div>}
                      <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 11, color: p.muted }}>
                        <span>{r.mileage?.toLocaleString()} km</span>
                        {r.workshop && <span>· {r.workshop}</span>}
                        {r.cost > 0 && <span>· ${Number(r.cost).toLocaleString()}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Side panel: vehicle info + latest service */}
        <div style={{ animation: 'textIn .5s .14s both', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '15px 18px', borderRadius: 16, background: '#141414', border: '1px solid rgba(245,197,24,0.2)' }}>
            <div style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, marginBottom: 8 }}>Vehículo</div>
            {[
              ['Marca', vehicle.brand],
              ['Modelo', vehicle.model],
              ['Año', String(vehicle.year)],
              ['Tipo', vehicle.type],
              ['Color', vehicle.color],
              ['Placa', vehicle.plate],
              ['Ciudad', vehicle.city],
            ].map(([a, b]) => (
              <div key={a as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                <span style={{ color: '#7c786e' }}>{a as string}</span>
                <span style={{ fontWeight: 600 }}>{b as string}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: '15px 18px', borderRadius: 16, background: '#141414', border: '1px solid rgba(245,197,24,0.2)' }}>
            <div style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, marginBottom: 8 }}>Último servicio</div>
            {latest ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{latest.service_type}</div>
                <div style={{ fontSize: 12, color: '#b6b2a6', marginTop: 4 }}>{latest.description}</div>
                <div style={{ fontSize: 12, color: '#7c786e', marginTop: 6 }}>
                  {new Date(latest.date).toLocaleDateString()} · {latest.mileage?.toLocaleString()} km
                </div>
                {latest.workshop && <div style={{ fontSize: 12, color: '#7c786e', marginTop: 2 }}>📍 {latest.workshop}</div>}
              </>
            ) : (
              <div style={{ color: '#7c786e', fontSize: 13 }}>Sin registros</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function useVehicleRecords(path: string, vehicleId?: string) {
  const [data, setData] = useState<any[]>([])
  const fetch = useCallback(async () => {
    if (!vehicleId) return
    const d = await apiGet(`${path}/vehicle/${vehicleId}`)
    if (d) setData(d)
  }, [path, vehicleId])
  useEffect(() => { fetch() }, [fetch])
  return data
}

function HistorialTab({ vehicleId }: { vehicleId?: string }) {
  const records = useVehicleRecords('/maintenance', vehicleId)
  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      <_h2>Historial de mantenimiento</_h2>
      {!records.length ? <_empty msg="Aún no hay registros" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {records.map((r, i) => (
            <div key={i} style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{r.service_type}</div>
                  <div style={{ fontSize: 13, color: '#b6b2a6', marginTop: 4 }}>{r.description}</div>
                </div>
                <span style={{ fontSize: 12, color: '#7c786e', whiteSpace: 'nowrap' }}>{new Date(r.date).toLocaleDateString()}</span>
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 12, fontSize: 13, color: '#b6b2a6' }}>
                <span>{r.mileage?.toLocaleString()} km</span>
                {r.cost > 0 && <span>· ${Number(r.cost).toLocaleString()}</span>}
                <span>· {r.workshop || 'Taller no registrado'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DiagnosticoTab({ vehicleId }: { vehicleId?: string }) {
  const items = useVehicleRecords('/diagnostics', vehicleId)
  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      <_h2>Diagnóstico</_h2>
      {!items.length ? <_empty msg="Sin diagnósticos registrados" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((d, i) => (
            <div key={i} style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700 }}>{d.alert_type}</span>
                <span style={{ color: d.severity === 'critical' ? '#ef4444' : d.severity === 'warning' ? '#f59e0b' : '#22c55e', fontWeight: 700, fontSize: 12 }}>{d.severity}</span>
              </div>
              <div style={{ color: '#b6b2a6', fontSize: 13, marginTop: 6 }}>{d.description}</div>
              <div style={{ fontSize: 12, color: '#7c786e', marginTop: 6 }}>{new Date(d.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PartesTab({ vehicleId }: { vehicleId?: string }) {
  const items = useVehicleRecords('/parts', vehicleId)
  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      <_h2>Control de partes</_h2>
      {!items.length ? <_empty msg="Sin partes registradas" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
          {items.map((p, i) => (
            <div key={i} style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontWeight: 700 }}>{p.name}</div>
              <div style={{ color: '#b6b2a6', fontSize: 12 }}>{p.part_number}</div>
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: p.status === 'ok' ? '#22c55e' : p.status === 'worn' ? '#f59e0b' : p.status === 'critical' ? '#ef4444' : '#7c786e' }}>{p.status}</span>
              </div>
              {p.mileage_installed && <div style={{ fontSize: 11, color: '#7c786e', marginTop: 4 }}>instalado a los {p.mileage_installed?.toLocaleString()} km</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GaleriaTab({ vehicleId }: { vehicleId?: string }) {
  const imgs = useVehicleRecords('/gallery', vehicleId)
  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      <_h2>Galería</_h2>
      {!imgs.length ? <_empty msg="Sin imágenes" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
          {imgs.map((g, i) => (
            <div key={i} style={{ borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
              <img src={g.image_url} alt={g.caption || ''} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
              {g.caption && <div style={{ padding: '6px 10px', fontSize: 12, color: '#b6b2a6' }}>{g.caption}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CertificadosTab({ vehicleId }: { vehicleId?: string }) {
  const items = useVehicleRecords('/certificates', vehicleId)
  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      <_h2>Certificados</_h2>
      {!items.length ? <_empty msg="Sin certificados" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((c, i) => (
            <div key={i} style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 700 }}>{c.name}</div>
                {c.expiry_date && <span style={{ fontSize: 11, color: '#7c786e', whiteSpace: 'nowrap' }}>vence {new Date(c.expiry_date).toLocaleDateString()}</span>}
              </div>
              <div style={{ color: '#b6b2a6', fontSize: 12, marginTop: 4 }}>expedido por {c.issued_by}</div>
              <div style={{ marginTop: 6, display: 'flex', gap: 8, fontSize: 12 }}>
                {c.file_url && (
                  <a href={c.file_url} target="_blank" rel="noreferrer" style={{ color: '#F5C518', fontWeight: 600 }}>
                    Ver documento →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DocumentosTab({ vehicleId }: { vehicleId?: string }) {
  const items = useVehicleRecords('/documents', vehicleId)
  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      <_h2>Documentos</_h2>
      {!items.length ? <_empty msg="Sin documentos" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((d, i) => (
            <div key={i} style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700 }}>{d.name}</div>
                <span style={{ fontSize: 11, color: '#7c786e' }}>{d.type}</span>
              </div>
              <div style={{ color: '#b6b2a6', fontSize: 13, marginTop: 4 }}>{d.notes}</div>
              {d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 8, color: '#F5C518', fontWeight: 600, fontSize: 13 }}>Abrir →</a>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TallerTab({ vehicleId }: { vehicleId?: string }) {
  const items = useVehicleRecords('/service-logs', vehicleId)
  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      <_h2>Taller — Bitácora de servicio</_h2>
      {!items.length ? <_empty msg="Sin entradas de taller" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((s, i) => (
            <div key={i} style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700 }}>Entrada #{s.id?.slice(0, 8)}</div>
                <span style={{ fontSize: 11, color: '#7c786e' }}>{new Date(s.created_at).toLocaleDateString()}</span>
              </div>
              <div style={{ color: '#b6b2a6', fontSize: 13, marginTop: 4 }}>{s.log_text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Sub-components ── */
function _h2({ children }: { children: string }) {
  return <h2 style={{ fontFamily: "'Anton',sans-serif", fontSize: 24, letterSpacing: '.01em', margin: '0 0 18px', textTransform: 'uppercase' }}>{children}</h2>
}
function _empty({ msg }: { msg: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 40, color: '#7c786e', fontSize: 14, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 16 }}>
      {msg}
    </div>
  )
}

export default function AppPage() {
  const router = useRouter()
  const { user, loading, profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('ficha')
  const [vehicle, setVehicle] = useState<any>(null)
  const [vehicleLoading, setVehicleLoading] = useState(true)
  const [showProfile, setShowProfile] = useState(false)
  const [editName, setEditName] = useState('')
  const [editModelo, setEditModelo] = useState('')
  const [editTipo, setEditTipo] = useState('Sedán')
  const [editAnio, setEditAnio] = useState(2026)
  const [editColor, setEditColor] = useState('')

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/'); return }
    setVehicleLoading(true)
    apiGet('/vehicles').then((data) => {
      if (data?.length) setVehicle(data[0])
      setVehicleLoading(false)
    })
  }, [user, loading])

  useEffect(() => {
    if (!showProfile) return
    setEditName(vehicle?.owner || profile?.full_name || '')
    setEditModelo(`${vehicle?.brand || ''} ${vehicle?.model || ''}`.trim())
    setEditTipo(vehicle?.type || 'Sedán')
    setEditAnio(vehicle?.year || 2026)
    setEditColor(vehicle?.color || '')
  }, [showProfile, vehicle, profile])

  if (loading || !user) return null

  const ownerName = vehicle?.owner || profile?.full_name || 'Usuario'
  const initial = profile?.full_name?.charAt(0) || ownerName.charAt(0) || '?'

  const VEHICLE_TYPES = ['Sedán', 'SUV', 'Camioneta', 'Moto', 'Deportivo', 'Hatchback', 'Pickup', 'Furgoneta']
  const YEARS: number[] = []
  for (let y = 2026; y >= 2005; y--) YEARS.push(y)

  const handleSaveProfile = async () => {
    if (!vehicle?.id) return
    const nameParts = editModelo.split(' ')
    const brand = nameParts[0] || ''
    const model = nameParts.slice(1).join(' ') || editModelo
    await Promise.all([
      editName !== profile?.full_name ? apiPut('/auth/me', { full_name: editName }) : Promise.resolve(),
      apiPut(`/vehicles/${vehicle.id}`, { brand, model, year: editAnio, type: editTipo, color: editColor }),
    ])
    setVehicle((prev: any) => prev ? { ...prev, owner: editName, brand, model, year: editAnio, type: editTipo, color: editColor } : prev)
    setShowProfile(false)
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#060606', display: 'flex' }}>
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        vehicle={vehicle ? {
          modelo: `${vehicle.brand} ${vehicle.model}`.trim() || 'Mi vehículo',
          anio: vehicle.year,
          tipo: vehicle.type,
          color: vehicle.color,
          owner: vehicle.owner,
        } : null}
        plateText={vehicle?.plate}
        city={vehicle?.city}
        vehicleLoading={vehicleLoading}
      />

      <div style={{
        marginLeft: 266, flex: 1, padding: '44px clamp(24px,4vw,56px) 72px',
        position: 'relative', minHeight: '100vh',
        background: 'radial-gradient(ellipse at 0 -40%, rgba(245,197,24,0.04) 0%, transparent 55%)',
      }}>
        {/* Top-right profile button */}
        <div style={{ position: 'absolute', top: 20, right: 'clamp(24px,4vw,56px)', zIndex: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => setShowProfile(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 14px 6px 6px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(20,20,20,0.8)', backdropFilter: 'blur(12px)', color: '#f5f3ec', cursor: 'pointer', transition: 'all .16s' }}>
            <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#F5C518', color: '#111', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{initial}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{ownerName}</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', paddingTop: 10 }}>
          {activeTab === 'ficha' ? <FichaTab vehicle={vehicle} /> :
           activeTab === 'historial' ? <HistorialTab vehicleId={vehicle?.id} /> :
           activeTab === 'diagnostico' ? <DiagnosticoTab vehicleId={vehicle?.id} /> :
           activeTab === 'partes' ? <PartesTab vehicleId={vehicle?.id} /> :
           activeTab === 'galeria' ? <GaleriaTab vehicleId={vehicle?.id} /> :
           activeTab === 'certificados' ? <CertificadosTab vehicleId={vehicle?.id} /> :
           activeTab === 'documentos' ? <DocumentosTab vehicleId={vehicle?.id} /> :
           activeTab === 'taller' ? <TallerTab vehicleId={vehicle?.id} /> :
           <FichaTab vehicle={vehicle} />}
        </div>
      </div>

      {/* Profile modal */}
      {showProfile && (
        <div onClick={() => setShowProfile(false)} style={{ position: 'fixed', inset: 0, zIndex: 72, background: 'rgba(4,4,4,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 460, maxWidth: '94vw', maxHeight: '88vh', overflowY: 'auto', background: '#141414', border: '1px solid rgba(245,197,24,0.3)', borderRadius: 22, padding: 24, boxShadow: '0 40px 90px rgba(0,0,0,.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 48, height: 48, borderRadius: '50%', background: '#F5C518', color: '#111', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19 }}>{initial}</span>
                <div>
                  <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 22, textTransform: 'uppercase', lineHeight: 1 }}>Mi perfil</div>
                  <div style={{ fontSize: 12, color: '#7c786e' }}>{profile?.email}</div>
                </div>
              </div>
              <button onClick={() => setShowProfile(false)} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', color: '#b6b2a6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, marginBottom: 10 }}>Datos del usuario</div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 11, color: '#9a968a', fontWeight: 600, display: 'block', marginBottom: 5 }}>Nombre completo</label>
              <input value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 14, outline: 'none' }} />
            </div>
            <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700, marginBottom: 10 }}>Datos del vehículo</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#9a968a', fontWeight: 600, display: 'block', marginBottom: 5 }}>Modelo / línea</label>
                <input value={editModelo} onChange={e => setEditModelo(e.target.value)} placeholder="Ej. Mazda 3 Grand Touring" style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 14, outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#9a968a', fontWeight: 600, display: 'block', marginBottom: 5 }}>Tipo</label>
                <select value={editTipo} onChange={e => setEditTipo(e.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 14, outline: 'none', cursor: 'pointer' }}>
                  {VEHICLE_TYPES.map(vt => <option key={vt} value={vt}>{vt}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#9a968a', fontWeight: 600, display: 'block', marginBottom: 5 }}>Año</label>
                <select value={editAnio} onChange={e => setEditAnio(Number(e.target.value))} style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 14, outline: 'none', cursor: 'pointer' }}>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#9a968a', fontWeight: 600, display: 'block', marginBottom: 5 }}>Color</label>
                <input value={editColor} onChange={e => setEditColor(e.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 14, outline: 'none' }} />
              </div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'rgba(245,197,24,0.08)', border: '1px dashed rgba(245,197,24,0.32)' }}>
              <span style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700 }}>Placa</span>
              <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 20, color: '#F5C518', letterSpacing: '.05em' }}>{vehicle?.plate}</span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#7c786e' }} />
              <span style={{ fontSize: 13, color: '#b6b2a6' }}>{vehicle?.city}</span>
            </div>
            <button onClick={handleSaveProfile} style={{ marginTop: 18, width: '100%', padding: 13, borderRadius: 12, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Guardar cambios</button>
            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <button onClick={() => setShowProfile(false)} style={{ flex: 1, padding: 13, borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#a8a496', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => { setShowProfile(false); signOut() }} style={{ padding: '13px 18px', borderRadius: 12, border: '1px solid rgba(255,55,55,0.3)', background: 'rgba(255,55,55,0.08)', color: '#ff4d6a', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
