'use client'

import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useMaintenance, useWorkshops, useParts } from '@/lib/hooks'
import { apiGet, apiPut } from '@/lib/api'
import { uploadFile } from '@/lib/upload'
import { useCountdown } from '@/lib/hooks'
import { getWalletBackground } from '@/lib/wallet-bg'
import { ServiceIcon } from '@/lib/icons_new'
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

const PARTS = [
  { name: 'Aceite de motor', interval: 5000, lastKm: 0 },
  { name: 'Filtro de aire', interval: 10000, lastKm: 0 },
  { name: 'Pastillas de freno', interval: 20000, lastKm: 0 },
  { name: 'Llantas', interval: 40000, lastKm: 0 },
  { name: 'Refrigerante', interval: 30000, lastKm: 0 },
  { name: 'Batería', interval: 36000, lastKm: 0 },
  { name: 'Correa de accesorios', interval: 25000, lastKm: 0 },
  { name: 'Bujías', interval: 15000, lastKm: 0 },
  { name: 'Filtro de combustible', interval: 20000, lastKm: 0 },
  { name: 'Transmisión', interval: 40000, lastKm: 0 },
]

interface FichaTabProps {
  vehicle: Vehicle | null
  onAddService: () => void
  onEditService: (r: MaintenanceRecord) => void
  onOpenPublicar: () => void
  onNavigate: (tab: string) => void
  nfcTokens: NfcToken[]
  toggleNfcActive: () => void
  refreshKey?: number
  theme: 'light' | 'dark'
}

