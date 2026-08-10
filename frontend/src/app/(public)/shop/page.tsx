'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CarLinkMark, NfcKeyIcon } from '@/lib/icons_new'

// Landing de venta del llavero NFC CarLink — adaptada de Plataforma/CarLink Landing.html.
// Siempre oscura (no sigue el toggle claro/oscuro del resto del sitio): es una página de
// venta autocontenida, igual que la sección "Cómo funciona" del home. Los CTA de compra y
// registro de taller no tienen checkout propio todavía — apuntan a los flujos reales que ya
// existen (/#h-buyfob en el home, /register) hasta que se conecte el endpoint de producto.

const GOLD = '#F5C518'
const MUTED = '#a8a496'
const BORDER = 'rgba(255,255,255,0.08)'
const CARD = '#121216'

const CHECK = (color = GOLD, size = 15) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto', marginTop: 2 }}><path d="M20 6L9 17l-5-5" /></svg>
)
const ARROW = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)

// Wordmark idéntico al de la nav (page.tsx) y el footer (LandingSections.tsx) —
// mismo markup, sin mayúsculas forzadas, para que el logo se vea igual en
// cualquier parte del sitio.
function CarLinkWordmark({ fontSize, iconSize, badgeSize, badgeRadius }: { fontSize: number; iconSize: number; badgeSize: number; badgeRadius: number }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: badgeSize > 22 ? 10 : 8, fontFamily: 'var(--font-display)', fontSize, letterSpacing: '.01em', color: '#f5f3ec' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: badgeSize, height: badgeSize, borderRadius: badgeRadius, background: GOLD, color: '#111' }}>
        <CarLinkMark size={iconSize} />
      </span>
      <span>Car<span style={{ color: GOLD }}>Link</span></span>
    </span>
  )
}

// Mismo EYEBROW/H2 que LandingSections.tsx — en TODO el sitio real, Anton en
// mayúsculas se usa solo para el H1 del hero (uno por página); cada <h2> de
// sección usa la tipografía de cuerpo (Inter), peso 400, sin mayúsculas.
const EYEBROW: React.CSSProperties = { fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', fontWeight: 600, color: GOLD }
const H2: React.CSSProperties = { fontSize: 'clamp(24px,3vw,34px)', fontWeight: 400, letterSpacing: '-0.01em', margin: '10px 0 0', color: '#f5f3ec' }
const SECTION: React.CSSProperties = { maxWidth: 1280, margin: '0 auto', padding: 'clamp(48px,6vw,84px) clamp(20px,5vw,64px)' }
const CARD_STYLE: React.CSSProperties = { padding: 28, borderRadius: 18, background: CARD, border: `1px solid ${BORDER}` }
const CTA_BTN: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 10, padding: '15px 30px', borderRadius: 13, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: '0 0 28px rgba(245,197,24,.38)', textDecoration: 'none' }

