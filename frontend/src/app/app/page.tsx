'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/store/auth'
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api'
import { useMaintenance, useParts } from '@/lib/hooks'
import Sidebar from '@/components/Sidebar'
import HistoryStack from '@/components/HistoryStack'
import ServiceFormModal from '@/components/ServiceFormModal'
import PartFormModal from '@/components/PartFormModal'
import QuickRegisterModal from '@/components/QuickRegisterModal'
import CertificadosTab from '@/components/CertificadosTab'
import DocumentosTab from '@/components/DocumentosTab'
import GaleriaTab from '@/components/GaleriaTab'
import DiagnosticoTab from '@/components/DiagnosticoTab'

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

/* ── Countdown hook ──
   `targetMs` must be referentially stable across renders (memoize it at the call
   site) — recomputing `Date.now() + …` inline on every render feeds the effect a
   "new" dependency each time, which retriggers tick()'s setState and blows the
   render loop ("Maximum update depth exceeded"). */
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

function FichaTab({ vehicle, onAddService, onEditService, refreshKey }: { vehicle: any; onAddService: () => void; onEditService: (r: any) => void; refreshKey?: number }) {
  const { records: maintenance, latest } = useMaintenance(vehicle?.id)
  const [flipped, setFlipped] = useState(false)

  const currentKm = latest?.mileage
  const nextServiceKm = latest?.next_service_mileage
  const hasCountdown = latest?.next_service_mileage != null && currentKm != null
  const countdownTarget = useMemo(() => (hasCountdown ? Date.now() + 7 * 86400000 : 0), [hasCountdown])
  const cd = useCountdown(countdownTarget)

  if (!vehicle) return <_empty msg="Registra un vehículo primero" />

  const p = getPreset(vehicle.color)
  const totalServ = maintenance.length
  const kmToNext = nextServiceKm != null && currentKm != null ? Math.max(0, nextServiceKm - currentKm) : null
  const progWidth = nextServiceKm != null && currentKm != null ? `${Math.min(100, (currentKm / nextServiceKm) * 100)}%` : '0%'

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>Ficha técnica digital</div>
            <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: 'clamp(30px,3.8vw,46px)', letterSpacing: '.01em', margin: '8px 0 8px', textTransform: 'uppercase' }}>Estado del vehículo</h1>
            <p style={{ color: '#b6b2a6', margin: '0 0 16px', maxWidth: '60ch', fontSize: 14 }}>Tarjeta viva de mantenimiento. Se actualiza sola con cada servicio.</p>
          </div>
          <button onClick={onAddService} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 12, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 0 20px rgba(245,197,24,0.35)', whiteSpace: 'nowrap' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Agregar servicio
          </button>
        </div>
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

                <div style={{ margin: '18px 0 4px' }}>
                  <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: p.muted, fontWeight: 700 }}>Kilometraje actual</div>
                  <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 54, letterSpacing: '.01em', lineHeight: 1, color: p.ink }}>
                    {currentKm != null ? currentKm.toLocaleString() : '—'}<span style={{ fontSize: 20, color: p.muted, fontFamily: "'Inter'", fontWeight: 600 }}> km</span>
                  </div>
                </div>

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

                {maintenance.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: p.muted, fontWeight: 700, margin: '16px 0 7px' }}>Servicios realizados · pasa el cursor para el detalle</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
                      {maintenance.slice(0, 6).map((r, i) => (
                        <div key={i} onClick={() => onEditService(r)} style={{ padding: '8px 10px', borderRadius: 10, background: p.chipBg, border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'all .15s' }}
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
                    <div key={i} onClick={() => onEditService(r)} style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
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
      </div>
    </div>
  )
}

function HistorialTab({ vehicleId, onAddService, onEditService, refreshKey }: { vehicleId?: string; onAddService: () => void; onEditService: (r: any) => void; refreshKey?: number }) {
  const { records, loading, reload } = useMaintenance(vehicleId)
  useEffect(() => { if (vehicleId) reload() }, [vehicleId, reload, refreshKey])

  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <_h2>Historial de mantenimiento</_h2>
        <button onClick={onAddService} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 12, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 0 20px rgba(245,197,24,0.35)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Agregar servicio
        </button>
      </div>
      {!loading && records.length === 0 ? <_empty msg="Aún no hay registros" /> : (
        <HistoryStack records={records} onEdit={onEditService} />
      )}
    </div>
  )
}

