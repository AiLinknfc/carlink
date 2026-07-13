'use client'

import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/store/auth'
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api'
import { uploadFile } from '@/lib/upload'
import { useMaintenance, useParts } from '@/lib/hooks'
import Sidebar from '@/components/Sidebar'
import BgParticles from '@/components/BgParticles'
import HistoryStack from '@/components/HistoryStack'
import ServiceFormModal from '@/components/ServiceFormModal'
import PartFormModal from '@/components/PartFormModal'
import QuickRegisterModal from '@/components/QuickRegisterModal'
import CertificadosTab from '@/components/CertificadosTab'
import DocumentosTab from '@/components/DocumentosTab'
import GaleriaTab from '@/components/GaleriaTab'
import DiagnosticoTab from '@/components/DiagnosticoTab'

/* ── Wallet background presets (identical to V2) ── */
const BG_PRESETS: { id: string; label: string; dark: boolean; css: string }[] = [
  { id: 'noche', label: 'Noche', dark: true, css: 'linear-gradient(155deg,#1c1708 0%,#141414 55%,#0d0d0d 100%)' },
  { id: 'ambar', label: 'Ámbar', dark: true, css: 'linear-gradient(135deg,#4a3a08 0%,#1a1712 60%,#0d0d0d 100%)' },
  { id: 'humo', label: 'Humo', dark: true, css: 'linear-gradient(160deg,#2b2b2b 0%,#161616 55%,#0d0d0d 100%)' },
  { id: 'destello', label: 'Destello', dark: true, css: 'radial-gradient(120% 90% at 15% 0%,#3a2f08 0%,#141414 45%,#0b0b0b 100%)' },
  { id: 'nitro', label: 'Nitro', dark: true, css: 'linear-gradient(135deg,#04212b 0%,#0d1418 55%,#0a0a0a 100%)' },
  { id: 'nfc', label: 'NFC', dark: true, css: 'linear-gradient(155deg,#3d3008 0%,#1a1712 45%,#141414 100%)' },
  { id: 'blanco', label: 'Blanco', dark: false, css: 'linear-gradient(155deg,#ffffff 0%,#f3f1ea 60%,#e7e3d6 100%)' },
  { id: 'papel', label: 'Marfil', dark: false, css: 'linear-gradient(135deg,#fbf7ec 0%,#f1ead6 100%)' },
  { id: 'nieve', label: 'Nieve', dark: false, css: 'radial-gradient(120% 90% at 85% 0%,#fff7db 0%,#ffffff 45%,#eef0f2 100%)' },
]

/* ── Workshop demo data for the flip-card back (identical to V2) ── */
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

/* ── Service chip that expands on hover (identical to V2) ── */
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

