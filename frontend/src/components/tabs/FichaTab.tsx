'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useMaintenance } from '@/lib/hooks'
import { apiGet, apiPut } from '@/lib/api'
import { uploadFile } from '@/lib/upload'
import { useCountdown } from '@/lib/hooks'
import { getWalletBackground } from '@/lib/wallet-bg'
import type { Vehicle, MaintenanceRecord, NfcToken } from '@/lib/types'

const TALLER_INFO = {
  name: 'Tecnicentro La 80',
  rating: 4.8,
  reviews: 214,
  address: 'Cra 70 #80-24, Bogotá D.C.',
  phone: '+57 311 456 7890',
  hours: 'Lun–Sáb · 7:00 a.m. a 6:00 p.m.',
  warranty: 'Garantía 5.000 km / 6 meses',
  web: 'tallerdeconfianza.com',
}

function ServiceChip({ icon, title, desc, cChipBg, cChipBd, cMuted, titleColor = '#c99a00' }: {
  icon: ReactNode; title: string; desc: string; cChipBg: string; cChipBd: string; cMuted: string; titleColor?: string
}) {
  const [hover, setHover] = useState(false)
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ overflow: 'hidden', maxHeight: hover ? 96 : 38, background: hover ? 'rgba(245,197,24,0.08)' : cChipBg, border: `1px solid ${hover ? 'rgba(245,197,24,0.5)' : cChipBd}`, borderRadius: 11, padding: '9px 11px', transition: 'max-height .3s cubic-bezier(0.22,1,0.36,1),border-color .18s,background .18s', cursor: 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: titleColor, fontSize: 12, fontWeight: 700 }}>{icon}{title}</div>
      <div style={{ fontSize: 11, color: cMuted, marginTop: 6, lineHeight: 1.35, opacity: hover ? 1 : 0, transition: 'opacity .2s' }}>{desc}</div>
    </div>
  )
}

interface FichaTabProps {
  vehicle: Vehicle | null
  onAddService: () => void
  onEditService: (r: MaintenanceRecord) => void
  onOpenPublicar: () => void
  nfcTokens: NfcToken[]
  toggleNfcActive: () => void
  refreshKey?: number
  theme: 'light' | 'dark'
}

