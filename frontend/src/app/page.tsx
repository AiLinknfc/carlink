'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useAuth } from '@/store/auth'
import { CITIES } from '@/lib/constants'
import LoginModal from '@/components/LoginModal'
import Plate3D from '@/components/Plate3D'
import BgParticles from '@/components/BgParticles'
import { formatPlate, parsePlate } from '@/lib/plate'

const PLATE_TYPES = [
  { id: 'particular', name: 'Particular', tag: '' },
  { id: 'publico', name: 'Público', tag: 'PÚBLICO' },
  { id: 'diplomatica', name: 'Diplomática', tag: 'CD' },
  { id: 'carga', name: 'Carga', tag: 'CARGA' },
  { id: 'remolque', name: 'Remolque', tag: '' },
  { id: 'clasico', name: 'Clásico', tag: 'ANTIGUO' },
]

const PLATE_STYLE: Record<string, { bg: string; ink: string; label: string }> = {
  particular:  { bg: 'linear-gradient(178deg,#F8D64B 0%,#F2C21A 62%,#E7B412 100%)', ink: '#111116', label: '#141414' },
  publico:     { bg: 'linear-gradient(178deg,#ffffff 0%,#eef0f2 60%,#dde1e6 100%)', ink: '#0c1a12', label: '#0c1a12' },
  diplomatica: { bg: 'linear-gradient(178deg,#2340d6 0%,#1531a8 60%,#0f2688 100%)', ink: '#ffffff', label: '#ffffff' },
  carga:       { bg: 'linear-gradient(178deg,#cc2222 0%,#a81818 60%,#8a1212 100%)', ink: '#ffffff', label: '#ffffff' },
  remolque:    { bg: 'linear-gradient(178deg,#1a6b3c 0%,#145530 60%,#0f4426 100%)', ink: '#ffffff', label: '#ffffff' },
  clasico:     { bg: 'linear-gradient(135deg,#e8e0d0 0%,#e8e0d0 50%,#2e4a75 50%,#2e4a75 100%)', ink: '#111116', label: '#ffffff' },
}

const PLATE_CONFIG: Record<string, { letterLen: number; numLen: number }> = {
  particular:  { letterLen: 3, numLen: 3 },
  publico:     { letterLen: 3, numLen: 3 },
  diplomatica: { letterLen: 2, numLen: 4 },
  carga:       { letterLen: 3, numLen: 3 },
  remolque:    { letterLen: 1, numLen: 5 },
  clasico:     { letterLen: 3, numLen: 3 },
}