function PartesTab({ vehicleId }: { vehicleId?: string }) {
  const { parts, loading, reload } = useParts(vehicleId)
  const [showForm, setShowForm] = useState(false)
  const [editPart, setEditPart] = useState<any>(null)

  const onAdd = useCallback(() => { setEditPart(null); setShowForm(true) }, [])
  const onEdit = useCallback((p: any) => { setEditPart(p); setShowForm(true) }, [])
  const onClose = useCallback(() => { setShowForm(false); setEditPart(null) }, [])
  const onSaved = useCallback(() => { reload() }, [reload])

  const statusColor = (s: string) => s === 'ok' ? '#22c55e' : s === 'worn' ? '#f59e0b' : s === 'critical' ? '#ef4444' : '#7c786e'
  const statusLabel = (s: string) => s === 'ok' ? 'Bien' : s === 'worn' ? 'Desgastada' : s === 'critical' ? 'Crítica' : 'Sin datos'

  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <_h2>Control de partes</_h2>
        <button onClick={onAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 12, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 0 20px rgba(245,197,24,0.35)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Agregar parte
        </button>
      </div>
      {!loading && parts.length === 0 ? <_empty msg="Sin partes registradas" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
          {parts.map((part: any) => (
            <div key={part.id} onClick={() => onEdit(part)} style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
              <div style={{ fontWeight: 700 }}>{part.name}</div>
              {part.part_number && <div style={{ color: '#b6b2a6', fontSize: 12 }}>{part.part_number}</div>}
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: statusColor(part.status) }}>{statusLabel(part.status)}</span>
              </div>
              {part.mileage_installed && <div style={{ fontSize: 11, color: '#7c786e', marginTop: 4 }}>instalado a los {part.mileage_installed?.toLocaleString()} km</div>}
            </div>
          ))}
        </div>
      )}
      {showForm && vehicleId && (
        <PartFormModal vehicleId={vehicleId} editPart={editPart} onClose={onClose} onSaved={() => { onSaved(); onClose() }} />
      )}
    </div>
  )
}

