'use client'

import React, { useState, useEffect } from 'react'

type Theme = 'light' | 'dark'

const GOLD = '#F5C518'
const SOLUTION_TAGS = ['Historial', 'Fotos', 'Facturas', 'Garantías', 'Recordatorios', 'Documentos', 'Kilometraje']
// Duplicada una vez para el loop infinito de la cinta — cada pill lleva su
// propio marginRight (no `gap` del flex) para que las dos copias midan
// exactamente lo mismo y translateX(-50%) empalme sin salto ni costura.
const MARQUEE_TAGS = [...SOLUTION_TAGS, ...SOLUTION_TAGS]

const SECTION_MAX: React.CSSProperties = { maxWidth: 1160, margin: '0 auto', width: '100%' }
const EYEBROW: React.CSSProperties = {
  fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', fontWeight: 600, color: GOLD,
}
const H2: React.CSSProperties = {
  fontSize: 'clamp(24px,3vw,34px)', fontWeight: 400, letterSpacing: '-0.01em', margin: '10px 0 0',
}

// "Cómo funciona" — extraída de LandingSections.tsx (2026-09-07) para poder
// vivir arriba del hero de placa ("Plataforma de mantenimiento vehicular"),
// entre el hero de venta (KeychainScrub) y ese hero. Sigue siendo la MISMA
// sección que se linkea desde #h-como (footer, nav) — solo cambió su
// posición en el DOM/página, no su contenido ni su id.
export default function ComoFuncionaSection({ theme }: { theme: Theme }) {
  const muted = theme === 'light' ? '#6f6a5f' : '#8f8a7a'
  const isDark = theme === 'dark'
  const lead: React.CSSProperties = { fontWeight: 300, fontSize: 15, lineHeight: 1.6, color: muted, margin: 0 }

  // La sección "Cómo funciona" muestra las 3 escenas SIEMPRE completas y
  // visibles — nada se oculta nunca. El glow recorre la secuencia:
  // paso 1 → flecha → paso 2 → flecha → paso 3 en ciclo continuo.
  const [activeStep, setActiveStep] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setActiveStep(s => (s + 1) % 5), 720)
    return () => clearInterval(id)
  }, [])
  const stepGlow = (i: number, baseShadow = ''): React.CSSProperties => ({
    transition: 'box-shadow .45s cubic-bezier(.22,1,.36,1), transform .45s cubic-bezier(.22,1,.36,1)',
    boxShadow: `${baseShadow ? baseShadow + ',' : ''}${activeStep === i ? (isDark ? '0 0 0 1px rgba(245,197,24,0.55), 0 0 34px rgba(245,197,24,0.28)' : '0 0 0 1px rgba(245,197,24,0.65), 0 0 34px rgba(245,197,24,0.22)') : (isDark ? '0 0 0 1px rgba(245,197,24,0), 0 0 0 rgba(245,197,24,0)' : '0 0 0 1px rgba(245,197,24,0), 0 0 0 rgba(245,197,24,0)')}`,
    transform: activeStep === i ? 'translateY(-2px)' : 'translateY(0)',
  })
  const stepPop = (i: number): React.CSSProperties => ({
    transition: 'transform .4s cubic-bezier(.22,1,.36,1)',
    transform: activeStep === i ? 'scale(1.05)' : 'scale(1)',
  })
  const stepPill = (i: number): React.CSSProperties => ({
    transition: 'background .45s ease, border-color .45s ease, box-shadow .45s ease',
    background: activeStep === i ? 'rgba(245,197,24,0.16)' : 'rgba(255,255,255,0.03)',
    border: `1px solid ${activeStep === i ? 'rgba(245,197,24,0.55)' : 'rgba(255,255,255,0.08)'}`,
    boxShadow: activeStep === i ? '0 0 20px rgba(245,197,24,0.22)' : 'none',
  })
  // Flechas se activan en los pasos intermedios: paso 1→flecha1(1), paso 2→flecha2(3)
  const arrowGlow = (arrowIndex: number): React.CSSProperties => ({
    transition: 'opacity .4s ease, transform .4s ease',
    opacity: activeStep === arrowIndex ? 1 : 0.35,
    transform: activeStep === arrowIndex ? 'scale(1.25)' : 'scale(1)',
  })

  return (
    <>
      <style>{`
        @keyframes comoPlateApproach { 0%,10%{transform:translateX(-140px) rotate(-10deg)} 50%{transform:translateX(-12px) rotate(-2deg)} 90%,100%{transform:translateX(-140px) rotate(-10deg)} }
        @keyframes comoGaugeBreathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.025)} }
        @keyframes tagsMarquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @media(max-width:860px){ [data-r="nfcScenes"]{grid-template-columns:1fr !important} [data-r="nfcScenes"]>div{padding:10px 0 !important} [data-r="nfcScenes"]>div>div:first-child{min-height:190px !important} [data-r="nfcArrow"]{display:none !important} }
      `}</style>
      <section id="h-como" style={{ ...SECTION_MAX, padding: '48px clamp(20px,5vw,64px)' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 36px' }}>
          <div style={EYEBROW}>Cómo funciona</div>
          <h2 style={{ ...H2, margin: '14px auto 0', maxWidth: '20ch' }}>Escaneas. Y ves <span style={{ color: GOLD }}>absolutamente todo</span>.</h2>
          <div style={{ overflow: 'hidden', width: '100%', marginTop: 32, WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)', maskImage: 'linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)' }}>
            <div style={{ display: 'flex', width: 'max-content', animation: 'tagsMarquee 24s linear infinite' }}>
              {MARQUEE_TAGS.map((t, i) => (
                <span key={`${t}-${i}`} data-r="shopSolutionTag" style={{ padding: '10px 20px', borderRadius: 999, background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.32)', color: GOLD, fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', marginRight: 11 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ position: 'relative', borderRadius: 28, padding: '24px clamp(16px,3.5vw,34px)', maxWidth: 930, margin: '0 auto', background: isDark ? 'radial-gradient(130% 120% at 50% -10%,#20232b 0%,#111318 45%,#0a0b0e 100%)' : 'radial-gradient(130% 120% at 50% -10%,#f0efe8 0%,#eae8e0 45%,#e4e2da 100%)', border: isDark ? '1px solid rgba(245,197,24,0.22)' : '1px solid rgba(17,17,17,0.1)', boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.06),0 24px 60px rgba(0,0,0,.5)' : 'inset 0 1px 0 rgba(255,255,255,0.8),0 24px 60px rgba(17,17,17,0.1)', overflow: 'hidden' }}>
          {/* scanline overlay */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: isDark ? 'repeating-linear-gradient(90deg,rgba(255,255,255,0.02) 0 1px,transparent 1px 3px)' : 'repeating-linear-gradient(90deg,rgba(0,0,0,0.02) 0 1px,transparent 1px 3px)', opacity: .4 }} />
          <div data-r="nfcScenes" style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', gap: 16, alignItems: 'center' }}>

            {/* ESCENA 1 — Ingresa tu placa */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* phone */}
                <div style={{ position: 'relative', width: 100, height: 200, borderRadius: 18, background: isDark ? 'linear-gradient(155deg,#1c1c1c,#0a0a0a)' : 'linear-gradient(155deg,#e8e6df,#d8d6cd)', border: isDark ? '2px solid rgba(255,255,255,0.14)' : '2px solid rgba(17,17,17,0.12)', ...stepGlow(0, isDark ? '0 20px 40px rgba(0,0,0,.55)' : '0 20px 40px rgba(17,17,17,0.12)') }}>
                  <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 28, height: 3, borderRadius: 3, background: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(17,17,17,0.15)' }} />
                  <div style={{ position: 'absolute', inset: '13px 5px', borderRadius: 11, background: isDark ? '#050505' : '#f5f3ec', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" style={{ transition: 'transform .45s cubic-bezier(.22,1,.36,1)', transform: activeStep === 0 ? 'scale(1.12)' : 'scale(1)' }}>
                      <circle cx="12" cy="12" r="10" fill="none" stroke="#F5C518" strokeWidth="1.6" />
                      <path d="M7 12.5l3 3 7-7" fill="none" stroke="#F5C518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
                {/* llavero image — se acerca al teléfono y se retira */}
                <div style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -84, marginTop: -24, animation: 'comoPlateApproach 3.2s cubic-bezier(.22,1,.36,1) infinite', borderRadius: 6 }}>
                  <img src="/llavero.png" alt="Llavero CarLink NFC" width={80} height={92} style={{ display: 'block', borderRadius: 6 }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 14px', borderRadius: 999, ...stepPill(0) }}>
                <span style={{ width: 20, height: 20, flex: '0 0 auto', borderRadius: 6, background: 'rgba(245,197,24,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#F5C518' }}>01</span>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: '#F5C518' }}>Ingresa tu placa</span>
              </div>
            </div>

            {/* Arrow 1→2 */}
            <div data-r="nfcArrow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD, ...arrowGlow(1) }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </div>

            {/* ESCENA 2 — Activa tus indicadores */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', height: 210, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                {/* gauge */}
                <div style={{ position: 'relative', width: 96, height: 96, flex: '0 0 auto', animation: 'comoGaugeBreathe 3.2s ease-in-out infinite', ...stepPop(1) }}>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(from 135deg,#F5C518 0deg 190deg,rgba(255,255,255,0.08) 190deg 270deg,transparent 270deg 360deg)', filter: 'drop-shadow(0 0 10px rgba(245,197,24,0.35))' }} />
                  <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', background: isDark ? 'radial-gradient(circle at 50% 35%,#1a1d24,#0c0d11)' : 'radial-gradient(circle at 50% 35%,#f0efe8,#e4e2da)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(17,17,17,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'box-shadow .45s ease', boxShadow: activeStep === 1 ? '0 0 24px rgba(245,197,24,0.4)' : '0 0 0 rgba(245,197,24,0)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#F5C518"><path d="M12 2c-3 4-6 7-6 11a6 6 0 0 0 12 0c0-4-3-7-6-11z" /></svg>
                  </div>
                </div>
                {/* indicator badges */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, width: '100%', maxWidth: 210 }}>
                  {[{ label: 'Motor', color: '#2ecc71', bg: isDark ? 'rgba(46,204,113,0.08)' : 'rgba(46,204,113,0.1)', border: 'rgba(46,204,113,0.4)', shadow: 'rgba(46,204,113,0.18)' },
                    { label: 'Frenos', color: '#F5C518', bg: isDark ? 'rgba(245,197,24,0.08)' : 'rgba(245,197,24,0.1)', border: 'rgba(245,197,24,0.4)', shadow: 'rgba(245,197,24,0.18)' },
                    { label: 'Llantas', color: '#ff8a3d', bg: isDark ? 'rgba(255,138,61,0.08)' : 'rgba(255,138,61,0.1)', border: 'rgba(255,138,61,0.4)', shadow: 'rgba(255,138,61,0.18)' },
                    { label: 'Transmisión', color: '#F5C518', bg: isDark ? 'rgba(245,197,24,0.08)' : 'rgba(245,197,24,0.1)', border: 'rgba(245,197,24,0.4)', shadow: 'rgba(245,197,24,0.18)' }
                  ].map(b => (
                    <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 9px', borderRadius: 10, background: b.bg, border: `1px solid ${b.border}`, boxShadow: `0 0 12px ${b.shadow}`, ...stepPop(1) }}>
                      <span style={{ width: 12, height: 12, flex: '0 0 auto', borderRadius: '50%', border: `1.5px solid ${b.color}`, background: 'transparent' }} />
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: b.color }}>{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 14px', borderRadius: 999, ...stepPill(1) }}>
                <span style={{ width: 20, height: 20, flex: '0 0 auto', borderRadius: 6, background: 'rgba(245,197,24,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#F5C518' }}>02</span>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: '#F5C518' }}>Activa tus indicadores</span>
              </div>
            </div>

            {/* Arrow 2→3 */}
            <div data-r="nfcArrow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD, ...arrowGlow(3) }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </div>

            {/* ESCENA 3 — Publica tu ficha */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: 250, borderRadius: 16, padding: '16px 18px', background: isDark ? 'linear-gradient(158deg,#191919 0%,#141414 60%,#0f0f0f 100%)' : 'linear-gradient(158deg,#ffffff 0%,#f8f7f3 60%,#f0efe8 100%)', border: isDark ? '1px solid rgba(245,197,24,0.32)' : '1px solid rgba(17,17,17,0.1)', ...stepGlow(2, isDark ? '0 24px 50px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,0.06)' : '0 24px 50px rgba(17,17,17,0.08),inset 0 1px 0 rgba(255,255,255,0.9)') }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 800, color: '#F5C518', letterSpacing: '.05em' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5C518', boxShadow: '0 0 8px #F5C518' }} />Ficha publicada</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: muted }}>ABC 123</span>
                  </div>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '10px 0' }} />
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: muted, fontWeight: 700 }}>Kilometraje actual</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: '#F5C518', lineHeight: 1.1 }}>41.200<span style={{ fontSize: 11, color: muted, fontFamily: 'var(--font-ui)', fontWeight: 600 }}> km</span></div>
                  </div>
                  <div style={{ position: 'relative', height: 5, borderRadius: 5, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.08)', overflow: 'hidden', margin: '10px 0' }}><div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '64%', background: 'linear-gradient(90deg,#8a6a00,#F5C518,#FFD84D)', borderRadius: 5 }} /></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: muted }}><span>Próximo servicio</span><span style={{ color: isDark ? '#f5f3ec' : '#17171a', fontWeight: 600 }}>51.200 km</span></div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 14px', borderRadius: 999, ...stepPill(2) }}>
                <span style={{ width: 20, height: 20, flex: '0 0 auto', borderRadius: 6, background: 'rgba(245,197,24,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#F5C518' }}>03</span>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: '#F5C518' }}>Publica tu ficha</span>
              </div>
            </div>

          </div>
          <p style={{ textAlign: 'center', fontWeight: 300, fontSize: 13.5, lineHeight: 1.6, color: muted, margin: '18px auto 0', maxWidth: 580 }}>Acerca tu llavero NFC al teléfono, verifica con Google en segundos y observa cómo tu ficha de mantenimiento se arma sola — siempre alerta al cuidado de tu vehículo.</p>
        </div>
      </section>
    </>
  )
}
