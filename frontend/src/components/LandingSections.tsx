'use client'

import React, { useState, useEffect, type FormEvent } from 'react'
import CarLinkLogo from '@/components/CarLinkLogo'
import Link from 'next/link'
import { reviewsApi, waitlistApi } from '@/lib/api'
import type { Review } from '@/lib/types'
import { NfcKeyIcon } from '@/lib/icons_new'
import { SUPPORT_WHATSAPP } from '@/lib/checkout'

type Theme = 'light' | 'dark'

const GOLD = '#F5C518'

// Math.cos/sin can differ by 1 ULP between the server (Node) and client
// (browser) JS engines — rounding SSR-rendered trig output keeps hydration
// deterministic.
const round3 = (n: number) => Math.round(n * 1000) / 1000

// Comparación "con/sin CarLink" — movida desde la landing de shop (2026-09-07),
// vive entre "Cómo funciona" y "Comunidad" en el home. No duplicar en shop/page.tsx.
const COMPARISON = [
  { feature: 'Organización del historial', without: 'Papeles arrugados, térmicos borrados en la guantera', withCl: 'Bitácora digital en la nube accesible en 1 segundo' },
  { feature: 'Proceso para ver información', without: 'Revolver facturas y adivinar kilometrajes antiguos', withCl: 'Acercar tu celular al llavero NFC sin abrir aplicaciones' },
  { feature: 'Confianza del comprador', without: 'Sospechas de kilometraje y pedido de rebajas del 15%', withCl: 'Transparencia verificada que defiende el precio de venta de tu vehículo' },
  { feature: 'Aviso de mantenimiento', without: 'Depender de stickers borrosos en el panorámico', withCl: 'Alertas digitales inteligentes de aceite, frenos y SOAT' },
  { feature: 'Resistencia del formato', without: 'Se rompe, se moja, se extravía en lavaderos', withCl: 'Impermeable e indestructible en tu llavero' },
  { feature: 'Costo mensual de almacenamiento', without: 'N/A', withCl: '$0 COP — pago único de por vida' },
]

// Planes de pricing — mismos valores que shop/page.tsx (buildPlans).
// Se arma con los tokens del tema del home.
function buildPlans(border: string, textColor: string, isDark: boolean) {
  return [
    {
      name: 'Conductor', price: 'Gratis', period: 'para siempre', tag: '',
      border, priceColor: textColor,
      features: ['Ficha técnica ilimitada', 'Historial y recordatorios', 'Descarga y Wallet', 'Galería y documentos'],
      cta: 'Crear mi ficha', href: '/register', btnBg: 'rgba(245,197,24,0.12)', btnColor: GOLD,
    },
    {
      name: 'Llavero NFC CarLink', price: '$29.900', period: 'pago único · envío incluido', tag: 'MÁS POPULAR',
      border: `2px solid ${GOLD}`, priceColor: GOLD, bg: isDark ? 'linear-gradient(165deg,#241f0c,#141418)' : 'linear-gradient(165deg,#fff6d9,#fffdf5)',
      features: ['Todo lo del plan Conductor', 'Llavero personalizado', 'Modo público', 'Perfil verificable', 'Compartir historial con un toque'],
      cta: 'Quiero mi CarLink', href: '/#h-buyfob', btnBg: GOLD, btnColor: '#111',
    },
    {
      name: 'Taller aliado', price: '$79.900', period: '/mes · Pruebalo ya!', tag: '',
      border: `1px solid rgba(245,197,24,0.28)`, priceColor: textColor,
      features: ['Clientes y fichas ilimitadas', 'Perfil público con reseñas', 'Certificados y facturación', 'Soporte prioritario'],
      cta: 'Registrar mi taller', href: '/register?mode=empresa', btnBg: 'rgba(245,197,24,0.12)', btnColor: GOLD,
    },
  ]
}

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
    cardBg: dark ? '#121216' : '#f7f6f2',
    rowTint: dark ? 'rgba(255,255,255,0.02)' : 'rgba(17,17,17,0.02)',
  }
}

