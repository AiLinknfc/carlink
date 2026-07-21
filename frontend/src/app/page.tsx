'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/store/auth'
import { CITIES } from '@/lib/constants'
import LoginModal from '@/components/LoginModal'
import PolicyModal, { PolicyTab } from '@/components/PolicyModal'
import PqrsAgent from '@/components/PqrsAgent'
import FobCheckoutModal from '@/components/FobCheckoutModal'
import LandingSections from '@/components/LandingSections'
import Plate3D from '@/components/Plate3D'
import BgParticles from '@/components/BgParticles'

const PLATE_TYPES = [
  { id: 'particular', name: 'Particular', tag: '' },
  { id: 'moto', name: 'Moto', tag: '' },
  { id: 'publico', name: 'Público', tag: 'PÚBLICO' },
  { id: 'diplomatica', name: 'Diplomática', tag: 'CD' },
  { id: 'carga', name: 'Carga', tag: 'CARGA' },
  { id: 'remolque', name: 'Remolque', tag: '' },
  { id: 'clasico', name: 'Clásico', tag: 'ANTIGUO' },
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
  carga:       { letterLen: 3, numLen: 3 },
  remolque:    { letterLen: 1, numLen: 5 },
  clasico:     { letterLen: 3, numLen: 3 },
}

// Valores por defecto genéricos (plantilla) por tipo, válidos según su formato de caracteres.
// Se ven como un ejemplo para que el usuario los reemplace con su placa real.
const PLATE_DEFAULTS: Record<string, { letters: string; numbers: string }> = {
  particular:  { letters: 'ABC', numbers: '123' },  // 3 letras + 3 números
  moto:        { letters: 'ABC', numbers: '12D' },  // 3 letras + 2 números + 1 letra
  publico:     { letters: 'ABC', numbers: '123' },
  diplomatica: { letters: 'AB',  numbers: '1234' },
  carga:       { letters: 'ABC', numbers: '123' },
  remolque:    { letters: 'A',   numbers: '12345' },
  clasico:     { letters: 'ABC', numbers: '123' },
}

