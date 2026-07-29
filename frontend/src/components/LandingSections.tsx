'use client'

import React, { useState, useEffect, useRef } from 'react'
import { NfcKeyIcon, CarLinkMark } from '@/lib/icons_new'
import Link from 'next/link'

type Theme = 'light' | 'dark'

const GOLD = '#F5C518'

/* ── Theme tokens (resolved from the design's light/dark palette) ── */
function tokens(theme: Theme) {
  const dark = theme !== 'light'
  return {
    text: dark ? '#f5f3ec' : '#17171a',
    muted: dark ? '#8f8a7a' : '#6f6a5f',
    goldSoft: dark ? '#e0b53a' : '#b8860a',
    glassBg: dark ? 'rgba(14,14,14,0.74)' : 'rgba(255,255,255,0.8)',
    glassBorder: dark ? 'rgba(245,197,24,0.22)' : 'rgba(17,17,17,0.1)',
    cardBorder: dark ? 'rgba(255,255,255,0.1)' : 'rgba(17,17,17,0.1)',
    thinBorder: dark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,17,0.07)',
    bubbleBg: dark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,17,0.05)',
  }
}

const SECTION_MAX: React.CSSProperties = { maxWidth: 1160, margin: '0 auto', width: '100%' }
const EYEBROW: React.CSSProperties = {
  fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', fontWeight: 600, color: GOLD,
}
const H2: React.CSSProperties = {
  fontSize: 'clamp(24px,3vw,34px)', fontWeight: 400, letterSpacing: '-0.01em', margin: '10px 0 0',
}

const STEPS = [
  { n: '01', title: 'Ingresa tu placa', desc: 'Escribe el número de placa y la ciudad donde fue expedida. Nada más.' },
  { n: '02', title: 'Verifica con Google', desc: 'Un inicio de sesión familiar y seguro — sin contraseñas nuevas que recordar.' },
  { n: '03', title: 'Tu ficha vive sola', desc: 'Cada mantenimiento la actualiza automáticamente: kilometraje, aceite, próximo servicio.' },
]

const TRUST = [
  {
    title: 'Talleres verificados',
    desc: 'Cada taller aliado pasa por un proceso de verificación antes de poder actualizar fichas.',
    icon: <path d="M20 6L9 17l-5-5" />,
  },
  {
    title: 'Garantía respaldada',
    desc: 'Cada servicio queda con su sello de garantía visible en la ficha, no en un papel que se pierde.',
    icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></>,
  },
  {
    title: 'Historial inalterable',
    desc: 'Cada registro queda con fecha, taller y kilometraje — nadie lo puede reescribir después.',
    icon: <><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /></>,
  },
  {
    title: 'Datos protegidos',
    desc: 'Solo tú decides quién ve tu ficha. La verificación es tuya, no de terceros.',
    icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  },
]

const COVERAGE = [
  { city: 'Bogotá D.C.', count: 4 }, { city: 'Medellín', count: 3 }, { city: 'Cali', count: 2 }, { city: 'Barranquilla', count: 2 },
  { city: 'Cartagena', count: 1 }, { city: 'Bucaramanga', count: 2 }, { city: 'Pereira', count: 1 }, { city: 'Manizales', count: 1 },
  { city: 'Tunja', count: 1 }, { city: 'Duitama', count: 1 },
]

const FAQS = [
  { q: '¿CarLink reemplaza al SOAT o la tecnomecánica?', a: 'No — los complementa. CarLink es tu ficha de mantenimiento; SOAT y RTM siguen siendo trámites oficiales, aunque también puedes guardarlos en tu sección de Documentos.' },
  { q: '¿Qué pasa si cambio de taller?', a: 'Nada se pierde. El historial queda asociado a tu placa, no al taller — cada visita nueva simplemente se agrega con el nombre de quien te atendió.' },
  { q: '¿Necesito el llavero NFC para usar la app?', a: 'No es obligatorio. Puedes ver y compartir tu ficha desde el navegador; el llavero solo hace la verificación en el taller más rápida.' },
  { q: '¿Mis datos son públicos?', a: 'No. Tu ficha solo es visible para quien tú compartas el enlace o acerque el llavero — no aparece en buscadores ni se comparte con terceros.' },
  { q: '¿Cuánto cuesta para un conductor?', a: 'Nada. Crear tu ficha, ver tu historial y descargar tu pase de Wallet es gratis para siempre.' },
]

const SPONSORS = [
  { name: 'Terpel', logo: '/images/sponsors/terpel.svg' },
  { name: 'Mobil 1', logo: '/images/sponsors/mobil1.svg' },
  { name: 'Shell Helix', logo: '/images/sponsors/shell-helix.svg' },
  { name: 'Castrol', logo: '/images/sponsors/castrol.svg' },
  { name: 'Michelin', logo: '/images/sponsors/michelin.svg' },
  { name: 'SURA', logo: '/images/sponsors/sura.svg' },
]

const MARKET_PREVIEW = [
  { model: 'Mazda 3 Grand Touring 2021', price: '$78.500.000', km: '41.200 km', city: 'Bogotá D.C.', img: '/images/cars/mazda-3-2021.webp' },
  { model: 'Renault Duster Intens 2020', price: '$62.900.000', km: '58.400 km', city: 'Bogotá D.C.', img: '/images/cars/renault-duster-2020.jpg' },
  { model: 'Chevrolet Tracker LT 2022', price: '$85.200.000', km: '22.900 km', city: 'Medellín', img: '/images/cars/chevrolet-tracker-2022.webp' },
]

const ARROW = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)
const CHECK = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}><path d="M20 6L9 17l-5-5" /></svg>
)

type PolicyTab = 'warranty' | 'privacy' | 'support'