function FichaTab({ vehicle, onAddService, onEditService, onOpenPublicar, nfcTokens, toggleNfcActive, refreshKey, theme }: { vehicle: any; onAddService: () => void; onEditService: (r: any) => void; onOpenPublicar: () => void; nfcTokens: any[]; toggleNfcActive: () => void; refreshKey?: number; theme: 'light' | 'dark' }) {
  const { records: maintenance, latest } = useMaintenance(vehicle?.id)
  const [flipped, setFlipped] = useState(false)
  const [bgPreset, setBgPreset] = useState('noche')
  const [showBgMenu, setShowBgMenu] = useState(false)
  const [soatDoc, setSoatDoc] = useState<any>(null)
  const [rtmDoc, setRtmDoc] = useState<any>(null)
  const [workshopLogo, setWorkshopLogo] = useState<string>('')
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!vehicle?.id) return
    apiGet(`/documents/vehicle/${vehicle.id}`).then((docs: any[]) => {
      if (!docs) return
      const soat = docs.find((d: any) => d.type === 'soat')
      const rtm = docs.find((d: any) => d.type === 'rtm')
      setSoatDoc(soat || null)
      setRtmDoc(rtm || null)
    })
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
  // Tablero siempre muestra el próximo mantenimiento + contador (como en V2)
  const countdownTarget = useMemo(() => Date.now() + (hasCountdown ? 7 : 90) * 86400000, [hasCountdown])
  const cd = useCountdown(countdownTarget)

  if (!vehicle) return <_empty msg="Registra un vehículo primero" />

  const totalServ = maintenance.length
  const kmToNext = nextServiceKm != null && currentKm != null ? Math.max(0, nextServiceKm - currentKm) : null
  const progWidth = nextServiceKm != null && currentKm != null ? `${Math.min(100, (currentKm / nextServiceKm) * 100)}%` : '0%'

  // Valores de visualización: usan datos reales o un estimado (+5.000 km) cuando faltan
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

  // Wallet preset drives the flip-card front background + text tone (identical to V2)
  const preset = BG_PRESETS.find(b => b.id === bgPreset) || BG_PRESETS[0]
  const cDark = preset.dark
  const cInk = cDark ? '#f5f3ec' : '#141414'
  const cSoft = cDark ? '#c9c6ba' : '#4a463c'
  const cMuted = cDark ? '#8f8a7a' : '#6f6a5f'
  const cChipBg = cDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
  const cChipBd = cDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'

  // Topbar theme drives every OTHER ficha card (tablero, taller-back, NFC, wallet).
  // Only the flip-front "CarLink Club · Socio" uses the wallet preset above.
  const tDark = theme !== 'light'
  const sInk = tDark ? '#f5f3ec' : '#17171a'
  const sMuted = tDark ? '#8f8a7a' : '#6f6a5f'
  const sBorder = tDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.10)'
  const cardBg = tDark ? '#141414' : '#ffffff'
  const nfcBg = tDark ? 'linear-gradient(155deg,rgba(245,197,24,0.14),rgba(20,20,20,0.6))' : 'linear-gradient(155deg,rgba(245,197,24,0.18),rgba(255,255,255,0.92))'
  const tableroBg = tDark ? 'radial-gradient(130% 120% at 50% -10%,#20232b 0%,#111318 45%,#0a0b0e 100%)' : 'radial-gradient(130% 120% at 50% -10%,#ffffff 0%,#f2f0ea 55%,#e7e4da 100%)'
  const tableroDivider = tDark ? 'rgba(255,255,255,0.07)' : 'rgba(17,17,17,0.09)'
  const tableroTrack = tDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.10)'
  const tallerBg = tDark ? 'linear-gradient(155deg,#1c1708 0%,#171307 60%,#0d0d0d 100%)' : 'linear-gradient(155deg,#fff8e6 0%,#fdf6e3 60%,#f4efe0 100%)'

  // Tablero deep surfaces — theme-aware
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

  // Tablero gauges (demo health/oil life, identical look to V2)
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
      {/* Header */}
      <div style={{ marginBottom: 22, animation: 'textIn .5s .04s both' }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>Ficha técnica digital</div>
          <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: 'clamp(30px,3.8vw,46px)', letterSpacing: '.01em', margin: '8px 0 8px', textTransform: 'uppercase' }}>Estado del vehículo</h1>
          <p style={{ color: '#b6b2a6', margin: 0, maxWidth: '60ch', fontSize: 14 }}>Tarjeta viva de mantenimiento. Se actualiza sola con cada servicio.</p>
        </div>
      </div>

      {/* ===== TABLERO VEHICULAR ===== */}
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 22, marginBottom: 20, padding: 22, background: tableroBg, border: '1px solid rgba(245,197,24,0.22)', boxShadow: tDark ? 'inset 0 1px 0 rgba(255,255,255,0.06),0 24px 60px rgba(0,0,0,.5)' : 'inset 0 1px 0 rgba(255,255,255,0.6),0 20px 50px rgba(0,0,0,.12)', animation: 'textIn .5s .05s both' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `repeating-linear-gradient(90deg,${scanLines} 0 1px,transparent 1px 3px)`, opacity: 0.5 }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 800 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M12 3a9 9 0 0 0-9 9h3M12 3v3M21 12a9 9 0 0 0-9-9"/><path d="M18.4 6.6 15 10"/></svg>Tablero del vehículo
          </div>
          <div title="Alertas que requieren atención inmediata (frenos, fluidos críticos, revisiones vencidas). En verde no hay pendientes urgentes." style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999, background: alertBadgeBg, border: '1px solid #2ecc71', cursor: 'help' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2ecc71', boxShadow: '0 0 8px #2ecc71' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#2ecc71' }}>0 urgentes</span>
          </div>
        </div>

        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1.15fr 1fr', gap: 16, alignItems: 'center' }}>
          {/* GAUGE: Vida del aceite */}
          <div title="Vida útil restante del aceite según el kilometraje recorrido desde el último cambio. Al llegar a 0% toca cambiarlo." style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'help' }}>
            <div style={{ position: 'relative', width: 170, height: 170, borderRadius: '50%', background: `conic-gradient(from 135deg, ${oilColor} 0deg ${oilDeg}deg, ${gaugeTrack} ${oilDeg}deg 270deg, transparent 270deg 360deg)`, filter: 'drop-shadow(0 0 14px rgba(245,197,24,0.25))' }}>
              <div style={{ position: 'absolute', inset: '14px', borderRadius: '50%', background: gaugeInnerBg, border: `1px solid ${gaugeBorder}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill={oilColor} style={{ marginBottom: 2 }}><path d="M12 2c-3 4-6 7-6 11a6 6 0 0 0 12 0c0-4-3-7-6-11z"/></svg>
                <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 34, lineHeight: 1, color: oilColor }}>{oilPct}%</div>
                <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: odometerLabel, fontWeight: 700, marginTop: 3 }}>Vida aceite</div>
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: sMuted }}>{latest?.lubricant_type || 'Sintético 5W-30'}</div>
          </div>

          {/* ODÓMETRO CENTRAL */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: sMuted, fontWeight: 700 }}>Odómetro</div>
            <div title="Kilometraje total actual del vehículo, tomado del último servicio registrado." style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, margin: '6px 0 4px', padding: '10px 18px', borderRadius: 12, background: odometerBg, border: '1px solid rgba(245,197,24,0.3)', boxShadow: odometerShadow, cursor: 'help' }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 38, letterSpacing: '.08em', color: tDark ? '#F5C518' : '#1a1a1a', textShadow: tDark ? '0 0 14px rgba(245,197,24,0.55)' : 'none' }}>{currentKm != null ? currentKm.toLocaleString() : '—'}</span>
              <span style={{ fontSize: 14, color: odometerLabel, fontWeight: 600 }}>km</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 14 }}>
              <div title="Cantidad total de servicios de mantenimiento registrados en esta ficha." style={{ flex: 1, maxWidth: 130, padding: '10px 12px', borderRadius: 12, background: statCardBg, border: `1px solid ${statCardBorder}`, cursor: 'help' }}>
                <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 26, lineHeight: 1, color: statCardText }}>{totalServ}</div>
                <div style={{ fontSize: 10, color: odometerLabel, letterSpacing: '.06em' }}>servicios</div>
              </div>
              <div title="Kilómetros recorridos desde tu primer servicio registrado en CarLink." style={{ flex: 1, maxWidth: 130, padding: '10px 12px', borderRadius: 12, background: statCardBg, border: `1px solid ${statCardBorder}`, cursor: 'help' }}>
                <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 26, lineHeight: 1, color: statCardText }}>{kmRun.toLocaleString()}</div>
                <div style={{ fontSize: 10, color: odometerLabel, letterSpacing: '.06em' }}>km con CarLink</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
              {soatDoc ? (
                <a href={soatDoc.file_url || '#'} target="_blank" rel="noreferrer" title="SOAT vigente — toca para abrir" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.4)', fontSize: 10, fontWeight: 700, color: '#5be89a', cursor: 'pointer', textDecoration: 'none' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M20 6L9 17l-5-5"/></svg><span>SOAT</span></a>
              ) : (
                <button onClick={() => onAddService()} title="SOAT no registrado — toca para agregar" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, background: 'rgba(255,176,32,0.1)', border: '1px solid rgba(255,176,32,0.4)', fontSize: 10, fontWeight: 700, color: '#ffcf5a', cursor: 'pointer' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 9v4M12 17h.01"/></svg><span>SOAT</span></button>
              )}
              {rtmDoc ? (
                <a href={rtmDoc.file_url || '#'} target="_blank" rel="noreferrer" title="RTM vigente — toca para abrir" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.4)', fontSize: 10, fontWeight: 700, color: '#5be89a', cursor: 'pointer', textDecoration: 'none' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M20 6L9 17l-5-5"/></svg><span>RTM</span></a>
              ) : (
                <button onClick={() => onAddService()} title="RTM no registrado — toca para agregar" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, background: 'rgba(255,176,32,0.1)', border: '1px solid rgba(255,176,32,0.4)', fontSize: 10, fontWeight: 700, color: '#ffcf5a', cursor: 'pointer' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 9v4M12 17h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg><span>RTM</span></button>
              )}
            </div>
          </div>

          {/* GAUGE: Salud del vehículo */}
          <div title="Estado general del vehículo combinando mantenimientos al día, partes en buen estado y ausencia de alertas." style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'help' }}>
            <div style={{ position: 'relative', width: 170, height: 170, borderRadius: '50%', background: `conic-gradient(from 135deg, ${healthColor} 0deg ${healthDeg}deg, ${gaugeTrack} ${healthDeg}deg 270deg, transparent 270deg 360deg)` }}>
              <div style={{ position: 'absolute', inset: '14px', borderRadius: '50%', background: gaugeInnerBg, border: `1px solid ${gaugeBorder}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={healthColor} strokeWidth="1.8" style={{ marginBottom: 2 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
                <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 34, lineHeight: 1, color: healthColor }}>{healthPct}%</div>
                <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: odometerLabel, fontWeight: 700, marginTop: 3 }}>Salud</div>
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: healthColor }}>{healthLabel}</div>
          </div>
        </div>

        {/* Próximo mantenimiento + cuenta regresiva (siempre visible, como en V2) */}
        <div style={{ position: 'relative', marginTop: 20, paddingTop: 18, borderTop: `1px solid ${tableroDivider}`, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div title="Kilometraje estimado del próximo mantenimiento y cuánto falta. La barra muestra tu avance hacia esa cita." style={{ flex: 1, minWidth: 210, cursor: 'help' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: sMuted, fontWeight: 700 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.9"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>Próximo mantenimiento
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: sInk, margin: '5px 0 8px' }}>{nextServiceDisp.toLocaleString()} km · faltan {kmToNextDisp.toLocaleString()} km</div>
            <div style={{ height: 8, borderRadius: 6, background: tableroTrack, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: progWidthDisp, background: 'linear-gradient(90deg,#8a6a00,#F5C518,#FFD84D)', borderRadius: 6, transition: 'width .7s cubic-bezier(0.22,1,0.36,1)' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
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
            <div style={{
              position: 'relative', minHeight: 486,
              backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
              borderRadius: 24, overflow: 'hidden',
              border: '1px solid rgba(245,197,24,0.3)',
              padding: 24, display: 'flex', flexDirection: 'column',
              background: preset.css,
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
                  <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 54, letterSpacing: '.01em', lineHeight: 1, color: cInk }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
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

            {/* BACK — Tu taller de confianza (Deslízala para ver quién te atendió) */}
            <div style={{
              position: 'absolute', inset: 0, minHeight: 486,
              backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              borderRadius: 24, overflow: 'hidden',
              border: '1px solid rgba(245,197,24,0.28)',
              padding: 26, display: 'flex', flexDirection: 'column',
              background: tallerBg,
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
          {/* NFC card — el fondo sigue el tema del topbar */}
          <div style={{ borderRadius: 20, padding: 22, background: nfcBg, border: '1px solid rgba(245,197,24,0.28)', boxShadow: tDark ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : 'inset 0 1px 0 rgba(255,255,255,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', fontWeight: 700, color: tDark ? '#F5C518' : '#b8860a' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 8.5a6 6 0 0 1 12 0"/><path d="M3.5 11a9 9 0 0 1 17 0"/><circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none"/></svg>Vinculado a llavero NFC
            </div>
            <p style={{ margin: '10px 0 16px', fontSize: 13, color: sMuted, lineHeight: 1.55 }}>Al tocar tu llavero contra el teléfono, esta ficha aparece al instante. El taller la actualiza en segundos.</p>
            <button onClick={onAddService} style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 13, borderRadius: 12, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 0 24px rgba(245,197,24,0.4)', transition: 'all .2s' }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>Registrar nuevo servicio</button>
            <button onClick={onOpenPublicar} style={{ width: '100%', marginTop: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 12, borderRadius: 12, border: vehicle?.nfc_active !== false ? '1px solid rgba(46,204,113,0.4)' : '1px solid rgba(245,197,24,0.4)', background: vehicle?.nfc_active !== false ? 'rgba(46,204,113,0.08)' : 'rgba(245,197,24,0.06)', color: vehicle?.nfc_active !== false ? '#2ecc71' : '#F5C518', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all .18s' }}>{vehicle?.nfc_active !== false ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 3.9M15.4 6.6l-6.8 3.9"/></svg>}{vehicle?.nfc_active !== false ? 'Ver ficha pública' : 'Publicar ficha pública'}</button>
            <button style={{ width: '100%', marginTop: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 12, borderRadius: 12, border: '1px solid rgba(245,197,24,0.4)', background: 'rgba(245,197,24,0.06)', color: '#F5C518', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all .18s' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-6 9 6v11a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>Pedir llavero NFC a domicilio</button>
          </div>

          {/* WALLET / PERSONALIZAR */}
          <div style={{ borderRadius: 20, padding: 20, background: cardBg, border: `1px solid ${sBorder}`, boxShadow: tDark ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : 'inset 0 1px 0 rgba(255,255,255,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', fontWeight: 700, color: tDark ? '#F5C518' : '#b8860a' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.4" fill="currentColor" stroke="none"/></svg>Ficha para Wallet
            </div>
            <p style={{ margin: '9px 0 14px', fontSize: 13, color: sMuted, lineHeight: 1.5 }}>Descarga un pase con diseño de billetera digital, listo para guardar en tu teléfono.</p>
            <div style={{ fontSize: 11, color: sMuted, margin: '0 0 8px', fontWeight: 600 }}>Fondo del pase</div>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowBgMenu(m => !m)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 11, cursor: 'pointer', background: tDark ? 'rgba(255,255,255,0.03)' : 'rgba(17,17,17,0.03)', border: `1px solid ${sBorder}`, color: sInk, fontSize: 13, fontWeight: 600, transition: 'border-color .16s' }}>
                <span style={{ width: 34, height: 24, flex: '0 0 auto', borderRadius: 7, background: preset.css, border: '1px solid rgba(128,128,128,0.3)' }} />
                <span style={{ flex: 1, textAlign: 'left' }}>{preset.label}</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              {showBgMenu && (
                <div style={{ position: 'absolute', zIndex: 9, left: 0, right: 0, top: 'calc(100% + 6px)', background: tDark ? '#1a1a1a' : '#ffffff', border: '1px solid rgba(245,197,24,0.3)', borderRadius: 12, padding: 10, boxShadow: '0 20px 50px rgba(0,0,0,.35)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7 }}>
                    {BG_PRESETS.map(bp => (
                      <button key={bp.id} onClick={() => { setBgPreset(bp.id); setShowBgMenu(false) }} title={bp.label} style={{ height: 34, borderRadius: 9, cursor: 'pointer', background: bp.css, outline: `2px solid ${bp.id === bgPreset ? '#F5C518' : 'transparent'}`, outlineOffset: 1, border: '1px solid rgba(255,255,255,0.16)', transition: 'outline .15s' }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 10, borderRadius: 11, border: `1px dashed ${sBorder}`, background: tDark ? 'rgba(255,255,255,0.03)' : 'rgba(17,17,17,0.03)', color: sMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="M21 15l-5-5L5 21"/></svg>Fondo propio<input type="file" accept="image/*" style={{ display: 'none' }} /></label>
              <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 10, borderRadius: 11, border: `1px dashed ${sBorder}`, background: tDark ? 'rgba(255,255,255,0.03)' : 'rgba(17,17,17,0.03)', color: sMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10"/><path d="M2 19h20"/><circle cx="12" cy="8" r="2"/></svg>Logo<input type="file" accept="image/*" style={{ display: 'none' }} /></label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => setBgPreset('noche')} style={{ flex: '0 0 auto', padding: '10px 14px', borderRadius: 11, border: `1px solid ${sBorder}`, background: tDark ? 'rgba(255,255,255,0.03)' : 'rgba(17,17,17,0.03)', color: sMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Reset</button>
              <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 11, borderRadius: 11, border: 'none', background: '#F5C518', color: '#111', fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: 'all .18s' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>Descargar pase</button>
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
      <div style={{ marginBottom: 22, animation: 'textIn .5s .04s both' }}>
        <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>
          Bitácora del vehículo
        </div>
        <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: 'clamp(30px,3.8vw,46px)', letterSpacing: '.01em', margin: '8px 0 8px', textTransform: 'uppercase' }}>
          Historial de mantenimiento
        </h1>
        <p style={{ color: 'var(--text-2)', margin: 0, maxWidth: '60ch', fontSize: 14 }}>
          Registro completo de cada servicio realizado. Consulta fechas, costos y kilometraje de una mirada.
        </p>
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
      <div style={{ marginBottom: 22, animation: 'textIn .5s .04s both' }}>
        <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>
          INSPECCIÓN DEL VEHÍCULO
        </div>
        <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: 'clamp(30px,3.8vw,46px)', letterSpacing: '.01em', margin: '8px 0 8px', textTransform: 'uppercase' }}>
          Control de partes
        </h1>
        <p style={{ color: 'var(--text-2)', margin: 0, maxWidth: '60ch', fontSize: 14 }}>
          Estado de cada componente mecánico. Registra cambios, desgaste y vida útil de las piezas clave.
        </p>
      </div>
      <button onClick={onAdd}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 20px', borderRadius: 12,
          border: 'none', background: '#F5C518', color: '#111',
          fontWeight: 800, fontSize: 13, cursor: 'pointer',
          transition: 'all .16s',
          boxShadow: '0 0 20px rgba(245,197,24,0.35)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#e6b300' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#F5C518' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        Agregar parte
      </button>
      {!loading && parts.length === 0 ? <_empty msg="Sin partes registradas" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
          {parts.map((part: any) => (
            <div key={part.id} onClick={() => onEdit(part)} style={{ padding: 16, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              <div style={{ fontWeight: 700 }}>{part.name}</div>
              {part.part_number && <div style={{ color: 'var(--text-2)', fontSize: 12 }}>{part.part_number}</div>}
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: statusColor(part.status) }}>{statusLabel(part.status)}</span>
              </div>
              {part.mileage_installed && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>instalado a los {part.mileage_installed?.toLocaleString()} km</div>}
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
            <div key={i} style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700 }}>Entrada #{s.id?.slice(0, 8)}</div>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(s.created_at).toLocaleDateString()}</span>
              </div>
              <div style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 4 }}>{s.log_text}</div>
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
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)', fontSize: 14, border: '1px dashed var(--border-2)', borderRadius: 16 }}>
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
  const [sellEnabled, setSellEnabled] = useState(false)
  const [sellPrice, setSellPrice] = useState('')
  const [sellCity, setSellCity] = useState('')
  const [sellZip, setSellZip] = useState('')
  const [sellPhone, setSellPhone] = useState('')
  const [sellDescription, setSellDescription] = useState('')
  const [whatsappEnabled, setWhatsappEnabled] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState('')
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
  const [showCart, setShowCart] = useState(false)
  const [payMethod, setPayMethod] = useState('card')
  const [appToast, setAppToast] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [foundRequests, setFoundRequests] = useState<any[]>([])
  const [showFoundPanel, setShowFoundPanel] = useState(false)

  useEffect(() => {
    try { setTheme(window.localStorage.getItem('carlink_theme') === 'light' ? 'light' : 'dark') } catch { /* ignore */ }
  }, [])

  // Expose the theme to CSS variables so all tab cards follow the contrast
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    return () => { delete document.documentElement.dataset.theme }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light'
      try { window.localStorage.setItem('carlink_theme', next) } catch { /* ignore */ }
      return next
    })
  }, [])

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

  useEffect(() => {
    if (!user) return
    apiGet('/found-requests').then(data => {
      if (data) setFoundRequests(data)
    })
  }, [user])

  const markFoundRead = async (id: string) => {
    await apiPatch(`/found-requests/${id}/read`, {})
    setFoundRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'read' } : r))
  }

  const openPublicar = useCallback(() => {
    if (nfcTokens.length > 0) {
      const latest = nfcTokens[0]
      const raw = localStorage.getItem(`nfc_raw_${latest.id}`)
      if (raw) {
        window.open(`/nfc/${raw}`, '_blank')
        return
      }
    }
    flashApp('Genera un llavero NFC primero desde el panel')
  }, [nfcTokens, flashApp])

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
      localStorage.setItem(`nfc_raw_${data.id}`, rawToken)
      setNfcTokens(prev => [data, ...prev])
      setGeneratedUrl(`${window.location.origin}/nfc/${rawToken}`)
    }
    setNfcLoading(false)
  }

  const revokeNfcToken = async (id: string) => {
    const ok = await apiDelete(`/nfc/tokens/${id}`)
    if (ok) {
      localStorage.removeItem(`nfc_raw_${id}`)
      setNfcTokens(prev => prev.filter(t => t.id !== id))
    }
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
    setSellEnabled(vehicle?.sell_enabled || false)
    setSellPrice(vehicle?.sell_price || '')
    setSellCity(vehicle?.sell_city || '')
    setSellZip(vehicle?.sell_zip || '')
    setSellPhone(vehicle?.sell_phone || '')
    setSellDescription(vehicle?.sell_description || '')
    setWhatsappEnabled(profile?.whatsapp_enabled || false)
    setWhatsappNumber(profile?.whatsapp_number || '')
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
      apiPut('/auth/me', { full_name: editName, whatsapp_enabled: whatsappEnabled, whatsapp_number: whatsappNumber }),
      apiPut(`/vehicles/${vehicle.id}`, {
        brand, model, year: editAnio, type: editTipo, color: editColor,
        sell_enabled: sellEnabled, sell_price: sellPrice, sell_city: sellCity,
        sell_zip: sellZip, sell_phone: sellPhone, sell_description: sellDescription,
      }),
    ])
    setVehicle((prev: any) => prev ? { ...prev, owner: editName, brand, model, year: editAnio, type: editTipo, color: editColor, sell_enabled: sellEnabled, sell_price: sellPrice, sell_city: sellCity, sell_zip: sellZip, sell_phone: sellPhone, sell_description: sellDescription } : prev)
    setShowProfile(false)
  }

  const pageBg = theme === 'light' ? '#f7f6f2' : '#060606'
  const vignetteBg = theme === 'light'
    ? 'radial-gradient(circle at 50% 42%,transparent 40%,rgba(247,246,242,0.94) 100%)'
    : 'radial-gradient(circle at 50% 42%,transparent 40%,rgba(6,6,6,0.86) 100%)'
  const rootTextColor = theme === 'light' ? '#17171a' : '#f5f3ec'
  // Topbar glass buttons follow the theme (blancos en modo claro)
  const glassBg = theme === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(20,20,20,0.8)'
  const profileBtnBg = theme === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(20,20,20,0.8)'
  const profileBtnBorder = theme === 'light' ? 'rgba(17,17,17,0.1)' : 'rgba(255,255,255,0.12)'
  const profileBtnColor = theme === 'light' ? '#17171a' : '#f5f3ec'
  const tDark = theme !== 'light'

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: pageBg, color: rootTextColor, display: 'flex' }}>
      <BgParticles theme={theme} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', background: vignetteBg }} />
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
        theme={theme}
      />

      <div style={{
        marginLeft: 266, flex: 1, padding: '44px clamp(24px,4vw,56px) 72px',
        position: 'relative', zIndex: 2, minHeight: '100vh', color: rootTextColor,
        background: 'radial-gradient(ellipse at 0 -40%, rgba(245,197,24,0.04) 0%, transparent 55%)',
      }}>
        {/* Top-right action buttons */}
        <div style={{ position: 'absolute', top: 20, right: 'clamp(24px,4vw,56px)', zIndex: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={toggleTheme} title="Cambiar apariencia"
            style={{ width: 46, height: 46, borderRadius: 13, border: '1px solid rgba(245,197,24,0.35)', background: theme === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(20,20,20,0.82)', backdropFilter: 'blur(12px)', color: theme === 'light' ? '#17171a' : '#F5C518', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .16s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.6)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.35)' }}>
            {theme === 'light'
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M4.4 4.4l1.7 1.7M17.9 17.9l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.4 19.6l1.7-1.7M17.9 6.1l1.7-1.7"/></svg>
              : <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M20.7 14.9A9 9 0 1 1 9.1 3.3a7.2 7.2 0 0 0 11.6 11.6z"/></svg>}
          </button>

          <button onClick={() => setShowQuickRegister(true)} title="Registro rápido"
            style={{ width: 46, height: 46, borderRadius: 13, border: '1px solid rgba(245,197,24,0.35)', background: glassBg, backdropFilter: 'blur(12px)', color: '#F5C518', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .16s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F5C518'; e.currentTarget.style.color = '#111' }}
            onMouseLeave={e => { e.currentTarget.style.background = glassBg; e.currentTarget.style.color = '#F5C518' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          </button>

          <button onClick={() => setShowNfc(f => !f)} title="Llavero NFC"
            style={{ position: 'relative', width: 46, height: 46, borderRadius: 13, border: showNfc ? '1px solid #F5C518' : '1px solid rgba(245,197,24,0.35)', background: showNfc ? 'rgba(245,197,24,0.2)' : glassBg, backdropFilter: 'blur(12px)', color: showNfc ? (theme === 'light' ? '#17171a' : '#fff') : '#F5C518', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .16s' }}
            onMouseEnter={e => { if (!showNfc) { e.currentTarget.style.background = '#F5C518'; e.currentTarget.style.color = '#111' } }}
            onMouseLeave={e => { if (!showNfc) { e.currentTarget.style.background = glassBg; e.currentTarget.style.color = '#F5C518' } }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="10"/><path d="M6 12a6 6 0 0 1 6-6M8.5 12a3.5 3.5 0 0 1 3.5-3.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>
            {nfcTokens.length > 0 && (
              <span style={{ position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: '50%', background: '#F5C518', color: '#111', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid var(--bg, ${tDark ? '#141414' : '#f0efe8'})` }}>{nfcTokens.length}</span>
            )}
          </button>

          {foundRequests.filter(r => r.status === 'pending').length > 0 && (
            <button onClick={() => setShowFoundPanel(true)} title="Llaveros encontrados"
              style={{ position: 'relative', width: 46, height: 46, borderRadius: 13, border: '1px solid rgba(255,107,107,0.4)', background: glassBg, backdropFilter: 'blur(12px)', color: '#ff6b6b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .16s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.15)' }}
              onMouseLeave={e => { e.currentTarget.style.background = glassBg }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span style={{ position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: '50%', background: '#ff6b6b', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${tDark ? '#141414' : '#f0efe8'}` }}>{foundRequests.filter(r => r.status === 'pending').length}</span>
            </button>
          )}

          <button onClick={() => setShowCart(true)} title="Solicitar llavero NFC"
            style={{ position: 'relative', width: 46, height: 46, borderRadius: 13, border: '1px solid rgba(245,197,24,0.4)', background: profileBtnBg, backdropFilter: 'blur(12px)', color: theme === 'light' ? '#b8860a' : '#F5C518', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .16s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F5C518'; e.currentTarget.style.color = '#111' }}
            onMouseLeave={e => { e.currentTarget.style.background = profileBtnBg; e.currentTarget.style.color = theme === 'light' ? '#b8860a' : '#F5C518' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
          </button>

          <button onClick={() => setShowProfile(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 14px 6px 6px', borderRadius: 999, border: `1px solid ${profileBtnBorder}`, background: profileBtnBg, backdropFilter: 'blur(12px)', color: profileBtnColor, cursor: 'pointer', transition: 'all .16s' }}>
            <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#F5C518', color: '#111', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{initial}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{ownerName}</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', paddingTop: 10 }}>
          {activeTab === 'ficha' ? <FichaTab vehicle={vehicle} onAddService={onAddService} onEditService={onEditService} onOpenPublicar={openPublicar} nfcTokens={nfcTokens} toggleNfcActive={toggleNfcActive} refreshKey={refreshKey} theme={theme} /> :
           activeTab === 'historial' ? <HistorialTab vehicleId={vehicle?.id} onAddService={onAddService} onEditService={onEditService} refreshKey={refreshKey} /> :
           activeTab === 'diagnostico' ? <DiagnosticoTab vehicleId={vehicle?.id} /> :
           activeTab === 'partes' ? <PartesTab vehicleId={vehicle?.id} /> :
           activeTab === 'galeria' ? <GaleriaTab vehicleId={vehicle?.id} /> :
           activeTab === 'certificados' ? <CertificadosTab vehicleId={vehicle?.id} refreshKey={refreshKey} /> :
           activeTab === 'documentos' ? <DocumentosTab vehicleId={vehicle?.id} refreshKey={refreshKey} /> :
           activeTab === 'taller' ? <TallerTab vehicleId={vehicle?.id} /> :
           <FichaTab vehicle={vehicle} onAddService={onAddService} onEditService={onEditService} onOpenPublicar={openPublicar} nfcTokens={nfcTokens} toggleNfcActive={toggleNfcActive} refreshKey={refreshKey} theme={theme} />}
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
        <div onClick={() => setShowProfile(false)} style={{ position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 72, background: 'transparent', display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 420, maxWidth: 'calc(100vw - 32px)', height: 'calc(100vh - 32px)', margin: 16, overflowY: 'auto', background: 'var(--panel-bg)', borderRadius: 20, boxShadow: tDark ? '0 20px 60px rgba(0,0,0,.55), 0 0 0 1px rgba(245,197,24,0.12)' : '0 20px 60px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, padding: '20px 24px 0', borderBottom: '1px solid var(--panel-border)', paddingBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 48, height: 48, borderRadius: '50%', background: '#F5C518', color: '#111', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19 }}>{initial}</span>
                <div>
                  <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 22, textTransform: 'uppercase', lineHeight: 1 }}>Mi perfil</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{profile?.email}</div>
                </div>
              </div>
              <button onClick={() => setShowProfile(false)} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--btn-ghost-border)', background: 'var(--btn-ghost-bg)', color: 'var(--btn-ghost-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ flex: 1, padding: '0 24px 24px', overflowY: 'auto' }}>
              <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, marginBottom: 10 }}>Datos del usuario</div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Nombre completo</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: tDark ? '#f5f3ec' : '#17171a', fontSize: 14, outline: 'none' }} />
              </div>
              <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700, marginBottom: 10 }}>Datos del vehículo</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Modelo / línea</label>
                  <input value={editModelo} onChange={e => setEditModelo(e.target.value)} placeholder="Ej. Mazda 3 Grand Touring" style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: tDark ? '#f5f3ec' : '#17171a', fontSize: 14, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Tipo</label>
                  <select value={editTipo} onChange={e => setEditTipo(e.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: tDark ? '#f5f3ec' : '#17171a', fontSize: 14, outline: 'none', cursor: 'pointer' }}>
                    {VEHICLE_TYPES.map(vt => <option key={vt} value={vt}>{vt}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Año</label>
                  <select value={editAnio} onChange={e => setEditAnio(Number(e.target.value))} style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: tDark ? '#f5f3ec' : '#17171a', fontSize: 14, outline: 'none', cursor: 'pointer' }}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Color</label>
                  <input value={editColor} onChange={e => setEditColor(e.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: tDark ? '#f5f3ec' : '#17171a', fontSize: 14, outline: 'none' }} />
                </div>
              </div>
              {/* Sell toggle */}
              <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 14, background: sellEnabled ? 'rgba(245,197,24,0.08)' : 'var(--surface-2)', border: `1px solid ${sellEnabled ? 'rgba(245,197,24,0.3)' : 'var(--border)'}`, transition: 'all .2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-2)' }}>Publicar mi perfil</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Ofrecer este vehículo en venta</div>
                  </div>
                  <button onClick={() => setSellEnabled(v => !v)} style={{ width: 46, height: 26, borderRadius: 13, border: 'none', background: sellEnabled ? '#F5C518' : 'rgba(255,255,255,0.12)', cursor: 'pointer', position: 'relative', transition: 'background .2s', flex: '0 0 auto' }}>
                    <span style={{ position: 'absolute', top: 3, left: sellEnabled ? 24 : 3, width: 20, height: 20, borderRadius: '50%', background: sellEnabled ? '#111' : '#666', transition: 'left .2s' }} />
                  </button>
                </div>

                {sellEnabled && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeUp .3s both' }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Precio de venta</label>
                      <input value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder="Ej. 45.000.000"
                        style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: tDark ? '#f5f3ec' : '#17171a', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Ciudad</label>
                        <input value={sellCity} onChange={e => setSellCity(e.target.value)} placeholder="Ej. Bogotá"
                          style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: tDark ? '#f5f3ec' : '#17171a', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Código postal</label>
                        <input value={sellZip} onChange={e => setSellZip(e.target.value)} placeholder="Ej. 110110"
                          style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: tDark ? '#f5f3ec' : '#17171a', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Teléfono de contacto</label>
                      <input value={sellPhone} onChange={e => setSellPhone(e.target.value)} placeholder="Ej. +57 300 123 4567"
                        style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: tDark ? '#f5f3ec' : '#17171a', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Descripción de la venta</label>
                      <textarea value={sellDescription} onChange={e => setSellDescription(e.target.value)} rows={3} placeholder="Ej. Vehículo en excelente estado, único dueño, documentación al día…"
                        style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: tDark ? '#f5f3ec' : '#17171a', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* WhatsApp contact toggle */}
              <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 14, background: whatsappEnabled ? 'rgba(74,222,128,0.08)' : 'var(--surface-2)', border: `1px solid ${whatsappEnabled ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`, transition: 'all .2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#4ade80' }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      Contacto WhatsApp
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Permite que quien encuentre tu llavero te contacte por WhatsApp</div>
                  </div>
                  <button onClick={() => setWhatsappEnabled(v => !v)} style={{ width: 46, height: 26, borderRadius: 13, border: 'none', background: whatsappEnabled ? '#4ade80' : 'rgba(255,255,255,0.12)', cursor: 'pointer', position: 'relative', transition: 'background .2s', flex: '0 0 auto' }}>
                    <span style={{ position: 'absolute', top: 3, left: whatsappEnabled ? 24 : 3, width: 20, height: 20, borderRadius: '50%', background: whatsappEnabled ? '#111' : '#666', transition: 'left .2s' }} />
                  </button>
                </div>
                {whatsappEnabled && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                    <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Número de WhatsApp</label>
                    <input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="Ej. +57 300 123 4567"
                      style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: tDark ? '#f5f3ec' : '#17171a', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                )}
              </div>

              <button onClick={handleSaveProfile} style={{ marginTop: 18, width: '100%', padding: 13, borderRadius: 12, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Guardar cambios</button>
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <button onClick={() => setShowProfile(false)} style={{ flex: 1, padding: 13, borderRadius: 12, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
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
          <div onClick={e => e.stopPropagation()} style={{ width: 520, maxWidth: '94vw', maxHeight: '88vh', overflowY: 'auto', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 22, padding: 24, boxShadow: tDark ? '0 40px 90px rgba(0,0,0,.6)' : '0 40px 90px rgba(0,0,0,.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 48, height: 48, borderRadius: 12, background: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3.2v5.6M12 15.2v5.6M3.2 12h5.6M15.2 12h5.6"/></svg>
                </span>
                <div>
                  <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 20, textTransform: 'uppercase', lineHeight: 1.1 }}>Llavero NFC</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Ficha pública de tu vehículo</div>
                </div>
              </div>
              <button onClick={() => { setShowNfc(false); setGeneratedUrl(''); setGenCopied(false) }} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--btn-ghost-border)', background: 'var(--btn-ghost-bg)', color: 'var(--btn-ghost-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            <div style={{ marginBottom: 16, padding: 14, borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--section-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: tDark ? '#fff' : '#17171a', marginBottom: 2 }}>Ficha pública</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.4 }}>
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
            <div style={{ marginBottom: 16, padding: 14, borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--section-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700 }}>Tus llaveros activos</div>
                <button onClick={generateNfcToken} disabled={nfcLoading}
                  style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(245,197,24,0.35)', background: nfcLoading ? 'rgba(245,197,24,0.1)' : 'rgba(245,197,24,0.15)', color: nfcLoading ? '#998a4a' : '#F5C518', fontSize: 12, fontWeight: 700, cursor: nfcLoading ? 'default' : 'pointer', transition: 'all .16s' }}>
                  {nfcLoading ? 'Generando…' : '+ Nuevo llavero'}
                </button>
              </div>

              {tokensLoading ? (
                <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '10px 0' }}>Cargando…</div>
              ) : nfcTokens.length === 0 && !generatedUrl ? (
                <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '10px 0', lineHeight: 1.5 }}>
                  Aún no has generado ningún llavero. Presiona <b style={{ color: 'var(--text-2)' }}>+ Nuevo llavero</b> para crear uno.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {nfcTokens.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: t.is_active ? 'rgba(46,204,113,0.05)' : 'rgba(255,55,55,0.05)', border: t.is_active ? '1px solid rgba(46,204,113,0.2)' : '1px solid rgba(255,55,55,0.15)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: t.is_active ? '#2ecc71' : '#ff4d6a', fontWeight: 700 }}>{t.token_prefix}…</span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
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
                      style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(245,197,24,0.4)', background: 'var(--inset-dark)', color: '#F5C518', fontSize: 11, fontFamily: "'JetBrains Mono',monospace", outline: 'none', cursor: 'text' }} />
                    <button onClick={() => { navigator.clipboard.writeText(generatedUrl).then(() => { setGenCopied(true); setTimeout(() => setGenCopied(false), 2000) }).catch(() => {}) }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: 'none', background: genCopied ? '#2ecc71' : '#F5C518', color: '#111', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .2s' }}>
                      {genCopied && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}{genCopied ? 'Copiado' : 'Copiar enlace'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>
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

      {/* Cart — Solicitar llavero NFC */}
      {showCart && (
        <div onClick={() => setShowCart(false)} style={{ position: 'fixed', inset: 0, zIndex: 74, background: 'rgba(4,4,4,0.74)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 460, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 22, padding: 24, boxShadow: tDark ? '0 40px 90px rgba(0,0,0,.6)' : '0 40px 90px rgba(0,0,0,.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 24, textTransform: 'uppercase' }}>Solicitar llavero NFC</div>
              <button onClick={() => setShowCart(false)} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--btn-ghost-border)', background: 'var(--btn-ghost-bg)', color: 'var(--btn-ghost-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 14, borderRadius: 16, background: tDark ? 'linear-gradient(135deg,rgba(245,197,24,0.14),rgba(20,20,20,0.6))' : 'linear-gradient(135deg,rgba(245,197,24,0.12),rgba(247,246,242,0.9))', border: '1px solid rgba(245,197,24,0.28)', margin: '10px 0 16px' }}>
              <span style={{ width: 60, height: 60, flex: '0 0 auto', borderRadius: 14, background: 'radial-gradient(circle at 40% 35%,#3a3a3a,#141414)', border: '2px solid #F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5C518', boxShadow: '0 0 22px rgba(245,197,24,0.35)' }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="10"/><path d="M6 12a6 6 0 0 1 6-6M8.5 12a3.5 3.5 0 0 1 3.5-3.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: tDark ? '#fff' : '#17171a' }}>Llavero NFC CarLink</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Aro metálico + chip programado con tu ficha. Envío a domicilio 3–5 días.</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13, color: 'var(--text-3)', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Llavero NFC (1 und.)</span><span style={{ color: tDark ? '#f5f3ec' : '#17171a', fontWeight: 600 }}>$59.900</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Programación + envío</span><span style={{ color: '#5be89a', fontWeight: 600 }}>Gratis</span></div>
              <div style={{ height: 1, background: 'var(--section-border)', margin: '2px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}><span style={{ color: tDark ? '#fff' : '#17171a', fontWeight: 700 }}>Total</span><span style={{ color: '#F5C518', fontWeight: 800, fontFamily: "'Anton',sans-serif", fontSize: 20 }}>$59.900</span></div>
            </div>

            <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, marginBottom: 9 }}>Método de pago</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {[{ id: 'card', name: 'Tarjeta de crédito / débito' }, { id: 'pse', name: 'PSE — débito bancario' }, { id: 'nequi', name: 'Nequi' }].map(pm => {
                const active = payMethod === pm.id
                return (
                  <button key={pm.id} onClick={() => setPayMethod(pm.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', fontSize: 14, fontWeight: 600, background: active ? 'rgba(245,197,24,0.14)' : 'var(--input-bg)', border: `1.5px solid ${active ? '#F5C518' : 'var(--input-border)'}`, color: active ? (tDark ? '#fff' : '#17171a') : 'var(--text-3)' }}>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${active ? '#F5C518' : '#6f6a5f'}`, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? '#F5C518' : 'transparent' }} /></span>
                    {pm.name}
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 13px', borderRadius: 11, background: 'var(--surface-2)', border: '1px solid var(--section-border)', marginBottom: 16 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.8" style={{ marginTop: 1, flex: '0 0 auto' }}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Enviar a <b style={{ color: tDark ? '#f5f3ec' : '#17171a' }}>{ownerName}</b> · Placa {vehicle?.plate || '—'} · {vehicle?.city || '—'}</div>
            </div>

            <button onClick={() => { setShowCart(false); flashApp('Pago aprobado — preparando tu envío') }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 15, borderRadius: 13, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 0 24px rgba(245,197,24,0.4)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>Pagar $59.900
            </button>
          </div>
        </div>
      )}

      {/* ── Found Requests Panel ── */}
      {showFoundPanel && (
        <div onClick={() => setShowFoundPanel(false)} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(4,4,4,0.74)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 480, maxWidth: '94vw', maxHeight: '85vh', overflowY: 'auto', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 22, padding: 24, boxShadow: tDark ? '0 40px 90px rgba(0,0,0,.6)' : '0 40px 90px rgba(0,0,0,.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 22, textTransform: 'uppercase', color: '#ff6b6b' }}>Llaveros encontrados</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Personas que encontraron tu llavero NFC</div>
              </div>
              <button onClick={() => setShowFoundPanel(false)} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--btn-ghost-border)', background: 'var(--btn-ghost-bg)', color: 'var(--btn-ghost-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {foundRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 20px' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5c5c6a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>Sin reportes aún</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Cuando alguien encuentre tu llavero, recibirás una notificación aquí.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {foundRequests.map((req) => (
                  <div key={req.id} onClick={() => { if (req.status === 'pending') markFoundRead(req.id) }} style={{ padding: '14px 16px', borderRadius: 14, background: req.status === 'pending' ? 'rgba(255,107,107,0.08)' : 'var(--surface-2)', border: `1px solid ${req.status === 'pending' ? 'rgba(255,107,107,0.25)' : 'var(--border)'}`, cursor: req.status === 'pending' ? 'pointer' : 'default', transition: 'all .2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,107,107,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b6b', flex: '0 0 auto' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: tDark ? '#fff' : '#17171a' }}>{req.finder_name || 'Anónimo'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(req.created_at).toLocaleDateString()} · {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                      {req.status === 'pending' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff6b6b', flex: '0 0 auto', marginTop: 6 }} />}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 10 }}>{req.message}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {req.finder_phone && (
                        <a href={`tel:${req.finder_phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.25)', color: '#F5C518', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                          {req.finder_phone}
                        </a>
                      )}
                      {req.finder_phone && (
                        <a href={`https://wa.me/${req.finder_phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          WhatsApp
                        </a>
                      )}
                      {req.vehicle_plate && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 11, fontWeight: 600 }}>
                          {req.vehicle_brand} {req.vehicle_model} · {req.vehicle_plate}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