function TallerTab({ vehicleId }: { vehicleId?: string }) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!vehicleId) { setLoading(false); return }
    setLoading(true)
    apiGet(`/service-logs/vehicle/${vehicleId}`).then(d => { if (d) setItems(d) }).finally(() => setLoading(false))
  }, [vehicleId])

  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      <_h2>Taller — Bitácora de servicio</_h2>
      {!loading && items.length === 0 ? <_empty msg="Sin entradas de taller" /> : (
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
  return <h2 style={{ fontFamily: "'Anton',sans-serif", fontSize: 24, letterSpacing: '.01em', margin: 0, textTransform: 'uppercase' }}>{children}</h2>
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
  const [showForm, setShowForm] = useState(false)
  const [editRecord, setEditRecord] = useState<any>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showNfc, setShowNfc] = useState(false)
  const [nfcTokens, setNfcTokens] = useState<any[]>([])
  const [nfcLoading, setNfcLoading] = useState(false)
  const [tokensLoading, setTokensLoading] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [genCopied, setGenCopied] = useState(false)
  const [showQuickRegister, setShowQuickRegister] = useState(false)
  const [appToast, setAppToast] = useState<string | null>(null)

  const flashApp = useCallback((msg: string) => {
    setAppToast(msg)
    setTimeout(() => setAppToast(null), 2600)
  }, [])

  const toggleNfcActive = useCallback(async () => {
    if (!vehicle?.id) return
    const result = await apiPatch(`/vehicles/${vehicle.id}/nfc-toggle`, {})
    if (result) {
      setVehicle((prev: any) => ({ ...prev, nfc_active: result.nfc_active }))
      flashApp(result.nfc_active ? 'Ficha pública activada' : 'Ficha pública oculta')
    }
  }, [vehicle?.id, flashApp])

  useEffect(() => {
    if (!showNfc || !user) return
    setTokensLoading(true)
    setGeneratedUrl('')
    apiGet('/nfc/tokens').then(data => {
      if (data) setNfcTokens(data)
      setTokensLoading(false)
    })
  }, [showNfc, user])

  const generateNfcToken = async () => {
    if (!user) return
    setNfcLoading(true)
    setGeneratedUrl('')
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    const rawToken = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
    const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawToken))
    const hashArr = new Uint8Array(hashBuf)
    const tokenHash = Array.from(hashArr).map(b => b.toString(16).padStart(2, '0')).join('')
    const tokenPrefix = rawToken.slice(0, 8)
    const data = await apiPost('/nfc/tokens', { token_hash: tokenHash, token_prefix: tokenPrefix })
    if (data) {
      setNfcTokens(prev => [data, ...prev])
      setGeneratedUrl(`${window.location.origin}/nfc/${rawToken}`)
    }
    setNfcLoading(false)
  }

  const revokeNfcToken = async (id: string) => {
    const ok = await apiDelete(`/nfc/tokens/${id}`)
    if (ok) setNfcTokens(prev => prev.filter(t => t.id !== id))
  }

  const onAddService = useCallback(() => {
    setEditRecord(null)
    setShowForm(true)
  }, [])

  const onEditService = useCallback((r: any) => {
    setEditRecord(r)
    setShowForm(true)
  }, [])

  const onCloseForm = useCallback(() => {
    setShowForm(false)
    setEditRecord(null)
  }, [])

  const onSaved = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/'); return }
    setVehicleLoading(true)
    apiGet('/vehicles').then((data) => {
      if (data?.length) setVehicle(data[0])
      setVehicleLoading(false)
    })
  }, [user, loading, router])

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
          owner: ownerName,
        } : null}
        plateText={vehicle?.plate}
        city={vehicle?.city}
        vehicleLoading={vehicleLoading}
        onLogout={signOut}
        accountType={profile?.account_type || undefined}
      />

      <div style={{
        marginLeft: 266, flex: 1, padding: '44px clamp(24px,4vw,56px) 72px',
        position: 'relative', minHeight: '100vh',
        background: 'radial-gradient(ellipse at 0 -40%, rgba(245,197,24,0.04) 0%, transparent 55%)',
      }}>
        {/* Top-right action buttons */}
        <div style={{ position: 'absolute', top: 20, right: 'clamp(24px,4vw,56px)', zIndex: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => setShowQuickRegister(true)} title="Registro rápido"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', height: 46, borderRadius: 13, border: '1px solid rgba(245,197,24,0.35)', background: 'rgba(20,20,20,0.8)', backdropFilter: 'blur(12px)', color: '#F5C518', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all .16s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F5C518'; e.currentTarget.style.color = '#111' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(20,20,20,0.8)'; e.currentTarget.style.color = '#F5C518' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Registro rápido
          </button>

          <button onClick={() => setShowNfc(f => !f)} title="Llavero NFC"
            style={{ position: 'relative', width: 46, height: 46, borderRadius: 13, border: showNfc ? '1px solid #F5C518' : '1px solid rgba(245,197,24,0.35)', background: showNfc ? 'rgba(245,197,24,0.2)' : 'rgba(20,20,20,0.8)', backdropFilter: 'blur(12px)', color: showNfc ? '#fff' : '#F5C518', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .16s' }}
            onMouseEnter={e => { if (!showNfc) { e.currentTarget.style.background = '#F5C518'; e.currentTarget.style.color = '#111' } }}
            onMouseLeave={e => { if (!showNfc) { e.currentTarget.style.background = 'rgba(20,20,20,0.8)'; e.currentTarget.style.color = '#F5C518' } }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
            {nfcTokens.length > 0 && (
              <span style={{ position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: '50%', background: '#F5C518', color: '#111', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0a0a0a' }}>{nfcTokens.length}</span>
            )}
          </button>

          <button onClick={() => setShowProfile(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 14px 6px 6px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(20,20,20,0.8)', backdropFilter: 'blur(12px)', color: '#f5f3ec', cursor: 'pointer', transition: 'all .16s' }}>
            <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#F5C518', color: '#111', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{initial}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{ownerName}</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', paddingTop: 10 }}>
          {activeTab === 'ficha' ? <FichaTab vehicle={vehicle} onAddService={onAddService} onEditService={onEditService} refreshKey={refreshKey} /> :
           activeTab === 'historial' ? <HistorialTab vehicleId={vehicle?.id} onAddService={onAddService} onEditService={onEditService} refreshKey={refreshKey} /> :
           activeTab === 'diagnostico' ? <DiagnosticoTab vehicleId={vehicle?.id} /> :
           activeTab === 'partes' ? <PartesTab vehicleId={vehicle?.id} /> :
           activeTab === 'galeria' ? <GaleriaTab vehicleId={vehicle?.id} /> :
           activeTab === 'certificados' ? <CertificadosTab vehicleId={vehicle?.id} refreshKey={refreshKey} /> :
           activeTab === 'documentos' ? <DocumentosTab vehicleId={vehicle?.id} refreshKey={refreshKey} /> :
           activeTab === 'taller' ? <TallerTab vehicleId={vehicle?.id} /> :
           <FichaTab vehicle={vehicle} onAddService={onAddService} onEditService={onEditService} refreshKey={refreshKey} />}
        </div>

        {/* App-level toast */}
        {appToast && (
          <div style={{ position: 'fixed', left: '50%', bottom: 34, zIndex: 60, transform: 'translateX(-50%)', animation: 'toastIn .4s both', display: 'flex', gap: 11, alignItems: 'center', padding: '14px 24px', borderRadius: 999, background: 'rgba(16,16,16,0.94)', backdropFilter: 'blur(14px)', border: '1px solid rgba(245,197,24,0.5)', color: '#fff8e6', fontWeight: 600, fontSize: 14 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            </span>
            {appToast}
          </div>
        )}
      </div>

      {/* Service form modal */}
      {showForm && vehicle?.id && (
        <ServiceFormModal
          vehicleId={vehicle.id}
          editRecord={editRecord}
          onClose={onCloseForm}
          onSaved={onSaved}
        />
      )}

      {/* Profile right panel */}
      {showProfile && (
        <div onClick={() => setShowProfile(false)} style={{ position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 72, background: 'rgba(4,4,4,0.72)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'flex-end', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 420, maxWidth: '100vw', height: '100%', overflowY: 'auto', background: '#141414', borderLeft: '1px solid rgba(245,197,24,0.3)', borderRadius: 0, boxShadow: '-40px 0 90px rgba(0,0,0,.6)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, padding: '20px 24px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 18 }}>
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
            <div style={{ flex: 1, padding: '0 24px 24px', overflowY: 'auto' }}>
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
        </div>
      )}

      {/* NFC llavero panel */}
      {showNfc && (
        <div onClick={() => { setShowNfc(false); setGeneratedUrl(''); setGenCopied(false) }} style={{ position: 'fixed', inset: 0, zIndex: 72, background: 'rgba(4,4,4,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 520, maxWidth: '94vw', maxHeight: '88vh', overflowY: 'auto', background: '#141414', border: '1px solid rgba(245,197,24,0.3)', borderRadius: 22, padding: 24, boxShadow: '0 40px 90px rgba(0,0,0,.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(245,197,24,0.14)', border: '2px solid #F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5C518' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
                </span>
                <div>
                  <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 20, textTransform: 'uppercase', lineHeight: 1.1 }}>Llavero NFC</div>
                  <div style={{ fontSize: 11, color: '#7c786e', marginTop: 2 }}>Ficha pública de tu vehículo</div>
                </div>
              </div>
              <button onClick={() => { setShowNfc(false); setGeneratedUrl(''); setGenCopied(false) }} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', color: '#b6b2a6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div style={{ padding: 16, borderRadius: 14, background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.25)', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#d8c98a', lineHeight: 1.5 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.8" style={{ flex: '0 0 auto', marginTop: 1 }}><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
                <span>Al tocar tu llavero NFC contra el teléfono, se abre la ficha técnica al instante. El taller la actualiza en segundos.</span>
              </div>
            </div>

            {/* Public NFC page visibility toggle */}
            <div style={{ marginBottom: 16, padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>Ficha pública</div>
                <div style={{ fontSize: 11, color: '#7c786e', lineHeight: 1.4 }}>
                  {vehicle?.nfc_active !== false ? 'Visible al escanear el llavero NFC.' : 'Oculta — el llavero no mostrará la ficha.'}
                </div>
              </div>
              <button onClick={toggleNfcActive} role="switch" aria-checked={vehicle?.nfc_active !== false}
                title={vehicle?.nfc_active !== false ? 'Desactivar ficha pública' : 'Activar ficha pública'}
                style={{ position: 'relative', width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer', flex: '0 0 auto', background: vehicle?.nfc_active !== false ? '#2ecc71' : 'rgba(255,255,255,0.15)', transition: 'background .2s' }}>
                <span style={{ position: 'absolute', top: 2, left: vehicle?.nfc_active !== false ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.4)' }} />
              </button>
            </div>

            {/* Generate / show new token */}
            <div style={{ marginBottom: 16, padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700 }}>Tus llaveros activos</div>
                <button onClick={generateNfcToken} disabled={nfcLoading}
                  style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(245,197,24,0.35)', background: nfcLoading ? 'rgba(245,197,24,0.1)' : 'rgba(245,197,24,0.15)', color: nfcLoading ? '#998a4a' : '#F5C518', fontSize: 12, fontWeight: 700, cursor: nfcLoading ? 'default' : 'pointer', transition: 'all .16s' }}>
                  {nfcLoading ? 'Generando…' : '+ Nuevo llavero'}
                </button>
              </div>

              {tokensLoading ? (
                <div style={{ fontSize: 12, color: '#7c786e', padding: '10px 0' }}>Cargando…</div>
              ) : nfcTokens.length === 0 && !generatedUrl ? (
                <div style={{ fontSize: 12, color: '#7c786e', padding: '10px 0', lineHeight: 1.5 }}>
                  Aún no has generado ningún llavero. Presiona <b style={{ color: '#b6b2a6' }}>+ Nuevo llavero</b> para crear uno.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {nfcTokens.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: t.is_active ? 'rgba(46,204,113,0.05)' : 'rgba(255,55,55,0.05)', border: t.is_active ? '1px solid rgba(46,204,113,0.2)' : '1px solid rgba(255,55,55,0.15)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: t.is_active ? '#2ecc71' : '#ff4d6a', fontWeight: 700 }}>{t.token_prefix}…</span>
                        <span style={{ fontSize: 11, color: '#7c786e' }}>
                          {t.is_active ? `${t.access_count} accesos` : 'Revocado'}
                          {t.last_accessed_at && ` · última vez ${new Date(t.last_accessed_at).toLocaleDateString()}`}
                        </span>
                      </div>
                      {t.is_active && (
                        <button onClick={() => revokeNfcToken(t.id)} title="Revocar"
                          style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(255,55,55,0.3)', background: 'rgba(255,55,55,0.08)', color: '#ff4d6a', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                          Revocar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {generatedUrl && (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: 'rgba(245,197,24,0.1)', border: '2px solid #F5C518' }}>
                  <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700, marginBottom: 6 }}>¡Nuevo llavero generado!</div>
                  <div style={{ fontSize: 12, color: '#b6b2a6', marginBottom: 8, lineHeight: 1.4 }}>
                    Este enlace es la <b>única vez que se muestra</b>. Copialo ahora para programar tu chip NFC:
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                    <input readOnly value={generatedUrl} onClick={e => (e.target as HTMLInputElement).select()}
                      style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(245,197,24,0.4)', background: 'rgba(0,0,0,0.4)', color: '#F5C518', fontSize: 11, fontFamily: "'JetBrains Mono',monospace", outline: 'none', cursor: 'text' }} />
                    <button onClick={() => { navigator.clipboard.writeText(generatedUrl).then(() => { setGenCopied(true); setTimeout(() => setGenCopied(false), 2000) }).catch(() => {}) }}
                      style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: genCopied ? '#2ecc71' : '#F5C518', color: '#111', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .2s' }}>
                      {genCopied ? 'Copiado ✓' : 'Copiar enlace'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12, color: '#b6b2a6', lineHeight: 1.55 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(245,197,24,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', marginTop: 1, color: '#F5C518', fontSize: 10, fontWeight: 800 }}>1</span>
                <span>Genera el enlace único en esta pantalla y copialo.</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(245,197,24,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', marginTop: 1, color: '#F5C518', fontSize: 10, fontWeight: 800 }}>2</span>
                <span>El taller escribe el enlace en tu llavero NFC con un programador compatible.</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(245,197,24,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', marginTop: 1, color: '#F5C518', fontSize: 10, fontWeight: 800 }}>3</span>
                <span>Al acercar el llavero al teléfono, se abre tu ficha técnica al instante. Sin apps, sin búsquedas.</span>
              </div>
            </div>

            <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: 'rgba(46,204,113,0.06)', border: '1px solid rgba(46,204,113,0.25)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
              <div style={{ fontSize: 12, color: '#5be89a', lineHeight: 1.4 }}>
                <b style={{ fontWeight: 700 }}>Seguro por diseño.</b> El token de 256 bits se hashea con SHA-256 antes de almacenarse. El backend nunca ve la clave original. El endpoint público solo expone placa, modelo y color — nunca datos del dueño.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick register modal */}
      {showQuickRegister && vehicle?.id && (
        <QuickRegisterModal
          vehicleId={vehicle.id}
          onClose={() => setShowQuickRegister(false)}
          onSuccess={flashApp}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}
