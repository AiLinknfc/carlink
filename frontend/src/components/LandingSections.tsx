'use client'

import React, { useState, useEffect, type FormEvent } from 'react'
import CarLinkLogo from '@/components/CarLinkLogo'
import Link from 'next/link'
import { reviewsApi, waitlistApi } from '@/lib/api'
import type { Review } from '@/lib/types'
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
// Mismo regex que el backend (waitlist.py: _EMAIL_RE) — el backend solo manda
// el correo con el PDF si "contact" matchea esto; si no, no envía nada (no
// hay integración de WhatsApp automático). Se usa acá para decidir qué le
// mostramos/hacemos al usuario después de guardar el lead.
const isEmailContact = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)

type PolicyTab = 'warranty' | 'privacy' | 'support'

export default function LandingSections({ theme, onStart, onOpenEmpresa, onOpenPolicy, onOpenPqrs, onOpenCart }: { theme: Theme; onStart: () => void; onOpenEmpresa: (accountType?: 'user' | 'business') => void; onOpenPolicy: (tab: PolicyTab) => void; onOpenPqrs: () => void; onOpenCart: () => void }) {
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
    const contact = leadContact.trim()
    if (!contact || leadStatus === 'loading') return
    setLeadStatus('loading')
    const res = await waitlistApi.create(contact, 'landing_guia_mantenimiento')
    if (!res) { setLeadStatus('error'); return }
    // El backend solo envía el PDF por correo (ver isEmailContact) — no hay
    // envío automático de WhatsApp. Para que dejar el celular "funcione" de
    // verdad (no solo se guarde), abrimos WhatsApp con el pedido precargado
    // en vez de mostrar un "enviado" falso.
    if (!isEmailContact(contact)) {
      window.open(`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Hola, quiero recibir la Guía de Mantenimiento gratis')}`, '_blank', 'noopener,noreferrer')
    }
    setLeadStatus('done')
  }

  const card = (border = k.glassBorder): React.CSSProperties => ({ background: k.glassBg, border: `1px solid ${border}` })
  const lead: React.CSSProperties = { fontWeight: 300, fontSize: 15, lineHeight: 1.6, color: k.muted, margin: 0 }
  const isDark = theme !== 'light'
  const softTint = (alpha: number) => isDark ? `rgba(255,255,255,${alpha})` : `rgba(17,17,17,${alpha})`

  return (
    <div style={{ position: 'relative', zIndex: 10, color: k.text }}>
      <style>{`
        @keyframes comunidad-marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes waFabPulse { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.55);opacity:0} }
        @media(prefers-reduced-motion:reduce){ [style*="waFabPulse"]{animation:none !important} }
        [data-r="comunidadTrack"]:hover [data-r="comunidadInner"]{ animation-play-state: paused }
        @media(max-width:860px){ [data-r="mapFrame"]{min-height:280px !important} [data-r="footergrid"]{grid-template-columns:1fr !important} .buyfob-grid{grid-template-columns:1fr !important} .buyfob-grid>div:last-child{position:static !important} .grid2{grid-template-columns:1fr !important} [data-r="hProductos"]{grid-template-columns:1fr !important} [data-r="hCaptureLeads"]{grid-template-columns:1fr !important} }
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

      {/* ===== PRODUCTOS — qué vas a recibir ===== */}
      <section id="h-productos" style={{ ...SECTION_MAX, padding: '56px clamp(20px,5vw,64px)', borderTop: `1px solid ${k.thinBorder}` }}>
        <div style={{ textAlign: 'center', maxWidth: 660, margin: '0 auto 46px' }}>
          <div style={EYEBROW}>Qué vas a recibir</div>
          <h2 style={H2}>Elige tu llavero CarLink</h2>
          <p style={{ fontSize: 15, color: k.muted, lineHeight: 1.6, margin: '14px auto 0', maxWidth: '52ch' }}>Esto es exactamente lo que llega a tu puerta — sin sorpresas.</p>
        </div>
        <div data-r="hProductos" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, maxWidth: 1000, margin: '0 auto' }}>

          {/* Llavero individual — el producto real, ya se puede comprar */}
          <div data-r="hProductCard" style={{ padding: 'clamp(22px,3vw,30px)', borderRadius: 24, background: k.cardBg, border: `1px solid ${k.cardBorder}`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 22, background: isDark ? '#0c0c10' : '#f0efe8' }}>
              <img src="/empaque-final.png" alt="Llavero NFC CarLink en su empaque" style={{ width: '100%', display: 'block' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: GOLD }}>
              <CarLinkLogo size={15} />Llavero NFC CarLink
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, margin: '14px 0 4px' }}>$29.900</div>
            <div style={{ fontSize: 13.5, color: k.muted, marginBottom: 20 }}>pago único · envío incluido</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, flex: 1 }}>
              {['1 llavero NFC de alta resistencia', 'QR de respaldo', 'Acceso vitalicio a la plataforma'].map(f => (
                <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: k.muted, lineHeight: 1.4 }}>{CHECK(GOLD, 15)}{f}</div>
              ))}
            </div>
            <button onClick={onOpenCart} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 15, borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 0 24px rgba(245,197,24,0.3)' }}>
              Comprar mi llavero{ARROW}
            </button>
          </div>

          {/* Kit — personalizado y hecho bajo pedido (3 chips NFC: llavero,
              tarjeta y sticker; foto en public/kit-final.png, renderizada abajo). Sin SKU propio en el backend
              todavía, así que el "comprar" es coordinar por WhatsApp en vez
              de abrir el carrito de la placa individual — no simula un pago
              que el sistema no sabe procesar. */}
          <div data-r="hProductCard" style={{ position: 'relative', padding: 'clamp(22px,3vw,30px)', borderRadius: 24, background: k.cardBg, border: `1px solid ${GOLD}`, display: 'flex', flexDirection: 'column' }}>
            <span style={{ position: 'absolute', top: -13, left: 30, display: 'inline-flex', alignItems: 'center', gap: 6, background: GOLD, color: '#111', fontSize: 11.5, fontWeight: 800, padding: '6px 16px', borderRadius: 999, letterSpacing: '.08em' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z" /></svg>
              BAJO PEDIDO
            </span>
            <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 22, background: isDark ? '#0c0c10' : '#f0efe8' }}>
              <img src="/kit-final.png" alt="Kit CarLink: llavero personalizado, tarjeta y sticker NFC" style={{ width: '100%', display: 'block' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: GOLD }}>
              <CarLinkLogo size={15} />Kit CarLink
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, margin: '14px 0 4px' }}>$49.900</div>
            <div style={{ fontSize: 13.5, color: k.muted, marginBottom: 20 }}>accesorios para todo el carro, con 3 chips NFC</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, flex: 1 }}>
              {['2 chips NFC — llavero y botón adhesivo', 'Tarjeta QR con grabado laser', 'Llavero personalizado con tu placa', 'Acabado en resina + aro de lujo', 'Acceso vitalicio a la plataforma'].map(f => (
                <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: k.muted, lineHeight: 1.4 }}>{CHECK(GOLD, 15)}{f}</div>
              ))}
            </div>
            <a
              href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Hola, quiero pedir el Kit CarLink ($49.900)')}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 15, borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 15, textDecoration: 'none', boxShadow: '0 0 24px rgba(245,197,24,0.3)' }}
            >
              Pedir mi kit{ARROW}
            </a>
          </div>

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

      {/* ===== WHATSAPP FLOTANTE ===== */}
      <a
        href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Hola, tengo una pregunta sobre el llavero CarLink NFC')}`}
        target="_blank" rel="noopener noreferrer"
        aria-label="Hablar por WhatsApp" title="Hablar por WhatsApp"
        style={{
          position: 'fixed', right: 'clamp(16px,4vw,28px)', bottom: 'clamp(16px,4vw,28px)', zIndex: 45,
          width: 58, height: 58, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#25D366', color: '#062b12', textDecoration: 'none',
          boxShadow: '0 10px 30px rgba(37,211,102,0.45)',
        }}
      >
        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(37,211,102,0.55)', animation: 'waFabPulse 2.4s ease-out infinite' }} />
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" /></svg>
      </a>

      {/* ===== WAITLIST — Captura de leads ===== */}
      <section style={{ borderTop: `1px solid ${k.cardBorder}` }}>
        <div data-r="hCaptureLeads" style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(44px,5.4vw,72px) clamp(20px,5vw,64px)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
          <div>
            <div style={EYEBROW}>¿Aún lo estás pensando?.</div>
            <h2 style={{ ...H2, margin: '12px 0 12px' }}>Recibe gratis la Guía de Mantenimiento</h2>
            <p style={{ fontSize: 15.5, color: k.muted, lineHeight: 1.6, margin: 0 }}>Descarga sin costo el PDF "Lista de Chequeo para Vender tu Carro al Mayor Precio en Colombia"</p>
          </div>
          <div>
            {leadStatus === 'done' ? (
              <div style={{ padding: '18px 20px', borderRadius: 16, background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.35)', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>{CHECK('#5be89a', 24)}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{isEmailContact(leadContact) ? '¡Guía enviada con éxito!' : '¡Ya casi! Envía el mensaje de WhatsApp'}</div>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: k.muted }}>
                  {isEmailContact(leadContact) ? 'Revisa tu correo.' : 'Te abrimos WhatsApp en otra pestaña — envía el mensaje y te mandamos la guía.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} data-r="hCaptureInput" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  type="text" required value={leadContact} onChange={e => setLeadContact(e.target.value)}
                  placeholder="Tu correo o celular con WhatsApp"
                  style={{ flex: 1, minWidth: 200, padding: '15px 18px', borderRadius: 12, border: `1px solid ${softTint(0.14)}`, background: softTint(0.04), color: k.text, fontSize: 15, outline: 'none' }}
                  onFocus={e => { e.currentTarget.style.borderColor = GOLD }}
                  onBlur={e => { e.currentTarget.style.borderColor = softTint(0.14) }}
                />
                <button type="submit" disabled={leadStatus === 'loading'} data-r="hCaptureBtn" style={{ padding: '15px 26px', borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 15, cursor: leadStatus === 'loading' ? 'default' : 'pointer', opacity: leadStatus === 'loading' ? 0.7 : 1, whiteSpace: 'nowrap' }}>
                  {leadStatus === 'loading' ? 'Enviando…' : 'Descargar Guía'}
                </button>
                {leadStatus === 'error' && <p style={{ width: '100%', margin: 0, fontSize: 12, color: '#ff8a8a' }}>No se pudo guardar tu contacto. Intenta de nuevo.</p>}
              </form>
            )}
            <div style={{ fontSize: 12.5, color: isDark ? '#6f6a5f' : '#8f8a7a', marginTop: 12, lineHeight: 1.5 }}>Al enviar aceptas nuestra política de tratamiento de datos. Puedes darte de baja cuando quieras.</div>
          </div>
        </div>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 clamp(20px,5vw,64px)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '15px 30px', borderRadius: 13, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 16, textDecoration: 'none' }}>Registrarme gratis</Link>
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
              <Link href="#h-productos" style={{ color: k.muted, textDecoration: 'none' }}>Precios</Link>
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