export default function FichaTab({ vehicle, onAddService, onEditService, onOpenPublicar, onNavigate, nfcTokens, toggleNfcActive, refreshKey, theme }: FichaTabProps) {
  const { records: maintenance, latest } = useMaintenance(vehicle?.id, refreshKey)
  const { workshops } = useWorkshops()
  const { parts: dbParts, reload: reloadParts } = useParts(vehicle?.id)
  const [flipped, setFlipped] = useState(false)
  const [workshopLogo, setWorkshopLogo] = useState<string>('')
  const [stampsRequired, setStampsRequired] = useState(6)
  const [promoDesc, setPromoDesc] = useState('')
  const [hoverTellKey, setHoverTellKey] = useState<string | null>(null)
  const [tellOpen, setTellOpen] = useState<string | null>(null)
  const [citaStep, setCitaStep] = useState<'detail' | 'cita'>('detail')
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (refreshKey != null && refreshKey > 0) reloadParts()
  }, [refreshKey, reloadParts])

  useEffect(() => {
    if (!vehicle?.id) return
    apiGet('/workshops/me').then((w: any) => {
      if (w?.logo_url) setWorkshopLogo(w.logo_url)
      if (w?.stamps_required) setStampsRequired(w.stamps_required)
      if (w?.promotion_description) setPromoDesc(w.promotion_description)
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

  /* Derive latest Aceite record specifically — ficha always shows oil info */
  const latestAceite = [...maintenance].find(r => r.service_type === 'Aceite') || null
  /* Fallback to overall latest only if no aceite record exists */
  const fichaRecord = latestAceite || latest

  /* Real current vehicle mileage = highest mileage across ALL records */
  const currentKm = maintenance.length > 0 ? Math.max(...maintenance.map(r => r.mileage)) : fichaRecord?.mileage
  /* Oil change mileage: when the oil was last changed (for reference) */
  const oilChangeKm = latestAceite?.mileage ?? null
  /* Next service from the aceite record */
  const nextServiceKm = fichaRecord?.next_service_mileage

  const totalServ = maintenance.length
  const kmToNext = nextServiceKm != null && currentKm != null ? Math.max(0, nextServiceKm - currentKm) : null
  const oilCycleKm = oilChangeKm != null && nextServiceKm != null ? (nextServiceKm - oilChangeKm) : 5000
  const oilProgress = oilChangeKm != null && currentKm != null && oilCycleKm > 0
    ? Math.min(1, Math.max(0, (currentKm - oilChangeKm) / oilCycleKm))
    : 0
  const progWidth = `${Math.round(oilProgress * 100)}%`

  /* Predicted date for next service based on avg 1500 km/month */
  const AVG_KM_PER_MONTH = 1500
  const predictedDateMs = useMemo(() => kmToNext != null && kmToNext > 0
    ? Date.now() + (kmToNext / AVG_KM_PER_MONTH) * 30.44 * 86400000
    : null, [kmToNext])
  const predictedDate = predictedDateMs != null ? new Date(predictedDateMs) : null
  const predictedDateStr = predictedDate
    ? predictedDate.toLocaleDateString('es', { month: 'short', year: 'numeric' })
    : null

  const hasCountdown = nextServiceKm != null && currentKm != null && kmToNext != null && kmToNext > 0
  const countdownTarget = predictedDateMs ?? (Date.now() + 90 * 86400000)
  const cd = useCountdown(countdownTarget)

  if (!vehicle) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)', fontSize: 14, border: '1px dashed var(--border-2)', borderRadius: 16 }}>
      Registra un vehículo primero
    </div>
  )

  const baseKm = currentKm ?? 0
  const nextServiceDisp = nextServiceKm ?? baseKm + 5000
  const kmToNextDisp = Math.max(0, nextServiceDisp - baseKm)
  const oilCycleKmDisp = oilChangeKm != null && nextServiceDisp != null ? (nextServiceDisp - oilChangeKm) : 5000
  const progWidthDisp = oilChangeKm != null && baseKm != null && oilCycleKmDisp > 0
    ? `${Math.min(100, Math.max(0, ((baseKm - oilChangeKm) / oilCycleKmDisp) * 100))}%`
    : '0%'

  const stamps = ['Aceite', 'Filtros', 'Frenos', 'Llantas', 'Suspensión', 'Batería', 'Transmisión', 'General'].slice(0, stampsRequired).map((label, i) => ({
    label,
    on: i < maintenance.length,
  }))

  // --- Dynamic PARTS calculations (use real dbParts when available) ---
  const currentKmVal = currentKm || 0
  const parts = PARTS.map(p => {
    const dbPart = dbParts.find((dp: any) => dp.name === p.name)
    const lastKm = dbPart?.mileage_installed ?? p.lastKm
    const interval = dbPart?.lifespan_mileage || p.interval
    const next = lastKm + interval
    const rem = next - currentKmVal
    const pct = Math.max(0, Math.min(1, rem / interval))
    let estado: string, color: string
    if (rem <= 0) { estado = 'Vencido'; color = '#ff4d6a' }
    else if (pct <= 0.12) { estado = 'Urgente'; color = '#ff4d6a' }
    else if (pct <= 0.30) { estado = 'Pronto'; color = '#ffb020' }
    else { estado = 'Al día'; color = '#2ecc71' }
    return { name: p.name, interval, next, rem: Math.max(0, rem), pct, estado, color }
  })

  // --- Oil life (derive from latest Aceite maintenance record) ---
  const oilInterval = latestAceite?.next_service_mileage != null && latestAceite?.mileage != null
    ? (latestAceite.next_service_mileage - latestAceite.mileage)
    : (dbParts.find((dp: any) => dp.name === 'Aceite de motor')?.lifespan_mileage || 5000)
  const oilLastKm = latestAceite?.mileage ?? dbParts.find((dp: any) => dp.name === 'Aceite de motor')?.mileage_installed ?? 0
  const oilRemaining = Math.max(0, (oilLastKm + oilInterval) - currentKmVal)
  const oilLife = oilInterval > 0 ? Math.max(0, Math.min(1, oilRemaining / oilInterval)) : 1
  const oilPctDyn = Math.round(oilLife * 100)
  const oilColorDyn = oilLife > 0.5 ? '#22c55e' : oilLife > 0.3 ? '#F5C518' : oilLife > 0.12 ? '#ffb020' : '#ff4d6a'
  const oilDegDyn = Math.round(oilLife * 270)

  // --- Health (average of all parts) ---
  const healthArr = parts.map(p => p.pct)
  const health = healthArr.length ? healthArr.reduce((a, b) => a + b, 0) / healthArr.length : 1
  const healthPctDyn = Math.round(health * 100)
  const healthColorDyn = health > 0.5 ? '#22c55e' : health > 0.25 ? '#ffb020' : '#ff4d6a'
  const healthLabelDyn = health > 0.5 ? 'Óptimo' : health > 0.25 ? 'Atención' : 'Crítico'
  const healthDegDyn = Math.round(health * 270)

  // --- Urgentes ---
  const urgentesCount = parts.filter(p => p.pct <= 0.12).length
  const urgentesLabel = urgentesCount === 0 ? 'Sin alertas' : `${urgentesCount} por revisar`
  const urgentesColor = urgentesCount === 0 ? '#2ecc71' : '#ffb020'

  // --- Needle position ---
  const prog = nextServiceDisp > 0 ? Math.min(1, currentKmVal / nextServiceDisp) : 0
  const needleDegDefault = -90 + prog * 180

  const findPart = (name: string) => parts.find(p => p.name === name)
  const worstOf = (...names: string[]) => {
    const found = names.map(findPart).filter(Boolean) as typeof parts
    if (!found.length) return { estado: 'Al día', color: '#2ecc71', pct: 1, rem: 0 }
    return found.reduce((worst, p) => p.pct < worst.pct ? p : worst, found[0])
  }

  const brakesP = findPart('Pastillas de freno') || { color: '#2ecc71', estado: 'Al día', pct: 1, rem: 0 }
  const tiresP = findPart('Llantas') || { color: '#2ecc71', estado: 'Al día', pct: 1, rem: 0 }
  const engineP = worstOf('Aceite de motor', 'Bujías', 'Correa de accesorios', 'Refrigerante')

  const BATTERY_LIFESPAN_MONTHS = 24
  const battDbPart = dbParts.find((dp: any) => dp.name === 'Batería')
  const battLastKm = battDbPart?.mileage_installed ?? 0
  const battKmUsed = Math.max(0, currentKmVal - battLastKm)
  const battMonthsElapsed = Math.min(BATTERY_LIFESPAN_MONTHS, battKmUsed / 1500)
  const battPct = Math.max(0, 1 - battMonthsElapsed / BATTERY_LIFESPAN_MONTHS)
  const battRemMonths = Math.max(0, Math.round(BATTERY_LIFESPAN_MONTHS - battMonthsElapsed))
  const battColor = battPct <= 0.12 ? '#ff4d6a' : battPct <= 0.30 ? '#ffb020' : '#2ecc71'

  const fuelPct = Math.max(0.06, 1 - ((currentKmVal % 550) / 550))
  const fuelColor = fuelPct <= 0.15 ? '#ff4d6a' : fuelPct <= 0.3 ? '#ffb020' : '#2ecc71'

  // --- Telltale definitions ---
  interface TellDef { label: string; color: string; critical: boolean; pct: number; iconKey: string; remVal: number | string; unit: string }
  const tellDef = (label: string, p: { color: string; estado: string; pct: number; rem: number }, iconKey: string, unit = 'km'): TellDef => ({
    label, color: p.color,
    critical: p.estado === 'Urgente' || p.estado === 'Vencido',
    pct: p.pct, iconKey, remVal: Math.round(p.rem), unit,
  })

  const telltales: TellDef[] = [
    tellDef('ABS / Frenos', brakesP, 'abs'),
    tellDef('Freno de mano', brakesP, 'handbrake'),
    tellDef('Llantas', tiresP, 'tire'),
    { label: 'Batería', color: battColor, critical: battPct <= 0.12, pct: battPct, iconKey: 'battery', remVal: battRemMonths, unit: 'meses' },
    { label: 'Revisión motor', color: engineP.color, critical: engineP.estado === 'Urgente' || engineP.estado === 'Vencido', pct: engineP.pct, iconKey: 'engine', remVal: Math.round(engineP.rem), unit: 'km' },
    { label: 'Combustible', color: fuelColor, critical: fuelPct <= 0.15, pct: fuelPct, iconKey: 'fuel', remVal: Math.round(fuelPct * 100), unit: '%' },
  ]

  // --- Hover telltale ---
  const hoveredTell = hoverTellKey ? telltales.find(t => t.iconKey === hoverTellKey) : null
  const needleColorLive = hoveredTell ? hoveredTell.color : cd.d <= 3 ? '#ff4d6a' : '#F5C518'

  let needleDeg = needleDegDefault
  if (hoveredTell) {
    const pct = hoveredTell.pct
    let u: number
    if (pct > 0.30) { u = ((1 - pct) / (1 - 0.30)) * 0.6 }
    else if (pct > 0.12) { u = 0.6 + ((0.30 - pct) / (0.30 - 0.12)) * 0.2 }
    else { u = 0.8 + (Math.min(1, (0.12 - pct) / 0.12)) * 0.2 }
    needleDeg = -90 + u * 180
  }

  const odoCenterValue = hoveredTell ? String(hoveredTell.remVal) : (currentKmVal.toLocaleString())
  const odoCenterUnit = hoveredTell ? `FALTAN ${hoveredTell.unit.toUpperCase()}` : 'KM · PARA CAMBIO DE ACEITE'
  const odoBorder = cd.d <= 3 ? 'rgba(255,77,106,0.55)' : 'rgba(245,197,24,0.3)'
  const odoGlowShadow = cd.d <= 3 ? 'inset 0 2px 10px rgba(0,0,0,.7), 0 0 18px rgba(255,77,106,0.5)' : 'inset 0 2px 10px rgba(0,0,0,.7)'
  const odoTextShadow = cd.d <= 3 ? '0 0 16px rgba(255,77,106,0.75)' : '0 0 14px rgba(245,197,24,0.55)'
  const odoAnim = cd.d <= 3 ? 'odoCriticalPulse 1.1s ease-in-out infinite' : 'none'
  const hoverTellColor = hoveredTell ? hoveredTell.color : '#F5C518'
  const defaultLabelOpacity = hoveredTell ? 0 : 1
  const hoverLabelOpacity = hoveredTell ? 1 : 0
  const hoverTellLabel = hoveredTell ? hoveredTell.label : ''

  // --- Dial ticks (13 ticks from -90deg to +90deg) ---
  const dialTicks = Array.from({ length: 13 }, (_, i) => {
    const deg = -90 + i * 15
    const zoneT = (deg + 90) / 180
    const color = zoneT <= 0.6 ? '#2ecc71' : zoneT <= 0.8 ? '#ffb020' : '#ff4d6a'
    return { deg, len: i % 3 === 0 ? 18 : 10, color: i % 3 === 0 ? color : 'rgba(255,255,255,0.25)' }
  })

  const dialArc = 'conic-gradient(from 270deg, #2ecc71 0deg 108deg, #ffb020 108deg 144deg, #ff4d6a 144deg 180deg, transparent 180deg 360deg)'

  const investTotal = maintenance.reduce((sum, r) => sum + (Number(r.cost) || 0), 0)
  const investFmt = investTotal > 0 ? `$${investTotal.toLocaleString()}` : '$0'
  const kmRan = Math.max(0, currentKmVal - (maintenance[0]?.mileage || 0))

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
  const rawPlate = vehicle.plate || '—'
  const plateText = rawPlate.length > 6 ? `${rawPlate.slice(0, 3)}-${rawPlate.slice(3)}` : rawPlate

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

        {/* Header */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 800 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M12 3a9 9 0 0 0-9 9h3M12 3v3M21 12a9 9 0 0 0-9-9"/><path d="M18.4 6.6 15 10"/></svg>Tablero del vehículo
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999, background: tDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.06)', border: `1px solid ${urgentesColor}` }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: urgentesColor, boxShadow: `0 0 8px ${urgentesColor}` }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: urgentesColor }}>{urgentesLabel}</span>
          </div>
        </div>

        {/* 3-column grid: Oil Gauge | Odometer Dial | Health Gauge */}
        <div className="tablero-grid" style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1.6fr 1fr', gap: 10, alignItems: 'center' }}>

          {/* GAUGE: Vida del aceite */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: 150, height: 150, borderRadius: '50%', background: `conic-gradient(from 135deg, ${oilColorDyn} 0deg ${oilDegDyn}deg, ${gaugeTrack} ${oilDegDyn}deg 270deg, transparent 270deg 360deg)`, filter: 'drop-shadow(0 0 14px rgba(245,197,24,0.25))' }}>
              <div style={{ position: 'absolute', inset: 12, borderRadius: '50%', background: gaugeInnerBg, border: `1px solid ${gaugeBorder}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill={oilColorDyn} style={{ marginBottom: 2 }}><path d="M12 2c-3 4-6 7-6 11a6 6 0 0 0 12 0c0-4-3-7-6-11z"/></svg>
                <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 28, lineHeight: 1, color: oilColorDyn }}>{oilPctDyn}%</div>
                <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: odometerLabel, fontWeight: 700, marginTop: 2 }}>Vida aceite</div>
              </div>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: sMuted }}>{fichaRecord?.lubricant_type || 'Sintético 5W-30'}</div>
          </div>

          {/* ODÓMETRO CENTRAL — dial analógico con aguja */}
          <div style={{ textAlign: 'center' }}>
            {/* Dynamic label */}
            <div style={{ position: 'relative', height: 15, marginBottom: 4 }}>
              <div style={{ position: 'absolute', inset: 0, fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: odometerLabel, fontWeight: 700, transition: 'opacity .25s', opacity: defaultLabelOpacity }}>Kilometraje actual del vehículo</div>
              <div style={{ position: 'absolute', inset: 0, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 800, transition: 'opacity .25s', opacity: hoverLabelOpacity, color: hoverTellColor }}>{hoverTellLabel}</div>
            </div>

            {/* Dial body */}
            <div style={{ position: 'relative', width: 265, height: 265, margin: '0 auto', borderRadius: '50%', background: tDark ? 'radial-gradient(circle at 50% 42%,#1c1f26,#0a0b0e 72%)' : 'radial-gradient(circle at 50% 42%,#e8e5dc,#d5d0c6 72%)', boxShadow: tDark ? '0 14px 32px rgba(0,0,0,.5),inset 0 0 0 1px rgba(255,255,255,0.06)' : '0 14px 32px rgba(0,0,0,.15),inset 0 0 0 1px rgba(0,0,0,0.08)' }}>
              {/* Color arc ring */}
              <div style={{ position: 'absolute', inset: 9, borderRadius: '50%', background: dialArc, mask: 'radial-gradient(circle,transparent 68%,#000 69%)', WebkitMask: 'radial-gradient(circle,transparent 68%,#000 69%)' }} />

              {/* Tick marks */}
              {dialTicks.map((tk, i) => (
                <div key={i} style={{ position: 'absolute', left: '50%', top: '50%', width: 2.4, height: tk.len, background: tk.color, transformOrigin: '50% 0', transform: `translate(-50%,0) rotate(${tk.deg}deg) translateY(10px)`, borderRadius: 2 }} />
              ))}

              {/* Needle */}
              <div style={{ position: 'absolute', left: '50%', top: '50%', width: 4, height: 90, background: `linear-gradient(180deg,${needleColorLive},transparent 88%)`, transformOrigin: '50% 100%', transform: `translate(-50%,-100%) rotate(${needleDeg}deg)`, transition: 'transform .6s cubic-bezier(0.22,1,0.36,1),background .35s', borderRadius: 2, boxShadow: `0 0 10px ${needleColorLive}` }} />

              {/* Center pivot */}
              <div style={{ position: 'absolute', left: '50%', top: '50%', width: 16, height: 16, borderRadius: '50%', background: tDark ? 'radial-gradient(circle at 35% 30%,#f3f3f3,#8a8a8a 70%,#3a3a3a 100%)' : 'radial-gradient(circle at 35% 30%,#fff,#ccc 70%,#888 100%)', transform: 'translate(-50%,-50%)', boxShadow: '0 1px 4px rgba(0,0,0,.6)' }} />

              {/* Center readout */}
              <div style={{ position: 'absolute', left: '50%', top: '66%', transform: 'translate(-50%,0)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: '5px 16px', borderRadius: 10, background: tDark ? '#08090c' : '#f0ede4', border: `1px solid ${odoBorder}`, boxShadow: odoGlowShadow, animation: odoAnim, transition: 'border-color .4s' }}>
                <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 26, letterSpacing: '.02em', color: needleColorLive, textShadow: odoTextShadow, transition: 'color .3s,text-shadow .4s' }}>{odoCenterValue}</span>
                <span style={{ fontSize: 8, color: odometerLabel, fontWeight: 700, letterSpacing: '.07em' }}>{odoCenterUnit}</span>
              </div>
            </div>

            {/* Stats row below dial */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginTop: 10 }}>
              <div style={{ flex: 1, maxWidth: 108, padding: '7px 6px', borderRadius: 11, background: statCardBg, border: `1px solid ${statCardBorder}` }}>
                <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 19, lineHeight: 1, color: statCardText }}>{totalServ}</div>
                <div style={{ fontSize: 8.5, color: odometerLabel, letterSpacing: '.05em' }}>servicios</div>
              </div>
              <div style={{ flex: 1, maxWidth: 108, padding: '7px 6px', borderRadius: 11, background: statCardBg, border: `1px solid ${statCardBorder}` }}>
                <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 19, lineHeight: 1, color: statCardText }}>{kmRan.toLocaleString()}</div>
                <div style={{ fontSize: 8.5, color: odometerLabel, letterSpacing: '.05em' }}>km recorridos</div>
              </div>
              <div style={{ flex: 1, maxWidth: 108, padding: '7px 6px', borderRadius: 11, background: statCardBg, border: '1px solid rgba(245,197,24,0.22)' }}>
                <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 17, lineHeight: 1, color: '#F5C518' }}>{investFmt}</div>
                <div style={{ fontSize: 8.5, color: odometerLabel, letterSpacing: '.05em' }}>en gastos</div>
              </div>
            </div>
          </div>

          {/* GAUGE: Salud del vehículo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: 150, height: 150, borderRadius: '50%', background: `conic-gradient(from 135deg, ${healthColorDyn} 0deg ${healthDegDyn}deg, ${gaugeTrack} ${healthDegDyn}deg 270deg, transparent 270deg 360deg)` }}>
              <div style={{ position: 'absolute', inset: 13, borderRadius: '50%', background: gaugeInnerBg, border: `1px solid ${gaugeBorder}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={healthColorDyn} strokeWidth="1.8" style={{ marginBottom: 2 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
                <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 30, lineHeight: 1, color: healthColorDyn }}>{healthPctDyn}%</div>
                <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: odometerLabel, fontWeight: 700, marginTop: 3 }}>Salud del vehículo</div>
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: healthColorDyn }}>{healthLabelDyn}</div>
          </div>
        </div>

        {/* TELLTALE WARNING INDICATORS */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginTop: 10, flexWrap: 'wrap' }}>
          {telltales.map(t => (
            <button key={t.iconKey} title={`${t.label} — ${t.critical ? 'Urgente' : 'OK'}`}
              onClick={() => setTellOpen(t.iconKey)}
              onMouseEnter={() => setHoverTellKey(t.iconKey)}
              onMouseLeave={() => setHoverTellKey(null)}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 11, background: tDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.06)', border: `1.5px solid ${t.color}`, color: t.color, opacity: t.critical ? 1 : 0.55, animation: t.critical ? 'telltalePulse 1.1s ease-in-out infinite' : 'none', cursor: 'pointer', transition: 'transform .15s', padding: 0 }}>
              {t.iconKey === 'abs' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9.5"/><text x="12" y="15" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="7.2" fontWeight="800" stroke="none" fill="currentColor">ABS</text></svg>}
              {t.iconKey === 'handbrake' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M9.5 8a3 3 0 0 1 0 8"/><path d="M14.5 8a3 3 0 0 0 0 8"/><line x1="12" y1="8.2" x2="12" y2="13.5"/><circle cx="12" cy="16" r="1" fill="currentColor" stroke="none"/></svg>}
              {t.iconKey === 'tire' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9.5a6.4 3.6 0 0 1 12 0v3a6.4 3.6 0 0 1-12 0z"/><path d="M6.6 8.4a5.6 3 0 0 0 10.8 0"/><path d="M9 8.8v5.6M12 8.4v6.4M15 8.8v5.6"/><line x1="12" y1="16" x2="12" y2="18.6"/><circle cx="12" cy="19.6" r="1" fill="currentColor" stroke="none"/></svg>}
              {t.iconKey === 'battery' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="8" width="17" height="10" rx="1.6"/><path d="M8 8V6.4a1 1 0 0 1 1-1h1.4a1 1 0 0 1 1 1V8"/><path d="M14.6 8V6.4a1 1 0 0 1 1-1H17a1 1 0 0 1 1 1V8"/><line x1="7.6" y1="13" x2="10.6" y2="13"/><line x1="9.1" y1="11.5" x2="9.1" y2="14.5"/><line x1="13.6" y1="13" x2="16.6" y2="13"/></svg>}
              {t.iconKey === 'engine' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 16.5V13l2-2.2h3.2l1 1.2h3.6l.9-2.4h3.3a2 2 0 0 1 2 2v1.8"/><path d="M20.5 13.4H18"/><path d="M8.7 10.8V8.6h2.8v2.2"/><path d="M3.5 16.5h17"/><circle cx="7" cy="17.8" r="1.6"/><circle cx="17" cy="17.8" r="1.6"/></svg>}
              {t.iconKey === 'fuel' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V6.2a1.6 1.6 0 0 1 1.6-1.6h4.8A1.6 1.6 0 0 1 12 6.2V21"/><path d="M4 12.5h8"/><path d="M4 21h8"/><path d="M12 8.4l3 2.6v6.6a1.4 1.4 0 0 0 2.8 0v-4.8l-2.2-2.2"/></svg>}
            </button>
          ))}
        </div>

        {/* Próximo mantenimiento */}
        <div style={{ position: 'relative', marginTop: 10, paddingTop: 10, borderTop: `1px solid ${tableroDivider}`, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 210 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: sMuted, fontWeight: 700 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.9"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>Próximo cambio de aceite
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: sInk, margin: '5px 0 8px' }}>{nextServiceDisp.toLocaleString()} km · faltan {kmToNextDisp.toLocaleString()} km{predictedDateStr ? ` · ${predictedDateStr}` : ''}</div>
            <div style={{ height: 8, borderRadius: 6, background: tableroTrack, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: progWidthDisp, background: 'linear-gradient(90deg,#FFD84D,#F5C518,#8a6a00)', borderRadius: 6, transition: 'width .7s cubic-bezier(0.22,1,0.36,1)' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['d', 'h', 'm', 's'] as const).map(k => (
              <div key={k} style={{ textAlign: 'center', background: countdownBg, border: '1px solid rgba(245,197,24,0.25)', borderRadius: 11, padding: '8px 12px', minWidth: 54 }}>
                <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 26, color: '#F5C518', lineHeight: 1 }}>{(cd as any)[k]}</div>
                <div style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: odometerLabel }}>{k === 'd' ? 'días' : k === 'h' ? 'hrs' : k === 'm' ? 'min' : 'seg'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TELLTALE DETAIL MODAL */}
      {tellOpen && (() => {
        const t = telltales.find(x => x.iconKey === tellOpen)
        if (!t) return null
        const estado = t.critical ? 'Atención requerida' : t.pct <= 0.3 ? 'Próximo a revisar' : 'Al día'
        const desc = t.critical
          ? `${t.label} está en estado crítico según su vida útil — se recomienda atenderlo pronto.`
          : t.pct <= 0.3
            ? `${t.label} se acerca a su intervalo de revisión — agenda pronto para evitar imprevistos.`
            : `${t.label} está dentro de su vida útil normal.`
        const iconSvg = t.iconKey === 'abs' ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9.5"/><text x="12" y="15" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="7.2" fontWeight="800" stroke="none" fill="currentColor">ABS</text></svg>
          : t.iconKey === 'handbrake' ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M9.5 8a3 3 0 0 1 0 8"/><path d="M14.5 8a3 3 0 0 0 0 8"/><line x1="12" y1="8.2" x2="12" y2="13.5"/><circle cx="12" cy="16" r="1" fill="currentColor" stroke="none"/></svg>
          : t.iconKey === 'tire' ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9.5a6.4 3.6 0 0 1 12 0v3a6.4 3.6 0 0 1-12 0z"/><path d="M6.6 8.4a5.6 3 0 0 0 10.8 0"/><path d="M9 8.8v5.6M12 8.4v6.4M15 8.8v5.6"/><line x1="12" y1="16" x2="12" y2="18.6"/><circle cx="12" cy="19.6" r="1" fill="currentColor" stroke="none"/></svg>
          : t.iconKey === 'battery' ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="8" width="17" height="10" rx="1.6"/><path d="M8 8V6.4a1 1 0 0 1 1-1h1.4a1 1 0 0 1 1 1V8"/><path d="M14.6 8V6.4a1 1 0 0 1 1-1H17a1 1 0 0 1 1 1V8"/><line x1="7.6" y1="13" x2="10.6" y2="13"/><line x1="9.1" y1="11.5" x2="9.1" y2="14.5"/><line x1="13.6" y1="13" x2="16.6" y2="13"/></svg>
          : t.iconKey === 'engine' ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 16.5V13l2-2.2h3.2l1 1.2h3.6l.9-2.4h3.3a2 2 0 0 1 2 2v1.8"/><path d="M20.5 13.4H18"/><path d="M8.7 10.8V8.6h2.8v2.2"/><path d="M3.5 16.5h17"/><circle cx="7" cy="17.8" r="1.6"/><circle cx="17" cy="17.8" r="1.6"/></svg>
          : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V6.2a1.6 1.6 0 0 1 1.6-1.6h4.8A1.6 1.6 0 0 1 12 6.2V21"/><path d="M4 12.5h8"/><path d="M4 21h8"/><path d="M12 8.4l3 2.6v6.6a1.4 1.4 0 0 0 2.8 0v-4.8l-2.2-2.2"/></svg>

        return createPortal(
          <div onClick={() => { setTellOpen(null); setCitaStep('detail') }} style={{ position: 'fixed', inset: 0, zIndex: 78, background: 'rgba(4,4,4,0.82)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: 380, maxWidth: '92vw', background: '#111318', border: `1px solid ${t.color}`, borderRadius: 22, padding: 26, boxShadow: '0 30px 80px rgba(0,0,0,.6)' }}>
              {citaStep === 'detail' ? (
                <>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <span style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(0,0,0,0.4)', border: `1px solid ${t.color}`, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{iconSvg}</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#f5f3ec' }}>{t.label}</span>
                    </div>
                    <button onClick={() => { setTellOpen(null); setCitaStep('detail') }} style={{ width: 30, height: 30, borderRadius: 9, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#8f8a7a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                  {/* Status pill */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 13px', borderRadius: 999, background: 'rgba(0,0,0,0.35)', border: `1px solid ${t.color}`, color: t.color, fontSize: 12, fontWeight: 800, marginBottom: 14 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.color, boxShadow: `0 0 8px ${t.color}` }} />
                    {estado}
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 8, borderRadius: 6, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 14 }}>
                    <div style={{ height: '100%', width: `${Math.round(t.pct * 100)}%`, background: t.color, borderRadius: 6 }} />
                  </div>
                  {/* Description */}
                  <p style={{ fontSize: 13.5, color: '#c9c6ba', lineHeight: 1.6, margin: '0 0 18px' }}>{desc}</p>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 9 }}>
                    <button onClick={() => { setTellOpen(null); setCitaStep('detail'); onNavigate('partes') }} style={{ flex: 1, padding: 12, borderRadius: 11, border: '1px solid rgba(245,197,24,0.4)', background: 'rgba(245,197,24,0.08)', color: '#F5C518', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Ver en Control de partes</button>
                    <button onClick={() => setCitaStep('cita')} style={{ flex: 1, padding: 12, borderRadius: 11, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Agendar cita</button>
                  </div>
                </>
              ) : (
                <>
                  {/* CITA STEP */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <span style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.4)', color: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#f5f3ec' }}>Agendar cita</span>
                    </div>
                    <button onClick={() => setCitaStep('detail')} style={{ width: 30, height: 30, borderRadius: 9, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#8f8a7a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>

                  {workshops.length > 0 ? (
                    <>
                      <p style={{ fontSize: 13, color: '#c9c6ba', margin: '0 0 14px', lineHeight: 1.5 }}>Selecciona un taller para agendar tu cita de <b style={{ color: t.color }}>{t.label}</b>:</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
                        {workshops.map(w => (
                          <button key={w.id} onClick={() => { setTellOpen(null); setCitaStep('detail'); onAddService() }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(245,197,24,0.25)', background: 'rgba(245,197,24,0.06)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                            <span style={{ width: 38, height: 38, borderRadius: 10, background: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#111', flexShrink: 0, overflow: 'hidden' }}>
                              {w.logo_url ? <img src={w.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : w.name.slice(0, 2).toUpperCase()}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#f5f3ec' }}>{w.name}</div>
                              <div style={{ fontSize: 11, color: '#8f8a7a', marginTop: 2 }}>{w.address || w.city || 'Sin dirección'}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(245,197,24,0.1)', border: '1px dashed rgba(245,197,24,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#f5f3ec', marginBottom: 6 }}>Sin talleres registrados</div>
                      <p style={{ fontSize: 13, color: '#8f8a7a', margin: '0 0 16px', lineHeight: 1.5 }}>Primero debes registrar un servicio para poder agendar una cita con un taller.</p>
                      <button onClick={() => { setTellOpen(null); setCitaStep('detail'); onAddService() }} style={{ padding: '10px 20px', borderRadius: 11, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Registrar servicio</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>,
          document.body
        )
      })()}

      {/* Main grid: ficha (flip) + right column */}
      <div className="fichagrid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,0.85fr)', gap: 22, alignItems: 'start' }}>
        {/* Flip card */}
        <div style={{ animation: 'textIn .5s .1s both', perspective: 2200 }}>
          <div style={{
            position: 'relative', minHeight: 356,
            transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d',
            transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            willChange: 'transform',
          }}>
            {/* FRONT */}
            <div className="flip-card-front" onClick={() => setFlipped(f => !f)} style={{
              position: 'relative', minHeight: 356,
              backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
              borderRadius: 22, overflow: 'hidden',
              border: '1px solid rgba(245,197,24,0.3)',
              padding: '14px 18px 10px', display: 'flex', flexDirection: 'column',
              background: walletBg,
              boxShadow: flipped ? '0 16px 50px rgba(0,0,0,0.35)' : '0 24px 70px rgba(0,0,0,0.45)',
              transition: 'box-shadow .5s',
              cursor: 'pointer',
            }}>
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: bgGradient }} />
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span style={{ width: 40, height: 40, flex: '0 0 auto', borderRadius: 10, overflow: 'hidden', background: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111', boxShadow: '0 4px 14px rgba(0,0,0,.3)' }}>
                      <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-3 4-6 7-6 11a6 6 0 0 0 12 0c0-4-3-7-6-11z"/></svg>
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 8, letterSpacing: '.2em', textTransform: 'uppercase', color: '#c99a00', fontWeight: 800 }}>CarLink Club · Socio</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: cInk, lineHeight: 1.1, marginTop: 1 }}>
                        {fichaRecord?.service_type === 'Aceite' ? (fichaRecord?.lubricant_brand || '—') : (fichaRecord?.service_type || '—')}
                      </div>
                      <div style={{ fontSize: 11, color: cSoft }}>
                        {fichaRecord?.service_type === 'Aceite' ? (fichaRecord?.lubricant_type || 'Sin datos de lubricante') : `Servicio de ${fichaRecord?.service_type || '—'}`}
                      </div>
                      {fichaRecord?.service_type === 'Aceite' && oilChangeKm != null && (
                        <div style={{ fontSize: 10, color: cMuted, marginTop: 2 }}>Cambiado a {oilChangeKm.toLocaleString()} km</div>
                      )}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setFlipped(f => !f) }} title="Dar vuelta a la ficha" style={{ flex: '0 0 auto', width: 34, height: 34, borderRadius: 9, border: '1px solid rgba(245,197,24,0.45)', background: 'rgba(245,197,24,0.12)', color: '#F5C518', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .18s' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
                  </button>
                </div>

                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {stamps.map((st, i) => (
                      <span key={i} title={st.label} style={{ width: 14, height: 14, borderRadius: '50%', background: st.on ? 'rgba(245,197,24,0.3)' : 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(245,197,24,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111' }}>
                        {st.on && <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: cMuted, fontWeight: 700 }}>
                    {totalServ}/{stampsRequired} sellos{promoDesc ? ` · ${promoDesc}` : ' · Nivel Oro'}
                  </div>
                </div>

                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {(() => {
                    const isOverdue = oilLife <= 0
                    const isWarning = oilLife > 0 && oilLife <= 0.12
                    const isApproaching = oilLife > 0.12 && oilLife <= 0.3
                    const isOk = oilLife > 0.3
                    const statusColor = isOverdue ? '#ff4d6a' : isWarning ? '#ff4d6a' : isApproaching ? '#ffb020' : '#22c55e'
                    const statusText = isOverdue ? 'Atrasado en mantenimiento' : isWarning ? 'Cambio urgente de aceite' : isApproaching ? 'Se acerca el próximo cambio' : 'Mantenimiento al día'
                    return (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: `${statusColor}18`, border: `1px solid ${statusColor}66`, color: statusColor, fontSize: 11, fontWeight: 700, transition: 'all .3s' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, boxShadow: `0 0 8px ${statusColor}` }}></span>
                        {statusText}
                      </span>
                    )
                  })()}
                  {latestDate && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: cMuted, fontWeight: 600 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                      {latestDate}
                    </span>
                  )}
                </div>

                {/* Kilometraje + Próximo servicio en fila */}
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'flex-end', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: cMuted, fontWeight: 700, marginBottom: 2 }}>Kilometraje aceite</div>
                    <div className="ficha-mileage" style={{ fontFamily: "'Anton',sans-serif", fontSize: 43, letterSpacing: '.01em', lineHeight: 1, color: cInk }}>
                      {oilChangeKm != null ? oilChangeKm.toLocaleString() : '—'}<span style={{ fontSize: 14, color: cMuted, fontFamily: "'Inter'", fontWeight: 600 }}> km</span>
                    </div>
                  </div>
                  <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
                    <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: cMuted, fontWeight: 700, marginBottom: 2 }}>Próximo servicio de aceite</div>
                    <div className="ficha-mileage" style={{ fontFamily: "'Anton',sans-serif", fontSize: 43, lineHeight: 1, color: cInk, textAlign: 'right' }}>{nextServiceKm != null ? nextServiceKm.toLocaleString() : '—'}<span style={{ fontSize: 14, color: cMuted, fontFamily: "'Inter'", fontWeight: 600 }}> km</span></div>
                  </div>
                </div>

                {/* Barra de progreso con indicador de avance */}
                <div style={{ marginTop: 8 }}>
                  <div style={{ position: 'relative', height: 7, borderRadius: 5, background: cChipBg, overflow: 'visible' }}>
                    <div style={{ height: '100%', width: progWidth, background: 'linear-gradient(90deg,#FFD84D,#F5C518,#8a6a00)', borderRadius: 5, transition: 'width .7s cubic-bezier(0.22,1,0.36,1)' }} />
                    {/* Arrow indicator */}
                    {currentKm != null && nextServiceKm != null && oilChangeKm != null && (
                      <div style={{ position: 'absolute', top: -1, left: `calc(${progWidth} - 4px)`, transition: 'left .7s cubic-bezier(0.22,1,0.36,1)' }}>
                        <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: `5px solid ${cInk}` }} />
                      </div>
                    )}
                  </div>
                  {/* Current km label below bar */}
                  {currentKm != null && (
                    <div style={{ marginTop: 4, fontSize: 10, color: cMuted, fontWeight: 600, textAlign: 'right' }}>
                      Actual: <span style={{ color: cInk, fontWeight: 700 }}>{currentKm.toLocaleString()} km</span>
                      {kmToNext != null && <span style={{ marginLeft: 6, color: oilLife > 0.3 ? '#22c55e' : oilLife > 0.12 ? '#ffb020' : '#ff4d6a' }}>· faltan {kmToNext.toLocaleString()} km</span>}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: cMuted, fontWeight: 700, margin: '8px 0 5px' }}>
                  {latest ? `Último servicio: ${latest.service_type}` : 'Servicios realizados'}
                </div>
                <div className="service-chips-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, maxHeight: 68, overflow: 'hidden' }}>
                  {(() => {
                    const chipDefs = [
                      { key: 'Aceite', title: 'Aceite' },
                      { key: 'Aire', title: 'Aire' },
                      { key: 'Combustible', title: 'Combust.' },
                      { key: 'Frenos', title: 'Frenos' },
                      { key: 'Refrigerante', title: 'Refrig.' },
                      { key: 'Llantas', title: 'Llantas' },
                      { key: 'Suspensión', title: 'Susp.' },
                      { key: 'Batería', title: 'Batería' },
                      { key: 'Transmisión', title: 'Transm.' },
                    ]
                    const maxMileage = maintenance.length > 0 ? Math.max(...maintenance.map(r => r.mileage)) : 0
                    const withState = chipDefs.map(item => {
                      const chipRecord = maintenance.find(r => r.service_type === item.key)
                      const hasRecord = chipRecord != null
                      const isLatestByMileage = hasRecord && chipRecord.mileage === maxMileage
                      const isActive = isLatestByMileage && chipRecord.next_service_mileage != null && currentKm != null && chipRecord.next_service_mileage > currentKm
                      const isExpired = hasRecord && chipRecord.next_service_mileage != null && currentKm != null && chipRecord.next_service_mileage <= currentKm
                      const sortKey = isActive ? 0 : isExpired ? 1 : hasRecord ? 2 : 3
                      return { ...item, chipRecord, hasRecord, isActive, isExpired, sortKey }
                    })
                    withState.sort((a, b) => a.sortKey - b.sortKey)
                    return withState.map(item => (
                      <div key={item.key} style={{
                        overflow: 'hidden', maxHeight: 34,
                        background: item.isActive ? 'rgba(245,197,24,0.12)' : item.isExpired ? 'rgba(255,77,106,0.08)' : cChipBg,
                        border: `1px solid ${item.isActive ? 'rgba(245,197,24,0.45)' : item.isExpired ? 'rgba(255,77,106,0.35)' : cChipBd}`,
                        borderRadius: 9, padding: '7px 9px',
                        opacity: item.hasRecord ? 1 : 0.35,
                        cursor: 'default',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: item.isActive ? '#F5C518' : item.isExpired ? '#ff4d6a' : cMuted, fontSize: 11, fontWeight: 700 }}>
                          <span style={{ flex: '0 0 auto', display: 'flex' }}><ServiceIcon type={item.key} size={13} /></span>{item.title}
                          {item.isActive && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}><path d="M20 6L9 17l-5-5"/></svg>}
                          {item.isExpired && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}><path d="M18 6L6 18M6 6l12 12"/></svg>}
                        </div>
                      </div>
                    ))
                  })()}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: 4, display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: cMuted, justifyContent: 'center' }}>
                  <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 12, color: '#c99a00', letterSpacing: '.02em' }}>CarLink</span>
                  <span>· ficha verificada · {plateText}</span>
                </div>
              </div>
            </div>

            {/* BACK — Tu taller de confianza */}
            <div className="flip-card-back" onClick={() => setFlipped(f => !f)} style={{
              position: 'absolute', inset: 0, minHeight: 356,
              backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              borderRadius: 22, overflow: 'hidden',
              border: '1px solid rgba(245,197,24,0.28)',
              padding: 22, display: 'flex', flexDirection: 'column',
              background: walletBg,
              cursor: 'pointer',
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
                <button onClick={(e) => { e.stopPropagation(); setFlipped(f => !f) }} title="Volver a la ficha" style={{ flex: '0 0 auto', width: 38, height: 38, borderRadius: 11, border: '1px solid rgba(245,197,24,0.45)', background: 'rgba(245,197,24,0.12)', color: '#F5C518', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .18s' }}>
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
