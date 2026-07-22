'use client'

import { useState, useEffect, useRef } from 'react'
import { NfcKeyIcon, CarLinkMark } from '@/lib/icons_new'

type Theme = 'light' | 'dark'

// Contador animado que arranca cuando entra en viewport.
// Con `live`, sigue subiendo lentamente para simular escaneos en tiempo real.
function CountUp({ target, duration = 1800, live = false }: { target: number; duration?: number; live?: boolean }) {
  const [n, setN] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let liveTimer: ReturnType<typeof setInterval> | undefined
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true
        const start = performance.now()
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration)
          const eased = 1 - Math.pow(1 - p, 3)
          setN(Math.round(target * eased))
          if (p < 1) requestAnimationFrame(tick)
          else if (live) liveTimer = setInterval(() => setN(v => v + 1 + Math.floor(Math.random() * 2)), 3500)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.4 })
    io.observe(el)
    return () => { io.disconnect(); if (liveTimer) clearInterval(liveTimer) }
  }, [target, duration, live])
  return <span ref={ref}>{n.toLocaleString('es-CO')}</span>
}

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

const TESTIMONIOS = [
  { text: 'Ya no cargo facturas sueltas en la guantera. Toco mi llavero y el taller ve todo el historial al instante.', name: 'Andrés Morales', role: 'Conductor · Bogotá', initial: 'A' },
  { text: 'Actualizar la ficha del cliente toma 20 segundos. Antes lo hacíamos a mano en una hoja que se perdía.', name: 'Diana Ruiz', role: 'Tecnicentro La 80', initial: 'D' },
  { text: 'Vendí mi carro con la ficha completa desde el día uno — el comprador confió de inmediato.', name: 'Camilo Reyes', role: 'Conductor · Medellín', initial: 'C' },
]

const COVERAGE = [
  { city: 'Bogotá D.C.', count: 64 }, { city: 'Medellín', count: 38 }, { city: 'Cali', count: 29 }, { city: 'Barranquilla', count: 17 },
  { city: 'Bucaramanga', count: 12 }, { city: 'Pereira', count: 9 }, { city: 'Cartagena', count: 8 }, { city: 'Manizales', count: 6 },
]

const FAQS = [
  { q: '¿CarLink reemplaza al SOAT o la tecnomecánica?', a: 'No — los complementa. CarLink es tu ficha de mantenimiento; SOAT y RTM siguen siendo trámites oficiales, aunque también puedes guardarlos en tu sección de Documentos.' },
  { q: '¿Qué pasa si cambio de taller?', a: 'Nada se pierde. El historial queda asociado a tu placa, no al taller — cada visita nueva simplemente se agrega con el nombre de quien te atendió.' },
  { q: '¿Necesito el llavero NFC para usar la app?', a: 'No es obligatorio. Puedes ver y compartir tu ficha desde el navegador; el llavero solo hace la verificación en el taller más rápida.' },
  { q: '¿Mis datos son públicos?', a: 'No. Tu ficha solo es visible para quien tú compartas el enlace o acerque el llavero — no aparece en buscadores ni se comparte con terceros.' },
  { q: '¿Cuánto cuesta para un conductor?', a: 'Nada. Crear tu ficha, ver tu historial y descargar tu pase de Wallet es gratis para siempre.' },
]

const NFC_PRODUCTS = [
  { name: 'Llavero Estándar', desc: 'Aro metálico, grabado con tu placa.', price: '$49.900', tag: '', premium: false },
  { name: 'Llavero Premium', desc: 'Acabado en acero cepillado + envío express.', price: '$79.900', tag: 'Más vendido', premium: true },
  { name: 'Llavero Personalizado', desc: 'Tu logo o diseño propio en el llavero.', price: '$99.900', tag: '', premium: false },
]

const SPONSORS = ['Terpel', 'Mobil 1', 'Shell Helix', 'Castrol', 'Michelin', 'SURA']