export default function LandingPage() {
  const { signIn } = useAuth()
  const [plateLetters, setPlateLetters] = useState('GHK')
  const [plateNumbers, setPlateNumbers] = useState('472')
  const [city, setCity] = useState('Bogotá D.C.')
  const [type, setType] = useState('particular')
  const [cityOpen, setCityOpen] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const cityRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(e.target as Node))
        setCityOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const ps = PLATE_STYLE[type]
  const pc = PLATE_CONFIG[type]
  const plateText = formatPlate(plateLetters, plateNumbers)

  const types = useMemo(() => PLATE_TYPES.map(t => {
    const active = type === t.id
    return {
      id: t.id, name: t.name,
      bg: active ? '#F5C518' : 'rgba(255,255,255,0.05)',
      border: active ? '#F5C518' : 'rgba(255,255,255,0.12)',
      fg: active ? '#111' : '#b6b2a6',
      onClick: () => setType(t.id),
    }
  }), [type])

  const handleLetters = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlateLetters(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, pc.letterLen))
  }

  const handleNumbers = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlateNumbers(e.target.value.replace(/[^0-9]/g, '').slice(0, pc.numLen))
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

  return (
    <div style={{ position: 'relative', minHeight: '100vh', height: '100vh', overflow: 'hidden', background: '#060606' }}>
      <BgParticles />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(circle at 50% 42%, transparent 40%, rgba(6,6,6,0.86) 100%)' }} />

      <section data-r="entrada" style={{
        position: 'relative', zIndex: 10,
        width: '100vw', height: '100vh',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '78px clamp(20px,5vw,64px) 26px', overflowY: 'auto',
      }}>
        <div style={{
          position: 'absolute', top: 26, left: 'clamp(20px,5vw,64px)', zIndex: 16,
          display: 'flex', alignItems: 'center', gap: 11,
          fontFamily: "'Anton',sans-serif", fontSize: 24, letterSpacing: '.01em',
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30, borderRadius: 8, background: '#F5C518', color: '#111',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3.2v5.6M12 15.2v5.6M3.2 12h5.6M15.2 12h5.6"/></svg>
          </span>
          <span>Car<span style={{ color: '#F5C518' }}>Link</span></span>
        </div>

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
              textAlign: 'center', color: '#b6b2a6', fontSize: 15, maxWidth: '52ch',
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
              background: 'rgba(14,14,14,0.72)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
              border: '1px solid rgba(245,197,24,0.22)', borderRadius: 18, padding: 12,
              boxShadow: '0 24px 60px rgba(0,0,0,.55)',
            }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>
                <label style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700 }}>
                  Número de placa
                </label>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
                <input value={plateLetters} onChange={handleLetters}
                  maxLength={pc.letterLen} placeholder="ABC"
                  style={{ width: 52, border: 'none', background: 'transparent', color: '#F5C518', fontFamily: "'Anton',sans-serif", fontSize: 26, letterSpacing: '.06em', textTransform: 'uppercase', outline: 'none', padding: '2px 0', textAlign: 'right' }} />
                <span style={{ color: '#F5C518', fontFamily: "'Anton',sans-serif", fontSize: 26, lineHeight: 1, opacity: 0.5, padding: '0 6px' }}>-</span>
                <input value={plateNumbers} onChange={handleNumbers}
                  maxLength={pc.numLen} placeholder="123"
                  style={{ width: 52, border: 'none', background: 'transparent', color: '#F5C518', fontFamily: "'Anton',sans-serif", fontSize: 26, letterSpacing: '.06em', outline: 'none', padding: '2px 0', textAlign: 'left' }} />
              </div>
              </div>

              <div data-r="divider" style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 8px', position: 'relative' }} ref={cityRef}>
                <label style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700 }}>
                  Ciudad de expedición
                </label>
                <button onClick={() => setCityOpen(!cityOpen)} type="button"
                  style={{ width: '100%', border: 'none', background: 'transparent', color: '#f5f3ec', fontSize: 17, fontWeight: 600, outline: 'none', padding: '4px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{city}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto', opacity: 0.5, transform: cityOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {cityOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                    marginTop: 4, maxHeight: 210, overflowY: 'auto',
                    background: '#141414', border: '1px solid rgba(245,197,24,0.25)',
                    borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,.6)',
                  }}>
                    {CITIES.map(c => (
                      <button key={c} onClick={() => { setCity(c); setCityOpen(false) }} type="button"
                        style={{
                          display: 'block', width: '100%', padding: '10px 14px', border: 'none',
                          background: city === c ? 'rgba(245,197,24,0.15)' : 'transparent',
                          color: city === c ? '#F5C518' : '#f5f3ec',
                          fontSize: 15, fontWeight: city === c ? 700 : 500,
                          textAlign: 'left', cursor: 'pointer',
                          transition: 'background .12s',
                        }}
                        onMouseEnter={e => { if (city !== c) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
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
              <div style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, marginBottom: 9 }}>
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

            <p style={{ textAlign: 'center', color: '#7c786e', fontSize: 12, margin: '14px 0 0' }}>
              Al continuar accederás con tu cuenta de Google · Datos protegidos
            </p>
          </div>
        </div>
      </section>

      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        plateText={plateText}
        onOpenPolicy={() => {}}
        theme="dark"
      />
    </div>
  )
}
