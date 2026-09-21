'use client'

import { useState } from 'react'
import Link from 'next/link'

/* Recursos archivados — secciones de la landing de /shop que se sacaron de la página pública
   pero se conservan por si sirven más adelante (2026-09-20). Solo se renderiza dentro de
   /admin (pestaña "Recursos"), que ya redirige a cualquiera que no sea el usuario admin.
   El JSX es el mismo que tenía app/(public)/shop/page.tsx; los tokens de estilo se
   recalculan acá porque allá vivían dentro del componente de la página. */

const GOLD = '#F5C518'
const round3 = (n: number) => Math.round(n * 1000) / 1000
const SECTION_MAX: React.CSSProperties = { maxWidth: 1160, margin: '0 auto', width: '100%' }
const ARROW = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)

const BOX_ITEMS = [
  {
    title: '1x Llavero NFC CarLink de Alta Resistencia',
    desc: 'Polímero IP68 impermeable a prueba de caídas, gasolina, grasa y roce continuo con otras llaves.',
    icon: <><rect x="3" y="3" width="11" height="18" rx="5.5" /><circle cx="8.5" cy="7.8" r="1.5" /><path d="M17.2 9.2a4.6 4.6 0 0 1 0 5.6" /><path d="M20 6.6a8.4 8.4 0 0 1 0 10.8" /></>,
  },
  {
    title: '1x Sticker QR de Respaldo para Parabrisas o Guantera',
    desc: 'Sticker adhesivo térmico de alta durabilidad para escanear con cámara en caso de que alguien no use NFC.',
    icon: <><rect x="3" y="3" width="7" height="7" rx="1.2" /><rect x="14" y="3" width="7" height="7" rx="1.2" /><rect x="3" y="14" width="7" height="7" rx="1.2" /><path d="M14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM19 19h2v2h-2z" /></>,
  },
  {
    title: 'Acceso VITALICIO e Ilimitado a la Plataforma CarLink',
    desc: 'Almacenamiento seguro en la nube de todos tus registros, fotos y facturas sin cuotas ni suscripciones.',
    icon: <><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></>,
  },
  {
    title: 'Guía de Inicio Rápido + Soporte Prioritario WhatsApp',
    desc: 'Paso a paso de 1 minuto e integración personalizada para resolver cualquier duda al instante.',
    icon: <><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></>,
  },
]