const SECTION_MAX: React.CSSProperties = { maxWidth: 1160, margin: '0 auto', width: '100%' }
const EYEBROW: React.CSSProperties = {
  fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', fontWeight: 600, color: GOLD,
}
const H2: React.CSSProperties = {
  fontSize: 'clamp(24px,3vw,34px)', fontWeight: 400, letterSpacing: '-0.01em', margin: '10px 0 0',
}

const FAQS = [
  { q: '¿Qué incluye cada servicio del taller?', a: 'Cada visita queda registrada con fecha, kilometraje, tall mecánico, los repuestos cambiados y una foto del comprobante. El historial es inmutable y verificable.' },
  { q: '¿Qué pasa si cambio de taller?', a: 'Nada se pierde. El historial queda asociado a tu placa, no al taller — cada visita nueva simplemente se agrega con el nombre de quien te atendió.' },
  { q: '¿Cómo verifico que el historial no esté adulterado?', a: 'Cada registro tiene un hash de integridad y la ubicación GPS del taller. Si alguien intenta editar un servicio pasado, la app marca la inconsistencia.' },
  { q: '¿Necesito descargar alguna aplicación?', a: 'No. CarLink funciona con la tecnología NFC nativa de todos los smartphones (iPhone y Android). Al acercar tu celular al llavero, se abre automáticamente tu navegador seguro con la bitácora digital de tu vehículo.' },
  { q: '¿Mis datos son públicos?', a: 'No. Tu ficha solo es visible para quien tú compartas el enlace o acerque el llavero — no aparece en buscadores ni se comparte con terceros.' },
  { q: '¿Cuánto cuesta para un conductor?', a: 'Nada. Crear tu ficha, ver tu historial y descargar tu pase de Wallet es gratis para siempre.' },
]



const ARROW = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)
const CHECK = (color = GOLD, size = 15) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto', marginTop: 2 }}><path d="M20 6L9 17l-5-5" /></svg>
)

type PolicyTab = 'warranty' | 'privacy' | 'support'

