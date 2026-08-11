'use client'

import { useState, useEffect, type FormEvent } from 'react'
import Link from 'next/link'
import { CarLinkMark, NfcKeyIcon } from '@/lib/icons_new'
import { waitlistApi } from '@/lib/api'

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

const TESTIMONIALS = [
  {
    id: '1',
    name: 'Andrés Felipe Gómez',
    city: 'Bogotá',
    carModel: 'Mazda 3 Touring 2020',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    rating: 5,
    title: 'Vendí mi Mazda en 3 días al precio que quería',
    text: 'El comprador me iba a pedir rebaja diciendo que no confiaba en el kilometraje. Le acerqué el celular al llavero CarLink, vio todas las facturas y mantenimientos organizados por fecha y firmados. Me pagó de contado sin pedir un solo peso de rebaja.',
    resultMetric: 'Vendió $3.200.000 por encima del promedio',
  },
  {
    id: '2',
    name: 'María Camila Torres',
    city: 'Medellín',
    carModel: 'Kia Sportage 2021',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
    rating: 5,
    title: 'Chao a la carpeta de papeles arrugados en la guantera',
    text: 'Antes guardaba recibos térmicos que se borraban con el calor. Ahora cada que salgo del taller en el Poblado, acerco el llavero y guardo el registro con valor y taller. Es facilísimo, no tuve que instalar nada raro.',
    resultMetric: 'Historial 100% digitalizado sin perder facturas',
  },
  {
    id: '3',
    name: 'Juan Esteban Prado',
    city: 'Cali',
    carModel: 'Renault Duster 4x4',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    rating: 5,
    title: 'Ahorré $1.800.000 al evitar cambiar una correa a destiempo',
    text: 'Casi le hago el cambio de correa antes de tiempo por duda. Toqué el llavero con mi celular y vi que el dueño anterior ya lo había registrado 10.000 km atrás con fecha exacta. Me ahorró un gasto innecesario inmediato.',
    resultMetric: 'Evitó gasto duplicado de $1.800.000 COP',
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
  const [leadContact, setLeadContact] = useState('')
  const [leadStatus, setLeadStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [activeCard, setActiveCard] = useState(-1)
  const [goneCards, setGoneCards] = useState<number[]>([])

  useEffect(() => {
    if (activeCard < 0 || activeCard > 6) return
    const t = setTimeout(() => {
      setGoneCards(prev => [...prev, activeCard])
      if (activeCard < 6) setActiveCard(activeCard + 1)
      else setTimeout(() => { setActiveCard(-1); setGoneCards([]) }, 800)
    }, 500)
    return () => clearTimeout(t)
  }, [activeCard])

  const handleLeadSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!leadContact.trim() || leadStatus === 'loading') return
    setLeadStatus('loading')
    const res = await waitlistApi.create(leadContact.trim(), 'shop_guia_mantenimiento')
    setLeadStatus(res ? 'done' : 'error')
  }

  return (
    <div style={{ background: '#08080a', color: '#f5f3ec', fontFamily: 'var(--font-ui)', minHeight: '100vh' }}>
      <style>{`
        @keyframes shopFadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        @keyframes shopFloatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes shopPulseRing { 0%{transform:scale(.7);opacity:.8} 100%{transform:scale(1.7);opacity:0} }
        [data-r="shopTestimonials"]{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.1);border-radius:24px;overflow:hidden}
        @media(max-width:860px){
          [data-r="shopTestimonials"]{grid-template-columns:1fr !important}
          [data-r="shopHero"]{grid-template-columns:1fr !important}
          [data-r="shopPrecio"]{grid-template-columns:1fr !important}
          [data-r="shopComo"]{grid-template-columns:1fr 1fr !important}
          [data-r="shopBox"]{grid-template-columns:1fr !important}
          [data-r="shopLeadGuia"]{grid-template-columns:1fr !important}
        }
        @media(max-width:720px){
          [data-r="shopNavLinks"]{display:none !important}
          [data-r="shopBackLabel"]{display:none !important}
          [data-r="shopScrollHint"]{display:flex !important}
        }
        .no-scrollbar::-webkit-scrollbar{display:none}
        .no-scrollbar{scrollbar-width:none;-ms-overflow-style:none}
        @keyframes shopCardGlow { 0%,100%{box-shadow:0 0 0 rgba(245,197,24,0)} 50%{box-shadow:0 0 18px rgba(245,197,24,.25)} }
        .dash-card{transition:transform .3s cubic-bezier(.2,.8,.2,1),box-shadow .3s ease}
        .dash-card:hover{transform:translateY(-3px) scale(1.02);box-shadow:0 8px 28px rgba(245,197,24,.2)}
        .dash-card-red:hover{box-shadow:0 8px 28px rgba(255,60,60,.22)}
        .dash-card-green:hover{box-shadow:0 8px 28px rgba(60,180,80,.22)}
        .dash-card-yellow:hover{box-shadow:0 8px 28px rgba(200,180,0,.22)}
        @keyframes nfcWave { 0%,100%{opacity:.22} 50%{opacity:1} }
        @keyframes cardFlyAway {
          0%{opacity:1;transform:translate(0,0) scale(1) rotate(0deg)}
          20%{opacity:1;transform:translate(30px,-40px) scale(1.15) rotate(-2deg)}
          50%{opacity:1;transform:translate(80px,-20px) scale(.8) rotate(1deg)}
          80%{opacity:.7;transform:translate(110px,10px) scale(.45) rotate(0deg)}
          100%{opacity:0;transform:translate(120px,20px) scale(.3) rotate(0deg)}
        }
        .card-fly-away{animation:cardFlyAway .48s cubic-bezier(.4,0,.2,1) forwards}
        .card-gone{display:none !important}
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

        {/* Escena: teléfono con fichas dashboard + llavero */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 500, animation: 'shopFadeUp .7s .14s both' }}>
          <div style={{ position: 'relative', width: 260, height: 480, borderRadius: 34, background: 'linear-gradient(165deg,#1a1a1f,#0e0e12)', border: '8px solid #17171c', boxShadow: '0 40px 90px rgba(0,0,0,.7),0 0 60px rgba(245,197,24,.12)', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 88, height: 20, background: '#17171c', borderRadius: '0 0 12px 12px', zIndex: 3 }} />
            {/* scroll fade top */}
            <div style={{ position: 'absolute', top: 30, left: 0, right: 0, height: 30, background: 'linear-gradient(180deg,#1a1a1f,transparent)', zIndex: 2, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(0deg,#0e0e12,transparent)', zIndex: 2, pointerEvents: 'none' }} />
            <div style={{ padding: '36px 14px 20px', height: '100%', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 10, scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="no-scrollbar">
              <div style={{ padding: '0 4px 6px' }}>
                <CarLinkWordmark fontSize={12} iconSize={10} badgeSize={18} badgeRadius={5} />
              </div>

              {/* Ficha 1: Kilometraje — placa amarilla */}
              <div className={`dash-card${activeCard === 0 ? ' card-fly-away' : goneCards.includes(0) ? ' card-gone' : ''}`} style={{ padding: '14px 14px 12px', borderRadius: 14, background: 'linear-gradient(168deg,#F8D64B,#F2C21A 60%,#E7B412)', border: '1px solid #d4a800', cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111116" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                  </div>
                  <div style={{ fontSize: 8, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#3a3a1e', fontWeight: 700 }}>Kilometraje</div>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: '#111116', lineHeight: 1 }}>48.250<span style={{ fontSize: 11, color: '#3a3a1e', fontFamily: 'var(--font-ui)', fontWeight: 600 }}> km</span></div>
                <div style={{ height: 5, borderRadius: 4, background: 'rgba(0,0,0,0.10)', overflow: 'hidden', marginTop: 10 }}><div style={{ height: '100%', width: '59%', background: 'linear-gradient(90deg,#111116,#3a3a1e)', borderRadius: 4 }} /></div>
                <div style={{ fontSize: 8.5, color: '#3a3a1e', marginTop: 6 }}>Proximo servicio · 51.200 km</div>
              </div>

              {/* Ficha 2: Presión de aceite — placa amarilla */}
              <div className={`dash-card${activeCard === 1 ? ' card-fly-away' : goneCards.includes(1) ? ' card-gone' : ''}`} style={{ padding: '14px', borderRadius: 14, background: 'linear-gradient(168deg,#F8D64B,#F2C21A 60%,#E7B412)', border: '1px solid #d4a800', cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="13" viewBox="0 0 520 230" fill="none" stroke="#111116" strokeWidth="29" strokeLinejoin="round" strokeLinecap="round"><path d="M28 14 L130 46 L128 82 L18 48 Z"></path><path d="M152 12 L222 12"></path><path d="M187 20 L187 84"></path><path d="M105 84 L268 84 L296 116 L462 46 L488 74 L382 118 L332 202 L105 202 Z" fill="rgba(0,0,0,0.06)"></path><path d="M500 128 C500 128 486 152 486 164 a14 14 0 0 0 28 0 c0 -12 -14 -36 -14 -36 Z" fill="#111116" strokeWidth="10"></path></svg>
                  </div>
                  <div style={{ fontSize: 8, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#3a3a1e', fontWeight: 700, flex: 1 }}>Aceite · Mobil 1 5W-30</div>
                  <svg width="31" height="26" viewBox="0 0 520 230" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="29" strokeLinejoin="round" strokeLinecap="round"><path d="M28 14 L130 46 L128 82 L18 48 Z"></path><path d="M152 12 L222 12"></path><path d="M187 20 L187 84"></path><path d="M105 84 L268 84 L296 116 L462 46 L488 74 L382 118 L332 202 L105 202 Z" fill="rgba(0,0,0,0.03)"></path><path d="M500 128 C500 128 486 152 486 164 a14 14 0 0 0 28 0 c0 -12 -14 -36 -14 -36 Z" fill="rgba(0,0,0,0.12)" strokeWidth="10"></path></svg>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#111116', lineHeight: 1 }}>82%</div>
                  <div style={{ fontSize: 8.5, color: '#3a3a1e' }}>vida util</div>
                </div>
                <div style={{ height: 5, borderRadius: 4, background: 'rgba(0,0,0,0.10)', overflow: 'hidden', marginTop: 10 }}><div style={{ height: '100%', width: '82%', background: 'linear-gradient(90deg,#111116,#3a3a1e)', borderRadius: 4 }} /></div>
                <div style={{ fontSize: 8.5, color: '#3a3a1e', marginTop: 6 }}>Cambio cada 10.000 km · Faltan 1.750 km</div>
              </div>

              {/* Ficha 3: Sistema de frenos — placa amarilla */}
              <div className={`dash-card${activeCard === 2 ? ' card-fly-away' : goneCards.includes(2) ? ' card-gone' : ''}`} style={{ padding: '14px', borderRadius: 14, background: 'linear-gradient(168deg,#F8D64B,#F2C21A 60%,#E7B412)', border: '1px solid #d4a800', cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="15" height="15" viewBox="0 0 120 100" fill="none" stroke="#111116" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"><circle cx="60" cy="50" r="23"></circle><path d="M60 37v14"></path><circle cx="60" cy="61.5" r="3.5" fill="#111116" stroke="none"></circle><path d="M31 27a34 34 0 0 0 0 46"></path><path d="M89 27a34 34 0 0 1 0 46"></path></svg>
                  </div>
                  <div style={{ fontSize: 8, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#3a3a1e', fontWeight: 700, flex: 1 }}>Sistema de frenos</div>
                  <svg width="29" height="23" viewBox="0 0 120 100" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"><circle cx="60" cy="50" r="23"></circle><path d="M60 37v14"></path><circle cx="60" cy="61.5" r="3.5" fill="rgba(0,0,0,0.12)" stroke="none"></circle><path d="M31 27a34 34 0 0 0 0 46"></path><path d="M89 27a34 34 0 0 1 0 46"></path></svg>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#111116', lineHeight: 1 }}>38%</div>
                  <div style={{ fontSize: 8.5, color: '#3a3a1e' }}>pastillas restantes</div>
                </div>
                <div style={{ height: 5, borderRadius: 4, background: 'rgba(0,0,0,0.10)', overflow: 'hidden', marginTop: 10 }}><div style={{ height: '100%', width: '38%', background: 'linear-gradient(90deg,#111116,#3a3a1e)', borderRadius: 4 }} /></div>
                <div style={{ fontSize: 8.5, color: '#3a3a1e', marginTop: 6 }}>Reemplazar pronto · ~8.000 km</div>
              </div>

              {/* Ficha 4: Bateria / carga — placa amarilla */}
              <div className={`dash-card${activeCard === 3 ? ' card-fly-away' : goneCards.includes(3) ? ' card-gone' : ''}`} style={{ padding: '14px', borderRadius: 14, background: 'linear-gradient(168deg,#F8D64B,#F2C21A 60%,#E7B412)', border: '1px solid #d4a800', cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="15" height="15" viewBox="0 0 120 100" fill="none" stroke="#111116" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"><rect x="16" y="30" width="88" height="46" rx="5" fill="rgba(0,0,0,0.06)"></rect><path d="M34 30v-6h14v6"></path><path d="M72 30v-6h14v6"></path><path d="M32 52h16"></path><path d="M80 44v16"></path><path d="M72 52h16"></path></svg>
                  </div>
                  <div style={{ fontSize: 8, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#3a3a1e', fontWeight: 700, flex: 1 }}>Bateria / carga</div>
                  <svg width="29" height="23" viewBox="0 0 120 100" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"><rect x="16" y="30" width="88" height="46" rx="5" fill="rgba(0,0,0,0.03)"></rect><path d="M34 30v-6h14v6"></path><path d="M72 30v-6h14v6"></path><path d="M32 52h16"></path><path d="M80 44v16"></path><path d="M72 52h16"></path></svg>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#111116', lineHeight: 1 }}>91%</div>
                  <div style={{ fontSize: 8.5, color: '#3a3a1e' }}>carga restante</div>
                </div>
                <div style={{ height: 5, borderRadius: 4, background: 'rgba(0,0,0,0.10)', overflow: 'hidden', marginTop: 10 }}><div style={{ height: '100%', width: '91%', background: 'linear-gradient(90deg,#111116,#3a3a1e)', borderRadius: 4 }} /></div>
                <div style={{ fontSize: 8.5, color: '#3a3a1e', marginTop: 6 }}>Voltaje 12.6V · Alternador OK</div>
              </div>

              {/* Ficha 5: Factura — certificado blanco */}
              <div className={`dash-card${activeCard === 4 ? ' card-fly-away' : goneCards.includes(4) ? ' card-gone' : ''}`} style={{ padding: '14px', borderRadius: 14, background: '#ffffff', border: '1px solid #e0e0e0', cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111116" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                  </div>
                  <div style={{ fontSize: 8, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#111116', fontWeight: 700, flex: 1 }}>Factura · Terpel</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <div style={{ fontSize: 8.5, color: '#555' }}>Galones</div>
                  <div style={{ fontSize: 9, color: '#111116', fontWeight: 600 }}>12.4</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <div style={{ fontSize: 8.5, color: '#555' }}>Precio / galon</div>
                  <div style={{ fontSize: 9, color: '#111116', fontWeight: 600 }}>$11.540</div>
                </div>
                <div style={{ height: 1, background: '#e0e0e0', margin: '6px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <div style={{ fontSize: 8.5, color: '#555' }}>Subtotal</div>
                  <div style={{ fontSize: 9, color: '#111116', fontWeight: 600 }}>$143.096</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <div style={{ fontSize: 8.5, color: '#555' }}>IVA (19%)</div>
                  <div style={{ fontSize: 9, color: '#3cb450', fontWeight: 600 }}>Exento</div>
                </div>
                <div style={{ height: 1, background: '#e0e0e0', margin: '6px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: 9, color: '#111116', fontWeight: 700 }}>Total</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#111116', fontWeight: 700 }}>$143.096</div>
                </div>
                <div style={{ fontSize: 8, color: '#999', marginTop: 6 }}>12 Jun 2026 · Terpel Av. 80</div>
              </div>

              {/* Ficha 6: Tecnicentro — certificado blanco */}
              <div className={`dash-card${activeCard === 5 ? ' card-fly-away' : goneCards.includes(5) ? ' card-gone' : ''}`} style={{ padding: '14px', borderRadius: 14, background: '#ffffff', border: '1px solid #e0e0e0', cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#111116" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  </div>
                  <div style={{ fontSize: 8, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#111116', fontWeight: 700, flex: 1 }}>Tecnicentro La 80</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#111116', lineHeight: 1 }}>4.8</div>
                  <div style={{ fontSize: 9, color: '#555' }}>★ · 324 reseñas</div>
                </div>
                <div style={{ fontSize: 8.5, color: '#555', marginTop: 8 }}>Ultimo servicio: aceite + filtros · 12 Jun 2026</div>
              </div>

              {/* Ficha 7: SOAT — certificado blanco */}
              <div className={`dash-card${activeCard === 6 ? ' card-fly-away' : goneCards.includes(6) ? ' card-gone' : ''}`} style={{ padding: '14px', borderRadius: 14, background: '#ffffff', border: '1px solid #e0e0e0', cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="15" height="15" viewBox="0 0 120 100" fill="none" stroke="#111116" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"><circle cx="60" cy="50" r="23"></circle><path d="M31 27a34 34 0 0 0 0 46"></path><path d="M89 27a34 34 0 0 1 0 46"></path><text x="60" y="59" textAnchor="middle" fontFamily="sans-serif" fontSize="20" fontWeight="700" fill="#111116" stroke="none">SOAT</text></svg>
                  </div>
                  <div style={{ fontSize: 8, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#111116', fontWeight: 700, flex: 1 }}>SOAT vigente</div>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#111116', lineHeight: 1 }}>14 Nov 2026</div>
                <div style={{ fontSize: 8.5, color: '#555', marginTop: 8 }}>Faltan 127 dias · Tecnomecánica al día</div>
              </div>
            </div>
          </div>
          {/* carpeta NFC */}
          <div onClick={() => { if (activeCard < 0) setActiveCard(0) }} style={{ position: 'absolute', right: -6, bottom: 40, width: 148, height: 121, animation: 'shopFloatY 3.4s ease-in-out infinite', cursor: 'pointer' }}>
            {/* sombra dorada */}
            <div style={{ position: 'absolute', inset: '22% 6% -4%', borderRadius: 30, background: 'radial-gradient(closest-side,rgba(245,197,24,0.22),rgba(245,197,24,0) 72%)', filter: 'blur(16px)' }} />
            {/* tab carpeta */}
            <div style={{ position: 'absolute', left: 1, top: 15, width: '42%', height: '30%', borderRadius: '10px 16px 0 0', background: 'linear-gradient(160deg,rgba(245,197,24,0.18),rgba(245,197,24,0.05))', border: '1px solid rgba(245,197,24,0.16)', borderBottom: 'none', backdropFilter: 'blur(14px) saturate(150%)', WebkitBackdropFilter: 'blur(14px) saturate(150%)', boxShadow: 'inset 0 2px 0 rgba(245,197,24,0.28)' }} />
            {/* barra decorativa — hoja blanca intenso */}
            <div style={{ position: 'absolute', left: '4%', right: '4%', top: '21%', height: '5%', borderRadius: 8, background: 'linear-gradient(rgba(255,255,255,0.96),rgba(255,255,255,0.72))', boxShadow: '0 2px 14px rgba(255,255,255,0.40)' }} />
            {/* body carpeta con NFC */}
            <div style={{ position: 'absolute', inset: '24% 0 0', borderRadius: 14, background: 'linear-gradient(160deg,rgba(245,197,24,0.16),rgba(245,197,24,0.04))', border: '1px solid rgba(245,197,24,0.16)', backdropFilter: 'blur(14px) saturate(150%)', WebkitBackdropFilter: 'blur(14px) saturate(150%)', boxShadow: 'inset 0 2px 0 rgba(245,197,24,0.30), 0 20px 50px rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 300 140" width="78%" height="auto" fill="none" style={{ position: 'relative', overflow: 'visible' }}>
                <g transform="translate(12,-16)">
                  <text x="150" y="110" textAnchor="middle" fontFamily="var(--font-display)" fontSize="68" fontWeight="700" letterSpacing="2" fill="rgba(245,197,24,0.92)">NFC</text>
                  <g stroke="rgba(245,197,24,0.90)" strokeLinecap="butt" fill="none" strokeWidth="11">
                    <path d="M226.96 75.4A20 20 0 0 1 226.96 96.6" style={{ animation: 'nfcWave 2.4s ease-in-out 0.8s infinite' }} />
                    <path d="M242.22 65.86A38 38 0 0 1 242.22 106.14" style={{ animation: 'nfcWave 2.4s ease-in-out 0.4s infinite' }} />
                    <path d="M257.49 56.32A56 56 0 0 1 257.49 115.68" style={{ animation: 'nfcWave 2.4s ease-in-out 0s infinite' }} />
                    <path d="M49.04 75.4A20 20 0 0 0 49.04 96.6" style={{ animation: 'nfcWave 2.4s ease-in-out 0.8s infinite' }} />
                    <path d="M33.78 65.86A38 38 0 0 0 33.78 106.14" style={{ animation: 'nfcWave 2.4s ease-in-out 0.4s infinite' }} />
                    <path d="M18.51 56.32A56 56 0 0 0 18.51 115.68" style={{ animation: 'nfcWave 2.4s ease-in-out 0s infinite' }} />
                  </g>
                </g>
              </svg>
            </div>
          </div>
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
            <img src="/empaque.png" alt="Caja CarLink" style={{ width: '100%', borderRadius: 20, display: 'block' }} />
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

      {/* EL LLAVERO */}
      <section style={{ background: '#0c0c10', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={SECTION}>
          <div style={{ textAlign: 'center', maxWidth: 660, margin: '0 auto 52px' }}>
            <div style={EYEBROW}>El llavero CarLink</div>
            <h2 style={H2}>Impreso en 3D, con un <span style={{ fontWeight: 700 }}>chip NFC adentro</span></h2>
            <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.6, margin: '14px auto 0', maxWidth: '52ch' }}>Cuerpo en PLA impreso en 3D, sellado con una capa de resina. Personalizado con la placa que elijas: al acercarlo a un teléfono abre tu perfil de vehículo.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', alignItems: 'center', gap: 'clamp(28px,4vw,56px)', maxWidth: 1200, margin: '0 auto' }}>
            {/* Columna izquierda — 3 features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
              {[
                { num: '01', label: 'Cuerpo', title: 'Impresión 3D en PLA', desc: 'Estructura rígida y ligera impresa capa por capa, con el relieve de la placa en alto contraste.' },
                { num: '02', label: 'Acabado', title: 'Capa de resina', desc: 'Recubrimiento transparente que sella la superficie: brillo permanente y resistencia a rayones.' },
                { num: '03', label: 'Resistencia', title: 'Impactos y lluvia', desc: 'La resina hace el cuerpo impermeable y absorbe golpes del uso diario en el llavero.' },
              ].map(f => (
                <div key={f.num} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: 10, letterSpacing: '.28em', textTransform: 'uppercase', color: MUTED }}>{f.num} · {f.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 500, color: '#f5f3ec', marginTop: 4 }}>{f.title}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: MUTED, marginTop: 4 }}>{f.desc}</div>
                  </div>
                  <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 0 }}>
                    <div style={{ width: 40, borderTop: `1px dashed ${BORDER}` }} />
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
              {[
                { num: '04', label: 'Interior', title: 'Chip NFC embebido', desc: 'Antena rectangular sellada dentro del cuerpo. Sin batería y sin partes móviles.' },
                { num: '05', label: 'Personalización', title: 'Tu placa grabada', desc: 'Eliges la matrícula y la ciudad: cada llavero se imprime a la medida de tu vehículo.' },
                { num: '06', label: 'Sujeción', title: 'Argolla de acero', desc: 'Anillo inoxidable con eslabón giratorio en la esquina superior derecha.' },
              ].map(f => (
                <div key={f.num} style={{ display: 'flex', alignItems: 'center', gap: 14, flexDirection: 'row-reverse' }}>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <div style={{ fontSize: 10, letterSpacing: '.28em', textTransform: 'uppercase', color: MUTED }}>{f.num} · {f.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 500, color: '#f5f3ec', marginTop: 4 }}>{f.title}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: MUTED, marginTop: 4 }}>{f.desc}</div>
                  </div>
                  <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 0, flexDirection: 'row-reverse' }}>
                    <div style={{ width: 40, borderTop: `1px dashed ${BORDER}` }} />
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: GOLD, boxShadow: `0 0 10px ${GOLD}` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dimensiones */}
          <div style={{ maxWidth: 700, margin: '56px auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: '.34em', textTransform: 'uppercase', color: MUTED }}>Dimensiones</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {[
                { val: '62 mm', label: 'Largo' },
                { val: '39 mm', label: 'Ancho' },
                { val: '6 mm', label: 'Alto' },
              ].map((d, i) => (
                <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  {i > 0 && <div style={{ width: 1, height: 36, background: BORDER, margin: '0 20px' }} />}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#f5f3ec', letterSpacing: '-.01em' }}>{d.val}</div>
                    <div style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: MUTED, marginTop: 2 }}>{d.label}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, color: MUTED, textAlign: 'center', maxWidth: '48ch' }}>Peso 11 g · Sin batería · Toda la vida útil. El chip se alimenta del propio teléfono; quien lo escanea no necesita instalar ninguna app.</div>
          </div>
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

      {/* PRUEBA SOCIAL VERIFICADA */}
      <section style={{ ...SECTION, borderTop: `1px solid ${BORDER}` }}>
        <div style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 46px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase' as const, color: GOLD, marginBottom: 12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            Prueba social verificada
          </div>
          <h2 style={H2}>Conductores en Colombia que ya protegen su vehículo</h2>
          <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.55, margin: '14px auto 0', maxWidth: '52ch' }}>Más de 2.400 conductores particulares confían en CarLink para cuidar su patrimonio y defender su valor de reventa.</p>
        </div>

        <div data-r="shopTestimonials">
          {TESTIMONIALS.map(t => (
            <div key={t.id} style={{ background: '#0c0c10', padding: 'clamp(22px,3vw,30px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 2, color: GOLD }}>
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={GOLD} stroke="none"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.7 1.7 7-6.3-3.8L5.7 21l1.7-7-5.4-4.7 7.1-.7z" /></svg>
                    ))}
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: '#5be89a', background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.3)', padding: '3px 8px', borderRadius: 6 }}>
                    {CHECK('#5be89a', 11)}Verificado
                  </span>
                </div>
                <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 8, lineHeight: 1.35 }}>"{t.title}"</div>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, margin: 0 }}>"{t.text}"</p>
              </div>
              <div style={{ paddingTop: 16, borderTop: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'inline-block', padding: '7px 12px', borderRadius: 10, background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.22)', fontSize: 11, fontWeight: 700, color: GOLD }}>{t.resultMetric}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src={t.avatar} alt={t.name} referrerPolicy="no-referrer" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${BORDER}` }} />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.2 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{t.carModel} · {t.city}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32, padding: '22px clamp(20px,4vw,32px)', borderRadius: 22, background: CARD, border: `1px solid ${BORDER}`, maxWidth: 720, margin: '32px auto 0', display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 20, flexWrap: 'wrap', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: GOLD }}>4.9 / 5.0</div>
            <div style={{ fontSize: 12, color: MUTED, textAlign: 'left' }}>
              <div style={{ color: '#f5f3ec', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' as const }}>Promedio de satisfacción</div>
              Basado en 380+ calificaciones en Colombia
            </div>
          </div>
          <span style={{ width: 1, height: 32, background: BORDER }} />
          <div style={{ fontSize: 12, color: MUTED }}>
            <div style={{ color: '#5be89a', fontWeight: 700, fontSize: 14 }}>98.4% recomiendan</div>
            CarLink a otros conductores en el país
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

      {/* LEAD CAPTURE — Guía de Mantenimiento gratis */}
      <section style={SECTION}>
        <div data-r="shopLeadGuia" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 28, alignItems: 'center', padding: 'clamp(24px,4vw,36px)', borderRadius: 24, background: 'linear-gradient(160deg,#17160f,#121216)', border: '1px solid rgba(245,197,24,0.3)', boxShadow: '0 24px 60px rgba(0,0,0,.3)' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, fontSize: 10, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: GOLD, marginBottom: 10 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.5-6.5l-2 2M8.5 8.5l-2-2m11 11l-2-2M8.5 15.5l-2 2" /><circle cx="12" cy="12" r="3.5" /></svg>
              Regalo gratis en PDF
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,3vw,30px)', textTransform: 'uppercase' as const, margin: '0 0 8px', lineHeight: 1.08 }}>
              ¿Aún lo estás pensando? Recibe gratis la Guía de Mantenimiento
            </h3>
            <p style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.55, margin: 0 }}>
              Descarga sin costo el PDF "Lista de Chequeo para Vender tu Carro al Mayor Precio en Colombia" y recibe un bono de <strong style={{ color: GOLD }}>$5.000 COP de descuento adicional</strong> para tu primer llavero.
            </p>
          </div>

          <div>
            {leadStatus === 'done' ? (
              <div style={{ padding: '18px 20px', borderRadius: 16, background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.35)', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>{CHECK('#5be89a', 24)}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>¡Guía enviada con éxito!</div>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: MUTED }}>
                  Revisa tu WhatsApp o correo. Tu cupón de descuento es: <strong style={{ color: GOLD, fontFamily: "'JetBrains Mono',monospace" }}>CARLINK5K</strong>
                </p>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  type="text" required value={leadContact} onChange={e => setLeadContact(e.target.value)}
                  placeholder="Tu correo o celular con WhatsApp"
                  style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: `1px solid ${BORDER}`, background: CARD, color: '#f5f3ec', fontSize: 13.5, outline: 'none' }}
                  onFocus={e => { e.currentTarget.style.borderColor = GOLD }}
                  onBlur={e => { e.currentTarget.style.borderColor = BORDER }}
                />
                <button type="submit" disabled={leadStatus === 'loading'} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '13px 22px', borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 13, textTransform: 'uppercase' as const, letterSpacing: '.04em', cursor: leadStatus === 'loading' ? 'default' : 'pointer', opacity: leadStatus === 'loading' ? 0.7 : 1 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
                  {leadStatus === 'loading' ? 'Enviando…' : 'Descargar Guía + Bono $5.000'}
                </button>
                {leadStatus === 'error' && <p style={{ margin: 0, fontSize: 12, color: '#ff8a8a' }}>No se pudo guardar tu contacto. Intenta de nuevo.</p>}
              </form>
            )}
          </div>
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

      {/* CAPTURA DE LEADS */}
      <section style={{ background: '#0c0c10', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(44px,5.4vw,72px) clamp(20px,5vw,64px)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
          <div>
            <div style={EYEBROW}>¿Aún lo estás pensando?</div>
            <h2 style={{ ...H2, margin: '12px 0 12px' }}>Te avisamos cuando salga el próximo lote</h2>
            <p style={{ fontSize: 15.5, color: MUTED, lineHeight: 1.6, margin: 0 }}>Déjanos tu correo y te escribimos con el descuento de lanzamiento. Sin spam, solo cuando haya novedades.</p>
          </div>
          <div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input placeholder="tu@correo.com" style={{ flex: 1, minWidth: 200, padding: '15px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 15, outline: 'none' }} />
              <button style={{ padding: '15px 26px', borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 15, cursor: 'pointer', whiteSpace: 'nowrap' }}>Avísame</button>
            </div>
            <div style={{ fontSize: 12.5, color: '#6f6a5f', marginTop: 12, lineHeight: 1.5 }}>Al enviar aceptas nuestra política de tratamiento de datos. Puedes darte de baja cuando quieras.</div>
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