export default function FichaTab({ vehicle, onAddService, onEditService, onOpenPublicar, nfcTokens, toggleNfcActive, refreshKey, theme }: FichaTabProps) {
  const { records: maintenance, latest } = useMaintenance(vehicle?.id)
  const [flipped, setFlipped] = useState(false)
  const [workshopLogo, setWorkshopLogo] = useState<string>('')
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!vehicle?.id) return
    apiGet('/workshops/me').then((w: any) => {
      if (w?.logo_url) setWorkshopLogo(w.logo_url)
    }).catch(() => {})
  }, [vehicle?.id])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadFile(file, 'workshops')
    if (url) {
      setWorkshopLogo(url)
      await apiPut('/workshops/me', { logo_url: url })
    }
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const currentKm = latest?.mileage
  const nextServiceKm = latest?.next_service_mileage
  const hasCountdown = latest?.next_service_mileage != null && currentKm != null
  const countdownTarget = Date.now() + (hasCountdown ? 7 : 90) * 86400000
  const cd = useCountdown(countdownTarget)

  if (!vehicle) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)', fontSize: 14, border: '1px dashed var(--border-2)', borderRadius: 16 }}>
      Registra un vehículo primero
    </div>
  )

  const totalServ = maintenance.length
  const kmToNext = nextServiceKm != null && currentKm != null ? Math.max(0, nextServiceKm - currentKm) : null
  const progWidth = nextServiceKm != null && currentKm != null ? `${Math.min(100, (currentKm / nextServiceKm) * 100)}%` : '0%'

  const baseKm = currentKm ?? 0
  const nextServiceDisp = nextServiceKm ?? baseKm + 5000
  const kmToNextDisp = Math.max(0, nextServiceDisp - baseKm)
  const progWidthDisp = nextServiceDisp > 0 ? `${Math.min(100, (baseKm / nextServiceDisp) * 100)}%` : '0%'

  const stamps = ['Aceite', 'Filtros', 'Frenos', 'Llantas', 'Suspensión', 'Batería'].map((label, i) => ({
    label,
    on: i < maintenance.length,
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

  const walletBg = getWalletBackground(vehicle, theme)
  const preset = { css: walletBg, dark: theme === 'dark' }
  const cDark = preset.dark
  const cInk = cDark ? '#f5f3ec' : '#141414'
  const cSoft = cDark ? '#c9c6ba' : '#4a463c'
  const cMuted = cDark ? '#8f8a7a' : '#6f6a5f'
  const cChipBg = cDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
  const cChipBd = cDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'

  const tDark = theme !== 'light'
  const sInk = tDark ? '#f5f3ec' : '#17171a'
  const sMuted = tDark ? '#8f8a7a' : '#6f6a5f'
  const sBorder = tDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.10)'
  const tableroBg = walletBg
  const tableroDivider = tDark ? 'rgba(255,255,255,0.07)' : 'rgba(17,17,17,0.09)'
  const tableroTrack = tDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.10)'
  const tallerBg = tDark ? 'linear-gradient(155deg,#1c1708 0%,#171307 60%,#0d0d0d 100%)' : 'linear-gradient(155deg,#fff8e6 0%,#fdf6e3 60%,#f4efe0 100%)'

  const gaugeInnerBg = tDark ? 'radial-gradient(circle at 50% 35%,#1a1d24,#0c0d11)' : 'radial-gradient(circle at 50% 35%,#f5f3ec,#e8e5dc)'
  const gaugeTrack = tDark ? 'rgba(255,255,255,0.07)' : 'rgba(17,17,17,0.08)'
  const gaugeBorder = tDark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,17,0.08)'
  const odometerBg = tDark ? '#08090c' : '#f0ede4'
  const odometerShadow = tDark ? 'inset 0 2px 10px rgba(0,0,0,.7)' : 'inset 0 1px 4px rgba(0,0,0,.08)'
  const statCardBg = tDark ? '#101216' : '#f7f6f2'
  const statCardBorder = tDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.10)'
  const statCardText = tDark ? '#fff' : '#17171a'
  const alertBadgeBg = tDark ? 'rgba(0,0,0,0.4)' : 'rgba(46,204,113,0.08)'
  const countdownBg = tDark ? 'rgba(0,0,0,0.4)' : 'rgba(17,17,17,0.05)'
  const scanLines = tDark ? 'rgba(255,255,255,0.02)' : 'rgba(17,17,17,0.015)'
  const odometerLabel = tDark ? '#6f6a5f' : '#7a756a'

  const oilPct = 85
  const oilColor = oilPct > 40 ? '#F5C518' : '#ff6b6b'
  const oilDeg = Math.round((oilPct / 100) * 270)
  const healthPct = 92
  const healthColor = healthPct >= 80 ? '#22c55e' : healthPct >= 50 ? '#ffb020' : '#ff4d6a'
  const healthLabel = healthPct >= 80 ? 'Óptimo' : healthPct >= 50 ? 'Regular' : 'Atención'
  const healthDeg = Math.round((healthPct / 100) * 270)
  const rawPlate = vehicle.plate || '—'
  const plateText = rawPlate.length > 6 ? `${rawPlate.slice(0, 3)}-${rawPlate.slice(3)}` : rawPlate
  const kmRun = Math.max(0, (currentKm || 0) - (maintenance[maintenance.length - 1]?.mileage || 0))

  return (
    <div style={{ animation: 'sectionIn .55s cubic-bezier(0.22,1,0.36,1) both', maxWidth: 1000 }}>
      <div style={{ marginBottom: 22, animation: 'textIn .5s .04s both' }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>Ficha técnica digital</div>
          <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: 'clamp(30px,3.8vw,46px)', letterSpacing: '.01em', margin: '8px 0 8px', textTransform: 'uppercase' }}>Estado del vehículo</h1>
          <p style={{ color: '#b6b2a6', margin: 0, maxWidth: '60ch', fontSize: 14 }}>Tarjeta viva de mantenimiento. Se actualiza sola con cada servicio.</p>
        </div>
      </div>

      {/* TABLERO VEHICULAR */}
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 22, marginBottom: 20, padding: 22, background: tableroBg, border: '1px solid rgba(245,197,24,0.22)', boxShadow: tDark ? 'inset 0 1px 0 rgba(255,255,255,0.06),0 24px 60px rgba(0,0,0,.5)' : 'inset 0 1px 0 rgba(255,255,255,0.6),0 20px 50px rgba(0,0,0,.12)', animation: 'textIn .5s .05s both' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `repeating-linear-gradient(90deg,${scanLines} 0 1px,transparent 1px 3px)`, opacity: 0.5 }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 800 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M12 3a9 9 0 0 0-9 9h3M12 3v3M21 12a9 9 0 0 0-9-9"/><path d="M18.4 6.6 15 10"/></svg>Tablero del vehículo
          </div>
          <div title="Alertas que requieren atención inmediata" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999, background: alertBadgeBg, border: '1px solid #2ecc71', cursor: 'help' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2ecc71', boxShadow: '0 0 8px #2ecc71' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#2ecc71' }}>0 urgentes</span>
          </div>
        </div>

        <div className="tablero-grid" style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1.15fr 1fr', gap: 16, alignItems: 'center' }}>
          {/* GAUGE: Vida del aceite */}
          <div title="Vida útil restante del aceite" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'help' }}>
            <div className="gauge-container" style={{ position: 'relative', width: 170, height: 170, borderRadius: '50%', background: `conic-gradient(from 135deg, ${oilColor} 0deg ${oilDeg}deg, ${gaugeTrack} ${oilDeg}deg 270deg, transparent 270deg 360deg)`, filter: 'drop-shadow(0 0 14px rgba(245,197,24,0.25))' }}>
              <div className="gauge-inner" style={{ position: 'absolute', inset: '14px', borderRadius: '50%', background: gaugeInnerBg, border: `1px solid ${gaugeBorder}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill={oilColor} style={{ marginBottom: 2 }}><path d="M12 2c-3 4-6 7-6 11a6 6 0 0 0 12 0c0-4-3-7-6-11z"/></svg>
                <div className="gauge-percent" style={{ fontFamily: "'Anton',sans-serif", fontSize: 34, lineHeight: 1, color: oilColor }}>{oilPct}%</div>
                <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: odometerLabel, fontWeight: 700, marginTop: 3 }}>Vida aceite</div>
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: sMuted }}>{latest?.lubricant_type || 'Sintético 5W-30'}</div>
          </div>

          {/* ODÓMETRO CENTRAL */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: sMuted, fontWeight: 700 }}>Odómetro</div>
            <div title="Kilometraje total actual del vehículo" style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, margin: '6px 0 4px', padding: '10px 18px', borderRadius: 12, background: odometerBg, border: '1px solid rgba(245,197,24,0.3)', boxShadow: odometerShadow, cursor: 'help' }}>
              <span className="odometer-value" style={{ fontFamily: "'Anton',sans-serif", fontWeight: 700, fontSize: 38, letterSpacing: '.08em', color: tDark ? '#F5C518' : '#1a1a1a', textShadow: tDark ? '0 0 14px rgba(245,197,24,0.55)' : 'none' }}>{currentKm != null ? currentKm.toLocaleString() : '—'}</span>
              <span style={{ fontSize: 14, color: odometerLabel, fontWeight: 600 }}>km</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 14 }}>
              <div title="Cantidad total de servicios" style={{ flex: 1, maxWidth: 130, padding: '10px 12px', borderRadius: 12, background: statCardBg, border: `1px solid ${statCardBorder}`, cursor: 'help' }}>
                <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 26, lineHeight: 1, color: statCardText }}>{totalServ}</div>
                <div style={{ fontSize: 10, color: odometerLabel, letterSpacing: '.06em' }}>servicios</div>
              </div>
              <div title="Kilómetros con CarLink" style={{ flex: 1, maxWidth: 130, padding: '10px 12px', borderRadius: 12, background: statCardBg, border: `1px solid ${statCardBorder}`, cursor: 'help' }}>
                <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 26, lineHeight: 1, color: statCardText }}>{kmRun.toLocaleString()}</div>
                <div style={{ fontSize: 10, color: odometerLabel, letterSpacing: '.06em' }}>km con CarLink</div>
              </div>
            </div>
          </div>

          {/* GAUGE: Salud del vehículo */}
          <div title="Estado general del vehículo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'help' }}>
            <div className="gauge-container" style={{ position: 'relative', width: 170, height: 170, borderRadius: '50%', background: `conic-gradient(from 135deg, ${healthColor} 0deg ${healthDeg}deg, ${gaugeTrack} ${healthDeg}deg 270deg, transparent 270deg 360deg)` }}>
              <div className="gauge-inner" style={{ position: 'absolute', inset: '14px', borderRadius: '50%', background: gaugeInnerBg, border: `1px solid ${gaugeBorder}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={healthColor} strokeWidth="1.8" style={{ marginBottom: 2 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
                <div className="gauge-percent" style={{ fontFamily: "'Anton',sans-serif", fontSize: 34, lineHeight: 1, color: healthColor }}>{healthPct}%</div>
                <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: odometerLabel, fontWeight: 700, marginTop: 3 }}>Salud</div>
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: healthColor }}>{healthLabel}</div>
          </div>
        </div>

        {/* Próximo mantenimiento */}
        <div style={{ position: 'relative', marginTop: 20, paddingTop: 18, borderTop: `1px solid ${tableroDivider}`, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div title="Kilometraje estimado del próximo mantenimiento" style={{ flex: 1, minWidth: 210, cursor: 'help' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: sMuted, fontWeight: 700 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.9"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>Próximo mantenimiento
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: sInk, margin: '5px 0 8px' }}>{nextServiceDisp.toLocaleString()} km · faltan {kmToNextDisp.toLocaleString()} km</div>
            <div style={{ height: 8, borderRadius: 6, background: tableroTrack, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: progWidthDisp, background: 'linear-gradient(90deg,#8a6a00,#F5C518,#FFD84D)', borderRadius: 6, transition: 'width .7s cubic-bezier(0.22,1,0.36,1)' }} />
            </div>
          </div>
          <div className="countdown-blocks" style={{ display: 'flex', gap: 8 }}>
            {['d', 'h', 'm', 's'].map(k => (
              <div key={k} style={{ textAlign: 'center', background: countdownBg, border: '1px solid rgba(245,197,24,0.25)', borderRadius: 11, padding: '8px 12px', minWidth: 54 }}>
                <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 26, color: '#F5C518', lineHeight: 1 }}>{(cd as any)[k]}</div>
                <div style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: odometerLabel }}>{k === 'd' ? 'días' : k === 'h' ? 'hrs' : k === 'm' ? 'min' : 'seg'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main grid: ficha (flip) + right column */}
      <div className="fichagrid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,0.85fr)', gap: 22, alignItems: 'start' }}>
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
            <div className="flip-card-front" style={{
              position: 'relative', minHeight: 486,
              backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
              borderRadius: 24, overflow: 'hidden',
              border: '1px solid rgba(245,197,24,0.3)',
              padding: 24, display: 'flex', flexDirection: 'column',
              background: walletBg,
              boxShadow: flipped ? '0 16px 50px rgba(0,0,0,0.35)' : '0 24px 70px rgba(0,0,0,0.45)',
              transition: 'box-shadow .5s',
            }}>
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: bgGradient }} />
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                    <span style={{ width: 44, height: 44, flex: '0 0 auto', borderRadius: 11, overflow: 'hidden', background: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111', boxShadow: '0 4px 14px rgba(0,0,0,.3)' }}>
                      <svg width="23" height="23" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-3 4-6 7-6 11a6 6 0 0 0 12 0c0-4-3-7-6-11z"/></svg>
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: '#c99a00', fontWeight: 800 }}>CarLink Club · Socio</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: cInk, lineHeight: 1.1, marginTop: 2 }}>{latest?.lubricant_brand || '—'}</div>
                      <div style={{ fontSize: 12, color: cSoft }}>{latest?.lubricant_type || 'Sin datos de lubricante'}</div>
                    </div>
                  </div>
                  <button onClick={() => setFlipped(f => !f)} title="Dar vuelta a la ficha" style={{ flex: '0 0 auto', width: 38, height: 38, borderRadius: 11, border: '1px solid rgba(245,197,24,0.45)', background: 'rgba(245,197,24,0.12)', color: '#F5C518', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .18s' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
                  </button>
                </div>

                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {stamps.map((st, i) => (
                      <span key={i} title={st.label} style={{ width: 16, height: 16, borderRadius: '50%', background: st.on ? 'rgba(245,197,24,0.3)' : 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(245,197,24,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111' }}>
                        {st.on && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: cMuted, fontWeight: 700 }}>{totalServ} sellos · Nivel Oro</div>
                </div>

                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 13px', borderRadius: 999, background: 'rgba(245,197,24,0.14)', border: '1px solid rgba(245,197,24,0.4)', color: '#c99a00', fontSize: 12, fontWeight: 700 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#F5C518', boxShadow: '0 0 8px #F5C518' }}></span>
                    Mantenimiento al día
                  </span>
                  {latestDate && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: cMuted, fontWeight: 600 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                      {latestDate}
                    </span>
                  )}
                </div>

                <div style={{ margin: '18px 0 4px' }}>
                  <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: cMuted, fontWeight: 700 }}>Kilometraje actual</div>
                  <div className="ficha-mileage" style={{ fontFamily: "'Anton',sans-serif", fontSize: 54, letterSpacing: '.01em', lineHeight: 1, color: cInk }}>
                    {currentKm != null ? currentKm.toLocaleString() : '—'}<span style={{ fontSize: 20, color: cMuted, fontFamily: "'Inter'", fontWeight: 600 }}> km</span>
                  </div>
                </div>

                <div style={{ margin: '12px 0 6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: cSoft, marginBottom: 7 }}>
                    <span>Próximo servicio</span>
                    <span style={{ color: cInk, fontWeight: 600 }}>{nextServiceKm != null ? `${nextServiceKm.toLocaleString()} km · faltan ${kmToNext?.toLocaleString()} km` : '—'}</span>
                  </div>
                  <div style={{ height: 9, borderRadius: 6, background: cChipBg, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: progWidth, background: 'linear-gradient(90deg,#8a6a00,#F5C518,#FFD84D)', borderRadius: 6, transition: 'width .7s cubic-bezier(0.22,1,0.36,1)' }} />
                  </div>
                </div>

                <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: cMuted, fontWeight: 700, margin: '16px 0 7px' }}>Servicios realizados · pasa el cursor para el detalle</div>
                <div className="service-chips-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
                  <ServiceChip cChipBg={cChipBg} cChipBd={cChipBd} cMuted={cMuted}
                    icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flex: '0 0 auto' }}><path d="M12 2c-3 4-6 7-6 11a6 6 0 0 0 12 0c0-4-3-7-6-11z"/></svg>}
                    title="Aceite" desc={`${latest?.lubricant_brand || '—'} · ${latest?.lubricant_type || '—'}. Filtro de aceite cambiado.`} />
                  <ServiceChip cChipBg={cChipBg} cChipBd={cChipBd} cMuted={cMuted}
                    icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}><path d="M4 12h10a3 3 0 1 0-3-3M4 16h14a3 3 0 1 1-3 3"/></svg>}
                    title="Aire" desc="Filtro de aire reemplazado y flujo verificado." />
                  <ServiceChip cChipBg={cChipBg} cChipBd={cChipBd} cMuted={cMuted}
                    icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}><path d="M3 22h12V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/><path d="M15 8h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2"/></svg>}
                    title="Combustible" desc="Filtro de combustible e inyección revisados." />
                  <ServiceChip cChipBg={cChipBg} cChipBd={cChipBd} cMuted={cMuted}
                    icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" style={{ flex: '0 0 auto' }}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>}
                    title="Frenos" desc="Óptimo. Pastillas y discos inspeccionados." />
                  <ServiceChip cChipBg={cChipBg} cChipBd={cChipBd} cMuted={cMuted}
                    icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4"/></svg>}
                    title="Refrigerante" desc="Óptimo. Nivel y temperatura correctos." />
                  <ServiceChip cChipBg={cChipBg} cChipBd={cChipBd} cMuted={cMuted}
                    icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" style={{ flex: '0 0 auto' }}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/></svg>}
                    title="Llantas" desc="Presión y rotación verificadas. Labrado OK." />
                </div>

                <div style={{ flex: 1 }} />
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: cMuted, justifyContent: 'center' }}>
                  <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 13, color: '#c99a00', letterSpacing: '.02em' }}>CarLink</span>
                  <span>· ficha verificada · {plateText}</span>
                </div>
              </div>
            </div>

            {/* BACK — Tu taller de confianza */}
            <div className="flip-card-back" style={{
              position: 'absolute', inset: 0, minHeight: 486,
              backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              borderRadius: 24, overflow: 'hidden',
              border: '1px solid rgba(245,197,24,0.28)',
              padding: 26, display: 'flex', flexDirection: 'column',
              background: walletBg,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                  <span onClick={() => logoInputRef.current?.click()} title="Clic para cambiar logo del taller" style={{ width: 52, height: 52, borderRadius: 14, background: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: '#111', boxShadow: '0 0 20px rgba(245,197,24,0.4)', cursor: 'pointer', overflow: 'hidden', position: 'relative', flex: '0 0 auto' }}>
                    {workshopLogo ? (
                      <img src={workshopLogo} alt="Logo del taller" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <>TC</>
                    )}
                    <span style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity .18s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </span>
                  </span>
                  <div>
                    <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: '#c99a00', fontWeight: 800 }}>Tu taller de confianza</div>
                    <div style={{ fontSize: 19, fontWeight: 700, color: sInk }}>{latest?.workshop || TALLER_INFO.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#ffcf5a' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>
                      {TALLER_INFO.rating} <span style={{ color: '#6f6a5f' }}>· {TALLER_INFO.reviews} reseñas</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setFlipped(f => !f)} title="Volver a la ficha" style={{ flex: '0 0 auto', width: 38, height: 38, borderRadius: 11, border: '1px solid rgba(245,197,24,0.45)', background: 'rgba(245,197,24,0.12)', color: '#F5C518', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .18s' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
                </button>
              </div>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: sMuted }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.8" style={{ marginTop: 1, flex: '0 0 auto' }}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>{TALLER_INFO.address}</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.8" style={{ marginTop: 1, flex: '0 0 auto' }}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>{TALLER_INFO.hours}</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.8" style={{ marginTop: 1, flex: '0 0 auto' }}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/></svg>{TALLER_INFO.phone}</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: '#F5C518' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ marginTop: 1, flex: '0 0 auto' }}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>{TALLER_INFO.web}</div>
              </div>
              <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 14, background: 'linear-gradient(135deg,rgba(245,197,24,0.14),rgba(245,197,24,0.05))', border: '1px dashed rgba(245,197,24,0.4)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.6" style={{ flex: '0 0 auto' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
                <div><div style={{ fontWeight: 700, color: '#fff8e1', fontSize: 13 }}>Sello de garantía</div><div style={{ fontSize: 12, color: '#d8c98a' }}>{TALLER_INFO.warranty}</div></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" style={{ flex: '0 0 auto', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 11, background: 'linear-gradient(45deg,#F58529,#DD2A7B,#8134AF,#515BD4)', color: '#fff', textDecoration: 'none' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a>
                <a href="https://facebook.com" target="_blank" rel="noreferrer" style={{ flex: '0 0 auto', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 11, background: '#1877F2', color: '#fff', textDecoration: 'none' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>
                <a href={`https://${TALLER_INFO.web}`} target="_blank" rel="noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 11, background: '#25D366', color: '#062b12', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.1-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5 0a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.6-1.2.1-.2 0-.3 0-.5s-.5-1.3-.7-1.7-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3A2.8 2.8 0 0 0 6.5 9c0 1.7 1.2 3.3 1.4 3.5s2.4 3.7 5.9 5c2.1.8 2.5.6 3 .6s1.4-.6 1.6-1.1.2-1 .1-1.1-.3-.1-.5-.2z"/></svg>WhatsApp</a>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 18, textAlign: 'center', fontSize: 10.5, color: '#4a463c' }}>CarLink · ficha verificada · {plateText}</div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'textIn .5s .16s both' }}>
          <div style={{ borderRadius: 20, padding: 22, background: tableroBg, border: '1px solid rgba(245,197,24,0.22)', boxShadow: tDark ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : 'inset 0 1px 0 rgba(255,255,255,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', fontWeight: 700, color: tDark ? '#F5C518' : '#b8860a' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 8.5a6 6 0 0 1 12 0"/><path d="M3.5 11a9 9 0 0 1 17 0"/><circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none"/></svg>Vinculado a llavero NFC
            </div>
            <p style={{ margin: '10px 0 16px', fontSize: 13, color: sMuted, lineHeight: 1.55 }}>Al tocar tu llavero contra el teléfono, esta ficha aparece al instante. El taller la actualiza en segundos.</p>
            <button onClick={onAddService} style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 13, borderRadius: 12, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 0 24px rgba(245,197,24,0.4)', transition: 'all .2s' }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>Registrar nuevo servicio</button>
            <button onClick={onOpenPublicar} style={{ width: '100%', marginTop: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 12, borderRadius: 12, border: vehicle?.nfc_active !== false ? '1px solid rgba(46,204,113,0.4)' : '1px solid rgba(245,197,24,0.4)', background: vehicle?.nfc_active !== false ? 'rgba(46,204,113,0.08)' : 'rgba(245,197,24,0.06)', color: vehicle?.nfc_active !== false ? '#2ecc71' : '#F5C518', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all .18s' }}>{vehicle?.nfc_active !== false ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 3.9M15.4 6.6l-6.8 3.9"/></svg>}{vehicle?.nfc_active !== false ? 'Ver ficha pública' : 'Publicar ficha pública'}</button>

          </div>
        </div>
      </div>
    </div>
  )
}
