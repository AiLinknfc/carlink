'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/store/auth'
import { CITIES } from '@/lib/constants'
import Plate3D from '@/components/Plate3D'

const PLATE_TYPES = [
  { id: 'carro', name: 'Carro', bg: 'rgba(245,197,24,0.15)', border: 'rgba(245,197,24,0.4)', fg: '#F5C518' },
  { id: 'moto', name: 'Moto', bg: 'transparent', border: 'rgba(255,255,255,0.12)', fg: '#b6b2a6' },
  { id: 'camion', name: 'Camión', bg: 'transparent', border: 'rgba(255,255,255,0.12)', fg: '#b6b2a6' },
  { id: 'taxi', name: 'Taxi', bg: 'transparent', border: 'rgba(255,255,255,0.12)', fg: '#b6b2a6' },
  { id: 'oficial', name: 'Oficial', bg: 'transparent', border: 'rgba(255,255,255,0.12)', fg: '#b6b2a6' },
]

export default function LandingPage() {
  const { signIn } = useAuth()
  const [plateText, setPlateText] = useState('ABC 123')
  const [city, setCity] = useState('Bogotá')
  const [type, setType] = useState('carro')

  const isMoto = type === 'moto'
  const types = useMemo(() => PLATE_TYPES.map(t => ({ ...t, onClick: () => setType(t.id) })), [])

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: '#060606' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'radial-gradient(circle at 50% 42%, transparent 40%, rgba(6,6,6,0.86) 100%)' }} />

      <div style={{
        position: 'fixed', left: '50%', top: '50%', zIndex: 44,
        transform: 'translate(-50%, -50%)',
        transition: 'transform 950ms cubic-bezier(0.22,1,0.36,1), opacity .5s',
      }}>
        <Plate3D plate={plateText} city={city} isMoto={isMoto} />
      </div>

      <div style={{ display: 'flex', width: '400vw', height: '100vh', transition: 'transform 850ms cubic-bezier(0.22,1,0.36,1)', position: 'relative', zIndex: 10 }}>
        <section style={{
          width: '100vw', height: '100vh', flex: '0 0 100vw',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '78px clamp(20px,5vw,64px) 26px', overflowY: 'auto',
        }}>
          <div style={{ position: 'absolute', top: 26, left: 'clamp(20px,5vw,64px)', zIndex: 16, display: 'flex', alignItems: 'center', gap: 11 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: '#F5C518', color: '#111' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 12h11l-2-3 6 5-6 5 2-3H3z"/></svg>
            </span>
            <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 24, letterSpacing: '.01em' }}>Car<span style={{ color: '#F5C518' }}>Link</span></span>
          </div>

          <div style={{ textAlign: 'center', zIndex: 16, animation: 'fadeUp .7s both', flex: '0 0 auto' }}>
            <div style={{ fontSize: 12, letterSpacing: '.28em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>Plataforma de mantenimiento vehicular</div>
            <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: 'clamp(30px,4.6vw,58px)', lineHeight: 0.98, margin: '12px auto 0', maxWidth: '19ch', textTransform: 'uppercase' }}>
              Tu placa es tu <span style={{ color: '#F5C518' }}>identidad digital</span>
            </h1>
          </div>

          <div style={{ zIndex: 16, width: 'min(720px,96vw)', margin: '0 auto', flex: '0 0 auto', animation: 'fadeUp .7s .12s both' }}>
            <p style={{ textAlign: 'center', color: '#b6b2a6', fontSize: 15, maxWidth: '52ch', margin: '0 auto 14px', lineHeight: 1.5 }}>
              Ingresa tu placa y la ciudad de expedición. Pasa el cursor (o toca) la placa y verás cómo cobra vida.
            </p>

            <div style={{ display: 'flex', gap: 7, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
              {types.map((t) => (
                <button key={t.id} onClick={t.onClick}
                  style={{ padding: '8px 15px', borderRadius: 999, border: `1px solid ${t.border}`, background: t.bg, color: t.fg, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  {t.name}
                </button>
              ))}
            </div>

            <div style={{
              display: 'flex', gap: 10, alignItems: 'stretch',
              background: 'rgba(14,14,14,0.72)', backdropFilter: 'blur(22px)',
              border: '1px solid rgba(245,197,24,0.22)', borderRadius: 18, padding: 12,
              boxShadow: '0 24px 60px rgba(0,0,0,.55)',
            }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 8px' }}>
                <label style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700 }}>Número de placa</label>
                <input value={plateText} onChange={e => setPlateText(e.target.value.toUpperCase())} maxLength={8} placeholder="ABC 123"
                  style={{ width: '100%', border: 'none', background: 'transparent', color: '#F5C518', fontFamily: "'Anton',sans-serif", fontSize: 26, letterSpacing: '.06em', textTransform: 'uppercase', outline: 'none', padding: '2px 0' }} />
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 8px' }}>
                <label style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700 }}>Ciudad de expedición</label>
                <select value={city} onChange={e => setCity(e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'transparent', color: '#f5f3ec', fontSize: 17, fontWeight: 600, outline: 'none', padding: '4px 0', cursor: 'pointer' }}>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button onClick={() => { sessionStorage.setItem('carlink_plate', plateText); sessionStorage.setItem('carlink_city', city); signIn(); }}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 26px', borderRadius: 12, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 0 24px rgba(245,197,24,0.4)' }}>
                Continuar
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </button>
            </div>

            <p style={{ textAlign: 'center', color: '#7c786e', fontSize: 12, marginTop: 14 }}>Al continuar accederás con tu cuenta de Google · Datos protegidos</p>
          </div>
        </section>
      </div>
    </div>
  )
}