export default function RecursosPanel({ isDark }: { isDark: boolean }) {
  const MUTED = isDark ? '#a8a496' : '#5c584e'
  const BORDER = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.1)'
  const CARD = isDark ? '#121216' : '#f7f6f2'
  const textColor = isDark ? '#f5f3ec' : '#17171a'
  const sectionAltBg = isDark ? '#0c0c10' : '#f7f6f2'
  const softTint = (alpha: number) => isDark ? `rgba(255,255,255,${alpha})` : `rgba(17,17,17,${alpha})`
  const card = (border = BORDER): React.CSSProperties => ({ background: CARD, border: `1px solid ${border}` })
  const EYEBROW: React.CSSProperties = { fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', fontWeight: 600, color: GOLD }
  const H2: React.CSSProperties = { fontSize: 'clamp(24px,3vw,34px)', fontWeight: 400, letterSpacing: '-0.01em', margin: '10px 0 0', color: textColor }
  const SECTION: React.CSSProperties = { maxWidth: 1280, margin: '0 auto', padding: 'clamp(48px,6vw,84px) clamp(20px,5vw,64px)' }
  const CTA_BTN: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 10, padding: '15px 30px', borderRadius: 13, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: '0 0 28px rgba(245,197,24,0.3)', textDecoration: 'none' }

  return (
    <div style={{ background: isDark ? '#08080a' : '#ffffff', color: textColor, borderRadius: 14, overflow: 'hidden' }}>
      <style>{`
          [data-r="shopBox"]{grid-template-columns:1fr !important}
          [data-r="shopLlaveroGrid"]{grid-template-columns:1fr !important}
          [data-r="shopDimensions"]{flex-direction:column !important}
          [data-r="shopDimensionDivider"]{width:36px !important;margin:8px auto !important}
          [data-r="shopLlaveroFeatures"]{gap:24px !important}
          [data-r="shopLlaveroFeature"]{flex-direction:column !important;text-align:center !important}
          [data-r="shopLlaveroDots"]{flex-direction:row !important;justify-content:center !important;margin-top:8px !important}
          [data-r="shopLlaveroDotsLine"]{display:none !important}
          [data-r="shopCtaBtn"]{padding:14px 22px !important;font-size:14px !important}
          [data-r="shopBoxItem"]{padding:'14px 16px' !important}
          [data-r="shopBoxItemTitle"]{fontSize:14px !important}
          [data-r="shopBoxItemDesc"]{fontSize:12px !important}
      `}</style>
      <div style={{ padding: '16px 20px', fontSize: 12.5, color: MUTED, borderBottom: `1px solid ${BORDER}` }}>
        Recursos archivados de la landing de /shop (solo visibles aquí): Transparencia total, El llavero y Dashboard vehicular.
      </div>

          {/* TRANSPARENCIA TOTAL */}
          <section style={SECTION}>
            <div style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 44px' }}>
              <div style={EYEBROW}>Transparencia total</div>
              <h2 style={H2}>¿Qué llega exactamente en tu caja?</h2>
              <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.55, margin: '14px auto 0', maxWidth: '52ch' }}>Sin sorpresas ni cobros ocultos. Por tu pago único de $39.900 COP recibes la experiencia completa lista para usar.</p>
            </div>

            <div data-r="shopBox" style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr', gap: 48, alignItems: 'center', maxWidth: 1080, margin: '0 auto' }}>
              {/* Ilustración — misma familia visual que la escena del hero (caja +
                  llavero + sticker QR), sin foto real de producto. */}
              <div style={{ position: 'relative', width: '100%', maxWidth: 380, margin: '0 auto' }}>
                <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: 280, height: 280, background: 'radial-gradient(circle,rgba(245,197,24,.16),transparent 70%)', pointerEvents: 'none' }} />
                <img src="/empaque.png" alt="Caja CarLink" style={{ width: '100%', borderRadius: 20, display: 'block' }} />
              </div>

              {/* Lista de lo que incluye */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {BOX_ITEMS.map(item => (
                  <div key={item.title} data-r="shopBoxItem" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '18px 20px', borderRadius: 16, background: CARD, border: `1px solid ${BORDER}` }}>
                    <span style={{ width: 36, height: 36, flex: '0 0 auto', borderRadius: 11, background: 'rgba(245,197,24,0.12)', color: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
                    </span>
                    <div>
                      <div data-r="shopBoxItemTitle" style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 5, lineHeight: 1.35 }}>{item.title}</div>
                      <div data-r="shopBoxItemDesc" style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.5 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 38 }}>
              <Link href="/#h-buyfob" data-r="shopCtaBtn" style={CTA_BTN}>Recibir todo el kit por $39.900 COP{ARROW}</Link>
            </div>
          </section>

          {/* EL LLAVERO */}
          <section style={{ background: sectionAltBg, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
            <div style={SECTION}>
              <div style={{ textAlign: 'center', maxWidth: 660, margin: '0 auto 52px' }}>
                <div style={EYEBROW}>El llavero CarLink</div>
                <h2 style={H2}>Impreso en 3D, con un <span style={{ fontWeight: 700 }}>chip NFC adentro</span></h2>
                <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.6, margin: '14px auto 0', maxWidth: '52ch' }}>Cuerpo en PLA impreso en 3D, sellado con una capa de resina. Personalizado con la placa que elijas: al acercarlo a un teléfono abre tu perfil de vehículo.</p>
              </div>

              <div data-r="shopLlaveroGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', alignItems: 'center', gap: 'clamp(28px,4vw,56px)', maxWidth: 1200, margin: '0 auto' }}>
                {/* Columna izquierda — 3 features */}
                <div data-r="shopLlaveroFeatures" style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
                  {[
                    { num: '01', label: 'Cuerpo', title: 'Impresión 3D en PLA', desc: 'Estructura rígida y ligera impresa capa por capa, con el relieve de la placa en alto contraste.' },
                    { num: '02', label: 'Acabado', title: 'Capa de resina', desc: 'Recubrimiento transparente que sella la superficie: brillo permanente y resistencia a rayones.' },
                    { num: '03', label: 'Resistencia', title: 'Impactos y lluvia', desc: 'La resina hace el cuerpo impermeable y absorbe golpes del uso diario en el llavero.' },
                  ].map(f => (
                    <div key={f.num} data-r="shopLlaveroFeature" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                        <div style={{ fontSize: 10, letterSpacing: '.28em', textTransform: 'uppercase', color: MUTED }}>{f.num} · {f.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 500, color: textColor, marginTop: 4 }}>{f.title}</div>
                        <div style={{ fontSize: 13, lineHeight: 1.5, color: MUTED, marginTop: 4 }}>{f.desc}</div>
                      </div>
                      <div data-r="shopLlaveroDots" style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 0 }}>
                        <div data-r="shopLlaveroDotsLine" style={{ width: 40, borderTop: `1px dashed ${BORDER}` }} />
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: GOLD, boxShadow: `0 0 10px ${GOLD}` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Centro — ilustración llavero */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
                  <div style={{ position: 'absolute', width: '78%', height: '52%', background: `radial-gradient(60% 60% at 50% 50%, rgba(245,197,24,0.12), transparent 70%)`, filter: 'blur(38px)' }} />
                  <div
                    className="shop-keychain-group"
                    style={{ position: 'relative', width: 'min(280px,94%)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', animation: 'shopFloatY 3.6s ease-in-out infinite', cursor: 'pointer' }}
                  >
                    {/* Argolla — anillo hueco de plata pulida */}
                    <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'flex-end', gap: 10, marginRight: 18, marginBottom: -6 }}>
                      <div style={{
                        width: 80, height: 80, borderRadius: '50%',
                        background: 'radial-gradient(circle, transparent 28px, #c8c8c8 30px, #e8e8e8 36px, #b0b0b0 40px)',
                        boxShadow: '0 0 20px rgba(200,200,200,0.15), 0 16px 32px rgba(0,0,0,0.45)',
                      }} />
                    </div>
                    {/* Placa — amarillo brillante con inset highlight, misma estética del hero */}
                    <div style={{ position: 'relative', width: 220, aspectRatio: '16/10', borderRadius: 20, padding: 12, boxSizing: 'border-box', background: 'linear-gradient(168deg,#F8D64B,#F2C21A 60%,#E7B412)', border: '5px solid #0c0c0e', boxShadow: '0 24px 50px rgba(0,0,0,.65),inset 0 3px 0 rgba(255,255,255,.5)', transform: 'rotate(-3deg)' }}>
                      <div style={{ position: 'absolute', inset: 12, borderRadius: 10, border: '2px solid rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, letterSpacing: '.04em', color: '#111116', textShadow: '0 1px 0 rgba(255,255,255,0.3)' }}>ABC 123</div>
                        <div style={{ fontSize: 10, letterSpacing: '.3em', color: '#3a3a1e', fontWeight: 700 }}>CIUDAD</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Columna derecha — 3 features */}
                <div data-r="shopLlaveroFeatures" style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
                  {[
                    { num: '04', label: 'Interior', title: 'Chip NFC embebido', desc: 'Antena rectangular sellada dentro del cuerpo. Sin batería y sin partes móviles.' },
                    { num: '05', label: 'Personalización', title: 'Tu placa grabada', desc: 'Eliges la matrícula y la ciudad: cada llavero se imprime a la medida de tu vehículo.' },
                    { num: '06', label: 'Sujeción', title: 'Argolla de acero', desc: 'Anillo inoxidable con eslabón giratorio en la esquina superior derecha.' },
                  ].map(f => (
                    <div key={f.num} data-r="shopLlaveroFeature" style={{ display: 'flex', alignItems: 'center', gap: 14, flexDirection: 'row-reverse' }}>
                      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                        <div style={{ fontSize: 10, letterSpacing: '.28em', textTransform: 'uppercase', color: MUTED }}>{f.num} · {f.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 500, color: textColor, marginTop: 4 }}>{f.title}</div>
                        <div style={{ fontSize: 13, lineHeight: 1.5, color: MUTED, marginTop: 4 }}>{f.desc}</div>
                      </div>
                      <div data-r="shopLlaveroDots" style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 0, flexDirection: 'row-reverse' }}>
                        <div data-r="shopLlaveroDotsLine" style={{ width: 40, borderTop: `1px dashed ${BORDER}` }} />
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: GOLD, boxShadow: `0 0 10px ${GOLD}` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dimensiones */}
              <div style={{ maxWidth: 700, margin: '56px auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 11, letterSpacing: '.34em', textTransform: 'uppercase', color: MUTED }}>Dimensiones</div>
                <div data-r="shopDimensions" style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  {[
                    { val: '62 mm', label: 'Largo' },
                    { val: '39 mm', label: 'Ancho' },
                    { val: '6 mm', label: 'Alto' },
                  ].map((d, i) => (
                    <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      {i > 0 && <div data-r="shopDimensionDivider" style={{ width: 1, height: 36, background: BORDER, margin: '0 20px' }} />}
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 700, color: textColor, letterSpacing: '-.01em' }}>{d.val}</div>
                        <div style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: MUTED, marginTop: 2 }}>{d.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 13, color: MUTED, textAlign: 'center', maxWidth: '48ch' }}>Peso 11 g · Sin batería · Toda la vida útil. El chip se alimenta del propio teléfono; quien lo escanea no necesita instalar ninguna app.</div>
              </div>
            </div>
          </section>

          {/* ===== DASHBOARD VEHICULAR + ODÓMETRO ===== */}
          <section id="h-vehicle-dash" style={{ ...SECTION_MAX, padding: '40px clamp(20px,5vw,64px) 48px', borderTop: `1px solid ${BORDER}` }}>
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
                    { date: '05 dic 2025', event: 'Revisión general + afinación', km: '1.200 km', tall: 'Taller AutoPlus', pts: [98, 82, 74, 70, 68, 66, 65, 64, 63, 62], scale: [0, 100] },
                    { date: '12 feb 2026', event: 'Cambio de llantas Michelin', km: '3.800 km', tall: 'Taller Express', pts: [100, 88, 80, 73, 65, 56, 46, 35, 23, 10], scale: [0, 100] },
                    { date: '28 abr 2026', event: 'Revisión de frenos delanteros', km: '6.200 km', tall: 'CDA Medellín', pts: [95, 90, 82, 70, 55, 38, 22, 12, 6, 2], scale: [0, 100] },
                    { date: '14 jun 2026', event: 'Cambio de aceite synthetic 5W-30', km: '8.400 km', tall: 'Taller AutoPlus', pts: [100, 85, 72, 62, 55, 50, 47, 45, 44, 43], scale: [0, 100] },
                  ]
                  const [hovered, setHovered] = useState<number>(0)
                  const active = services[hovered]
                  const chartW = 300
                  const chartH = 100
                  const padL = 28
                  const padR = 8
                  const padT = 6
                  const padB = 14
                  const innerW = chartW - padL - padR
                  const innerH = chartH - padT - padB
                  const stepX = innerW / (active.pts.length - 1)
                  const [yMin, yMax] = active.scale
                  const toY = (v: number) => padT + innerH * (1 - (v - yMin) / (yMax - yMin))
                  const toX = (i: number) => padL + i * stepX
                  const pointsFor = (pts: number[]): Array<[number, number]> => pts.map((v, i) => [toX(i), toY(v)])
                  const smoothPath = (pts: Array<[number, number]>, tension = 0.5) => {
                    if (pts.length < 2) return ''
                    let d = `M${pts[0][0]},${pts[0][1]}`
                    for (let i = 0; i < pts.length - 1; i++) {
                      const p0 = pts[i - 1] ?? pts[i]
                      const p1 = pts[i]
                      const p2 = pts[i + 1]
                      const p3 = pts[i + 2] ?? p2
                      const c1x = p1[0] + (p2[0] - p0[0]) / 6 * tension * 2
                      const c1y = p1[1] + (p2[1] - p0[1]) / 6 * tension * 2
                      const c2x = p2[0] - (p3[0] - p1[0]) / 6 * tension * 2
                      const c2y = p2[1] - (p3[1] - p1[1]) / 6 * tension * 2
                      d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`
                    }
                    return d
                  }
                  const pathFor = (pts: number[]) => smoothPath(pointsFor(pts))
                  const areaPath = `${pathFor(active.pts)} L${toX(active.pts.length - 1)},${chartH} L${padL},${chartH} Z`
                  const yTicks = [yMin, Math.round((yMax - yMin) * 0.5 + yMin), yMax]

                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: GOLD, lineHeight: 1.35 }}>{active.event}</span>
                        <span style={{ fontSize: 10.5, color: MUTED, whiteSpace: 'nowrap', flex: '0 0 auto' }}>{active.date}</span>
                      </div>

                      <div style={{ position: 'relative', height: 160, borderRadius: 14, background: softTint(0.05), border: `1px solid ${BORDER}`, overflow: 'visible', padding: '8px 4px 4px 0' }}>
                        <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                          <defs>
                            <linearGradient id="hChartGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={GOLD} stopOpacity="0.30" />
                              <stop offset="100%" stopColor={GOLD} stopOpacity="0.02" />
                            </linearGradient>
                          </defs>
                          {yTicks.map((tick, i) => (
                            <g key={i}>
                              <line x1={padL} y1={toY(tick)} x2={chartW - padR} y2={toY(tick)} stroke={MUTED} strokeWidth="0.3" opacity="0.25" />
                              <text x={padL - 3} y={toY(tick) + 3} textAnchor="end" fill={MUTED} fontSize="6" fontFamily="var(--font-ui)">{tick}%</text>
                            </g>
                          ))}
                          <path d={areaPath} fill="url(#hChartGrad)">
                            <animate attributeName="d" dur="0.4s" fill="freeze" from={`M${padL},${chartH} L${chartW - padR},${chartH} L${chartW - padR},${chartH} L${padL},${chartH} Z`} to={areaPath} />
                          </path>
                          {services.map((s, i) => {
                            const isActive = hovered === i
                            return (
                              <g key={i}>
                                <path d={pathFor(s.pts)} fill="none" stroke={GOLD} strokeLinecap="round" strokeLinejoin="round"
                                  strokeWidth={isActive ? 2.5 : 1.3} opacity={isActive ? 1 : 0.25}
                                  style={{ transition: 'opacity .25s ease, stroke-width .25s ease' }} />
                                <path d={pathFor(s.pts)} fill="none" stroke="transparent" strokeWidth="14"
                                  style={{ cursor: 'pointer' }} pointerEvents="stroke"
                                  onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(0)} />
                                {isActive && s.pts.map((y, p) => (
                                  <circle key={p} cx={toX(p)} cy={toY(y)} r="2.8" fill={GOLD} stroke={isDark ? '#0a0a0a' : '#fff'} strokeWidth="1.2" />
                                ))}
                              </g>
                            )
                          })}
                          <circle cx={toX(0)} cy={toY(active.pts[0])} r="4" fill={GOLD} opacity="0.25">
                            <animate attributeName="r" dur="1.5s" repeatCount="indefinite" values="4;7;4" />
                          </circle>
                        </svg>
                        <div style={{ position: 'absolute', bottom: 4, left: 28, fontSize: 8.5, color: MUTED }}>dic</div>
                        <div style={{ position: 'absolute', bottom: 4, left: '38%', fontSize: 8.5, color: MUTED }}>feb</div>
                        <div style={{ position: 'absolute', bottom: 4, left: '62%', fontSize: 8.5, color: MUTED }}>abr</div>
                        <div style={{ position: 'absolute', bottom: 4, right: 8, fontSize: 8.5, color: MUTED }}>jun</div>
                      </div>

                      {services.map((row, i) => (
                        <div key={i}
                          onMouseEnter={() => setHovered(i)}
                          onMouseLeave={() => setHovered(0)}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10,
                            background: hovered === i ? `${GOLD}12` : softTint(0.05),
                            border: `1px solid ${hovered === i ? GOLD : BORDER}`,
                            cursor: 'pointer', transition: 'all 0.25s ease',
                            transform: hovered === i ? 'scale(1.01)' : 'scale(1)',
                          }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', marginTop: 4, background: hovered === i ? GOLD : MUTED, flexShrink: 0, transition: 'background 0.25s', boxShadow: hovered === i ? `0 0 8px ${GOLD}` : 'none' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: hovered === i ? GOLD : textColor, lineHeight: 1.35, transition: 'color 0.25s' }}>{row.event}</div>
                            <div style={{ fontSize: 10.5, color: MUTED, marginTop: 1 }}>{row.date} · {row.km} · {row.tall}</div>
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

                {(() => {
                  const indicators = [
                    { l: 'Kilometraje', v: 42000, max: 100000, unit: 'km', color: GOLD, pct: 42 },
                    { l: 'Combustible', v: 78, max: 100, unit: '%', color: GOLD, pct: 78 },
                    { l: 'Temperatura', v: 73, max: 120, unit: '°C', color: GOLD, pct: 61 },
                    { l: 'Llantas', v: 85, max: 100, unit: '%', color: GOLD, pct: 85 },
                  ]
                  const [hovered, setHovered] = useState<number | null>(null)
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
                          <circle cx="110" cy="110" r="100" fill="none" stroke={BORDER} strokeWidth="1" />
                          {Array.from({ length: 60 }).map((_, i) => {
                            const angle = (i * 6 - 90) * (Math.PI / 180)
                            const isMajor = i % 5 === 0
                            const r1 = isMajor ? 85 : 91
                            const r2 = 97
                            return (
                              <line key={i} x1={round3(110 + r1 * Math.cos(angle))} y1={round3(110 + r1 * Math.sin(angle))} x2={round3(110 + r2 * Math.cos(angle))} y2={round3(110 + r2 * Math.sin(angle))} stroke={isMajor ? active.color : MUTED} strokeWidth={isMajor ? 2 : 0.7} strokeLinecap="round" style={{ transition: 'stroke 0.3s' }} />
                            )
                          })}
                          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                            const v = Math.round(active.max * frac)
                            const angle = (frac * 270 - 135) * (Math.PI / 180)
                            const r = 73
                            return <text key={frac} x={round3(110 + r * Math.cos(angle))} y={round3(110 + r * Math.sin(angle))} textAnchor="middle" dominantBaseline="central" fill={MUTED} fontSize="8" fontWeight="500">{v}</text>
                          })}
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
                          <div style={{ fontSize: 9, color: MUTED, letterSpacing: '.12em', textTransform: 'uppercase' }}>{active.unit} {active.l.toLowerCase()}</div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%' }}>
                        {indicators.map((ind, i) => {
                          const opacity = 1 - i * 0.2
                          return (
                            <div key={i}
                              onMouseEnter={() => setHovered(i)}
                              onMouseLeave={() => setHovered(null)}
                              style={{
                                padding: '10px 12px', borderRadius: 10,
                                background: hovered === i ? `rgba(245,197,24,0.15)` : softTint(0.05),
                                border: `1px solid ${hovered === i ? GOLD : BORDER}`,
                                cursor: 'pointer', transition: 'all 0.25s ease',
                                transform: hovered === i ? 'scale(1.03)' : 'scale(1)',
                              }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                <span style={{ fontSize: 10, fontWeight: 600, color: hovered === i ? GOLD : MUTED, letterSpacing: '.08em', textTransform: 'uppercase', transition: 'color 0.25s' }}>{ind.l}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: GOLD, opacity }}>{ind.v.toLocaleString('es-CO')} {ind.unit}</span>
                              </div>
                              <div style={{ height: 3, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,17,0.06)', overflow: 'hidden' }}>
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
    </div>
  )
}