export default function LandingSections({ theme, onStart, onOpenEmpresa, onOpenPolicy, onOpenPqrs }: { theme: Theme; onStart: () => void; onOpenEmpresa: (accountType?: 'user' | 'business') => void; onOpenPolicy: (tab: PolicyTab) => void; onOpenPqrs: () => void }) {
  const [faqOpen, setFaqOpen] = useState<number>(-1)
  const k = tokens(theme)

  // Reseñas reales de plataforma (ver ResenasTab) para "Comunidad CarLink" —
  // la lectura pública no trae nombre/email del autor (misma reserva de
  // privacidad que el resto de fichas públicas), así que se muestran
  // anonimizadas y solo si hay suficientes con comentario; si no, se
  // mantienen los 3 testimonios curados de abajo como respaldo.
  const [realTestimonials, setRealTestimonials] = useState<Review[] | null>(null)
  const [leadContact, setLeadContact] = useState('')
  const [leadStatus, setLeadStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  useEffect(() => {
    reviewsApi.list({ targetType: 'platform', sort: 'mejores', limit: 6 }).then(list => {
      const withComment = (list || []).filter(r => r.rating >= 4 && r.comment.trim().length > 0)
      if (withComment.length >= 3) setRealTestimonials(withComment)
    })
  }, [])

  const handleLeadSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!leadContact.trim() || leadStatus === 'loading') return
    setLeadStatus('loading')
    const res = await waitlistApi.create(leadContact.trim(), 'landing_guia_mantenimiento')
    setLeadStatus(res ? 'done' : 'error')
  }

  const card = (border = k.glassBorder): React.CSSProperties => ({ background: k.glassBg, border: `1px solid ${border}` })
  const lead: React.CSSProperties = { fontWeight: 300, fontSize: 15, lineHeight: 1.6, color: k.muted, margin: 0 }
  const CTA_BTN: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 10, padding: '15px 30px', borderRadius: 13, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: '0 0 28px rgba(245,197,24,.38)', textDecoration: 'none' }
  const PLANS = buildPlans(k.cardBorder, k.text, theme !== 'light')
  const isDark = theme !== 'light'
  const goldCardGradient = isDark ? 'linear-gradient(160deg,#17160f,#121216)' : 'linear-gradient(160deg,#fff8e1,#fdfaf2)'
  const goldCtaGradient = isDark
    ? 'radial-gradient(120% 100% at 50% 100%,#241f0c 0%,#0b0b0d 58%,#08080a 100%)'
    : 'radial-gradient(120% 100% at 50% 100%,#fff3c4 0%,#fbfaf6 58%,#ffffff 100%)'
  const softTint = (alpha: number) => isDark ? `rgba(255,255,255,${alpha})` : `rgba(17,17,17,${alpha})`

  return (
    <div style={{ position: 'relative', zIndex: 10, color: k.text }}>
      <style>{`
        @keyframes comunidad-marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        [data-r="comunidadTrack"]:hover [data-r="comunidadInner"]{ animation-play-state: paused }
        @media(max-width:860px){ [data-r="mapFrame"]{min-height:280px !important} [data-r="footergrid"]{grid-template-columns:1fr !important} .buyfob-grid{grid-template-columns:1fr !important} .buyfob-grid>div:last-child{position:static !important} .grid2{grid-template-columns:1fr !important} [data-r="hPrecio"]{grid-template-columns:1fr !important} [data-r="hLeadGuia"]{grid-template-columns:1fr !important} [data-r="hCaptureLeads"]{grid-template-columns:1fr !important} }
        @media(max-width:1024px){ [data-r="footergrid"]{grid-template-columns:1fr 1fr !important} }
        @media(max-width:720px){ [data-r="diffScrollHint"]{display:flex !important} }
        @media(max-width:380px){ [data-r="diffTable"]{min-width:0 !important} [data-r="diffTable"] th,[data-r="diffTable"] td{padding:12px 10px !important;font-size:12px !important} [data-r="diffTable"] th{font-size:9px !important} [data-r="diffTable"] td:first-child{font-size:11.5px !important} }
        @media(prefers-reduced-motion:reduce){ [data-r="comunidadInner"]{animation:none !important} }
      `}</style>

      {/* ===== LA DIFERENCIA — ¿Realmente necesitas CarLink? ===== */}
      <section id="h-diferencia" style={{ ...SECTION_MAX, padding: '56px clamp(20px,5vw,64px)', borderTop: `1px solid ${k.thinBorder}` }}>
        <div style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 40px' }}>
          <div style={EYEBROW}>La diferencia</div>
          <h2 style={H2}>¿Realmente necesitas CarLink?</h2>
          <p style={{ ...lead, margin: '14px auto 0', maxWidth: '48ch' }}>Mira la diferencia entre seguir con el método antiguo de carpetas vs pasar al control digital inteligente en tu bolsillo.</p>
        </div>

        {/* La columna "Con CarLink" es lo importante — en mobile queda fuera de
            vista sin este aviso, ya que la tabla completa no cabe en pantalla. */}
        <div data-r="diffScrollHint" style={{ display: 'none', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10, fontSize: 12.5, fontWeight: 600, color: GOLD }}>
          {ARROW}
          Desliza para ver la comparación completa
        </div>
        <div style={{ overflowX: 'auto', borderRadius: 20, border: `1px solid ${k.cardBorder}` }}>
          <table data-r="diffTable" style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '16px 20px', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: k.muted, background: k.cardBg, borderBottom: `1px solid ${k.cardBorder}` }}>Característica</th>
                <th style={{ textAlign: 'left', padding: '16px 20px', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#ff4d6a', background: k.cardBg, borderBottom: '1px solid rgba(255,77,106,0.24)' }}>Sin CarLink</th>
                <th style={{ textAlign: 'left', padding: '16px 20px', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: GOLD, background: k.cardBg, borderBottom: '1px solid rgba(245,197,24,0.42)' }}>Con CarLink</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={row.feature} style={{ background: i % 2 ? k.rowTint : 'transparent' }}>
                  <td style={{ padding: '18px 20px', fontSize: 14.5, fontWeight: 700, color: k.text, borderBottom: i < COMPARISON.length - 1 ? `1px solid ${k.cardBorder}` : 'none', verticalAlign: 'top' }}>{row.feature}</td>
                  <td style={{ padding: '18px 20px', fontSize: 14, color: k.muted, lineHeight: 1.5, borderBottom: i < COMPARISON.length - 1 ? `1px solid ${k.cardBorder}` : 'none', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff4d6a" strokeWidth="2.6" strokeLinecap="round" style={{ flex: '0 0 auto', marginTop: 3 }}><path d="M18 6L6 18M6 6l12 12" /></svg>
                      {row.without}
                    </div>
                  </td>
                  <td style={{ padding: '18px 20px', fontSize: 14, color: k.text, fontWeight: 500, lineHeight: 1.5, background: 'rgba(245,197,24,0.05)', borderBottom: i < COMPARISON.length - 1 ? '1px solid rgba(245,197,24,0.16)' : 'none', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                      {CHECK(GOLD, 15)}
                      {row.withCl}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===== PRECIO — Gratis para conductores, suscripción para talleres ===== */}
      <section id="h-precio" style={{ ...SECTION_MAX, padding: '56px clamp(20px,5vw,64px)', borderTop: `1px solid ${k.thinBorder}` }}>
        <div style={{ textAlign: 'center', maxWidth: 660, margin: '0 auto 52px' }}>
          <div style={EYEBROW}>Precio</div>
          <h2 style={H2}>Gratis para conductores, suscripción para talleres</h2>
        </div>
        <div data-r="hPrecio" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, maxWidth: 1080, margin: '0 auto' }}>
          {PLANS.map(pl => (
            <div key={pl.name} data-r="hPlanCard" style={{ position: 'relative', padding: '36px 30px', borderRadius: 22, background: pl.bg ?? k.cardBg, border: pl.border, display: 'flex', flexDirection: 'column' }}>
              {pl.tag && <span data-r="hPricingBadge" style={{ position: 'absolute', top: -13, left: 30, background: GOLD, color: '#111', fontSize: 11.5, fontWeight: 800, padding: '6px 16px', borderRadius: 999, letterSpacing: '.08em' }}>{pl.tag}</span>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: pl.priceColor === GOLD ? GOLD : k.muted }}>
                {pl.name.includes('Llavero') && <NfcKeyIcon size={15} />}
                {pl.name}
              </div>
              <div data-r="hPlanPrice" style={{ fontFamily: 'var(--font-display)', fontSize: 46, color: pl.priceColor, lineHeight: 1, margin: '16px 0 5px' }}>{pl.price}</div>
              <div style={{ fontSize: 14, color: k.muted }}>{pl.period}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '28px 0 26px', flex: 1 }}>
                {pl.features.map(f => (
                  <div key={f} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', fontSize: 14.5, color: k.muted, lineHeight: 1.4 }}>{CHECK(GOLD, 15)}{f}</div>
                ))}
              </div>
              <Link href={pl.href} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: pl.btnBg, color: pl.btnColor, fontWeight: 800, fontSize: 15, textAlign: 'center', textDecoration: 'none' }}>{pl.cta}</Link>
            </div>
          ))}
        </div>
      </section>

      {/* ===== COMUNIDAD CARLINK ===== */}
      <section id="h-comunidad" style={{ ...SECTION_MAX, padding: '56px clamp(20px,5vw,64px)', borderTop: `1px solid ${k.thinBorder}` }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 36px' }}>
          <div style={EYEBROW}>Comunidad</div>
          <h2 style={H2}>Conductores en Colombia que ya protegen su vehículo</h2>
          <p style={lead}>Una red creciente con más de 700 de vehículos certificados, talleres aliados y propietarios responsables.</p>
        </div>

        {/* Testimonials — marquee lento de derecha a izquierda */}
        <div data-r="comunidadTrack" style={{ overflow: 'hidden', maxWidth: 820, margin: '0 auto 36px', maskImage: 'linear-gradient(to right, transparent, black 48px, black calc(100% - 48px), transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 48px, black calc(100% - 48px), transparent)' }}>
          <div data-r="comunidadInner" style={{ display: 'flex', gap: 14, width: 'max-content', animation: 'comunidad-marquee 50s linear infinite' }}>
            {[...realTestimonials
              ? realTestimonials.map(r => ({ key: r.id, name: 'Cliente CarLink', city: '', text: r.comment, rating: r.rating }))
              : [
                  { key: '1', name: 'Andrés M.', city: 'Bogotá', text: 'Con el llavero NFC he podido guardar mis documentos sin problema, es fácil, rápido y gratuito como me gusta.', rating: 5 },
                  { key: '2', name: 'Laura Sófia.', city: 'Medellín', text: 'Mi taller verificó mi mantenimiento sin que yo pusiera algun dato de mi parte, eso me gustó, solo espero ver más talleres asociados, pero los que note estan bien.', rating: 4 },
                  { key: '3', name: 'Carlos R.', city: 'Cali', text: 'Vendí mi carro en menos de 3 semanas porque el comprador confió en la ficha certificada. Gracias!', rating: 5 },
                  { key: '4', name: 'Oscar Martinez.', city: 'Tunja', text: 'Cada vez que salgo del taller, acerco el llavero y queda el registro guardado. Ya no cargo con recibos que se borran', rating: 5 },
                  { key: '5', name: 'Javier Galindo.', city: 'Tunja', text: 'Cada vez que salgo del taller, acerco el llavero y queda el registro guardado. Ya no cargo con recibos que se borran', rating: 5 },
                  { key: '6', name: 'Maritza Becerra.', city: 'Bogotá', text: 'Cada vez que salgo del taller, acerco el llavero y queda el registro guardado. Ya no cargo con recibos que se borran', rating: 5 },
                ]
            /* duplicamos para loop continuo sin salto */
            , ...realTestimonials
              ? realTestimonials.map(r => ({ key: r.id + '-dup', name: 'Cliente CarLink', city: '', text: r.comment, rating: r.rating }))
              : [
                  { key: '1-dup', name: 'Andrés M.', city: 'Bogotá', text: 'Con el llavero NFC he podido guardar mis documentos sin problema, es fácil, rápido y gratuito como me gusta.', rating: 5 },
                  { key: '2-dup', name: 'Laura Sófia.', city: 'Medellín', text: 'Mi taller verificó mi mantenimiento sin que yo pusiera algun dato de mi parte, eso me gustó, solo espero ver más talleres asociados, pero los que note estan bien.', rating: 4 },
                  { key: '3-dup', name: 'Carlos R.', city: 'Cali', text: 'Vendí mi carro en menos de 3 semanas porque el comprador confió en la ficha certificada. Gracias!', rating: 5 },
                  { key: '4-dup', name: 'Oscar Martinez.', city: 'Tunja', text: 'Cada vez que salgo del taller, acerco el llavero y queda el registro guardado. Ya no cargo con recibos que se borran', rating: 5 },
                  { key: '5-dup', name: 'Javier Galindo.', city: 'Tunja', text: 'Cada vez que salgo del taller, acerco el llavero y queda el registro guardado. Ya no cargo con recibos que se borran', rating: 5 },
                  { key: '6-dup', name: 'Maritza Becerra.', city: 'Bogotá', text: 'Cada vez que salgo del taller, acerco el llavero y queda el registro guardado. Ya no cargo con recibos que se borran', rating: 5 },
                ]
            ].map(t => (
              <div key={t.key} style={{ padding: 20, borderRadius: 14, background: k.bubbleBg, border: `1px solid ${k.thinBorder}`, width: 260, flex: '0 0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill={i < t.rating ? GOLD : 'none'} stroke={GOLD} strokeWidth={i < t.rating ? 0 : 2}><path d="M12 2l2.9 6.6 7.1.7-5.4 4.7 1.7 7-6.3-3.8L5.7 21l1.7-7-5.4-4.7 7.1-.7z" /></svg>
                    ))}
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: GOLD, background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.3)', padding: '3px 8px', borderRadius: 6 }}>
                    {CHECK(GOLD, 11)}Verificado
                  </span>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.55, color: k.muted, margin: '0 0 14px' }}>"{t.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 12, borderTop: `1px solid ${k.thinBorder}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(245,197,24,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 15, color: GOLD }}>{t.name[0]}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                    {t.city && <div style={{ fontSize: 11, color: k.muted }}>{t.city}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
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

      {/* ===== BANNER WHATSAPP ===== */}
      <section style={{ ...SECTION_MAX, padding: '0 clamp(20px,5vw,64px) 48px' }}>
        <div data-r="hWhatsappBanner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, padding: 'clamp(20px,3vw,28px)', borderRadius: 22, background: k.cardBg, border: `1px solid ${k.cardBorder}`, boxShadow: '0 20px 50px rgba(0,0,0,.3)' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: k.text }}>¿Tienes alguna otra pregunta antes de pedir?</div>
            <p style={{ fontSize: 12, color: k.muted, margin: '3px 0 0' }}>Nuestro equipo de soporte en Colombia responde por WhatsApp en menos de 2 minutos.</p>
          </div>
          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Hola, tengo una pregunta sobre el llavero CarLink NFC')}`}
            target="_blank" rel="noopener noreferrer"
            style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 24px', borderRadius: 999, background: '#25D366', color: '#062b12', fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: '.04em', textDecoration: 'none', boxShadow: '0 10px 26px rgba(37,211,102,0.25)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" /></svg>
            Hablar por WhatsApp
          </a>
        </div>
      </section>

      {/* ===== LEAD CAPTURE — Guía de Mantenimiento gratis ===== */}
      <section style={{ ...SECTION_MAX, padding: '0 clamp(20px,5vw,64px) 48px' }}>
        <div data-r="hLeadGuia" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 28, alignItems: 'center', padding: 'clamp(24px,4vw,36px)', borderRadius: 24, background: goldCardGradient, border: '1px solid rgba(245,197,24,0.3)', boxShadow: '0 24px 60px rgba(0,0,0,.3)' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: softTint(0.05), border: `1px solid ${k.cardBorder}`, fontSize: 10, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: GOLD, marginBottom: 10 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.5-6.5l-2 2M8.5 8.5l-2-2m11 11l-2-2M8.5 15.5l-2 2" /><circle cx="12" cy="12" r="3.5" /></svg>
              Regalo gratis en PDF
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,3vw,30px)', textTransform: 'uppercase' as const, margin: '0 0 8px', lineHeight: 1.08 }}>
              ¿Aún lo estás pensando? Recibe gratis la Guía de Mantenimiento
            </h3>
            <p style={{ fontSize: 14.5, color: k.muted, lineHeight: 1.55, margin: 0 }}>
              Descarga sin costo el PDF "Lista de Chequeo para Vender tu Carro al Mayor Precio en Colombia" y recibe un bono de <strong style={{ color: GOLD }}>$5.000 COP de descuento adicional</strong> para tu primer llavero.
            </p>
          </div>

          <div>
            {leadStatus === 'done' ? (
              <div style={{ padding: '18px 20px', borderRadius: 16, background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.35)', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>{CHECK('#5be89a', 24)}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>¡Guía enviada con éxito!</div>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: k.muted }}>
                  Revisa tu WhatsApp o correo. Tu cupón de descuento es: <strong style={{ color: GOLD, fontFamily: "'JetBrains Mono',monospace" }}>CARLINK5K</strong>
                </p>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  type="text" required value={leadContact} onChange={e => setLeadContact(e.target.value)}
                  placeholder="Tu correo o celular con WhatsApp"
                  style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: `1px solid ${k.cardBorder}`, background: k.cardBg, color: k.text, fontSize: 13.5, outline: 'none' }}
                  onFocus={e => { e.currentTarget.style.borderColor = GOLD }}
                  onBlur={e => { e.currentTarget.style.borderColor = k.cardBorder }}
                />
                <button type="submit" disabled={leadStatus === 'loading'} data-r="hLeadBtn" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '13px 22px', borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 13, textTransform: 'uppercase' as const, letterSpacing: '.04em', cursor: leadStatus === 'loading' ? 'default' : 'pointer', opacity: leadStatus === 'loading' ? 0.7 : 1 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
                  {leadStatus === 'loading' ? 'Enviando…' : 'Descargar Guía + Bono $5.000'}
                </button>
                {leadStatus === 'error' && <p style={{ margin: 0, fontSize: 12, color: '#ff8a8a' }}>No se pudo guardar tu contacto. Intenta de nuevo.</p>}
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section style={{ background: goldCtaGradient, borderTop: '1px solid rgba(245,197,24,0.16)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(56px,7vw,96px) clamp(20px,5vw,64px)', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(28px,3.6vw,42px)', fontWeight: 400, letterSpacing: '-0.01em', margin: '0 auto' }}>Empieza gratis. <span style={{ color: GOLD }}>Escala con tu llavero.</span></h2>
          <p style={{ fontSize: 18, color: k.muted, lineHeight: 1.55, margin: '22px auto 0', maxWidth: '52ch' }}>Crea el perfil de tu vehículo sin costo. Cuando quieras compartir tu historial con un toque, pide tu CarLink NFC.</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 38 }}>
            <Link href="/#h-buyfob" data-r="hCtaBtn" style={CTA_BTN}>Quiero mi CarLink — $29.900{ARROW}</Link>
            <Link href="/register" data-r="hCtaSecondary" style={{ padding: '17px 30px', borderRadius: 14, border: '1px solid rgba(245,197,24,0.42)', background: 'rgba(245,197,24,0.06)', color: GOLD, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>Registrarme gratis</Link>
          </div>
        </div>
      </section>

      {/* ===== WAITLIST — Captura de leads ===== */}
      <section style={{ background: isDark ? '#0c0c10' : '#f7f6f2', borderTop: `1px solid ${k.cardBorder}` }}>
        <div data-r="hCaptureLeads" style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(44px,5.4vw,72px) clamp(20px,5vw,64px)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
          <div>
            <div style={EYEBROW}>¿Aún lo estás pensando?</div>
            <h2 style={{ ...H2, margin: '12px 0 12px' }}>Te avisamos cuando salga el próximo lote</h2>
            <p style={{ fontSize: 15.5, color: k.muted, lineHeight: 1.6, margin: 0 }}>Déjanos tu correo y te escribimos con el descuento de lanzamiento. Sin spam, solo cuando haya novedades.</p>
          </div>
          <div>
            <div data-r="hCaptureInput" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input placeholder="tu@correo.com" style={{ flex: 1, minWidth: 200, padding: '15px 18px', borderRadius: 12, border: `1px solid ${softTint(0.14)}`, background: softTint(0.04), color: k.text, fontSize: 15, outline: 'none' }} />
              <button data-r="hCaptureBtn" style={{ padding: '15px 26px', borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 15, cursor: 'pointer', whiteSpace: 'nowrap' }}>Avísame</button>
            </div>
            <div style={{ fontSize: 12.5, color: isDark ? '#6f6a5f' : '#8f8a7a', marginTop: 12, lineHeight: 1.5 }}>Al enviar aceptas nuestra política de tratamiento de datos. Puedes darte de baja cuando quieras.</div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{ borderTop: `1px solid ${k.thinBorder}`, padding: '52px clamp(20px,5vw,64px) 28px' }}>
        <div data-r="footergrid" className="footergrid" style={{ maxWidth: 1160, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1fr 1fr 1.1fr', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12 }}>
              <CarLinkLogo size={33} />
              <span>Car<span style={{ color: GOLD }}>Link</span></span>
            </div>
            <p style={{ ...lead, fontSize: 13.5, maxWidth: '32ch' }}>La ficha técnica digital de tu vehículo, viva y verificada por talleres reales.</p>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 14 }}>Producto</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13.5, fontWeight: 300 }}>
              <a href="#h-como" style={{ color: k.muted, textDecoration: 'none' }}>Cómo funciona</a>
              <Link href="/shop" style={{ color: k.muted, textDecoration: 'none' }}>Planes</Link>
              <Link href="/shop" style={{ color: k.muted, textDecoration: 'none' }}>Para talleres</Link>
              <Link href="/shop" style={{ color: k.muted, textDecoration: 'none' }}>Tienda NFC</Link>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 14 }}>Tienda</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13.5, fontWeight: 300 }}>
              <Link href="/shop" style={{ color: k.muted, textDecoration: 'none' }}>Llavero NFC CarLink</Link>
              <Link href="#h-precio" style={{ color: k.muted, textDecoration: 'none' }}>Precios</Link>
              <Link href="/shop#como" style={{ color: k.muted, textDecoration: 'none' }}>Cómo funciona</Link>
              <Link href="/shop#faq" style={{ color: k.muted, textDecoration: 'none' }}>Preguntas frecuentes</Link>
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