const PROBLEMS = [
  '¿No recuerdas cuándo cambiaste el aceite?',
  '¿Perdiste la factura del taller?',
  '¿Compraste un carro usado y no sabes si le hicieron mantenimiento?',
  '¿Olvidaste cuándo vence el SOAT?',
]
const SOLUTION_TAGS = ['Historial', 'Fotos', 'Facturas', 'Garantías', 'Recordatorios', 'Documentos', 'Kilometraje']
const BENEFITS = [
  { title: 'Nunca pierdes la información', desc: 'Todo queda guardado en la nube, asociado a tu placa — no a un papel que se moja o se pierde.' },
  { title: 'Aumenta el valor de reventa', desc: 'Un historial verificable le da confianza inmediata al comprador y respalda tu precio.' },
  { title: 'Demuestras el mantenimiento', desc: 'Cada servicio queda firmado por el taller que lo hizo. No es tu palabra: es un registro.' },
  { title: 'Compartes en un segundo', desc: 'Un enlace o un toque del llavero y la otra persona ve toda la ficha.' },
  { title: 'Conservas todas las facturas', desc: 'Escaneas el recibo con la cámara y queda archivado junto al servicio correspondiente.' },
  { title: 'Recibes recordatorios', desc: 'Aceite, SOAT, tecnomecánica, llantas, frenos y batería — te avisamos antes de que se venza.' },
]
const STEPS = [
  { n: '1', title: 'Compra el llavero', desc: 'Pídelo con tu placa o el texto que quieras. Llega personalizado a tu casa.' },
  { n: '2', title: 'Descarga la app', desc: 'Disponible para Android e iPhone. Entras con tu cuenta de Google.' },
  { n: '3', title: 'Registra tu vehículo', desc: 'Placa, marca, modelo y año. Toma menos de un minuto.' },
  { n: '4', title: 'Escanea', desc: 'Acerca el llavero al teléfono y ya tienes tu historial vivo.' },
]
const INCLUDES = ['Llavero personalizado', 'Perfil del vehículo', 'Historial de mantenimiento', 'Recordatorios', 'Fotos', 'Facturas', 'Kilometraje', 'Cambios de aceite', 'Llantas', 'Frenos', 'Documentación']
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
const COMPARISON = [
  { feature: 'Organización del historial', without: 'Papeles arrugados, térmicos borrados en la guantera', withCl: 'Bitácora digital en la nube accesible en 1 segundo' },
  { feature: 'Proceso para ver información', without: 'Revolver facturas y adivinar kilometrajes antiguos', withCl: 'Acercar tu celular al llavero NFC sin abrir aplicaciones' },
  { feature: 'Confianza del comprador', without: 'Sospechas de kilometraje y pedido de rebajas del 15%', withCl: 'Transparencia verificada que defiende el precio de venta' },
  { feature: 'Aviso de mantenimiento', without: 'Depender de stickers borrosos en el panorámico', withCl: 'Alertas digitales inteligentes de aceite, frenos y SOAT' },
  { feature: 'Resistencia del formato', without: 'Se rompe, se moja, se extravía en lavaderos', withCl: 'Resina IP68 impermeable e indestructible en tu llavero' },
  { feature: 'Costo mensual de almacenamiento', without: 'N/A', withCl: '$0 COP — pago único de por vida' },
]

// Precios y features iguales a los de la sección "Planes" (h-planes) y "Compra tu llavero"
// (h-buyfob) del home — no inventar números nuevos aquí.
const PLANS = [
  {
    name: 'Conductor', price: 'Gratis', period: 'para siempre', tag: '',
    border: BORDER, priceColor: '#f5f3ec',
    features: ['Ficha técnica ilimitada', 'Historial y recordatorios', 'Descarga y Wallet', 'Galería y documentos'],
    cta: 'Crear mi ficha', href: '/register', btnBg: 'rgba(245,197,24,0.12)', btnColor: GOLD,
  },
  {
    name: 'Llavero NFC CarLink', price: '$49.900', period: 'pago único · envío incluido', tag: 'MÁS POPULAR',
    border: `2px solid ${GOLD}`, priceColor: GOLD, bg: `linear-gradient(165deg,#241f0c,#141418)`,
    features: ['Todo lo del plan Conductor', 'Llavero personalizado', 'Modo público', 'Perfil verificable', 'Compartir historial con un toque'],
    cta: 'Quiero mi CarLink', href: '/#h-buyfob', btnBg: GOLD, btnColor: '#111',
  },
  {
    name: 'Taller aliado', price: '$79.900', period: '/mes · incluye 1 llavero gratis', tag: '',
    border: `1px solid rgba(245,197,24,0.28)`, priceColor: '#f5f3ec',
    features: ['Clientes y fichas ilimitadas', 'Perfil público con reseñas', 'Certificados y facturación', 'Soporte prioritario'],
    cta: 'Registrar mi taller', href: '/register?mode=empresa', btnBg: 'rgba(245,197,24,0.12)', btnColor: GOLD,
  },
]

