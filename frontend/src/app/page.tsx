'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/store/auth'
import { useTheme } from '@/store/theme'
import { CITIES } from '@/lib/constants'
import LoginModal from '@/components/LoginModal'
import PolicyModal, { PolicyTab } from '@/components/PolicyModal'
import PqrsAgent from '@/components/PqrsAgent'
import CartModal from '@/components/CartModal'
import LandingSections from '@/components/LandingSections'
import Plate3D from '@/components/Plate3D'
import BgParticles from '@/components/BgParticles'
import CarLinkLogo from '@/components/CarLinkLogo'
import KeychainScrub from '@/components/KeychainScrub'
import Link from 'next/link'

const GOLD = '#F5C518'
const CHECK = (color = GOLD, size = 15) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto', marginTop: 2 }}><path d="M20 6L9 17l-5-5" /></svg>
)
const ARROW = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)

function CarLinkWordmark({ fontSize, iconSize, textColor = '#f5f3ec' }: { fontSize: number; iconSize: number; textColor?: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-display)', fontSize, letterSpacing: '.01em', color: textColor }}>
      <CarLinkLogo size={iconSize} />
      <span>Car<span style={{ color: GOLD }}>Link</span></span>
    </span>
  )
}

const PLATE_TYPES = [
  { id: 'particular', name: 'Particular', showLabel: false },
  { id: 'moto', name: 'Moto', showLabel: false },
  { id: 'publico', name: 'Público', showLabel: false },
  { id: 'diplomatica', name: 'Diplomática', showLabel: true },
  { id: 'carga', name: 'Carga', showLabel: true },
  { id: 'remolque', name: 'Remolque', showLabel: true },
  { id: 'clasico', name: 'Clásico', showLabel: false },
]

const PLATE_STYLE: Record<string, { bg: string; ink: string; label: string }> = {
  particular:  { bg: 'linear-gradient(178deg,#F8D64B 0%,#F2C21A 62%,#E7B412 100%)', ink: '#111116', label: '#141414' },
  moto:        { bg: 'linear-gradient(178deg,#F8D64B 0%,#F2C21A 62%,#E7B412 100%)', ink: '#111116', label: '#141414' },
  publico:     { bg: 'linear-gradient(178deg,#ffffff 0%,#eef0f2 60%,#dde1e6 100%)', ink: '#0c1a12', label: '#0c1a12' },
  diplomatica: { bg: 'linear-gradient(178deg,#2340d6 0%,#1531a8 60%,#0f2688 100%)', ink: '#ffffff', label: '#ffffff' },
  carga:       { bg: 'linear-gradient(178deg,#cc2222 0%,#a81818 60%,#8a1212 100%)', ink: '#ffffff', label: '#ffffff' },
  remolque:    { bg: 'linear-gradient(178deg,#1a6b3c 0%,#145530 60%,#0f4426 100%)', ink: '#ffffff', label: '#ffffff' },
  clasico:     { bg: 'linear-gradient(90deg,#2e4a75 0%,#2e4a75 22%,#e8e0d0 22%,#e8e0d0 78%,#2e4a75 78%,#2e4a75 100%)', ink: '#111116', label: '#2e4a75' },
}

const PLATE_CONFIG: Record<string, { letterLen: number; numLen: number; moto?: boolean }> = {
  particular:  { letterLen: 3, numLen: 3 },
  moto:        { letterLen: 3, numLen: 3, moto: true },
  publico:     { letterLen: 3, numLen: 3 },
  diplomatica: { letterLen: 2, numLen: 4 },
  carga:       { letterLen: 1, numLen: 4 },
  remolque:    { letterLen: 1, numLen: 5 },
  clasico:     { letterLen: 3, numLen: 3 },
}

const PLATE_DEFAULTS: Record<string, { letters: string; numbers: string }> = {
  particular:  { letters: 'ABC', numbers: '123' },
  moto:        { letters: 'ABC', numbers: '12D' },
  publico:     { letters: 'ABC', numbers: '123' },
  diplomatica: { letters: 'AB',  numbers: '1234' },
  carga:       { letters: 'T',   numbers: '1234' },
  remolque:    { letters: 'R',   numbers: '12345' },
  clasico:     { letters: 'ABC', numbers: '123' },
}