const STATS = [
  { v: '4.8/5', l: 'calificación promedio de talleres' },
  { v: '180+', l: 'talleres y CDAs verificados' },
  { v: '100%', l: 'historial verificado por taller' },
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
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}><path d="M20 6L9 17l-5-5" /></svg>
)

type PolicyTab = 'warranty' | 'privacy' | 'support'

const FOB_IDS = ['std', 'prem', 'custom']

export default function LandingSections({ theme, onStart, onOpenPolicy, onOpenPqrs, onBuyFob }: { theme: Theme; onStart: () => void; onOpenPolicy: (tab: PolicyTab) => void; onOpenPqrs: () => void; onBuyFob: (productId?: string) => void }) {
  const [faqOpen, setFaqOpen] = useState<number>(-1)
  const [keychainCount, setKeychainCount] = useState(225)
  const k = tokens(theme)

  useEffect(() => {
    const stored = parseInt(localStorage.getItem('carlink_keychain_count') || '225', 10)
    setKeychainCount(stored)
  }, [])

  const card = (border = k.glassBorder): React.CSSProperties => ({ background: k.glassBg, border: `1px solid ${border}` })
  const lead: React.CSSProperties = { fontWeight: 300, fontSize: 15, lineHeight: 1.6, color: k.muted, margin: 0 }

  return (
    <div style={{ position: 'relative', zIndex: 10, color: k.text }}>
      {/* ===== CÓMO FUNCIONA ===== */}
      <section id="h-como" style={{ ...SECTION_MAX, padding: '88px clamp(20px,5vw,64px) 64px' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 44px' }}>
          <div style={EYEBROW}>Cómo funciona</div>
          <h2 style={{ ...H2, margin: '10px 0 12px' }}>De tu placa a una ficha viva en tres pasos</h2>
          <p style={lead}>Sin apps que instalar antes de probarlo, sin formularios eternos.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 18 }}>
          {STEPS.map(st => (
            <div key={st.n} style={{ padding: '26px 22px', borderRadius: 20, ...card() }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(245,197,24,0.14)', color: k.goldSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 15, marginBottom: 16 }}>{st.n}</div>
              <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 6 }}>{st.title}</div>
              <p style={{ ...lead, fontSize: 14, lineHeight: 1.55 }}>{st.desc}</p>
            </div>
          ))}
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
              <span style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(46,204,113,0.12)', color: '#2ecc71', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{tr.icon}</svg>
              </span>
              <div style={{ fontSize: 15.5, fontWeight: 500 }}>{tr.title}</div>
              <p style={{ ...lead, fontSize: 13.5, lineHeight: 1.55 }}>{tr.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== TESTIMONIOS ===== */}
      <section id="h-testi" style={{ ...SECTION_MAX, padding: '64px clamp(20px,5vw,64px)', borderTop: `1px solid ${k.thinBorder}` }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 44px' }}>
          <div style={EYEBROW}>Testimonios</div>
          <h2 style={H2}>Conductores y talleres que ya lo usan</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
          {TESTIMONIOS.map(q => (
            <div key={q.name} style={{ padding: 24, borderRadius: 18, ...card() }}>
              <div style={{ color: GOLD, fontSize: 14, letterSpacing: 2, marginBottom: 12 }}>★★★★★</div>
              <p style={{ fontWeight: 300, fontSize: 14.5, lineHeight: 1.6, margin: '0 0 16px', color: k.text }}>&ldquo;{q.text}&rdquo;</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: '50%', background: GOLD, color: '#111', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{q.initial}</span>
                <div><div style={{ fontSize: 13.5, fontWeight: 500 }}>{q.name}</div><div style={{ fontSize: 12, fontWeight: 300, color: k.muted }}>{q.role}</div></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== COBERTURA ===== */}
      <section id="h-cobertura" style={{ ...SECTION_MAX, padding: '64px clamp(20px,5vw,64px)', borderTop: `1px solid ${k.thinBorder}` }}>
        <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 40px' }}>
          <div style={EYEBROW}>Ubicación y cobertura</div>
          <h2 style={{ ...H2, margin: '10px 0 12px' }}>Talleres aliados cerca de ti</h2>
          <p style={lead}>CarLink ya opera en estas ciudades — cada una con talleres verificados listos para actualizar tu ficha.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
          {COVERAGE.map(cv => (
            <div key={cv.city} style={{ padding: 16, borderRadius: 14, ...card(), display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: GOLD, flex: '0 0 auto', boxShadow: `0 0 8px ${GOLD}` }} />
              <div><div style={{ fontSize: 14, fontWeight: 500 }}>{cv.city}</div><div style={{ fontSize: 11.5, fontWeight: 300, color: k.muted }}>{cv.count} talleres</div></div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <button onClick={onStart} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 999, border: '1px solid rgba(245,197,24,0.4)', background: 'rgba(245,197,24,0.08)', color: k.goldSoft, fontWeight: 500, fontSize: 13.5, cursor: 'pointer' }}>
            ¿Tienes un taller? Únete a la red{ARROW}
          </button>
        </div>
      </section>

      {/* ===== PLANES ===== */}
      <section id="h-planes" style={{ ...SECTION_MAX, padding: '64px clamp(20px,5vw,64px)', borderTop: `1px solid ${k.thinBorder}` }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 44px' }}>
          <div style={EYEBROW}>Planes</div>
          <h2 style={H2}>Gratis para conductores, simple para talleres</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 18, maxWidth: 820, margin: '0 auto' }}>
          {[
            { name: 'Conductor', price: 'Gratis', period: '', tag: '', border: k.cardBorder, features: ['Ficha técnica ilimitada', 'Historial y recordatorios', 'Descarga y Wallet', 'Galería y documentos'], cta: 'Crear mi ficha', btnBg: 'rgba(245,197,24,0.12)', btnColor: k.goldSoft },
            { name: 'Taller aliado', price: '$79.900', period: '/mes', tag: 'Popular', border: 'rgba(245,197,24,0.4)', features: ['Clientes y fichas ilimitadas', 'Perfil público con reseñas', 'Certificados y facturación', 'Soporte prioritario'], cta: 'Registrar mi taller', btnBg: GOLD, btnColor: '#111' },
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
              <button onClick={onStart} style={{ width: '100%', padding: 12, borderRadius: 11, border: 'none', background: pl.btnBg, color: pl.btnColor, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{pl.cta}</button>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="h-faq" style={{ maxWidth: 820, margin: '0 auto', width: '100%', padding: '64px clamp(20px,5vw,64px)', borderTop: `1px solid ${k.thinBorder}` }}>
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

      {/* ===== TIENDA NFC ===== */}
      <section id="h-tienda" style={{ ...SECTION_MAX, padding: '64px clamp(20px,5vw,64px)', borderTop: `1px solid ${k.thinBorder}` }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 44px' }}>
          <div style={EYEBROW}>Tienda CarLink</div>
          <h2 style={{ ...H2, margin: '10px 0 12px' }}>Lleva tu ficha en un llavero NFC</h2>
          <p style={lead}>Un toque contra el teléfono muestra tu ficha al instante — sin apps que abrir, sin buscar el enlace.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16, maxWidth: 900, margin: '0 auto' }}>
          {NFC_PRODUCTS.map((np, i) => (
            <div key={np.name} style={{ padding: 24, borderRadius: 20, ...card(np.tag ? 'rgba(245,197,24,0.4)' : k.glassBorder), position: 'relative', textAlign: 'center' }}>
              {np.tag && <span style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: GOLD, color: '#111', fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 999 }}>{np.tag}</span>}
              <div style={{ width: 76, height: 76, margin: '0 auto 16px', borderRadius: '50%', background: np.premium ? GOLD : 'rgba(245,197,24,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: np.premium ? '#111' : GOLD, display: 'flex' }}><NfcKeyIcon size={34} strokeWidth={1.6} /></span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{np.name}</div>
              <p style={{ ...lead, fontSize: 13, lineHeight: 1.5, margin: '8px 0 14px', minHeight: 40 }}>{np.desc}</p>
              <div style={{ fontSize: 24, fontWeight: 400, marginBottom: 16 }}>{np.price}</div>
              <button onClick={() => onBuyFob(FOB_IDS[i])} style={{ width: '100%', padding: 11, borderRadius: 11, border: 'none', background: np.premium ? GOLD : 'rgba(245,197,24,0.14)', color: np.premium ? '#111' : k.goldSoft, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Comprar</button>
            </div>
          ))}
        </div>
      </section>

      {/* ===== PATROCINADORES ===== */}
      <section id="h-sponsors" style={{ ...SECTION_MAX, padding: '56px clamp(20px,5vw,64px)', borderTop: `1px solid ${k.thinBorder}` }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 32px' }}>
          <div style={EYEBROW}>Respaldo</div>
          <h2 style={H2}>Marcas y aliados que confían en CarLink</h2>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          {SPONSORS.map(name => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 22px', borderRadius: 14, ...card(), minWidth: 150, justifyContent: 'center' }}>
              <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 16, letterSpacing: '.02em', color: k.muted }}>{name}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, maxWidth: 820, margin: '32px auto 0', textAlign: 'center' }}>
          {STATS.map(s => (
            <div key={s.l}><div style={{ fontFamily: "'Anton',sans-serif", fontSize: 30, color: GOLD }}>{s.v}</div><div style={{ fontSize: 12.5, fontWeight: 300, color: k.muted }}>{s.l}</div></div>
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
                  <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 15, color: GOLD }}>{mp.price}</span>
                </div>
                <div style={{ fontSize: 11.5, color: k.muted, marginTop: 3 }}>{mp.km} · {mp.city}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== COMPRA TU LLAVERO ===== */}
      <section id="h-buyfob" style={{ ...SECTION_MAX, padding: '56px clamp(20px,5vw,64px) 64px', borderTop: `1px solid ${k.thinBorder}` }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 36px' }}>
          <div style={EYEBROW}>Llavero NFC</div>
          <h2 style={{ ...H2, margin: '10px 0 12px' }}>Compra tu llavero — 3 pasos, sin vueltas</h2>
          <p style={lead}>Vincúlalo a tu placa y tu ficha aparece al instante en cualquier taller.</p>
        </div>
        <div className="grid2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, maxWidth: 760, margin: '0 auto 28px' }}>
          {[['1', 'Elige tu llavero'], ['2', 'Confirma tu dirección'], ['3', 'Paga y listo']].map(([n, t]) => (
            <div key={n} style={{ textAlign: 'center', padding: 18, borderRadius: 16, ...card() }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(245,197,24,0.14)', color: k.goldSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontWeight: 600, fontSize: 14 }}>{n}</div>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>{t}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center' }}>
          <button onClick={() => onBuyFob()} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '14px 28px', borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 0 24px rgba(245,197,24,0.4)' }}>
            Comprar llavero — desde $49.900{ARROW}
          </button>
        </div>
      </section>

      {/* ===== COMUNIDAD · CONTADOR + WALLET ===== */}
      <section id="h-comunidad" style={{ ...SECTION_MAX, padding: '40px clamp(20px,5vw,64px)', borderTop: `1px solid ${k.thinBorder}` }}>
        <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 32px' }}>
          <div style={EYEBROW}>Comunidad CarLink</div>
          <h2 style={{ ...H2, margin: '10px 0 0' }}>Tus llaveros activos en la red</h2>
        </div>

        <div className="grid2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, alignItems: 'stretch' }}>
          {/* ─── LEFT: Contador + NFC ondas ─── */}
          <div style={{ ...card(), borderRadius: 22, padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6 }}>
            <div style={{ position: 'relative', width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', border: `2px solid ${GOLD}`, opacity: 0, animation: `nfcRipple 2.6s ease-out infinite`, animationDelay: `${i * 0.85}s` }} />
              ))}
              <div style={{
                position: 'relative', width: 68, height: 68, borderRadius: '50%',
                background: 'radial-gradient(circle at 40% 30%, rgba(245,197,24,0.28), rgba(245,197,24,0.08))',
                border: '1.5px solid rgba(245,197,24,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 40px rgba(245,197,24,0.3)',
              }}>
                <span style={{ color: GOLD, display: 'flex' }}><NfcKeyIcon size={32} strokeWidth={1.9} /></span>
              </div>
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center' }}>
              <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 'clamp(36px,6vw,56px)', lineHeight: 1, color: GOLD, letterSpacing: '.01em' }}><CountUp target={keychainCount} live /></div>
            </div>
            <div style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', fontWeight: 700, color: k.muted }}>llaveros activos · en vivo</div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 0, marginTop: 8, background: k.bubbleBg, borderRadius: 10, border: `1px solid ${k.thinBorder}`, overflow: 'hidden' }}>
              {[
                { n: <><CountUp target={23} />+</>, l: 'talleres' },
                { n: <CountUp target={3} />, l: 'ciudades' },
                { n: '4.9★', l: 'satisfacción' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 16px', ...(i < 2 ? { borderRight: `1px solid ${k.thinBorder}` } : {}) }}>
                  <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 18, color: k.text, lineHeight: 1.1 }}>{s.n}</div>
                  <div style={{ fontSize: 9, color: k.muted, marginTop: 1 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── RIGHT: Wallet / estado de la placa ─── */}
          <div style={{ ...card(), borderRadius: 22, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={onStart} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '12px', borderRadius: 12, border: `1px solid ${k.glassBorder}`, background: 'rgba(245,197,24,0.08)', color: k.text, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="13" rx="3" /><path d="M2 10h20M16 15h3" /></svg>
              Sincronizar Ficha en Billetera / Wallet
            </button>

            {[
              { l: 'Estado general de placa', icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />, extra: <path d="M9 12l2 2 4-4" />, v: 'PlacaID Encriptada con Éxito', s: 'Firmado por CarLink Lab', vc: '#2ecc71' },
              { l: 'Última firma digital', icon: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>, v: '14 jun 2026', s: 'Actualizado hace unos momentos', vc: GOLD },
              { l: 'Expediente digital', icon: <><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" /></>, v: '5 Archivos Adjuntos', s: 'Gestionar fotos y recibos →', vc: '#2ecc71', link: true },
            ].map((row, i) => (
              <div key={i} style={{ padding: '11px 13px', borderRadius: 12, background: k.bubbleBg, border: `1px solid ${k.thinBorder}`, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: k.muted }}>{row.l}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 700 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={row.vc} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{row.icon}{row.extra}</svg>
                  <span>{row.v}</span>
                </div>
                {row.link
                  ? <button onClick={onStart} style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11, color: GOLD, fontWeight: 600 }}>{row.s}</button>
                  : <span style={{ fontSize: 11, color: k.muted }}>{row.s}</span>}
              </div>
            ))}
          </div>
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
              <p style={{ ...lead, fontSize: 13 }}>Reporta peticiones, quejas, reclamos o sugerencias. CarLia lo resuelve pronto.</p>
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
        <div className="footergrid" style={{ maxWidth: 1160, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1.2fr', gap: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Anton',sans-serif", fontSize: 20, marginBottom: 12 }}>
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
              <a href="#h-buyfob" style={{ color: k.muted, textDecoration: 'none' }}>App móvil</a>
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
              <a href="mailto:soporte@ailink.com.co" style={{ color: k.muted, textDecoration: 'none' }}>soporte@ailink.com.co</a>
              <a href="tel:+576015550199" style={{ color: k.muted, textDecoration: 'none' }}>+57 601 555 0199</a>
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