export default function LandingPage() {
  const { signIn } = useAuth()
  const [plates, setPlates] = useState<Record<string, { letters: string; numbers: string }>>(() => ({ ...PLATE_DEFAULTS }))
  const [city, setCity] = useState('Bogotá D.C.')
  const [type, setType] = useState('particular')
  const [cityOpen, setCityOpen] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [policyOpen, setPolicyOpen] = useState(false)
  const [policyTab, setPolicyTab] = useState<PolicyTab>('privacy')
  const [pqrsOpen, setPqrsOpen] = useState(false)
  const [fobOpen, setFobOpen] = useState(false)
  const [fobProduct, setFobProduct] = useState<string | undefined>(undefined)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const cityRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(e.target as Node))
        setCityOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    try { setTheme(window.localStorage.getItem('carlink_theme') === 'light' ? 'light' : 'dark') } catch { /* ignore */ }
  }, [])

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

  const dark = theme !== 'light'
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

  const ps = PLATE_STYLE[type]
  const pc = PLATE_CONFIG[type]
  const plateLetters = plates[type].letters
  const plateNumbers = plates[type].numbers
  // Cada tipo respeta su propio formato de caracteres (los handlers limitan la entrada).
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
    setCurrentPlate({ letters: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, pc.letterLen) })
  }

  const handleNumbers = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (pc.moto) {
      // Moto: 2 dígitos + 1 letra final (ej. 45F)
      const digits = raw.replace(/[^0-9]/g, '').slice(0, 2)
      const letter = raw.replace(/[^A-Z]/g, '').slice(0, 1)
      setCurrentPlate({ numbers: digits + letter })
    } else {
      setCurrentPlate({ numbers: raw.replace(/[^0-9]/g, '').slice(0, pc.numLen) })
    }
  }

  const openLoginModal = () => {
    sessionStorage.setItem('carlink_plate', plateText)
    sessionStorage.setItem('carlink_city', city)
    setLoginModalOpen(true)
  }

  const closeLoginModal = () => {
    setLoginModalOpen(false)
  }

  const handleSignIn = () => {
    signIn()
  }

  const openPolicy = (tab: PolicyTab) => {
    setPolicyTab(tab)
    setPolicyOpen(true)
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflowX: 'hidden', background: tk.pageBg }}>
      <BgParticles theme={theme} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', background: tk.vignette }} />

      {/* ===== HEADER (logo + contraste claro/oscuro) ===== */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px clamp(20px,5vw,64px)',
        background: tk.headerBg, backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        borderBottom: `1px solid ${tk.thinBorder}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, fontFamily: "'Anton',sans-serif", fontSize: 22, letterSpacing: '.01em' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: '#F5C518', color: '#111' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="8.3" /><circle cx="12" cy="12" r="2.8" /><path d="M12 3.7v3M12 17.3v3M3.7 12h3M17.3 12h3M6.2 6.2l2.1 2.1M15.7 15.7l2.1 2.1M6.2 17.8l2.1-2.1M15.7 8.3l2.1-2.1" /></svg>
          </span>
          <span>Car<span style={{ color: '#F5C518' }}>Link</span></span>
        </div>
        <button onClick={toggleTheme} title="Cambiar apariencia" aria-label="Cambiar modo claro u oscuro" style={{
          position: 'relative', width: 66, height: 34, borderRadius: 999,
          border: `1px solid ${tk.switchBorder}`, background: tk.switchTrack,
          cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 4px',
          transition: 'all .25s', boxShadow: tk.switchGlow,
        }}>
          <span style={{ position: 'absolute', left: 9, fontSize: 11, opacity: dark ? 0 : 1, transition: 'opacity .2s' }}>○</span>
          <span style={{ position: 'absolute', right: 8, color: '#111', opacity: dark ? 1 : 0, transition: 'opacity .2s', display: 'inline-flex' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M9 2a1 1 0 0 0-1 1v3.06A8 8 0 0 0 4 13a1 1 0 0 0 1 1h1l1 6h10l1-6h1a1 1 0 0 0 1-1 8 8 0 0 0-4-6.94V3a1 1 0 0 0-1-1z" /></svg>
          </span>
          <span style={{ position: 'relative', zIndex: 1, width: 26, height: 26, borderRadius: '50%', background: tk.knobBg, boxShadow: `0 2px 6px rgba(0,0,0,.35), ${tk.knobGlow}`, transform: `translateX(${dark ? 32 : 0}px)`, transition: 'transform .25s cubic-bezier(0.34,1.56,0.64,1), background .25s' }} />
        </button>
      </header>

      <section data-r="entrada" style={{
        position: 'relative', zIndex: 10,
        width: '100vw', height: '100vh',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '78px clamp(20px,5vw,64px) 26px', overflowY: 'auto',
      }}>
        <div style={{ textAlign: 'center', zIndex: 16, flex: '0 0 auto' }}>
          <div style={{ fontSize: 12, letterSpacing: '.28em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518', animation: 'fadeUp .7s both' }}>
            Plataforma de mantenimiento vehicular
          </div>

          <h1 style={{
            fontFamily: "'Anton',sans-serif", fontSize: 'clamp(30px,4.6vw,58px)',
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
              tag={PLATE_TYPES.find(t => t.id === type)?.tag} />
          </div>

          <div style={{ width: 'min(720px,96vw)', margin: '0 auto', animation: 'fadeUp .7s .12s both' }}>
            <p style={{
              textAlign: 'center', color: tk.muted, fontSize: 15, maxWidth: '52ch',
              margin: '0 auto 14px', lineHeight: 1.5,
            }}>
              Ingresa tu placa y la ciudad de expedición. Pasa el cursor (o toca) la placa y verás cómo cobra vida.
            </p>

            <div style={{ display: 'flex', gap: 7, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
              {types.map((t) => (
                <button key={t.id} onClick={t.onClick}
                  style={{ padding: '8px 15px', borderRadius: 999, border: `1px solid ${t.border}`, background: t.bg, color: t.fg, fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all .18s' }}>
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
                  maxLength={pc.letterLen} placeholder="ABC"
                  style={{ width: 52, border: 'none', background: 'transparent', color: '#F5C518', fontFamily: "'Anton',sans-serif", fontSize: 26, letterSpacing: '.06em', textTransform: 'uppercase', outline: 'none', padding: '2px 0', textAlign: 'right' }} />
                <span style={{ color: '#F5C518', fontFamily: "'Anton',sans-serif", fontSize: 26, lineHeight: 1, opacity: 0.5, padding: '0 6px' }}>-</span>
                <input value={plateNumbers} onChange={handleNumbers}
                  maxLength={pc.moto ? 3 : pc.numLen} placeholder={pc.moto ? '12D' : '123'}
                  style={{ width: 52, border: 'none', background: 'transparent', color: '#F5C518', fontFamily: "'Anton',sans-serif", fontSize: 26, letterSpacing: '.06em', textTransform: 'uppercase', outline: 'none', padding: '2px 0', textAlign: 'left' }} />
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

              <button onClick={openLoginModal}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 26px', borderRadius: 12, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 0 24px rgba(245,197,24,0.4)', transition: 'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 40px rgba(245,197,24,0.75)'; e.currentTarget.style.background = '#FFD84D' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 24px rgba(245,197,24,0.4)'; e.currentTarget.style.background = '#F5C518' }}>
                Continuar
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

      <LandingSections theme={theme} onStart={openLoginModal} onOpenPolicy={openPolicy} onOpenPqrs={() => setPqrsOpen(true)} onBuyFob={(id) => { setFobProduct(id); setFobOpen(true) }} />

      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        plateText={plateText}
        onOpenPolicy={openPolicy}
        theme={theme}
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

      <FobCheckoutModal
        isOpen={fobOpen}
        onClose={() => setFobOpen(false)}
        theme={theme}
        initialProductId={fobProduct}
        plate={plateText}
      />
    </div>
  )
}