export default function LandingPage() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [plates, setPlates] = useState<Record<string, { letters: string; numbers: string }>>(() => ({ ...PLATE_DEFAULTS }))
  const [city, setCity] = useState('Bogotá')
  const [type, setType] = useState('particular')
  const [cityOpen, setCityOpen] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [loginModalMode, setLoginModalMode] = useState<'signin' | 'signup'>('signin')
  const [loginModalAccountType, setLoginModalAccountType] = useState<'user' | 'business'>('user')
  const [policyOpen, setPolicyOpen] = useState(false)
  const [policyTab, setPolicyTab] = useState<PolicyTab>('privacy')
  const [pqrsOpen, setPqrsOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const { theme, isDark: dark, toggleTheme } = useTheme()
  const cityRef = useRef<HTMLDivElement>(null)

  // Forzar tema dark en el landing — cuando el usuario navegue a /app,
  // ThemeProvider restaura el tema guardado en localStorage.
  useEffect(() => {
    const prev = document.documentElement.dataset.theme
    document.documentElement.dataset.theme = 'dark'
    return () => { if (prev) document.documentElement.dataset.theme = prev }
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(e.target as Node))
        setCityOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])
  const tk = {
    pageBg: dark ? '#060606' : '#f7f6f2',
    vignette: dark
      ? 'radial-gradient(circle at 50% 42%, transparent 40%, rgba(6,6,6,0.86) 100%)'
      : 'radial-gradient(circle at 50% 42%, transparent 45%, rgba(247,246,242,0.92) 100%)',
    muted: dark ? '#b6b2a6' : '#6f6a5f',
    label: dark ? '#7c786e' : '#8a8578',
    glassBg: dark ? 'rgba(14,14,14,0.72)' : 'rgba(255,255,255,0.8)',
    glassBorder: dark ? 'rgba(245,197,24,0.22)' : 'rgba(17,17,17,0.1)',
    glassShadow: dark ? '0 24px 60px rgba(0,0,0,.55)' : '0 24px 60px rgba(17,17,17,0.12)',
    divider: dark ? 'rgba(255,255,255,0.1)' : 'rgba(17,17,17,0.08)',
    chipBg: dark ? 'rgba(255,255,255,0.05)' : 'rgba(17,17,17,0.04)',
    chipBorder: dark ? 'rgba(255,255,255,0.12)' : 'rgba(17,17,17,0.12)',
    citySelect: dark ? '#f5f3ec' : '#17171a',
    menuBg: dark ? '#141414' : '#ffffff',
    menuBorder: dark ? 'rgba(245,197,24,0.25)' : 'rgba(17,17,17,0.12)',
    menuHover: dark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,17,0.05)',
    thinBorder: dark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,17,0.07)',
    headerBg: dark ? 'rgba(9,9,9,0.72)' : 'rgba(255,255,255,0.72)',
    switchTrack: dark ? 'linear-gradient(90deg,#1a1a1a,#0a0a0a)' : 'linear-gradient(90deg,#e8e6df,#d8d6cd)',
    switchBorder: dark ? 'rgba(245,197,24,0.35)' : 'rgba(17,17,17,0.14)',
    switchGlow: dark ? 'inset 0 1px 3px rgba(0,0,0,0.6), 0 0 14px rgba(245,197,24,0.25)' : 'inset 0 1px 3px rgba(17,17,17,0.12)',
    knobBg: dark ? 'radial-gradient(circle at 35% 30%,#fff7d6,#F5C518 60%,#c99a00 100%)' : '#fff',
    knobGlow: dark ? '0 0 12px rgba(245,197,24,0.85)' : 'none',
  }

  // Shop hero theme tokens
  const SHOP_MUTED = dark ? '#a8a496' : '#5c584e'
  const SHOP_BORDER = dark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.1)'
  const SHOP_CTA_BTN: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 10, padding: '15px 30px', borderRadius: 13, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: '0 0 28px rgba(245,197,24,.38)', textDecoration: 'none' as const }

  const ps = PLATE_STYLE[type]
  const pc = PLATE_CONFIG[type]
  const plateLetters = plates[type].letters
  const plateNumbers = plates[type].numbers
  const plateText = `${plateLetters}-${plateNumbers}`

  const types = useMemo(() => PLATE_TYPES.map(t => {
    const active = type === t.id
    return {
      id: t.id, name: t.name,
      bg: active ? '#F5C518' : tk.chipBg,
      border: active ? '#F5C518' : tk.chipBorder,
      fg: active ? '#111' : tk.muted,
      onClick: () => setType(t.id),
    }
  }), [type, tk.chipBg, tk.chipBorder, tk.muted])

  const setCurrentPlate = (patch: Partial<{ letters: string; numbers: string }>) => {
    setPlates(p => ({ ...p, [type]: { ...p[type], ...patch } }))
  }

  const handleLetters = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, pc.letterLen)
    if (type === 'remolque') val = val.replace(/[^RS]/g, '')
    setCurrentPlate({ letters: val })
  }

  const handleNumbers = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (pc.moto) {
      const digits = raw.replace(/[^0-9]/g, '').slice(0, 2)
      const letter = raw.replace(/[^A-Z]/g, '').slice(0, 1)
      setCurrentPlate({ numbers: digits + letter })
    } else {
      setCurrentPlate({ numbers: raw.replace(/[^0-9]/g, '').slice(0, pc.numLen) })
    }
  }

  const openLoginModal = (accountType: 'user' | 'business' = 'user') => {
    sessionStorage.setItem('carlink_plate', plateText)
    sessionStorage.setItem('carlink_city', city)
    setLoginModalMode('signin')
    setLoginModalAccountType(accountType)
    setLoginModalOpen(true)
  }

  const openSignupModal = () => {
    sessionStorage.setItem('carlink_plate', plateText)
    sessionStorage.setItem('carlink_city', city)
    setLoginModalMode('signup')
    setLoginModalAccountType('user')
    setLoginModalOpen(true)
  }

  const openPolicy = (tab: PolicyTab) => {
    setPolicyTab(tab)
    setPolicyOpen(true)
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflowX: 'hidden', background: tk.pageBg }}>
      <BgParticles theme={theme} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', background: tk.vignette }} />

      <style>{`
        @keyframes shopFadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        @keyframes shopFloatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @media(max-width:860px){
          [data-r="shopHero"] [style*="grid-template-columns"]{grid-template-columns:1fr !important}
        }
        @media(max-width:720px){
          [data-r="keychainScrub"] canvas{min-height:360px !important}
        }
      `}</style>

      {/* ===== HEADER ===== */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px clamp(16px,4vw,40px)',
        background: tk.headerBg, backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        borderBottom: `1px solid ${tk.thinBorder}`,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '.01em' }}>
          <CarLinkLogo size={33} />
          <span>Car<span style={{ color: '#F5C518' }}>Link</span></span>
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={openSignupModal} className="header-auth-btn header-register" title="Crear cuenta" style={{
            padding: '6px 12px', borderRadius: 9, border: `1px solid ${tk.switchBorder}`,
            background: 'transparent', color: tk.muted, fontWeight: 600, fontSize: 12,
            cursor: 'pointer', transition: 'all .2s', whiteSpace: 'nowrap',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#F5C518'; e.currentTarget.style.color = '#F5C518' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = tk.switchBorder; e.currentTarget.style.color = tk.muted }}>
            Registrar
          </button>
          <button onClick={() => openLoginModal()} className="header-auth-btn" title="Iniciar sesión" style={{
            padding: '6px 12px', borderRadius: 9, border: 'none',
            background: '#F5C518', color: '#111', fontWeight: 700, fontSize: 12,
            cursor: 'pointer', transition: 'all .2s', whiteSpace: 'nowrap',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FFD84D' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F5C518' }}>
            Iniciar sesión
          </button>
          <button onClick={toggleTheme} title="Cambiar apariencia" aria-label="Cambiar modo claro u oscuro" className="header-theme-btn" style={{
            position: 'relative', width: 56, height: 28, borderRadius: 999,
            border: `1px solid ${tk.switchBorder}`, background: tk.switchTrack,
            cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 3px',
            transition: 'all .25s', boxShadow: tk.switchGlow,
          }}>
            <span style={{ position: 'absolute', left: 7, fontSize: 10, opacity: dark ? 0 : 1, transition: 'opacity .2s' }}>○</span>
            <span style={{ position: 'absolute', right: 6, color: '#111', opacity: dark ? 1 : 0, transition: 'opacity .2s', display: 'inline-flex' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M9 2a1 1 0 0 0-1 1v3.06A8 8 0 0 0 4 13a1 1 0 0 0 1 1h1l1 6h10l1-6h1a1 1 0 0 0 1-1 8 8 0 0 0-4-6.94V3a1 1 0 0 0-1-1z" /></svg>
            </span>
            <span style={{ position: 'relative', zIndex: 1, width: 22, height: 22, borderRadius: '50%', background: tk.knobBg, boxShadow: `0 2px 6px rgba(0,0,0,.35), ${tk.knobGlow}`, transform: `translateX(${dark ? 28 : 0}px)`, transition: 'transform .25s cubic-bezier(0.34,1.56,0.64,1), background .25s' }} />
          </button>
        </div>
      </header>

      {/* ===== SHOP HERO (copiado de /shop) ===== */}
      <section data-r="shopHero" style={{ position: 'relative', height: '100vh' }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh', maxWidth: 1280, margin: '0 auto', padding: '0 clamp(20px,5vw,64px)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 62% 44%,rgba(245,197,24,0.14),transparent 58%)', pointerEvents: 'none' }} />
          {/* Canvas — shifted right, behind text */}
          <div style={{ position: 'absolute', left: '28%', right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 20, animation: 'shopFadeUp .7s .14s both' }}>
            <KeychainScrub dark={dark} />
          </div>
          {/* Text — floating left, overlapping canvas ~20% */}
          <div style={{ position: 'absolute', left: 'clamp(20px,5vw,64px)', top: 100, zIndex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', width: 'clamp(320px,42vw,520px)', animation: 'shopFadeUp .7s both' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '7px 15px', borderRadius: 999, background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.3)', fontSize: 12, fontWeight: 700, letterSpacing: '.28em', textTransform: 'uppercase' as const, color: GOLD, marginBottom: 26, alignSelf: 'flex-start', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: GOLD }} />El pasaporte digital de tu vehículo
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px,4.6vw,58px)', lineHeight: 0.98, margin: 0, textTransform: 'uppercase' as const }}>Toda la historia de tu vehículo en <span style={{ color: GOLD }}>un solo toque</span>.</h1>
            <p style={{ fontSize: 15, lineHeight: 1.55, color: SHOP_MUTED, margin: '26px 0 0', maxWidth: '52ch' }}>CarLink convierte tu vehículo en un vehículo inteligente. Escanea tu llavero NFC y consulta mantenimiento, documentos, kilometraje, reparaciones y mucho más.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginTop: 38 }}>
              <Link href="#h-buyfob" style={SHOP_CTA_BTN}>Obtén tu CarLink{ARROW}</Link>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, color: GOLD, lineHeight: 1 }}>$49.900</div>
                <div style={{ fontSize: 13, color: SHOP_MUTED, marginTop: 3 }}>pago único · envío incluido</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 32, fontSize: 13.5, color: SHOP_MUTED, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>{CHECK()}App gratis para siempre</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>{CHECK()}Android e iPhone</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>{CHECK()}Sin batería</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HERO (original single-column layout) ===== */}
      <section data-r="entrada" className="hero-section" style={{
        position: 'relative', zIndex: 10,
        width: '100vw', minHeight: '100vh', height: 'auto',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '68px clamp(20px,5vw,64px) 26px',
      }}>
        <div style={{ textAlign: 'center', zIndex: 16, flex: '0 0 auto' }}>
          <div style={{ fontSize: 12, letterSpacing: '.28em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518', animation: 'fadeUp .7s both' }}>
            Plataforma de mantenimiento vehicular
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(30px,4.6vw,58px)',
            lineHeight: 0.98, letterSpacing: 0, margin: '12px auto 0', maxWidth: '19ch',
            textTransform: 'uppercase', animation: 'fadeUp .7s .04s both',
          }}>
            Tu placa es tu <span style={{ color: '#F5C518' }}>identidad digital</span>
          </h1>

          <div style={{
            display: 'flex', justifyContent: 'center', margin: '6px auto 4px',
            animation: 'fadeUp .7s .08s both',
          }}>
            <Plate3D plate={plateText} city={city}
              bg={ps.bg} inkColor={ps.ink} labelColor={ps.label}
              showLabel={PLATE_TYPES.find(t => t.id === type)?.showLabel ?? false} />
          </div>

          <div style={{ width: '100%', maxWidth: 720, margin: '0 auto', animation: 'fadeUp .7s .12s both' }}>
            <p style={{
              textAlign: 'center', color: tk.muted, fontSize: 15, maxWidth: '52ch',
              margin: '0 auto 14px', lineHeight: 1.5,
            }}>
              Ingresa tu placa y la ciudad de expedición. Pasa el cursor (o toca) la placa y verás cómo cobra vida.
            </p>

            <div style={{ display: 'flex', gap: 7, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
              {types.map((t) => (
                <button key={t.id} onClick={t.onClick}
                  style={{ padding: '10px 18px', borderRadius: 999, border: `1px solid ${t.border}`, background: t.bg, color: t.fg, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all .18s' }}>
                  {t.name}
                </button>
              ))}
            </div>

            <div data-r="heroform" style={{
              display: 'flex', gap: 10, alignItems: 'stretch',
              background: tk.glassBg, backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
              border: `1px solid ${tk.glassBorder}`, borderRadius: 18, padding: 12,
              boxShadow: tk.glassShadow,
            }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>
                <label style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: tk.label, fontWeight: 700 }}>
                  Número de placa
                </label>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
                <input value={plateLetters} onChange={handleLetters}
                  maxLength={pc.letterLen} placeholder={'A'.repeat(pc.letterLen)}
                  style={{ width: Math.max(40, pc.letterLen * 22), border: 'none', background: 'transparent', color: '#F5C518', fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '.06em', textTransform: 'uppercase', outline: 'none', padding: '2px 0', textAlign: 'right' }} />
                <span style={{ color: '#F5C518', fontFamily: 'var(--font-display)', fontSize: 26, lineHeight: 1, opacity: 0.5, padding: '0 6px' }}>-</span>
                <input value={plateNumbers} onChange={handleNumbers}
                  maxLength={pc.moto ? 3 : pc.numLen} placeholder={pc.moto ? '12D' : '1'.repeat(pc.numLen)}
                  style={{ width: Math.max(40, (pc.moto ? 3 : pc.numLen) * 22), border: 'none', background: 'transparent', color: '#F5C518', fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '.06em', textTransform: 'uppercase', outline: 'none', padding: '2px 0', textAlign: 'left' }} />
              </div>
              </div>

              <div data-r="divider" style={{ width: 1, background: tk.divider }} />

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 8px', position: 'relative' }} ref={cityRef}>
                <label style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: tk.label, fontWeight: 700 }}>
                  Ciudad de expedición
                </label>
                <button onClick={() => setCityOpen(!cityOpen)} type="button"
                  style={{ width: '100%', border: 'none', background: 'transparent', color: tk.citySelect, fontSize: 17, fontWeight: 600, outline: 'none', padding: '4px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{city}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto', opacity: 0.5, transform: cityOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {cityOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                    marginTop: 4, maxHeight: 210, overflowY: 'auto',
                    background: tk.menuBg, border: `1px solid ${tk.menuBorder}`,
                    borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,.6)',
                  }}>
                    {CITIES.map(c => (
                      <button key={c} onClick={() => { setCity(c); setCityOpen(false) }} type="button"
                        style={{
                          display: 'block', width: '100%', padding: '10px 14px', border: 'none',
                          background: city === c ? 'rgba(245,197,24,0.15)' : 'transparent',
                          color: city === c ? '#F5C518' : tk.citySelect,
                          fontSize: 15, fontWeight: city === c ? 700 : 500,
                          textAlign: 'left', cursor: 'pointer',
                          transition: 'background .12s',
                        }}
                        onMouseEnter={e => { if (city !== c) e.currentTarget.style.background = tk.menuHover }}
                        onMouseLeave={e => { if (city !== c) e.currentTarget.style.background = 'transparent' }}>
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={() => openLoginModal()}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 26px', borderRadius: 12, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 0 24px rgba(245,197,24,0.4)', transition: 'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 40px rgba(245,197,24,0.75)'; e.currentTarget.style.background = '#FFD84D' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 24px rgba(245,197,24,0.4)'; e.currentTarget.style.background = '#F5C518' }}>
                Acceder
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </button>
            </div>

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: tk.label, fontWeight: 700, marginBottom: 9 }}>
                Lleva tu ficha en la Wallet
              </div>
              <div data-r="storeRow" style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '9px 16px', borderRadius: 11, background: '#000', border: '1px solid rgba(255,255,255,0.22)', color: '#fff', textDecoration: 'none' }}>
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor"><path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.9-1.4-.1-2.8.9-3.5.9-.7 0-1.9-.8-3-.8-1.6 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.1 0 1.6-.7 3-.7s1.8.7 3 .7c1.2 0 2-1.1 2.8-2.2.9-1.3 1.2-2.5 1.2-2.6-.1 0-2.4-.9-2.4-3.6zM14.2 5.7c.6-.8 1-1.8.9-2.9-.9 0-2 .6-2.6 1.3-.6.7-1.1 1.7-1 2.7 1 .1 2-.5 2.7-1.1z"/></svg>
                  <span style={{ textAlign: 'left', lineHeight: 1.05 }}><span style={{ display: 'block', fontSize: 9, color: '#c9c6ba' }}>Descárgala en</span><span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>App Store</span></span>
                </a>
                <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '9px 16px', borderRadius: 11, background: '#000', border: '1px solid rgba(255,255,255,0.22)', color: '#fff', textDecoration: 'none' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#EA4335" d="M3.6 2.3C3.3 2.6 3.1 3 3.1 3.6v16.8c0 .6.2 1 .5 1.3l.1.1L13 12.6v-.2L3.7 2.2l-.1.1z"/><path fill="#FBBC04" d="M16 15.7l-3-3v-.2l3-3 .1.1 3.6 2.1c1 .6 1 1.5 0 2.1L16 15.7z"/><path fill="#4285F4" d="M16.1 15.6L13 12.5 3.6 21.9c.3.4.9.4 1.5.1l11-6.4z"/><path fill="#34A853" d="M16.1 9.4l-11-6.3c-.6-.4-1.2-.3-1.5.1L13 12.5l3.1-3.1z"/></svg>
                  <span style={{ textAlign: 'left', lineHeight: 1.05 }}><span style={{ display: 'block', fontSize: 9, color: '#c9c6ba' }}>Disponible en</span><span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>Google Play</span></span>
                </a>
              </div>
            </div>

            <p style={{ textAlign: 'center', color: tk.label, fontSize: 12, margin: '14px 0 0' }}>
              Al continuar accederás con tu cuenta de Google · Datos protegidos
            </p>
          </div>
        </div>
      </section>

      <LandingSections theme={theme} onStart={openLoginModal} onOpenEmpresa={openLoginModal} onOpenPolicy={openPolicy} onOpenPqrs={() => setPqrsOpen(true)} />

      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        plateText={plateText}
        onOpenPolicy={openPolicy}
        theme={theme}
        initialMode={loginModalMode}
        initialAccountType={loginModalAccountType}
      />

      <CartModal
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        theme={theme}
        plateText={plateText}
        plateType={type}
        city={city}
      />

      <PolicyModal
        isOpen={policyOpen}
        onClose={() => setPolicyOpen(false)}
        tab={policyTab}
        theme={theme}
        plateText={plateText}
        city={city}
      />

      <PqrsAgent
        isOpen={pqrsOpen}
        onClose={() => setPqrsOpen(false)}
        theme={theme}
        plate={plateText}
        city={city}
      />
    </div>
  )
}