const FAQS = [
  { q: '¿Necesita batería?', a: 'No. El llavero NFC funciona sin batería y sin mantenimiento — dura toda la vida del vehículo.' },
  { q: '¿Necesita Internet?', a: 'Solo para consultar la información. El escaneo del llavero es instantáneo; la ficha se carga desde la nube.' },
  { q: '¿Qué pasa si pierdo el llavero?', a: 'Puedes desactivarlo desde la app en segundos y asociar uno nuevo. Tu historial nunca se pierde: vive en tu cuenta, no en el llavero.' },
  { q: '¿Funciona en Android?', a: 'Sí. Todos los Android con NFC (la gran mayoría desde 2015) lo leen sin instalar nada.' },
  { q: '¿Funciona en iPhone?', a: 'Sí. Desde el iPhone 7 en adelante, con solo acercar el teléfono al llavero.' },
]

export default function ShopPage() {
  const [faqOpen, setFaqOpen] = useState(-1)

  return (
    <div style={{ background: '#08080a', color: '#f5f3ec', fontFamily: 'var(--font-ui)', minHeight: '100vh' }}>
      <style>{`
        @keyframes shopFadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        @keyframes shopFloatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes shopPulseRing { 0%{transform:scale(.7);opacity:.8} 100%{transform:scale(1.7);opacity:0} }
        @media(max-width:860px){
          [data-r="shopHero"]{grid-template-columns:1fr !important}
          [data-r="shopPrecio"]{grid-template-columns:1fr !important}
          [data-r="shopComo"]{grid-template-columns:1fr 1fr !important}
          [data-r="shopBox"]{grid-template-columns:1fr !important}
        }
        @media(max-width:720px){
          [data-r="shopNavLinks"]{display:none !important}
          [data-r="shopBackLabel"]{display:none !important}
          [data-r="shopScrollHint"]{display:flex !important}
        }
      `}</style>

      {/* NAV — el logo ya vuelve al inicio, pero se agrega un link explícito
          porque en una landing de campaña no todos lo dan por hecho. */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px clamp(20px,5vw,64px)', background: 'rgba(8,8,10,0.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(245,197,24,0.14)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: MUTED, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.color = GOLD }}
            onMouseLeave={e => { e.currentTarget.style.color = MUTED }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            <span data-r="shopBackLabel">Volver a la app</span>
          </Link>
          <span style={{ width: 1, height: 22, background: BORDER }} />
          <Link href="/" style={{ textDecoration: 'none' }}>
            <CarLinkWordmark fontSize={18} iconSize={14} badgeSize={26} badgeRadius={7} />
          </Link>
        </div>
        <nav data-r="shopNavLinks" style={{ display: 'flex', alignItems: 'center', gap: 28, fontSize: 14.5, fontWeight: 500, color: MUTED }}>
          <a href="#problema" style={{ color: 'inherit', textDecoration: 'none' }}>El problema</a>
          <a href="#como" style={{ color: 'inherit', textDecoration: 'none' }}>Cómo funciona</a>
          <a href="#precio" style={{ color: 'inherit', textDecoration: 'none' }}>Precio</a>
          <a href="#faq" style={{ color: 'inherit', textDecoration: 'none' }}>FAQ</a>
        </nav>
        <Link href="/#h-buyfob" style={{ padding: '11px 22px', borderRadius: 999, background: GOLD, color: '#111', fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', textDecoration: 'none' }}>Quiero mi CarLink</Link>
      </header>

      {/* HERO */}
      <section data-r="shopHero" style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 56, alignItems: 'center', maxWidth: 1280, margin: '0 auto', padding: 'clamp(52px,7vw,96px) clamp(20px,5vw,64px)', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 62% 44%,rgba(245,197,24,0.14),transparent 58%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, animation: 'shopFadeUp .7s both' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '7px 15px', borderRadius: 999, background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.3)', fontSize: 12.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: GOLD, marginBottom: 26 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: GOLD }} />El pasaporte digital de tu vehículo
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(38px,5.4vw,72px)', lineHeight: 1.02, margin: 0, textTransform: 'uppercase' as const }}>Toda la historia de tu vehículo en <span style={{ color: GOLD }}>un solo toque</span>.</h1>
          <p style={{ fontSize: 'clamp(17px,1.7vw,21px)', lineHeight: 1.55, color: MUTED, margin: '26px 0 0', maxWidth: '52ch' }}>CarLink convierte tu vehículo en un vehículo inteligente. Escanea tu llavero NFC y consulta mantenimiento, documentos, kilometraje, reparaciones y mucho más.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginTop: 38 }}>
            <Link href="/#h-buyfob" style={CTA_BTN}>Obtén tu CarLink{ARROW}</Link>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, color: GOLD, lineHeight: 1 }}>$49.900</div>
              <div style={{ fontSize: 13, color: MUTED, marginTop: 3 }}>pago único · envío incluido</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 32, fontSize: 13.5, color: MUTED, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>{CHECK()}App gratis para siempre</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>{CHECK()}Android e iPhone</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>{CHECK()}Sin batería</span>
          </div>
        </div>

        {/* Escena: teléfono + llavero acercándose */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 440, animation: 'shopFadeUp .7s .14s both' }}>
          <div style={{ position: 'relative', width: 250, height: 430, borderRadius: 34, background: 'linear-gradient(165deg,#1a1a1f,#0e0e12)', border: '8px solid #17171c', boxShadow: '0 40px 90px rgba(0,0,0,.7),0 0 60px rgba(245,197,24,.12)', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 88, height: 20, background: '#17171c', borderRadius: '0 0 12px 12px', zIndex: 3 }} />
            <div style={{ padding: '36px 18px 18px', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CarLinkWordmark fontSize={13} iconSize={11} badgeSize={20} badgeRadius={6} />
              <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: 'linear-gradient(158deg,#1c1a12,#141418)', border: '1px solid rgba(245,197,24,0.3)' }}>
                <div style={{ fontSize: 8.5, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: MUTED, fontWeight: 700 }}>Kilometraje</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: GOLD, lineHeight: 1, marginTop: 3 }}>48.250<span style={{ fontSize: 12, color: MUTED, fontFamily: 'var(--font-ui)', fontWeight: 600 }}> km</span></div>
                <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginTop: 12 }}><div style={{ height: '100%', width: '59%', background: 'linear-gradient(90deg,#8a6a00,#F5C518,#FFD84D)', borderRadius: 4 }} /></div>
                <div style={{ fontSize: 9, color: '#6f6a5f', marginTop: 7 }}>Próximo servicio · 51.200 km</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}><svg width="13" height="13" viewBox="0 0 24 24" fill={GOLD} style={{ flex: '0 0 auto' }}><path d="M12 2c-3 4-6 7-6 11a6 6 0 0 0 12 0c0-4-3-7-6-11z" /></svg><span style={{ fontSize: 10.5, color: '#d8d4c8' }}>Aceite · Mobil 1 5W-30</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" style={{ flex: '0 0 auto' }}><path d="M5 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1z" /></svg><span style={{ fontSize: 10.5, color: '#d8d4c8' }}>SOAT vigente · 14 Nov</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" style={{ flex: '0 0 auto' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg><span style={{ fontSize: 10.5, color: '#d8d4c8' }}>Tecnicentro La 80 · 4.8★</span></div>
              </div>
            </div>
          </div>
          {/* llavero */}
          <div style={{ position: 'absolute', right: 2, bottom: 52, width: 150, height: 96, borderRadius: 16, background: 'linear-gradient(168deg,#F8D64B,#F2C21A 60%,#E7B412)', border: '5px solid #0c0c0e', boxShadow: '0 24px 50px rgba(0,0,0,.65),inset 0 3px 0 rgba(255,255,255,.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'shopFloatY 3.4s ease-in-out infinite' }}>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '.28em', color: '#141414' }}>COLOMBIA</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: '#111116', lineHeight: 1, marginTop: 2 }}>GHK 472</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#3a3a1e' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 8.5a6 6 0 0 1 12 0" /><path d="M3.5 11a9 9 0 0 1 17 0" /><circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none" /></svg><span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '.14em' }}>NFC</span></div>
          </div>
          {/* ondas NFC */}
          {[0, 0.66, 1.32].map(delay => (
            <div key={delay} style={{ position: 'absolute', right: 104, bottom: 96, width: 46, height: 46, borderRadius: '50%', border: '2px solid rgba(245,197,24,.7)', animation: `shopPulseRing 2s ease-out ${delay}s infinite`, pointerEvents: 'none' }} />
          ))}
        </div>
      </section>

      {/* EL PROBLEMA */}
      <section id="problema" style={{ ...SECTION, borderTop: `1px solid ${BORDER}` }}>
        <div style={{ textAlign: 'center', maxWidth: 660, margin: '0 auto 46px' }}>
          <div style={EYEBROW}>El problema</div>
          <h2 style={H2}>¿Te suena familiar?</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
          {PROBLEMS.map(p => (
            <div key={p} style={CARD_STYLE}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,77,106,0.12)', color: '#ff4d6a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, fontSize: 22, fontWeight: 800 }}>?</div>
              <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.4, color: '#f5f3ec' }}>{p}</div>
            </div>
          ))}
        </div>
      </section>

      {/* LA SOLUCIÓN */}
      <section style={{ background: 'radial-gradient(110% 100% at 50% 0%,#1c1a12 0%,#08080a 62%)', borderTop: '1px solid rgba(245,197,24,0.12)', borderBottom: '1px solid rgba(245,197,24,0.12)' }}>
        <div style={{ ...SECTION, textAlign: 'center' }}>
          <div style={EYEBROW}>Nuestra solución</div>
          <h2 style={{ ...H2, margin: '14px auto 0', maxWidth: '20ch' }}>Escaneas. Y ves <span style={{ color: GOLD }}>absolutamente todo</span>.</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 11, marginTop: 38 }}>
            {SOLUTION_TAGS.map(t => (
              <span key={t} style={{ padding: '12px 24px', borderRadius: 999, background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.32)', color: GOLD, fontSize: 16, fontWeight: 600 }}>{t}</span>
            ))}
          </div>
          <Link href="/#h-buyfob" style={{ ...CTA_BTN, marginTop: 42 }}>Quiero mi CarLink{ARROW}</Link>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section style={SECTION}>
        <div style={{ textAlign: 'center', maxWidth: 660, margin: '0 auto 46px' }}>
          <div style={EYEBROW}>Beneficios</div>
          <h2 style={H2}>Lo que ganas de verdad</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
          {BENEFITS.map(b => (
            <div key={b.title} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', ...CARD_STYLE, padding: 26 }}>
              <span style={{ width: 34, height: 34, flex: '0 0 auto', borderRadius: 10, background: 'rgba(245,197,24,0.14)', color: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{CHECK(GOLD, 18)}</span>
              <div><div style={{ fontSize: 17.5, fontWeight: 700, marginBottom: 7 }}>{b.title}</div><div style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.5 }}>{b.desc}</div></div>
            </div>
          ))}
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como" style={{ ...SECTION, borderTop: `1px solid ${BORDER}` }}>
        <div style={{ textAlign: 'center', maxWidth: 660, margin: '0 auto 50px' }}>
          <div style={EYEBROW}>Cómo funciona</div>
          <h2 style={H2}>Cuatro pasos y listo</h2>
        </div>
        <div data-r="shopComo" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          {STEPS.map(st => (
            <div key={st.n} style={{ position: 'relative', padding: '30px 26px', borderRadius: 20, background: 'linear-gradient(160deg,#17160f,#121216)', border: '1px solid rgba(245,197,24,0.2)' }}>
              <div style={{ width: 52, height: 52, borderRadius: 15, background: GOLD, color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 26 }}>{st.n}</div>
              <div style={{ fontSize: 19, fontWeight: 700, margin: '20px 0 9px' }}>{st.title}</div>
              <div style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.5 }}>{st.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 38 }}>
          <Link href="/#h-buyfob" style={CTA_BTN}>Quiero mi CarLink{ARROW}</Link>
        </div>
      </section>

      {/* QUÉ INCLUYE */}
      <section style={{ background: '#0c0c10', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={SECTION}>
          <div style={{ textAlign: 'center', maxWidth: 660, margin: '0 auto 44px' }}>
            <div style={EYEBROW}>Qué incluye</div>
            <h2 style={H2}>Todo esto viene contigo</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 11, maxWidth: 1040, margin: '0 auto' }}>
            {INCLUDES.map(inc => (
              <div key={inc} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '15px 18px', borderRadius: 13, background: CARD, border: `1px solid ${BORDER}` }}>
                {CHECK(GOLD, 16)}
                <span style={{ fontSize: 14.5, fontWeight: 500, color: '#d8d4c8' }}>{inc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRANSPARENCIA TOTAL */}
      <section style={SECTION}>
        <div style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 44px' }}>
          <div style={EYEBROW}>Transparencia total</div>
          <h2 style={H2}>¿Qué llega exactamente en tu caja?</h2>
          <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.55, margin: '14px auto 0', maxWidth: '52ch' }}>Sin sorpresas ni cobros ocultos. Por tu pago único de $49.900 COP recibes la experiencia completa lista para usar.</p>
        </div>

        <div data-r="shopBox" style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr', gap: 48, alignItems: 'center', maxWidth: 1080, margin: '0 auto' }}>
          {/* Ilustración — misma familia visual que la escena del hero (caja +
              llavero + sticker QR), sin foto real de producto. */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 380, margin: '0 auto' }}>
            <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: 280, height: 280, background: 'radial-gradient(circle,rgba(245,197,24,.16),transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', borderRadius: 28, padding: '52px 30px 34px', background: 'linear-gradient(160deg,#191710,#121216 62%)', border: '1px solid rgba(245,197,24,0.3)', boxShadow: '0 30px 70px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              {/* cinta de la caja */}
              <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 46, height: 96, background: 'linear-gradient(180deg,#FFD84D,#E7B412)', clipPath: 'polygon(0 0,100% 0,100% 78%,50% 100%,0 78%)' }} />

              {/* llavero NFC */}
              <div style={{ position: 'relative', width: 168, height: 108, margin: '0 auto', borderRadius: 18, background: 'linear-gradient(168deg,#F8D64B,#F2C21A 60%,#E7B412)', border: '5px solid #0c0c0e', boxShadow: '0 20px 40px rgba(0,0,0,.6),inset 0 3px 0 rgba(255,255,255,.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'shopFloatY 3.6s ease-in-out infinite' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#111116' }}><NfcKeyIcon size={22} strokeWidth={2} /></span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: '#111116', letterSpacing: '.01em', marginTop: 4 }}>CarLink</span>
              </div>

              {/* sticker QR, superpuesto */}
              <div style={{ position: 'absolute', right: 28, bottom: 66, width: 62, height: 62, borderRadius: 12, background: '#f5f3ec', border: '3px solid #0c0c0e', boxShadow: '0 14px 26px rgba(0,0,0,.5)', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(3,1fr)', gap: 3, padding: 8, transform: 'rotate(8deg)' }}>
                {[0, 1, 2, 4, 6, 8].map(i => <span key={i} style={{ background: '#0c0c0e', borderRadius: 1 }} />)}
              </div>

              {/* badges de servicio */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 26 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.3)', fontSize: 11, fontWeight: 700, color: GOLD }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></svg>Acceso vitalicio
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.3)', fontSize: 11, fontWeight: 700, color: GOLD }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>Soporte
                </span>
              </div>
            </div>
          </div>

          {/* Lista de lo que incluye */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {BOX_ITEMS.map(item => (
              <div key={item.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '18px 20px', borderRadius: 16, background: CARD, border: `1px solid ${BORDER}` }}>
                <span style={{ width: 36, height: 36, flex: '0 0 auto', borderRadius: 11, background: 'rgba(245,197,24,0.12)', color: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
                </span>
                <div>
                  <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 5, lineHeight: 1.35 }}>{item.title}</div>
                  <div style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 38 }}>
          <Link href="/#h-buyfob" style={CTA_BTN}>Recibir todo el kit por $49.900 COP{ARROW}</Link>
        </div>
      </section>

      {/* COMPARACIÓN */}
      <section style={SECTION}>
        <div style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 40px' }}>
          <div style={EYEBROW}>La diferencia</div>
          <h2 style={H2}>¿Realmente necesitas CarLink?</h2>
          <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.55, margin: '14px auto 0', maxWidth: '48ch' }}>Mira la diferencia entre seguir con el método antiguo de carpetas vs pasar al control digital inteligente en tu bolsillo.</p>
        </div>

        {/* La columna "Con CarLink" es lo importante — en mobile queda fuera de
            vista sin este aviso, ya que la tabla completa no cabe en pantalla. */}
        <div data-r="shopScrollHint" style={{ display: 'none', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10, fontSize: 12.5, fontWeight: 600, color: GOLD }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          Desliza para ver la comparación completa
        </div>
        <div style={{ overflowX: 'auto', borderRadius: 20, border: `1px solid ${BORDER}` }}>
          <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '16px 20px', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: MUTED, background: CARD, borderBottom: `1px solid ${BORDER}` }}>Característica</th>
                <th style={{ textAlign: 'left', padding: '16px 20px', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#ff4d6a', background: CARD, borderBottom: '1px solid rgba(255,77,106,0.24)' }}>Sin CarLink</th>
                <th style={{ textAlign: 'left', padding: '16px 20px', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: GOLD, background: 'linear-gradient(160deg,#1a180f,#141418)', borderBottom: '1px solid rgba(245,197,24,0.42)' }}>Con CarLink</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={row.feature} style={{ background: i % 2 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                  <td style={{ padding: '18px 20px', fontSize: 14.5, fontWeight: 700, color: '#f5f3ec', borderBottom: i < COMPARISON.length - 1 ? `1px solid ${BORDER}` : 'none', verticalAlign: 'top' }}>{row.feature}</td>
                  <td style={{ padding: '18px 20px', fontSize: 14, color: MUTED, lineHeight: 1.5, borderBottom: i < COMPARISON.length - 1 ? `1px solid ${BORDER}` : 'none', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff4d6a" strokeWidth="2.6" strokeLinecap="round" style={{ flex: '0 0 auto', marginTop: 3 }}><path d="M18 6L6 18M6 6l12 12" /></svg>
                      {row.without}
                    </div>
                  </td>
                  <td style={{ padding: '18px 20px', fontSize: 14, color: '#f5f3ec', fontWeight: 500, lineHeight: 1.5, background: 'rgba(245,197,24,0.05)', borderBottom: i < COMPARISON.length - 1 ? '1px solid rgba(245,197,24,0.16)' : 'none', verticalAlign: 'top' }}>
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

        <div style={{ textAlign: 'center', marginTop: 44 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f5f3ec' }}>Toma el control del historial de tu carro hoy</div>
          <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.55, margin: '10px auto 26px', maxWidth: '48ch' }}>Haz tu pedido ahora y recibe el kit completo por $49.900 COP con envío gratis.</p>
          <Link href="/#h-buyfob" style={CTA_BTN}>Comprar Llavero CarLink{ARROW}</Link>
        </div>
      </section>

      {/* PRECIO */}
      <section id="precio" style={{ background: '#0c0c10', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={SECTION}>
          <div style={{ textAlign: 'center', maxWidth: 660, margin: '0 auto 52px' }}>
            <div style={EYEBROW}>Precio</div>
            <h2 style={H2}>Claro y sin letra menuda</h2>
          </div>
          <div data-r="shopPrecio" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, maxWidth: 1080, margin: '0 auto' }}>
            {PLANS.map(pl => (
              <div key={pl.name} style={{ position: 'relative', padding: '36px 30px', borderRadius: 22, background: pl.bg ?? CARD, border: pl.border, display: 'flex', flexDirection: 'column' }}>
                {pl.tag && <span style={{ position: 'absolute', top: -13, left: 30, background: GOLD, color: '#111', fontSize: 11.5, fontWeight: 800, padding: '6px 16px', borderRadius: 999, letterSpacing: '.08em' }}>{pl.tag}</span>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: pl.priceColor === GOLD ? GOLD : MUTED }}>
                  {pl.name.includes('Llavero') && <NfcKeyIcon size={15} />}
                  {pl.name}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 46, color: pl.priceColor, lineHeight: 1, margin: '16px 0 5px' }}>{pl.price}</div>
                <div style={{ fontSize: 14, color: MUTED }}>{pl.period}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '28px 0 26px', flex: 1 }}>
                  {pl.features.map(f => (
                    <div key={f} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', fontSize: 14.5, color: '#d8d4c8', lineHeight: 1.4 }}>{CHECK(GOLD, 15)}{f}</div>
                  ))}
                </div>
                <Link href={pl.href} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: pl.btnBg, color: pl.btnColor, fontWeight: 800, fontSize: 15, textAlign: 'center', textDecoration: 'none' }}>{pl.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(48px,6vw,84px) clamp(20px,5vw,64px)' }}>
        <div style={{ textAlign: 'center', marginBottom: 42 }}>
          <div style={EYEBROW}>FAQ</div>
          <h2 style={H2}>Preguntas frecuentes</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {FAQS.map((fq, i) => (
            <div key={fq.q} style={{ borderRadius: 15, background: CARD, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              <button onClick={() => setFaqOpen(faqOpen === i ? -1 : i)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '19px 24px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#f5f3ec', fontSize: 16, fontWeight: 600, fontFamily: 'inherit' }}>
                {fq.q}
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto', transform: faqOpen === i ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .22s' }}><path d="M6 9l6 6 6-6" /></svg>
              </button>
              {faqOpen === i && <p style={{ margin: 0, padding: '0 24px 21px', fontSize: 15, lineHeight: 1.6, color: MUTED }}>{fq.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ background: 'radial-gradient(120% 100% at 50% 100%,#241f0c 0%,#0b0b0d 58%,#08080a 100%)', borderTop: '1px solid rgba(245,197,24,0.16)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(56px,7vw,96px) clamp(20px,5vw,64px)', textAlign: 'center' }}>
          <h2 style={{ ...H2, fontSize: 'clamp(28px,3.6vw,42px)', margin: '0 auto' }}>Empieza gratis. <span style={{ color: GOLD }}>Escala con tu llavero.</span></h2>
          <p style={{ fontSize: 18, color: MUTED, lineHeight: 1.55, margin: '22px auto 0', maxWidth: '52ch' }}>Crea el perfil de tu vehículo sin costo. Cuando quieras compartir tu historial con un toque, pide tu CarLink NFC.</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 38 }}>
            <Link href="/#h-buyfob" style={CTA_BTN}>Quiero mi CarLink — $49.900{ARROW}</Link>
            <Link href="/register" style={{ padding: '17px 30px', borderRadius: 14, border: '1px solid rgba(245,197,24,0.42)', background: 'rgba(245,197,24,0.06)', color: GOLD, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>Registrarme gratis</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: '44px clamp(20px,5vw,64px) 30px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 22, flexWrap: 'wrap' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <CarLinkWordmark fontSize={20} iconSize={15} badgeSize={26} badgeRadius={7} />
          </Link>
          <div style={{ fontSize: 13.5, color: MUTED }}>© 2026 CarLink · Bogotá, Colombia · business@carlink.com.co</div>
        </div>
      </footer>
    </div>
  )
}