export default function LandingSections({ theme, onStart, onOpenEmpresa, onOpenPolicy, onOpenPqrs, onBuyFob }: { theme: Theme; onStart: () => void; onOpenEmpresa: (accountType?: 'user' | 'business') => void; onOpenPolicy: (tab: PolicyTab) => void; onOpenPqrs: () => void; onBuyFob: () => void }) {
  const [faqOpen, setFaqOpen] = useState<number>(-1)
  const mapRef = useRef<HTMLIFrameElement>(null)
  const k = tokens(theme)

  const card = (border = k.glassBorder): React.CSSProperties => ({ background: k.glassBg, border: `1px solid ${border}` })
  const lead: React.CSSProperties = { fontWeight: 300, fontSize: 15, lineHeight: 1.6, color: k.muted, margin: 0 }

  return (
    <div style={{ position: 'relative', zIndex: 10, color: k.text }}>
      {/* ===== CÓMO FUNCIONA ===== */}
      <style>{`
        @keyframes comoPhoneGlow { 0%,20%{box-shadow:0 0 0 rgba(245,197,24,0)} 25%,35%{box-shadow:0 0 46px rgba(245,197,24,.55)} 40%,100%{box-shadow:0 0 0 rgba(245,197,24,0)} }
        @keyframes comoPlateMove { 0%,5%{transform:translateX(-140px) rotate(-10deg);opacity:.95} 22%{transform:translateX(-12px) rotate(-2deg);opacity:1} 28%,100%{transform:translateX(0) rotate(0);opacity:0} }
        @keyframes comoRipple { 0%,22%{transform:translate(-50%,-50%) scale(.3);opacity:0} 27%{transform:translate(-50%,-50%) scale(.5);opacity:.9} 35%,100%{transform:translate(-50%,-50%) scale(2.6);opacity:0} }
        @keyframes comoCheckFade { 0%,24%{opacity:0;transform:scale(.6)} 30%{opacity:1;transform:scale(1)} 36%,100%{opacity:0;transform:scale(.6)} }
        @keyframes comoGaugeSweep { 0%,35%{opacity:0;transform:translateY(18px) scale(.92)} 42%{opacity:1;transform:translateY(0) scale(1)} 62%{opacity:1} 68%,100%{opacity:0;transform:translateY(-14px) scale(.94)} }
        @keyframes comoBenefitPop { 0%,42%{opacity:0;transform:scale(.7)} 50%{opacity:1;transform:scale(1)} 62%{opacity:1} 68%,100%{opacity:0;transform:scale(.7)} }
        @keyframes comoStoryVis { 0%{opacity:0;transform:translateY(10px) scale(.95)} 8%{opacity:1;transform:translateY(0) scale(1)} 28%{opacity:1} 38%,100%{opacity:0;transform:translateY(-8px) scale(.95)} }
        @keyframes comoStoryMsg { 0%{opacity:0;transform:translateY(10px)} 8%{opacity:1;transform:translateY(0)} 28%{opacity:1} 38%,100%{opacity:0;transform:translateY(-8px)} }
        @keyframes sponsorScroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @media(max-width:860px){ [data-r="nfcScenes"]{grid-template-columns:1fr !important} [data-r="nfcScenes"]>div{padding:10px 0 !important} [data-r="nfcScenes"]>div>div:first-child{min-height:190px !important} [data-r="mapFrame"]{min-height:280px !important} [data-r="footergrid"]{grid-template-columns:1fr !important} .buyfob-grid{grid-template-columns:1fr !important} .buyfob-grid>div:last-child{position:static !important} .grid2{grid-template-columns:1fr !important} }
        @media(max-width:1024px){ [data-r="footergrid"]{grid-template-columns:1fr 1fr !important} }
      `}</style>
      <section id="h-como" style={{ ...SECTION_MAX, marginTop: -115, padding: '0 clamp(20px,5vw,64px) 64px' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 44px' }}>
          <div style={EYEBROW}>Cómo funciona</div>
          <h2 style={{ ...H2, margin: '10px 0 12px' }}>De tu placa a una ficha viva en tres pasos</h2>
          <p style={lead}>Sin apps que instalar antes de probarlo, sin formularios eternos.</p>
        </div>
        <div style={{ position: 'relative', borderRadius: 28, padding: '36px clamp(20px,4vw,48px)', background: 'radial-gradient(130% 120% at 50% -10%,#20232b 0%,#111318 45%,#0a0b0e 100%)', border: '1px solid rgba(245,197,24,0.22)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06),0 24px 60px rgba(0,0,0,.5)', overflow: 'hidden' }}>
          {/* scanline overlay */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(90deg,rgba(255,255,255,0.02) 0 1px,transparent 1px 3px)', opacity: .4 }} />
          <div data-r="nfcScenes" style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 22, alignItems: 'center' }}>

            {/* ESCENA 1 — Ingresa tu placa */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{ position: 'relative', height: 230, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'comoStoryVis 12s cubic-bezier(.22,1,.36,1) 0s infinite both' }}>
                {/* phone */}
                <div style={{ position: 'relative', width: 110, height: 222, borderRadius: 20, background: 'linear-gradient(155deg,#1c1c1c,#0a0a0a)', border: '2px solid rgba(255,255,255,0.14)', boxShadow: '0 20px 40px rgba(0,0,0,.55)', animation: 'comoPhoneGlow 12s cubic-bezier(.22,1,.36,1) infinite' }}>
                  <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 32, height: 4, borderRadius: 3, background: 'rgba(255,255,255,0.18)' }} />
                  <div style={{ position: 'absolute', inset: '15px 5px', borderRadius: 13, background: '#050505', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" style={{ animation: 'comoCheckFade 12s cubic-bezier(.22,1,.36,1) infinite' }}>
                      <circle cx="12" cy="12" r="10" fill="none" stroke="#F5C518" strokeWidth="1.6" />
                      <path d="M7 12.5l3 3 7-7" fill="none" stroke="#F5C518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div style={{ position: 'absolute', left: 5, top: '50%', width: 24, height: 24, borderRadius: '50%', border: '2px solid #F5C518', transform: 'translate(-50%,-50%)', animation: 'comoRipple 12s cubic-bezier(.22,1,.36,1) infinite' }} />
                </div>
                {/* plate approaching */}
                <div style={{ position: 'absolute', left: '50%', top: '50%', width: 90, height: 48, marginLeft: -84, marginTop: -24, borderRadius: 9, background: 'linear-gradient(178deg,#F8D64B 0%,#F2C21A 62%,#E7B412 100%)', border: '3px solid #0c0c0e', boxShadow: '0 14px 26px rgba(0,0,0,.5),inset 0 2px 0 rgba(255,255,255,.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'comoPlateMove 12s cubic-bezier(.22,1,.36,1) infinite' }}>
                  <span style={{ fontSize: '6.5px', fontWeight: 800, letterSpacing: '.16em', color: '#3a3a1e' }}>COLOMBIA</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: '#111116', letterSpacing: '.03em', lineHeight: 1 }}>ABC 123</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 16px', borderRadius: 999, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', animation: 'comoStoryMsg 12s cubic-bezier(.22,1,.36,1) 0s infinite both' }}>
                <span style={{ width: 20, height: 20, flex: '0 0 auto', borderRadius: 6, background: 'rgba(245,197,24,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#F5C518' }}>01</span>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: '#F5C518' }}>Ingresa tu placa</span>
              </div>
            </div>

            {/* ESCENA 2 — Activa tus indicadores */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{ position: 'relative', height: 230, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, animation: 'comoStoryVis 12s cubic-bezier(.22,1,.36,1) 4s infinite both' }}>
                {/* gauge */}
                <div style={{ position: 'relative', width: 104, height: 104, flex: '0 0 auto', animation: 'comoGaugeSweep 12s cubic-bezier(.22,1,.36,1) infinite' }}>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(from 135deg,#F5C518 0deg 190deg,rgba(255,255,255,0.08) 190deg 270deg,transparent 270deg 360deg)', filter: 'drop-shadow(0 0 10px rgba(245,197,24,0.35))' }} />
                  <div style={{ position: 'absolute', inset: 9, borderRadius: '50%', background: 'radial-gradient(circle at 50% 35%,#1a1d24,#0c0d11)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#F5C518"><path d="M12 2c-3 4-6 7-6 11a6 6 0 0 0 12 0c0-4-3-7-6-11z" /></svg>
                  </div>
                </div>
                {/* indicator badges */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', maxWidth: 230 }}>
                  {[{ label: 'Motor', color: '#5be89a', bg: 'rgba(46,204,113,0.08)', border: 'rgba(46,204,113,0.4)', shadow: 'rgba(46,204,113,0.18)', delay: '0s' },
                    { label: 'Frenos', color: '#F5C518', bg: 'rgba(245,197,24,0.08)', border: 'rgba(245,197,24,0.4)', shadow: 'rgba(245,197,24,0.18)', delay: '.03s' },
                    { label: 'Llantas', color: '#ff8a3d', bg: 'rgba(255,138,61,0.08)', border: 'rgba(255,138,61,0.4)', shadow: 'rgba(255,138,61,0.18)', delay: '.06s' },
                    { label: 'Transmisión', color: '#F5C518', bg: 'rgba(245,197,24,0.08)', border: 'rgba(245,197,24,0.4)', shadow: 'rgba(245,197,24,0.18)', delay: '.09s' }
                  ].map(b => (
                    <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 11, background: b.bg, border: `1px solid ${b.border}`, boxShadow: `0 0 14px ${b.shadow}`, animation: `comoBenefitPop 12s cubic-bezier(.22,1,.36,1) infinite`, animationDelay: b.delay }}>
                      <span style={{ width: 14, height: 14, flex: '0 0 auto', borderRadius: '50%', border: `1.5px solid ${b.color}`, background: 'transparent' }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: b.color }}>{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 16px', borderRadius: 999, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', animation: 'comoStoryMsg 12s cubic-bezier(.22,1,.36,1) 4s infinite both' }}>
                <span style={{ width: 20, height: 20, flex: '0 0 auto', borderRadius: 6, background: 'rgba(245,197,24,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#F5C518' }}>02</span>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: '#F5C518' }}>Activa tus indicadores</span>
              </div>
            </div>

            {/* ESCENA 3 — Publica tu ficha */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{ position: 'relative', height: 230, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'comoStoryVis 12s cubic-bezier(.22,1,.36,1) 8s infinite both' }}>
                <div style={{ width: '100%', maxWidth: 270, borderRadius: 18, padding: '18px 20px', background: 'linear-gradient(158deg,#191919 0%,#141414 60%,#0f0f0f 100%)', border: '1px solid rgba(245,197,24,0.32)', boxShadow: '0 24px 50px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 800, color: '#F5C518', letterSpacing: '.05em' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#F5C518', boxShadow: '0 0 8px #F5C518' }} />Ficha publicada</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#8f8a7a' }}>ABC 123</span>
                  </div>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '12px 0' }} />
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#6f6a5f', fontWeight: 700 }}>Kilometraje actual</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: '#F5C518', lineHeight: 1.1 }}>41.200<span style={{ fontSize: 12, color: '#6f6a5f', fontFamily: 'var(--font-ui)', fontWeight: 600 }}> km</span></div>
                  </div>
                  <div style={{ position: 'relative', height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', margin: '12px 0' }}><div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '64%', background: 'linear-gradient(90deg,#8a6a00,#F5C518,#FFD84D)', borderRadius: 6 }} /></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8f8a7a' }}><span>Próximo servicio</span><span style={{ color: '#f5f3ec', fontWeight: 600 }}>51.200 km</span></div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 16px', borderRadius: 999, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', animation: 'comoStoryMsg 12s cubic-bezier(.22,1,.36,1) 8s infinite both' }}>
                <span style={{ width: 20, height: 20, flex: '0 0 auto', borderRadius: 6, background: 'rgba(245,197,24,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#F5C518' }}>03</span>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: '#F5C518' }}>Publica tu ficha</span>
              </div>
            </div>

          </div>
          <p style={{ textAlign: 'center', fontWeight: 300, fontSize: 13.5, lineHeight: 1.6, color: k.muted, margin: '22px auto 0', maxWidth: 580 }}>Acerca tu llavero NFC al teléfono, verifica con Google en segundos y observa cómo tu ficha de mantenimiento se arma sola — siempre alerta al cuidado de tu vehículo.</p>
        </div>
      </section>

      {/* ===== CONFIANZA ===== */}
      <section id="h-confianza" style={{ ...SECTION_MAX, padding: '64px clamp(20px,5vw,64px)', borderTop: `1px solid ${k.thinBorder}` }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 44px' }}>
          <div style={EYEBROW}>Por qué confiar</div>
          <h2 style={H2}>Cada dato queda respaldado</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 16 }}>
          {TRUST.map(tr => (
            <div key={tr.title} style={{ padding: 22, borderRadius: 18, ...card(), display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,197,24,0.12)', color: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{tr.icon}</svg>
              </span>
              <div style={{ fontSize: 15.5, fontWeight: 500 }}>{tr.title}</div>
              <p style={{ ...lead, fontSize: 13.5, lineHeight: 1.55 }}>{tr.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== DASHBOARD VEHICULAR + ODÓMETRO ===== */}
      <section id="h-vehicle-dash" style={{ ...SECTION_MAX, padding: '40px clamp(20px,5vw,64px) 48px', borderTop: `1px solid ${k.thinBorder}` }}>
        <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 32px' }}>
          <div style={EYEBROW}>Dashboard vehicular</div>
          <h2 style={{ ...H2, margin: '10px 0 0' }}>Historial y estado de tu vehículo en tiempo real</h2>
        </div>
        <div className="grid2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, alignItems: 'stretch' }}>
          {/* ─── LEFT: Histórico de datos vehiculares ─── */}
          <div style={{ ...card(), borderRadius: 22, padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 16l4-8 4 4 5-9" /></svg>
              <span style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>Histórico vehicular</span>
            </div>

            {(() => {
              const services = [
                { date: '05 dic 2025', event: 'Revisión general + afinación', km: '1.200 km', tall: 'Taller AutoPlus', color: GOLD, pts: [95, 88, 80, 72, 65, 58, 50] },
                { date: '12 feb 2026', event: 'Cambio de llantas Michelin', km: '3.800 km', tall: 'Taller Express', color: GOLD, pts: [90, 82, 74, 66, 58, 50, 42] },
                { date: '28 abr 2026', event: 'Revisión de frenos delanteros', km: '6.200 km', tall: 'CDA Medellín', color: GOLD, pts: [85, 76, 67, 58, 49, 40, 32] },
                { date: '14 jun 2026', event: 'Cambio de aceite synthetic 5W-30', km: '8.400 km', tall: 'Taller AutoPlus', color: GOLD, pts: [78, 70, 62, 53, 44, 35, 28] },
              ]
              const [hovered, setHovered] = React.useState<number>(0)
              const active = services[hovered]
              const maxY = 100
              const stepX = 300 / (active.pts.length - 1)
              const linePath = active.pts.map((y, i) => `${i === 0 ? 'M' : 'L'}${i * stepX},${y}`).join(' ')
              const areaPath = `${linePath} L300,100 L0,100 Z`

              return (
                <>
                  {/* Chart */}
                  <div style={{ position: 'relative', height: 160, borderRadius: 14, background: k.bubbleBg, border: `1px solid ${k.thinBorder}`, overflow: 'visible', padding: 12 }}>
                    <svg viewBox="0 0 300 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                      <defs>
                        <linearGradient id="hChartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={active.color} stopOpacity="0.35" />
                          <stop offset="100%" stopColor={active.color} stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      {/* Grid */}
                      {[25, 50, 75].map(y => (
                        <line key={y} x1="0" y1={y} x2="300" y2={y} stroke={k.muted} strokeWidth="0.3" opacity="0.3" />
                      ))}
                      {/* Area */}
                      <path d={areaPath} fill="url(#hChartGrad)">
                        <animate attributeName="d" dur="0.5s" fill="freeze" from="M0,100 L300,100 L300,100 L0,100 Z" to={areaPath} />
                      </path>
                      {/* Line */}
                      <path d={linePath} fill="none" stroke={active.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1500" strokeDashoffset="1500">
                        <animate attributeName="stroke-dashoffset" dur="0.8s" fill="freeze" from="1500" to="0" />
                      </path>
                      {/* Dots */}
                      {active.pts.map((y, i) => (
                        <circle key={i} cx={i * stepX} cy={y} r="0" fill={active.color} stroke={theme === 'dark' ? '#0a0a0a' : '#fff'} strokeWidth="1.5">
                          <animate attributeName="r" dur="0.25s" fill="freeze" begin={`${0.06 * i}s`} from="0" to="3" />
                        </circle>
                      ))}
                      {/* Active dot highlight */}
                      <circle cx={0} cy={active.pts[0]} r="5" fill={active.color} opacity="0.25">
                        <animate attributeName="r" dur="1.5s" repeatCount="indefinite" values="5;9;5" />
                      </circle>
                    </svg>
                    <div style={{ position: 'absolute', bottom: 6, left: 12, fontSize: 9, color: k.muted }}>dic</div>
                    <div style={{ position: 'absolute', bottom: 6, left: '33%', fontSize: 9, color: k.muted }}>feb</div>
                    <div style={{ position: 'absolute', bottom: 6, left: '66%', fontSize: 9, color: k.muted }}>abr</div>
                    <div style={{ position: 'absolute', bottom: 6, right: 12, fontSize: 9, color: k.muted }}>jun</div>
                    {/* Legend */}
                    <div style={{ position: 'absolute', top: 8, right: 10, padding: '3px 8px', borderRadius: 6, background: `${active.color}20`, border: `1px solid ${active.color}40` }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: active.color }}>{active.event.split(' ')[0]} {active.event.split(' ')[1]}</span>
                    </div>
                  </div>

                  {/* History rows */}
                  {services.map((row, i) => (
                    <div key={i}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(0)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                        background: hovered === i ? `${row.color}12` : k.bubbleBg,
                        border: `1px solid ${hovered === i ? row.color : k.thinBorder}`,
                        cursor: 'pointer', transition: 'all 0.25s ease',
                        transform: hovered === i ? 'scale(1.01)' : 'scale(1)',
                      }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: hovered === i ? row.color : k.muted, flexShrink: 0, transition: 'background 0.25s', boxShadow: hovered === i ? `0 0 8px ${row.color}` : 'none' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: hovered === i ? row.color : k.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color 0.25s' }}>{row.event}</div>
                        <div style={{ fontSize: 10.5, color: k.muted }}>{row.date} · {row.km} · {row.tall}</div>
                      </div>
                    </div>
                  ))}
                </>
              )
            })()}
          </div>

          {/* ─── RIGHT: Odómetro hiperrealista ─── */}
          <div style={{ ...card(), borderRadius: 22, padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, alignSelf: 'flex-start' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
              <span style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>Odómetro en vivo</span>
            </div>

            {/* Odometer face */}
            {(() => {
              const indicators = [
                { l: 'Kilometraje', v: 42000, max: 100000, unit: 'km', color: GOLD, pct: 42 },
                { l: 'Combustible', v: 78, max: 100, unit: '%', color: GOLD, pct: 78 },
                { l: 'Temperatura', v: 73, max: 120, unit: '°C', color: GOLD, pct: 61 },
                { l: 'Llantas', v: 85, max: 100, unit: '%', color: GOLD, pct: 85 },
              ]
              const [hovered, setHovered] = React.useState<number | null>(null)
              const active = hovered !== null ? indicators[hovered] : indicators[0]
              const needleAngle = (active.v / active.max) * 270 - 135

              return (
                <>
                  <div style={{ position: 'relative', width: 220, height: 220 }}>
                    <svg viewBox="0 0 220 220" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="odomGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={active.color} stopOpacity="0.25" />
                          <stop offset="100%" stopColor={active.color} stopOpacity="0.05" />
                        </linearGradient>
                      </defs>
                      <circle cx="110" cy="110" r="105" fill="none" stroke="url(#odomGrad)" strokeWidth="2" />
                      <circle cx="110" cy="110" r="100" fill="none" stroke={k.thinBorder} strokeWidth="1" />
                      {Array.from({ length: 60 }).map((_, i) => {
                        const angle = (i * 6 - 90) * (Math.PI / 180)
                        const isMajor = i % 5 === 0
                        const r1 = isMajor ? 85 : 91
                        const r2 = 97
                        return (
                          <line key={i} x1={110 + r1 * Math.cos(angle)} y1={110 + r1 * Math.sin(angle)} x2={110 + r2 * Math.cos(angle)} y2={110 + r2 * Math.sin(angle)} stroke={isMajor ? active.color : k.muted} strokeWidth={isMajor ? 2 : 0.7} strokeLinecap="round" style={{ transition: 'stroke 0.3s' }} />
                        )
                      })}
                      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                        const v = Math.round(active.max * frac)
                        const angle = (frac * 270 - 135) * (Math.PI / 180)
                        const r = 73
                        return <text key={frac} x={110 + r * Math.cos(angle)} y={110 + r * Math.sin(angle)} textAnchor="middle" dominantBaseline="central" fill={k.muted} fontSize="8" fontWeight="500">{v}</text>
                      })}
                      {/* Needle — pivots from center (110,110), extends outward radially */}
                      <g style={{ transformOrigin: '110px 110px', transform: `rotate(${needleAngle}deg)`, transition: 'transform 0.6s cubic-bezier(.4,0,.2,1)' }}>
                        <line x1="110" y1="110" x2="110" y2="18" stroke={active.color} strokeWidth="2.5" strokeLinecap="round" />
                        <circle cx="110" cy="110" r="7" fill={active.color} />
                        <circle cx="110" cy="110" r="3.5" fill="#111" />
                      </g>
                    </svg>
                    <div style={{ position: 'absolute', bottom: 34, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', transition: 'all 0.3s' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: active.color, lineHeight: 1, transition: 'color 0.3s' }}>
                        {active.v.toLocaleString('es-CO')}
                      </div>
                      <div style={{ fontSize: 9, color: k.muted, letterSpacing: '.12em', textTransform: 'uppercase' }}>{active.unit} {active.l.toLowerCase()}</div>
                    </div>
                  </div>

                  {/* Indicator grid — interactive */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%' }}>
                    {indicators.map((ind, i) => {
                      const opacity = 1 - i * 0.2
                      return (
                        <div key={i}
                          onMouseEnter={() => setHovered(i)}
                          onMouseLeave={() => setHovered(null)}
                          style={{
                            padding: '10px 12px', borderRadius: 10,
                            background: hovered === i ? `rgba(245,197,24,0.15)` : k.bubbleBg,
                            border: `1px solid ${hovered === i ? GOLD : k.thinBorder}`,
                            cursor: 'pointer', transition: 'all 0.25s ease',
                            transform: hovered === i ? 'scale(1.03)' : 'scale(1)',
                          }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                            <span style={{ fontSize: 10, fontWeight: 600, color: hovered === i ? GOLD : k.muted, letterSpacing: '.08em', textTransform: 'uppercase', transition: 'color 0.25s' }}>{ind.l}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: GOLD, opacity }}>{ind.v.toLocaleString('es-CO')} {ind.unit}</span>
                          </div>
                          <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{ width: `${ind.pct}%`, height: '100%', borderRadius: 2, background: GOLD, opacity, transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      </section>

      {/* ===== COBERTURA ===== */}
      <section id="h-cobertura" style={{ ...SECTION_MAX, padding: '64px clamp(20px,5vw,64px)', borderTop: `1px solid ${k.thinBorder}` }}>
        <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 40px' }}>
          <div style={EYEBROW}>Ubicación y cobertura</div>
          <h2 style={{ ...H2, margin: '10px 0 12px' }}>Talleres aliados cerca de ti</h2>
          <p style={lead}>CarLink ya opera en estas ciudades — cada una con talleres verificados listos para actualizar tu ficha.</p>
        </div>
        {/* Mapa */}
        <div data-r="mapFrame" style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', minHeight: 400, border: `1px solid ${k.glassBorder}`, background: '#0a0a0a', boxShadow: '0 24px 60px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
          <iframe ref={mapRef} src="/mapa-talleres-colombia.html" title="Mapa de talleres CarLink en Colombia" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(120% 100% at 50% 0%, transparent 60%, rgba(8,8,4,0.35) 100%)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginTop: 14 }}>
          {COVERAGE.map(cv => (
            <div key={cv.city} style={{ padding: 16, borderRadius: 14, ...card(), display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => mapRef.current?.contentWindow?.postMessage({ type: 'flyToCity', city: cv.city }, '*')}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: GOLD, flex: '0 0 auto', boxShadow: `0 0 8px ${GOLD}` }} />
              <div><div style={{ fontSize: 14, fontWeight: 500 }}>{cv.city}</div><div style={{ fontSize: 11.5, fontWeight: 300, color: k.muted }}>{cv.count} talleres</div></div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <button onClick={() => onOpenEmpresa('business')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 999, border: 'none', background: GOLD, color: '#111', fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>
            ¿Tienes un taller? Únete a la red{ARROW}
          </button>
        </div>
      </section>

      {/* ===== PLANES ===== */}
      <section id="h-planes" style={{ ...SECTION_MAX, padding: '64px clamp(20px,5vw,64px)', borderTop: `1px solid ${k.thinBorder}` }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 44px' }}>
          <div style={EYEBROW}>Planes</div>
          <h2 style={H2}>Gratis para conductores, simple para talleres</h2>
          <p style={{ ...lead, marginTop: 8 }}>Gratis para conductores, simple para talleres</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 18, maxWidth: 820, margin: '0 auto' }}>
          {[
            { name: 'Conductor', price: 'Gratis', period: '', tag: '', border: k.cardBorder, features: ['Ficha técnica ilimitada', 'Historial y recordatorios', 'Descarga y Wallet', 'Galería y documentos'], cta: 'Crear mi ficha', btnBg: 'rgba(245,197,24,0.12)', btnColor: k.goldSoft },
            { name: 'Taller aliado', price: '$79.900', period: '/mes', tag: 'Incluye 1 llavero gratis', border: 'rgba(245,197,24,0.4)', features: ['Clientes y fichas ilimitadas', 'Perfil público con reseñas', 'Certificados y facturación', 'Soporte prioritario'], cta: 'Registrar mi taller', btnBg: GOLD, btnColor: '#111' },
          ].map(pl => (
            <div key={pl.name} style={{ padding: 28, borderRadius: 20, ...card(pl.border), position: 'relative' }}>
              {pl.tag && <span style={{ position: 'absolute', top: -11, right: 24, background: GOLD, color: '#111', fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 999 }}>{pl.tag}</span>}
              <div style={{ fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.08em', color: k.muted }}>{pl.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '10px 0 18px' }}>
                <span style={{ fontSize: 34, fontWeight: 400 }}>{pl.price}</span>
                {pl.period && <span style={{ fontSize: 13, fontWeight: 300, color: k.muted }}>{pl.period}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20 }}>
                {pl.features.map(ft => (
                  <div key={ft} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, fontWeight: 300 }}>{CHECK}{ft}</div>
                ))}
              </div>
              <button onClick={pl.name === 'Taller aliado' ? () => onOpenEmpresa('business') : onStart} style={{ width: '100%', padding: 12, borderRadius: 11, border: 'none', background: pl.btnBg, color: pl.btnColor, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{pl.cta}</button>
            </div>
          ))}
        </div>
      </section>

      {/* ===== PATROCINADORES + KPIs ===== */}
      <section id="h-sponsors" style={{ ...SECTION_MAX, padding: '56px clamp(20px,5vw,64px)', borderTop: `1px solid ${k.thinBorder}` }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 32px' }}>
          <div style={EYEBROW}>Respaldo</div>
          <h2 style={H2}>Marcas y aliados que confían en CarLink</h2>
        </div>
        {/* Sponsor logos — infinite scroll carousel */}
        <div style={{ overflow: 'hidden', marginBottom: 40, maskImage: 'linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)' }}>
          <div style={{ display: 'flex', gap: 28, width: 'max-content', animation: 'sponsorScroll 25s linear infinite' }}>
            {[...SPONSORS, ...SPONSORS].map((sp, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 28px', borderRadius: 14, ...card(), minWidth: 160, flexShrink: 0 }}>
                <img src={sp.logo} alt={sp.name} style={{ height: 28, maxWidth: 120, objectFit: 'contain', filter: theme === 'dark' ? 'brightness(0) invert(1) opacity(0.5)' : 'grayscale(1) opacity(0.5)', transition: 'filter 0.3s' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.setAttribute('style', 'display:block') }} />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '.02em', color: k.muted, display: 'none' }}>{sp.name}</span>
              </div>
            ))}
          </div>
        </div>
        {/* KPI indicators row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, maxWidth: 820, margin: '0 auto', padding: '24px 20px', borderRadius: 18, background: k.bubbleBg, border: `1px solid ${k.thinBorder}` }}>
          {[
            { v: '4.8/5', l: 'Calificación promedio' },
            { v: '23+', l: 'Talleres en red' },
            { v: '10', l: 'Ciudades con cobertura' },
            { v: '4.9★', l: 'Satisfacción' },
            { v: '342', l: 'Llaveros activos' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: GOLD, lineHeight: 1.1 }}>{s.v}</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: k.muted, marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== VEHÍCULOS CERTIFICADOS CON IA ===== */}
      <section id="h-marketai" style={{ ...SECTION_MAX, padding: '56px clamp(20px,5vw,64px)', borderTop: `1px solid ${k.thinBorder}` }}>
        <div className="grid2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, alignItems: 'center' }}>
          <div>
            <div style={EYEBROW}>Vehículos certificados</div>
            <h2 style={{ ...H2, margin: '10px 0 12px' }}>Compra un carro con peritaje y ficha completa, guiado por IA</h2>
            <p style={{ ...lead, margin: '0 0 20px' }}>Cada anuncio en Vehículos en venta incluye peritaje mecánico, historial verificado y una IA que responde tus preguntas sobre el vehículo antes de agendar una visita.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
              {['Peritaje mecánico verificado por un taller aliado', 'Historial completo de mantenimiento de la placa', 'Asistente IA que resuelve dudas antes de la visita'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, fontWeight: 400 }}>{CHECK}{t}</div>
              ))}
            </div>
            <button onClick={onStart} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 0 20px rgba(245,197,24,0.35)' }}>Explorar vehículos{ARROW}</button>
          </div>
          <div style={{ borderRadius: 20, padding: 22, ...card() }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ width: 32, height: 32, borderRadius: 9, background: GOLD, color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8" /><rect x="4" y="8" width="16" height="12" rx="2" /><path d="M2 14h2M20 14h2M9 12v2M15 12v2" /></svg>
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>Asistente de compra CarLink</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ alignSelf: 'flex-end', maxWidth: '80%', padding: '10px 14px', borderRadius: '12px 12px 2px 12px', background: GOLD, color: '#111', fontSize: 13, fontWeight: 500 }}>¿Este Mazda 3 tuvo choques?</div>
              <div style={{ alignSelf: 'flex-start', maxWidth: '80%', padding: '10px 14px', borderRadius: '12px 12px 12px 2px', background: k.bubbleBg, fontSize: 13, fontWeight: 300 }}>No — el peritaje del taller no reporta daños estructurales. Su último cambio de aceite fue hace 1.200 km.</div>
              <div style={{ alignSelf: 'flex-end', maxWidth: '80%', padding: '10px 14px', borderRadius: '12px 12px 2px 12px', background: GOLD, color: '#111', fontSize: 13, fontWeight: 500 }}>¿Cuándo vence el SOAT?</div>
              <div style={{ alignSelf: 'flex-start', maxWidth: '80%', padding: '10px 14px', borderRadius: '12px 12px 12px 2px', background: k.bubbleBg, fontSize: 13, fontWeight: 300 }}>Vigente hasta noviembre — puedes verlo en Documentos del vehículo.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PREVIEW VEHÍCULOS EN VENTA ===== */}
      <section id="h-marketpreview" style={{ ...SECTION_MAX, padding: '0 clamp(20px,5vw,64px) 56px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
          {MARKET_PREVIEW.map(mp => (
            <div key={mp.model} style={{ borderRadius: 18, overflow: 'hidden', ...card() }}>
              <div style={{ height: 140, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                <img src={mp.img} alt={mp.model} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <span style={{ position: 'absolute', top: 9, right: 9, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: 'rgba(46,204,113,0.16)', border: '1px solid rgba(46,204,113,0.5)', color: '#5be89a', fontSize: 10, fontWeight: 800 }}>Peritaje OK</span>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700 }}>{mp.model}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: GOLD }}>{mp.price}</span>
                </div>
                <div style={{ fontSize: 11.5, color: k.muted, marginTop: 3 }}>{mp.km} · {mp.city}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== COMPRA TU LLAVERO ===== */}
      <section id="h-buyfob" style={{ ...SECTION_MAX, padding: '56px clamp(20px,5vw,64px) 64px', borderTop: `1px solid ${k.thinBorder}` }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 40px' }}>
          <div style={EYEBROW}>Llavero NFC</div>
          <h2 style={{ ...H2, margin: '10px 0 12px' }}>Compra tu llavero — 3 pasos, sin vueltas</h2>
          <p style={lead}>Vincúlalo a tu placa y tu ficha aparece al instante en cualquier taller.</p>
        </div>
        <div className="buyfob-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 44, maxWidth: 920, margin: '0 auto', alignItems: 'center' }}>
          {/* Left — Steps + benefits */}
          <div>
            {/* Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 36 }}>
              {[
                ['1', 'Elige tu llavero', 'Selecciona el llavero Premium que mejor se adapte a tu estilo.'],
                ['2', 'Confirma tu dirección', 'Ingresa tu placa y la dirección de envío. Validamos la cobertura en tu ciudad.'],
                ['3', 'Paga y listo', 'Acepta Stripe, Nequi, Bancolombia o contraentrega. Recibe tu llavero en 5 días hábiles.'],
              ].map(([n, t, d]) => (
                <div key={n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px 18px', borderRadius: 14, ...card() }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(245,197,24,0.14)', color: k.goldSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{n}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{t}</div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.5, color: k.muted }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
            {/* Benefits */}
            <div style={{ marginBottom: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: GOLD }}>¿Qué incluye tu llavero?</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {([
                  { id: 'enc', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>, title: 'Placa encriptada', desc: 'Datos protegidos con cifrado de extremo a extremo.' },
                  { id: 'fir', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></svg>, title: 'Firma digital', desc: 'Cada ficha lleva tu firma digital certificada.' },
                  { id: 'exp', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>, title: 'Expediente digital', desc: 'Historial completo de mantenimiento y servicios.' },
                  { id: 'ges', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>, title: 'Gestión inteligente', desc: 'Administra repuestos, talleres y mantenimiento desde tu ficha.' },
                  { id: 'fic', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>, title: 'Ficha publicable', desc: 'Un toque publica tu ficha. Incluye opción de reportar el llavero en caso de pérdida.' },
                  { id: 'not', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>, title: 'Notificaciones predictivas', desc: 'Alertas automáticas de mantenimiento, cambios de aceite y revisiones programadas.' },
                ] as const).map((item) => (
                  <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, background: 'rgba(245,197,24,0.04)', border: `1px solid ${k.thinBorder}` }}>
                    <span style={{ flexShrink: 0, lineHeight: 1, marginTop: 2 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 2 }}>{item.title}</div>
                      <div style={{ fontSize: 11, lineHeight: 1.45, color: k.muted }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Right — Product card */}
          <div style={{ position: 'sticky', top: 120 }}>
            <div style={{ padding: 28, borderRadius: 20, ...card(GOLD), position: 'relative', textAlign: 'center' }}>
              <span style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: GOLD, color: '#111', fontSize: 11, fontWeight: 600, padding: '4px 14px', borderRadius: 999 }}>Premium</span>
              <div style={{ width: 80, height: 80, margin: '0 auto 16px', borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#111', display: 'flex' }}><NfcKeyIcon size={38} strokeWidth={1.6} /></span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Llavero NFC CarLink</div>
              <p style={{ fontWeight: 300, fontSize: 13, lineHeight: 1.5, color: k.muted, margin: '10px 0 18px' }}>Impreso en PLA con chip NFC. Tu ficha se abre al instante con un toque.</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 18, fontSize: 12, color: k.muted }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg> Encriptado</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg> Predictivo</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg> Expediente</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>$49.900</div>
              <div style={{ fontSize: 12, color: k.muted, marginBottom: 18 }}>Envío incluido · Llega en 5 días hábiles</div>
              <button onClick={() => onBuyFob()} style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 700, fontSize: 15, cursor: 'pointer', transition: 'opacity 0.2s' }}>Comprar ahora</button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== COMUNIDAD CARLINK ===== */}
      <section id="h-comunidad" style={{ ...SECTION_MAX, padding: '56px clamp(20px,5vw,64px)', borderTop: `1px solid ${k.thinBorder}` }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 36px' }}>
          <div style={EYEBROW}>Comunidad</div>
          <h2 style={H2}>Miles de conductores ya confían en CarLink</h2>
          <p style={lead}>Una red creciente de vehículos certificados, talleres aliados y propietarios responsables.</p>
        </div>

        {/* Testimonials */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, maxWidth: 820, margin: '0 auto 36px' }}>
          {[
            { name: 'Andrés M.', city: 'Bogotá', text: 'Con el llavero NFC mis clientes ven el historial completo del carro en segundos. Increíble.' },
            { name: 'Laura G.', city: 'Medellín', text: 'Mi taller verificó 40 fichas el primer mes. CarLink nos dio credibilidad real.' },
            { name: 'Carlos R.', city: 'Cali', text: 'Vendí mi carro 3 semanas más rápido porque el comprador confió en la ficha certificada.' },
          ].map((t, i) => (
            <div key={i} style={{ padding: 20, borderRadius: 14, background: k.bubbleBg, border: `1px solid ${k.thinBorder}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(245,197,24,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 15, color: GOLD }}>{t.name[0]}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: k.muted }}>{t.city}</div>
                </div>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: k.muted, margin: 0 }}>"{t.text}"</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <button onClick={onStart} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 999, border: 'none', background: GOLD, color: '#111', fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>
            Únete a la comunidad{ARROW}
          </button>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="h-faq" style={{ maxWidth: 820, margin: '0 auto', width: '100%', padding: '48px clamp(20px,5vw,64px)', borderTop: `1px solid ${k.thinBorder}` }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={EYEBROW}>Preguntas frecuentes</div>
          <h2 style={H2}>Resolvemos tus dudas</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FAQS.map((fq, i) => {
            const open = faqOpen === i
            return (
              <div key={fq.q} style={{ borderRadius: 14, ...card(), overflow: 'hidden' }}>
                <button onClick={() => setFaqOpen(open ? -1 : i)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '17px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: k.text, fontSize: 14.5, fontWeight: 500 }}>
                  {fq.q}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }}><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {open && <p style={{ margin: 0, padding: '0 20px 18px', fontSize: 13.5, fontWeight: 300, lineHeight: 1.6, color: k.muted }}>{fq.a}</p>}
              </div>
            )
          })}
        </div>
      </section>

      {/* ===== PQRS · Agente conversacional ===== */}
      <section id="h-pqrs" style={{ ...SECTION_MAX, padding: '0 clamp(20px,5vw,64px) 48px' }}>
        <div className="grid2" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 18, alignItems: 'center', padding: '22px 24px', borderRadius: 20, background: 'linear-gradient(120deg, rgba(245,197,24,0.12), rgba(245,197,24,0.03))', border: '1px solid rgba(245,197,24,0.28)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ position: 'relative', width: 48, height: 48, borderRadius: 14, background: GOLD, color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 10h.01M12 10h.01M16 10h.01" /></svg>
            </span>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', fontWeight: 700, color: GOLD }}>PQRS · Habla con CarLia</div>
              <div style={{ fontSize: 15, fontWeight: 600, margin: '4px 0 2px' }}>¿Falta el modelo de tu auto o algo no funciona?</div>
              <p style={{ ...lead, fontSize: 13 }}>Reporta peticiones, quejas, reclamos o sugerencias. CarLink lo resuelve pronto.</p>
            </div>
          </div>
          <button onClick={onOpenPqrs} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '13px 24px', borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 0 24px rgba(245,197,24,0.35)', whiteSpace: 'nowrap' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            Abrir asistente
          </button>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{ borderTop: `1px solid ${k.thinBorder}`, padding: '52px clamp(20px,5vw,64px) 28px' }}>
        <div data-r="footergrid" className="footergrid" style={{ maxWidth: 1160, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1.2fr', gap: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 7, background: GOLD, color: '#111' }}>
                <CarLinkMark size={15} />
              </span>
              <span>Car<span style={{ color: GOLD }}>Link</span></span>
            </div>
            <p style={{ ...lead, fontSize: 13.5, maxWidth: '32ch' }}>La ficha técnica digital de tu vehículo, viva y verificada por talleres reales.</p>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 14 }}>Producto</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13.5, fontWeight: 300 }}>
              <a href="#h-como" style={{ color: k.muted, textDecoration: 'none' }}>Cómo funciona</a>
              <a href="#h-planes" style={{ color: k.muted, textDecoration: 'none' }}>Planes</a>
              <a href="#h-cobertura" style={{ color: k.muted, textDecoration: 'none' }}>Para talleres</a>
              <a href="#h-buyfob" style={{ color: k.muted, textDecoration: 'none' }}>Tienda NFC</a>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 14, color: GOLD }}>Empresa</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5, fontWeight: 500 }}>
              <Link href="/nosotros" style={{ color: k.text, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, transition: 'color .15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = GOLD }}
                onMouseLeave={e => { e.currentTarget.style.color = k.text }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
                Nosotros
              </Link>
              <Link href="/trabaja" style={{ color: k.text, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, transition: 'color .15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = GOLD }}
                onMouseLeave={e => { e.currentTarget.style.color = k.text }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></svg>
                Trabaja con nosotros
              </Link>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 14 }}>Legal y soporte</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 9, fontSize: 13.5, fontWeight: 300 }}>
              {([['warranty', 'Términos de Garantía'], ['privacy', 'Privacidad de Datos'], ['support', 'Soporte Técnico']] as [PolicyTab, string][]).map(([t, l]) => (
                <button key={t} onClick={() => onOpenPolicy(t)} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: k.muted, fontSize: 13.5, fontWeight: 300, fontFamily: 'inherit', textAlign: 'left' }}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 14 }}>Contacto</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13.5, fontWeight: 300, color: k.muted }}>
              <a href="https://maps.google.com/?q=Cra+70+%2380-24+Bogotá" target="_blank" rel="noreferrer" style={{ color: k.muted, textDecoration: 'none' }}>Cra 70 #80-24, Bogotá D.C., Colombia</a>
              <a href="mailto:business@carlink.com.co" style={{ color: k.muted, textDecoration: 'none' }}>business@carlink.com.co</a>
              <a href="tel:+573164976104" style={{ color: k.muted, textDecoration: 'none' }}>+57 316 497 6104</a>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <a href="https://www.instagram.com/ailink.nfc/" target="_blank" rel="noreferrer" style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(45deg,#F58529,#DD2A7B,#8134AF,#515BD4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
              </a>
              <a href="https://www.facebook.com/people/AiLink/61578774262078/" target="_blank" rel="noreferrer" style={{ width: 34, height: 34, borderRadius: 9, background: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
              </a>
              <a href="https://wa.me/573164976104" target="_blank" rel="noreferrer" style={{ width: 34, height: 34, borderRadius: 9, background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#062b12' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.1-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5 0a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.6-1.2.1-.2 0-.3 0-.5s-.5-1.3-.7-1.7-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3A2.8 2.8 0 0 0 6.5 9c0 1.7 1.2 3.3 1.4 3.5s2.4 3.7 5.9 5c2.1.8 2.5.6 3 .6s1.4-.6 1.6-1.1.2-1 .1-1.1-.3-.1-.5-.2z" /></svg>
              </a>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1160, margin: '36px auto 0', paddingTop: 20, borderTop: `1px solid ${k.thinBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 12, fontWeight: 300, color: k.muted }}>
          <span>© 2026 CarLink · Bogotá, Colombia · Todos los derechos reservados</span>
          <a href="https://ailink.com.co/" target="_blank" rel="noreferrer" title="Ir a AiLink"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999, background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.22)', color: k.muted, textDecoration: 'none', transition: 'all .16s', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.16)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.08)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.22)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19" /></svg>
            <span>Impulsado por <b style={{ fontWeight: 700, color: k.text }}>Ai<span style={{ color: GOLD }}>Link</span></b></span>
          </a>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, boxShadow: `0 0 6px ${GOLD}` }} />Todos los sistemas operativos</span>
        </div>
      </footer>
    </div>
  )
}
