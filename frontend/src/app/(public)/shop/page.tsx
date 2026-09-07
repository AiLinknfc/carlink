'use client'

import { useState, useEffect, useRef, type FormEvent } from 'react'
import Link from 'next/link'
import CarLinkLogo from '@/components/CarLinkLogo'
import { NfcKeyIcon } from '@/lib/icons_new'
import { waitlistApi, reviewsApi } from '@/lib/api'
import type { Review } from '@/lib/types'
import { SUPPORT_WHATSAPP } from '@/lib/checkout'
import { useTheme } from '@/store/theme'

// Landing de venta del llavero NFC CarLink — adaptada de Plataforma/CarLink Landing.html.
// Respeta el tema claro/oscuro elegido en el resto del sitio (2026-08-13) — antes quedaba
// siempre oscura sin importar el toggle, y cambiaba de golpe al entrar acá. GOLD y las
// piezas del mockup del hero (teléfono + dash-cards doradas, autocontenidas con su propio
// contraste interno) se quedan fijas; el resto de constantes de estilo se calculan dentro
// del componente porque dependen de `isDark`.
const GOLD = '#F5C518'

const round3 = (n: number) => Math.round(n * 1000) / 1000
const SECTION_MAX: React.CSSProperties = { maxWidth: 1160, margin: '0 auto', width: '100%' }

const CHECK = (color = GOLD, size = 15) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto', marginTop: 2 }}><path d="M20 6L9 17l-5-5" /></svg>
)
const ARROW = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)

// Wordmark idéntico al de la nav (page.tsx) y el footer (LandingSections.tsx) —
// mismo markup, sin mayúsculas forzadas, para que el logo se vea igual en
// cualquier parte del sitio. textColor por defecto es el blanco fijo que ya
// usaba — sigue así para la instancia que vive DENTRO del mockup del teléfono
// (siempre oscuro), y las 2 instancias de página real (nav/footer) pasan el
// color que corresponda al tema.
function CarLinkWordmark({ fontSize, iconSize, textColor = '#f5f3ec' }: { fontSize: number; iconSize: number; textColor?: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-display)', fontSize, letterSpacing: '.01em', color: textColor }}>
      <CarLinkLogo size={iconSize} />
      <span>Car<span style={{ color: GOLD }}>Link</span></span>
    </span>
  )
}

const PROBLEMS = [
  { text: '¿No recuerdas cuándo cambiaste el aceite?', icon: <path d="M12 2c-3 4-6 7-6 11a6 6 0 0 0 12 0c0-4-3-7-6-11z" /> },
  { text: '¿Perdiste la factura del taller?', icon: <><path d="M6 3h9l3 3v15H6z" /><path d="M15 3v3h3" /><path d="M9 12h6M9 16h4" /></> },
  { text: '¿Compraste un carro usado y no sabes si le hicieron mantenimiento?', icon: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M21 21l-4.35-4.35" /></> },
  { text: '¿Olvidaste cuándo vence el SOAT?', icon: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /><path d="M12 14v3M12 19h.01" /></> },
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
// Precios y features iguales a los de la sección "Planes" (h-planes) y "Compra tu llavero"
// (h-buyfob) del home — no inventar números nuevos aquí. Se arma dentro del componente
// (buildPlans) porque border/priceColor/bg dependen de isDark.
function buildPlans(isDark: boolean, border: string, textColor: string) {
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

const TESTIMONIALS = [
  {
    id: '1',
    name: 'Andrés Felipe Gómez',
    city: 'Bogotá',
    carModel: 'Mazda 3 Touring 2020',
    rating: 5,
    title: 'Vendí mi carro sin que me pidieran rebaja',
    text: 'El comprador quería ver el historial antes de cerrar. Le mostré la ficha del llavero con los mantenimientos al día y no hubo más preguntas.',
  },
  {
    id: '2',
    name: 'María Camila Torres',
    city: 'Medellín',
    carModel: 'Kia Sportage 2021',
    rating: 5,
    title: 'Se acabó buscar papeles en la guantera',
    text: 'Cada vez que salgo del taller, acerco el llavero y queda el registro guardado. Ya no cargo con recibos que se borran.',
  },
  {
    id: '3',
    name: 'Juan Esteban Prado',
    city: 'Cali',
    carModel: 'Renault Duster 4x4',
    rating: 5,
    title: 'Casi repito un cambio que ya estaba hecho',
    text: 'Iba a cambiar una correa por precaución. El llavero mostró que el dueño anterior ya la había cambiado hacía poco — me ahorré ese gasto.',
  },
]

const FAQS = [
  { q: '¿Necesita batería?', a: 'No. El llavero NFC funciona sin batería y sin mantenimiento — dura toda la vida del vehículo.' },
  { q: '¿Necesita Internet?', a: 'Solo para consultar la información. El escaneo del llavero es instantáneo; la ficha se carga desde la nube.' },
  { q: '¿Qué pasa si pierdo el llavero?', a: 'Puedes desactivarlo desde la app en segundos y asociar uno nuevo. Tu historial nunca se pierde: vive en tu cuenta, no en el llavero.' },
  { q: '¿Qué pasa si cambio de taller?', a: 'Nada se pierde. El historial queda asociado a tu placa, no al taller — el llavero simplemente registra la nueva visita con el nombre del taller que te atendió.' },
  { q: '¿El llavero reemplaza el SOAT o la tecnomecánica?', a: 'No — los complementa. CarLink es tu ficha de mantenimiento; SOAT y RTM siguen siendo trámites oficiales, aunque también puedes guardarlos en tu sección de Documentos.' },
  { q: '¿El llavero es resistente al agua, caídas y roces de llaves?', a: 'Totalmente. CarLink está encapsulado en resina polimérica industrial IP68 impermeable, resistente a caídas de más de 3 metros, salpicaduras de gasolina, aceite y el friccionamiento continuo con otras llaves metálicas.' },
]

const TRUST = [
  { title: 'Talleres verificados', desc: 'Cada taller aliado pasa por un proceso de verificación antes de poder actualizar fichas.', icon: <path d="M20 6L9 17l-5-5" /> },
  { title: 'Garantía respaldada', desc: 'Cada servicio queda con su sello de garantía visible en la ficha, no en un papel que se pierde.', icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></> },
  { title: 'Historial inalterable', desc: 'Cada registro queda con fecha, taller y kilometraje — nadie lo puede reescribir después.', icon: <><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /></> },
  { title: 'Datos protegidos', desc: 'Solo tú decides quién ve tu ficha. La verificación es tuya, no de terceros.', icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /> },
]

const COVERAGE = [
  { city: 'Bogotá D.C.', count: 4 }, { city: 'Medellín', count: 3 }, { city: 'Cali', count: 2 }, { city: 'Barranquilla', count: 2 },
  { city: 'Cartagena', count: 1 }, { city: 'Bucaramanga', count: 2 }, { city: 'Pereira', count: 1 }, { city: 'Manizales', count: 1 },
  { city: 'Tunja', count: 1 }, { city: 'Duitama', count: 1 },
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

export default function ShopPage() {
  const { isDark } = useTheme()

  // Antes eran const a nivel de módulo, fijas en oscuro. GOLD no cambia
  // (mismo valor que --accent en globals.css para ambos temas). El resto sí,
  // así que se calculan acá — el resto del archivo las sigue usando por
  // nombre sin tocarse, quedan en el mismo scope de closure.
  const MUTED = isDark ? '#a8a496' : '#5c584e'
  const BORDER = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.1)'
  const CARD = isDark ? '#121216' : '#f7f6f2'
  const textColor = isDark ? '#f5f3ec' : '#17171a'
  const pageBg = isDark ? '#08080a' : '#ffffff'
  // Secciones alternadas usan un fondo levemente distinto al de la página
  // para separarse visualmente (mismo criterio en ambos temas: un paso muy
  // sutil desde el fondo de página hacia el de las tarjetas).
  const sectionAltBg = isDark ? '#0c0c10' : '#f7f6f2'
  const navBg = isDark ? 'rgba(8,8,10,0.82)' : 'rgba(255,255,255,0.86)'
  // Tints translúcidos sueltos (franjas cebra de tabla, fondo de badges,
  // inputs) — blanco translúcido sobre oscuro, negro translúcido sobre
  // claro, mismo criterio que dividerColor en Sidebar.tsx.
  const softTint = (alpha: number) => isDark ? `rgba(255,255,255,${alpha})` : `rgba(17,17,17,${alpha})`
  // Gradientes "tarjeta premium" con matiz dorado — tarjetas puntuales
  // (paso a paso, guía de mantenimiento, CTA final).
  const goldCardGradient = isDark ? 'linear-gradient(160deg,#17160f,#121216)' : 'linear-gradient(160deg,#fff8e1,#fdfaf2)'
  const goldCtaGradient = isDark
    ? 'radial-gradient(120% 100% at 50% 100%,#241f0c 0%,#0b0b0d 58%,#08080a 100%)'
    : 'radial-gradient(120% 100% at 50% 100%,#fff3c4 0%,#fbfaf6 58%,#ffffff 100%)'
  const goldSolutionGradient = isDark
    ? 'radial-gradient(110% 100% at 50% 0%,#1c1a12 0%,#08080a 62%)'
    : 'radial-gradient(110% 100% at 50% 0%,#fff3c4 0%,#ffffff 62%)'
  // Texto "muted claro" (listas de features sobre las tarjetas doradas de
  // sección) — versión más clara que MUTED, propia de esas dos listas.
  const mutedLight = isDark ? '#d8d4c8' : '#4a4638'

  const lead: React.CSSProperties = { fontWeight: 300, fontSize: 15, lineHeight: 1.6, color: MUTED, margin: 0 }
  const card = (border = BORDER): React.CSSProperties => ({ background: CARD, border: `1px solid ${border}` })

  const EYEBROW: React.CSSProperties = { fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', fontWeight: 600, color: GOLD }
  const H2: React.CSSProperties = { fontSize: 'clamp(24px,3vw,34px)', fontWeight: 400, letterSpacing: '-0.01em', margin: '10px 0 0', color: textColor }
  const SECTION: React.CSSProperties = { maxWidth: 1280, margin: '0 auto', padding: 'clamp(48px,6vw,84px) clamp(20px,5vw,64px)' }
  const CARD_STYLE: React.CSSProperties = { padding: 28, borderRadius: 18, background: CARD, border: `1px solid ${BORDER}` }
  const CTA_BTN: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 10, padding: '15px 30px', borderRadius: 13, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: '0 0 28px rgba(245,197,24,.38)', textDecoration: 'none' }
  const PLANS = buildPlans(isDark, BORDER, textColor)

  const [faqOpen, setFaqOpen] = useState(-1)
  const [leadContact, setLeadContact] = useState('')
  const [leadStatus, setLeadStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [activeCard, setActiveCard] = useState(-1)
  const [goneCards, setGoneCards] = useState<number[]>([])
  const mapRef = useRef<HTMLIFrameElement>(null)
  // Reseñas reales de producto (ver ResenasTab) — la lectura pública no expone
  // nombre/email del autor (mismo criterio de privacidad que el resto de fichas
  // públicas de la app), así que solo se muestran si hay suficientes con
  // comentario para no verse vacías; si no, se mantienen los testimonios
  // curados de abajo (TESTIMONIALS) como respaldo.
  const [realReviews, setRealReviews] = useState<Review[] | null>(null)

  useEffect(() => {
    reviewsApi.list({ targetType: 'product', sort: 'mejores', limit: 6 }).then(list => {
      const withComment = (list || []).filter(r => r.rating >= 4 && r.comment.trim().length > 0)
      if (withComment.length >= 3) setRealReviews(withComment)
    })
  }, [])

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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        name: 'Llavero NFC CarLink',
        description: 'Llavero NFC/QR para el historial de mantenimiento de tu vehículo — resistente al agua, caídas y roce con otras llaves.',
        offers: {
          '@type': 'Offer',
          priceCurrency: 'COP',
          price: '49900',
          availability: 'https://schema.org/InStock',
          url: 'https://carlink.com.co/shop',
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQS.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  }

  return (
    <div style={{ background: pageBg, color: textColor, fontFamily: 'var(--font-ui)', minHeight: '100vh' }}>
      {/* Datos estructurados: reusa el mismo array FAQS que ya se pinta más
          abajo, no contenido inventado aparte. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <style>{`
        @keyframes shopFadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        @keyframes shopFloatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes shopPulseRing { 0%{transform:scale(.7);opacity:.8} 100%{transform:scale(1.7);opacity:0} }
        [data-r="shopTestimonials"]{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:${BORDER};border:1px solid ${BORDER};border-radius:24px;overflow:hidden}
        @media(max-width:860px){
          [data-r="shopTestimonials"]{grid-template-columns:1fr !important}
          [data-r="shopHero"]{grid-template-columns:1fr !important}
          [data-r="shopPrecio"]{grid-template-columns:1fr !important}
          [data-r="shopComo"]{grid-template-columns:1fr 1fr !important}
          [data-r="shopBox"]{grid-template-columns:1fr !important}
          [data-r="shopLeadGuia"]{grid-template-columns:1fr !important}
          [data-r="shopCaptureLeads"]{grid-template-columns:1fr !important}
          [data-r="shopLlaveroGrid"]{grid-template-columns:1fr !important}
        }
        @media(max-width:720px){
          [data-r="shopNavLinks"]{display:none !important}
          [data-r="shopBackLabel"]{display:none !important}
          [data-r="shopNavCta"]{padding:10px 16px !important;font-size:13px !important}
          [data-r="shopHeroScene"]{min-height:360px !important}
          [data-r="shopHeroPhone"]{width:200px !important;height:370px !important}
          [data-r="shopHeroNfc"]{width:110px !important;height:92px !important;right:-2px !important;bottom:20px !important}
          [data-r="shopDimensions"]{flex-direction:column !important}
          [data-r="shopDimensionDivider"]{width:36px !important;margin:8px auto !important}
          [data-r="shopLlaveroFeatures"]{gap:24px !important}
          [data-r="shopLlaveroFeature"]{flex-direction:column !important;text-align:center !important}
          [data-r="shopLlaveroDots"]{flex-direction:row !important;justify-content:center !important;margin-top:8px !important}
          [data-r="shopLlaveroDotsLine"]{display:none !important}
          [data-r="shopPricingBadge"]{position:static !important;margin-bottom:8px !important;display:inline-block !important}
          [data-r="shopCaptureInput"]{flex-direction:column !important}
          [data-r="shopCaptureBtn"]{width:100% !important}
          [data-r="shopWhatsappBanner"]{flex-direction:column !important;text-align:center !important}
        }
        @media(max-width:480px){
          [data-r="shopHeroPhone"]{width:170px !important;height:320px !important;border-width:6px !important;border-radius:26px !important}
          [data-r="shopHeroNfc"]{width:90px !important;height:76px !important}
          [data-r="shopComo"]{grid-template-columns:1fr !important}
          [data-r="shopStepCard"]{padding:20px 18px !important}
          [data-r="shopStepNum"]{width:40px !important;height:40px !important;font-size:20px !important}
          [data-r="shopPrecio"]{gap:14px !important}
          [data-r="shopPlanCard"]{padding:24px 18px !important}
          [data-r="shopPlanPrice"]{font-size:36px !important}
          [data-r="shopTestimonials"]{gap:0 !important}
          [data-r="shopTestimonialCard"]{padding:18px !important}
          [data-r="shopFaqBtn"]{padding:16px 18px !important;font-size:15px !important}
          [data-r="shopLeadGuia"]{padding:18px !important}
          [data-r="shopCtaBtn"]{padding:14px 22px !important;font-size:14px !important}
          [data-r="shopCtaSecondary"]{padding:14px 22px !important;font-size:14px !important}
          [data-r="shopSolutionTag"]{padding:10px 18px !important;font-size:14px !important}
          [data-r="shopProblemCard"]{padding:20px !important}
          [data-r="shopProblemIcon"]{width:36px !important;height:36px !important;font-size:18px !important}
          [data-r="shopBenefitCard"]{padding:18px !important}
          [data-r="shopIncludeItem"]{padding:'12px 14px' !important}
          [data-r="shopBoxItem"]{padding:'14px 16px' !important}
          [data-r="shopBoxItemTitle"]{fontSize:14px !important}
          [data-r="shopBoxItemDesc"]{fontSize:12px !important}
          [data-r="shopFooter"]{flex-direction:column !important;text-align:center !important}
          [data-r="shopFooterText"]{font-size:12px !important}
        }
        @media(max-width:380px){
          [data-r="shopHeroPhone"]{width:150px !important;height:290px !important}
          [data-r="shopHeroNfc"]{width:80px !important;height:68px !important}
          [data-r="shopPlanPrice"]{font-size:30px !important}
          [data-r="shopScoreNum"]{font-size:24px !important}
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
        @keyframes sponsorScroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @media(max-width:860px){ .grid2{grid-template-columns:1fr !important} .buyfob-grid{grid-template-columns:1fr !important} .buyfob-grid>div:last-child{position:static !important} }
      `}</style>

      {/* NAV — el logo ya vuelve al inicio, pero se agrega un link explícito
          porque en una landing de campaña no todos lo dan por hecho. */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px clamp(20px,5vw,64px)', background: navBg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(245,197,24,0.14)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: MUTED, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.color = GOLD }}
            onMouseLeave={e => { e.currentTarget.style.color = MUTED }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            <span data-r="shopBackLabel">Volver a la app</span>
          </Link>
          <span style={{ width: 1, height: 22, background: BORDER }} />
          <Link href="/" style={{ textDecoration: 'none' }}>
            <CarLinkWordmark fontSize={18} iconSize={33} textColor={textColor} />
          </Link>
        </div>
        <nav data-r="shopNavLinks" style={{ display: 'flex', alignItems: 'center', gap: 28, fontSize: 14.5, fontWeight: 500, color: MUTED }}>
          <a href="#problema" style={{ color: 'inherit', textDecoration: 'none' }}>El problema</a>
          <a href="#como" style={{ color: 'inherit', textDecoration: 'none' }}>Cómo funciona</a>
          <a href="#precio" style={{ color: 'inherit', textDecoration: 'none' }}>Precio</a>
          <a href="#faq" style={{ color: 'inherit', textDecoration: 'none' }}>FAQ</a>
        </nav>
        <Link href="/#h-buyfob" data-r="shopNavCta" style={{ padding: '11px 22px', borderRadius: 999, background: GOLD, color: '#111', fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', textDecoration: 'none' }}>Quiero mi CarLink</Link>
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
            <Link href="/#h-buyfob" data-r="shopCtaBtn" style={CTA_BTN}>Obtén tu CarLink{ARROW}</Link>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, color: GOLD, lineHeight: 1 }}>$29.900</div>
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
        <div data-r="shopHeroScene" style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 500, animation: 'shopFadeUp .7s .14s both' }}>
          <div data-r="shopHeroPhone" style={{ position: 'relative', width: 260, height: 480, borderRadius: 34, background: 'linear-gradient(165deg,#1a1a1f,#0e0e12)', border: '8px solid #17171c', boxShadow: '0 40px 90px rgba(0,0,0,.7),0 0 60px rgba(245,197,24,.12)', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 88, height: 20, background: '#17171c', borderRadius: '0 0 12px 12px', zIndex: 3 }} />
            {/* scroll fade top */}
            <div style={{ position: 'absolute', top: 30, left: 0, right: 0, height: 30, background: 'linear-gradient(180deg,#1a1a1f,transparent)', zIndex: 2, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(0deg,#0e0e12,transparent)', zIndex: 2, pointerEvents: 'none' }} />
            <div style={{ padding: '36px 14px 20px', height: '100%', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 10, scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="no-scrollbar">
              <div style={{ padding: '0 4px 6px' }}>
                <CarLinkWordmark fontSize={12} iconSize={23} />
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
          <div data-r="shopHeroNfc" onClick={() => { if (activeCard < 0) setActiveCard(0) }} style={{ position: 'absolute', right: -6, bottom: 40, width: 148, height: 121, animation: 'shopFloatY 3.4s ease-in-out infinite', cursor: 'pointer' }}>
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
            <div key={p.text} data-r="shopProblemCard" style={CARD_STYLE}>
              <div data-r="shopProblemIcon" style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,176,32,0.12)', color: '#ffb020', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{p.icon}</svg>
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.4, color: textColor }}>{p.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* LA SOLUCIÓN */}
      <section style={{ background: goldSolutionGradient, borderTop: '1px solid rgba(245,197,24,0.12)', borderBottom: '1px solid rgba(245,197,24,0.12)' }}>
        <div style={{ ...SECTION, textAlign: 'center' }}>
          <div style={EYEBROW}>Nuestra solución</div>
          <h2 style={{ ...H2, margin: '14px auto 0', maxWidth: '20ch' }}>Escaneas. Y ves <span style={{ color: GOLD }}>absolutamente todo</span>.</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 11, marginTop: 38 }}>
            {SOLUTION_TAGS.map(t => (
              <span key={t} data-r="shopSolutionTag" style={{ padding: '12px 24px', borderRadius: 999, background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.32)', color: GOLD, fontSize: 16, fontWeight: 600 }}>{t}</span>
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
            <div key={b.title} data-r="shopBenefitCard" style={{ display: 'flex', gap: 16, alignItems: 'flex-start', ...CARD_STYLE, padding: 26 }}>
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
            <div key={st.n} data-r="shopStepCard" style={{ position: 'relative', padding: '30px 26px', borderRadius: 20, background: goldCardGradient, border: '1px solid rgba(245,197,24,0.2)' }}>
              <div data-r="shopStepNum" style={{ width: 52, height: 52, borderRadius: 15, background: GOLD, color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 26 }}>{st.n}</div>
              <div style={{ fontSize: 19, fontWeight: 700, margin: '20px 0 9px' }}>{st.title}</div>
              <div style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.5 }}>{st.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 38 }}>
          <Link href="/#h-buyfob" data-r="shopCtaBtn" style={CTA_BTN}>Quiero mi CarLink{ARROW}</Link>
        </div>
      </section>

      {/* QUÉ INCLUYE */}
      <section style={{ background: sectionAltBg, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={SECTION}>
          <div style={{ textAlign: 'center', maxWidth: 660, margin: '0 auto 44px' }}>
            <div style={EYEBROW}>Qué incluye</div>
            <h2 style={H2}>Todo esto viene contigo</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 11, maxWidth: 1040, margin: '0 auto' }}>
            {INCLUDES.map(inc => (
              <div key={inc} data-r="shopIncludeItem" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '15px 18px', borderRadius: 13, background: CARD, border: `1px solid ${BORDER}` }}>
                {CHECK(GOLD, 16)}
                <span style={{ fontSize: 14.5, fontWeight: 500, color: mutedLight }}>{inc}</span>
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
          <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.55, margin: '14px auto 0', maxWidth: '52ch' }}>Sin sorpresas ni cobros ocultos. Por tu pago único de $29.900 COP recibes la experiencia completa lista para usar.</p>
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
          <Link href="/#h-buyfob" data-r="shopCtaBtn" style={CTA_BTN}>Recibir todo el kit por $29.900 COP{ARROW}</Link>
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

      {/* PRECIO */}
      <section id="precio" style={{ background: sectionAltBg, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={SECTION}>
          <div style={{ textAlign: 'center', maxWidth: 660, margin: '0 auto 52px' }}>
            <div style={EYEBROW}>Precio</div>
            <h2 style={H2}>Claro y sin letra menuda</h2>
          </div>
          <div data-r="shopPrecio" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, maxWidth: 1080, margin: '0 auto' }}>
            {PLANS.map(pl => (
              <div key={pl.name} data-r="shopPlanCard" style={{ position: 'relative', padding: '36px 30px', borderRadius: 22, background: pl.bg ?? CARD, border: pl.border, display: 'flex', flexDirection: 'column' }}>
                {pl.tag && <span data-r="shopPricingBadge" style={{ position: 'absolute', top: -13, left: 30, background: GOLD, color: '#111', fontSize: 11.5, fontWeight: 800, padding: '6px 16px', borderRadius: 999, letterSpacing: '.08em' }}>{pl.tag}</span>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: pl.priceColor === GOLD ? GOLD : MUTED }}>
                  {pl.name.includes('Llavero') && <NfcKeyIcon size={15} />}
                  {pl.name}
                </div>
                <div data-r="shopPlanPrice" style={{ fontFamily: 'var(--font-display)', fontSize: 46, color: pl.priceColor, lineHeight: 1, margin: '16px 0 5px' }}>{pl.price}</div>
                <div style={{ fontSize: 14, color: MUTED }}>{pl.period}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '28px 0 26px', flex: 1 }}>
                  {pl.features.map(f => (
                    <div key={f} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', fontSize: 14.5, color: mutedLight, lineHeight: 1.4 }}>{CHECK(GOLD, 15)}{f}</div>
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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: softTint(0.05), border: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase' as const, color: GOLD, marginBottom: 12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            Prueba social verificada
          </div>
          <h2 style={H2}>Conductores en Colombia que ya protegen su vehículo</h2>
          <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.55, margin: '14px auto 0', maxWidth: '52ch' }}>Más de 2.400 conductores particulares confían en CarLink para cuidar su patrimonio y defender su valor de reventa.</p>
        </div>

        <div data-r="shopTestimonials">
          {realReviews ? realReviews.map(r => (
            <div key={r.id} data-r="shopTestimonialCard" style={{ background: sectionAltBg, padding: 'clamp(22px,3vw,30px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 2, color: GOLD }}>
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={GOLD} stroke="none"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.7 1.7 7-6.3-3.8L5.7 21l1.7-7-5.4-4.7 7.1-.7z" /></svg>
                    ))}
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: GOLD, background: 'rgba(245,197,24,0.12)', border: `1px solid rgba(245,197,24,0.3)`, padding: '3px 8px', borderRadius: 6 }}>
                    {CHECK(GOLD, 11)}Cliente CarLink
                  </span>
                </div>
                <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.55, margin: 0 }}>"{r.comment}"</p>
              </div>
            </div>
          )) : TESTIMONIALS.map(t => (
            <div key={t.id} data-r="shopTestimonialCard" style={{ background: sectionAltBg, padding: 'clamp(22px,3vw,30px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 2, color: GOLD }}>
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={GOLD} stroke="none"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.7 1.7 7-6.3-3.8L5.7 21l1.7-7-5.4-4.7 7.1-.7z" /></svg>
                    ))}
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: GOLD, background: 'rgba(245,197,24,0.12)', border: `1px solid rgba(245,197,24,0.3)`, padding: '3px 8px', borderRadius: 6 }}>
                    {CHECK(GOLD, 11)}Verificado
                  </span>
                </div>
                <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 8, lineHeight: 1.35 }}>"{t.title}"</div>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, margin: 0 }}>"{t.text}"</p>
              </div>
              <div style={{ paddingTop: 16, borderTop: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(245,197,24,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 16, color: GOLD, flex: '0 0 auto' }}>{t.name[0]}</div>
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
            <div data-r="shopScoreNum" style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: GOLD }}>4.9 / 5.0</div>
            <div style={{ fontSize: 12, color: MUTED, textAlign: 'left' }}>
              <div style={{ color: textColor, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' as const }}>Promedio de satisfacción</div>
              Basado en 380+ calificaciones en Colombia
            </div>
          </div>
          <span style={{ width: 1, height: 32, background: BORDER }} />
          <div style={{ fontSize: 12, color: MUTED }}>
            <div style={{ color: GOLD, fontWeight: 700, fontSize: 14 }}>98.4% recomiendan</div>
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
              <button data-r="shopFaqBtn" onClick={() => setFaqOpen(faqOpen === i ? -1 : i)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '19px 24px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: textColor, fontSize: 16, fontWeight: 600, fontFamily: 'inherit' }}>
                {fq.q}
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto', transform: faqOpen === i ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .22s' }}><path d="M6 9l6 6 6-6" /></svg>
              </button>
              {faqOpen === i && <p style={{ margin: 0, padding: '0 24px 21px', fontSize: 15, lineHeight: 1.6, color: MUTED }}>{fq.a}</p>}
            </div>
          ))}
        </div>

        {/* Banner de soporte por WhatsApp — mismo número/patrón que el resto
            del sitio (SUPPORT_WHATSAPP, lib/checkout.ts). Fondo CARD real
            (no el mismo #08080a de la página, que lo dejaría invisible) y
            verde de marca de WhatsApp #25D366 (no un verde genérico). */}
        <div data-r="shopWhatsappBanner" style={{ marginTop: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, padding: 'clamp(20px,3vw,28px)', borderRadius: 22, background: CARD, border: `1px solid ${BORDER}`, boxShadow: '0 20px 50px rgba(0,0,0,.3)' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: textColor }}>¿Tienes alguna otra pregunta antes de pedir?</div>
            <p style={{ fontSize: 12, color: MUTED, margin: '3px 0 0' }}>Nuestro equipo de soporte en Colombia responde por WhatsApp en menos de 2 minutos.</p>
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

      {/* LEAD CAPTURE — Guía de Mantenimiento gratis */}
      <section style={SECTION}>
        <div data-r="shopLeadGuia" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 28, alignItems: 'center', padding: 'clamp(24px,4vw,36px)', borderRadius: 24, background: goldCardGradient, border: '1px solid rgba(245,197,24,0.3)', boxShadow: '0 24px 60px rgba(0,0,0,.3)' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: softTint(0.05), border: `1px solid ${BORDER}`, fontSize: 10, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: GOLD, marginBottom: 10 }}>
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
                  style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: `1px solid ${BORDER}`, background: CARD, color: textColor, fontSize: 13.5, outline: 'none' }}
                  onFocus={e => { e.currentTarget.style.borderColor = GOLD }}
                  onBlur={e => { e.currentTarget.style.borderColor = BORDER }}
                />
                <button type="submit" disabled={leadStatus === 'loading'} data-r="shopCaptureBtn" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '13px 22px', borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 13, textTransform: 'uppercase' as const, letterSpacing: '.04em', cursor: leadStatus === 'loading' ? 'default' : 'pointer', opacity: leadStatus === 'loading' ? 0.7 : 1 }}>
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
      <section style={{ background: goldCtaGradient, borderTop: '1px solid rgba(245,197,24,0.16)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(56px,7vw,96px) clamp(20px,5vw,64px)', textAlign: 'center' }}>
          <h2 style={{ ...H2, fontSize: 'clamp(28px,3.6vw,42px)', margin: '0 auto' }}>Empieza gratis. <span style={{ color: GOLD }}>Escala con tu llavero.</span></h2>
          <p style={{ fontSize: 18, color: MUTED, lineHeight: 1.55, margin: '22px auto 0', maxWidth: '52ch' }}>Crea el perfil de tu vehículo sin costo. Cuando quieras compartir tu historial con un toque, pide tu CarLink NFC.</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 38 }}>
            <Link href="/#h-buyfob" data-r="shopCtaBtn" style={CTA_BTN}>Quiero mi CarLink — $29.900{ARROW}</Link>
            <Link href="/register" data-r="shopCtaSecondary" style={{ padding: '17px 30px', borderRadius: 14, border: '1px solid rgba(245,197,24,0.42)', background: 'rgba(245,197,24,0.06)', color: GOLD, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>Registrarme gratis</Link>
          </div>
        </div>
      </section>

      {/* CAPTURA DE LEADS */}
      <section style={{ background: sectionAltBg, borderTop: `1px solid ${BORDER}` }}>
        <div data-r="shopCaptureLeads" style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(44px,5.4vw,72px) clamp(20px,5vw,64px)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
          <div>
            <div style={EYEBROW}>¿Aún lo estás pensando?</div>
            <h2 style={{ ...H2, margin: '12px 0 12px' }}>Te avisamos cuando salga el próximo lote</h2>
            <p style={{ fontSize: 15.5, color: MUTED, lineHeight: 1.6, margin: 0 }}>Déjanos tu correo y te escribimos con el descuento de lanzamiento. Sin spam, solo cuando haya novedades.</p>
          </div>
          <div>
            <div data-r="shopCaptureInput" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input placeholder="tu@correo.com" style={{ flex: 1, minWidth: 200, padding: '15px 18px', borderRadius: 12, border: `1px solid ${softTint(0.14)}`, background: softTint(0.04), color: textColor, fontSize: 15, outline: 'none' }} />
              <button data-r="shopCaptureBtn" style={{ padding: '15px 26px', borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 15, cursor: 'pointer', whiteSpace: 'nowrap' }}>Avísame</button>
            </div>
            <div style={{ fontSize: 12.5, color: isDark ? '#6f6a5f' : '#8f8a7a', marginTop: 12, lineHeight: 1.5 }}>Al enviar aceptas nuestra política de tratamiento de datos. Puedes darte de baja cuando quieras.</div>
          </div>
        </div>
      </section>

      {/* ===== CONFIANZA ===== */}
      <section id="h-confianza" style={{ ...SECTION_MAX, padding: '64px clamp(20px,5vw,64px)', borderTop: `1px solid ${BORDER}` }}>
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
      <section id="h-cobertura" style={{ ...SECTION_MAX, padding: '64px clamp(20px,5vw,64px)', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 40px' }}>
          <div style={EYEBROW}>Ubicación y cobertura</div>
          <h2 style={{ ...H2, margin: '10px 0 12px' }}>Talleres aliados cerca de ti</h2>
          <p style={lead}>CarLink ya opera en estas ciudades — cada una con talleres verificados listos para actualizar tu ficha.</p>
        </div>
        <div data-r="mapFrame" style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', minHeight: 400, border: `1px solid ${BORDER}`, background: '#0a0a0a', boxShadow: '0 24px 60px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
          <iframe ref={mapRef} src="/mapa-talleres-colombia.html" title="Mapa de talleres CarLink en Colombia" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(120% 100% at 50% 0%, transparent 60%, rgba(8,8,4,0.35) 100%)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginTop: 14 }}>
          {COVERAGE.map(cv => (
            <div key={cv.city} style={{ padding: 16, borderRadius: 14, ...card(), display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => mapRef.current?.contentWindow?.postMessage({ type: 'flyToCity', city: cv.city }, '*')}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: GOLD, flex: '0 0 auto', boxShadow: `0 0 8px ${GOLD}` }} />
              <div><div style={{ fontSize: 14, fontWeight: 500 }}>{cv.city}</div><div style={{ fontSize: 11.5, fontWeight: 300, color: MUTED }}>{cv.count} talleres</div></div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <Link href="/register?mode=empresa" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 999, border: 'none', background: GOLD, color: '#111', fontWeight: 600, fontSize: 13.5, cursor: 'pointer', textDecoration: 'none' }}>
            ¿Tienes un taller? Únete a la red{ARROW}
          </Link>
        </div>
      </section>

      {/* ===== PLANES ===== */}
      <section id="h-planes" style={{ ...SECTION_MAX, padding: '64px clamp(20px,5vw,64px)', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 44px' }}>
          <div style={EYEBROW}>Planes</div>
          <h2 style={H2}>Gratis para conductores, simple para talleres</h2>
          <p style={{ ...lead, marginTop: 8 }}>Gratis para conductores, simple para talleres</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 18, maxWidth: 820, margin: '0 auto' }}>
          {[
            { name: 'Conductor', price: 'Gratis', period: '', tag: '', border: BORDER, features: ['Ficha técnica ilimitada', 'Historial y recordatorios', 'Descarga y Wallet', 'Galería y documentos'], cta: 'Crear mi ficha', btnBg: 'rgba(245,197,24,0.12)', btnColor: GOLD },
            { name: 'Taller aliado', price: '$79.900', period: '/mes', tag: 'Pruebalo ya!', border: 'rgba(245,197,24,0.4)', features: ['Clientes y fichas ilimitadas', 'Perfil público con reseñas', 'Certificados y facturación', 'Soporte prioritario'], cta: 'Registrar mi taller', btnBg: GOLD, btnColor: '#111' },
          ].map(pl => (
            <div key={pl.name} style={{ padding: 28, borderRadius: 20, ...card(pl.border), position: 'relative' }}>
              {pl.tag && <span style={{ position: 'absolute', top: -11, right: 24, background: GOLD, color: '#111', fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 999 }}>{pl.tag}</span>}
              <div style={{ fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.08em', color: MUTED }}>{pl.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '10px 0 18px' }}>
                <span style={{ fontSize: 34, fontWeight: 400 }}>{pl.price}</span>
                {pl.period && <span style={{ fontSize: 13, fontWeight: 300, color: MUTED }}>{pl.period}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20 }}>
                {pl.features.map(ft => (
                  <div key={ft} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, fontWeight: 300 }}>{CHECK()}{ft}</div>
                ))}
              </div>
              {pl.name === 'Taller aliado'
                ? <Link href="/register?mode=empresa" style={{ width: '100%', padding: 12, borderRadius: 11, border: 'none', background: pl.btnBg, color: pl.btnColor, fontWeight: 600, fontSize: 14, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', display: 'block' }}>{pl.cta}</Link>
                : <Link href="/register" style={{ width: '100%', padding: 12, borderRadius: 11, border: 'none', background: pl.btnBg, color: pl.btnColor, fontWeight: 600, fontSize: 14, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', display: 'block' }}>{pl.cta}</Link>
              }
            </div>
          ))}
        </div>
      </section>

      {/* ===== PATROCINADORES + KPIs ===== */}
      <section id="h-sponsors" style={{ ...SECTION_MAX, padding: '56px clamp(20px,5vw,64px)', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 32px' }}>
          <div style={EYEBROW}>Respaldo</div>
          <h2 style={H2}>Marcas y aliados que confían en CarLink</h2>
        </div>
        <div style={{ overflow: 'hidden', marginBottom: 40, maskImage: 'linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)' }}>
          <div style={{ display: 'flex', gap: 28, width: 'max-content', animation: 'sponsorScroll 25s linear infinite' }}>
            {[...SPONSORS, ...SPONSORS].map((sp, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 28px', borderRadius: 14, ...card(), minWidth: 160, flexShrink: 0 }}>
                <img src={sp.logo} alt={sp.name} style={{ height: 28, maxWidth: 120, objectFit: 'contain', filter: isDark ? 'brightness(0) invert(1) opacity(0.5)' : 'grayscale(1) opacity(0.5)', transition: 'filter 0.3s' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.setAttribute('style', 'display:block') }} />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '.02em', color: MUTED, display: 'none' }}>{sp.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, maxWidth: 820, margin: '0 auto', padding: '24px 20px', borderRadius: 18, background: softTint(0.05), border: `1px solid ${BORDER}` }}>
          {[
            { v: '4.8/5', l: 'Calificación promedio' },
            { v: '23+', l: 'Talleres en red' },
            { v: '10', l: 'Ciudades con cobertura' },
            { v: '4.9', l: 'Satisfacción' },
            { v: '342', l: 'Llaveros activos' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: GOLD, lineHeight: 1.1 }}>{s.v}</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: MUTED, marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== VEHÍCULOS CERTIFICADOS CON IA ===== */}
      <section id="h-marketai" style={{ ...SECTION_MAX, padding: '56px clamp(20px,5vw,64px)', borderTop: `1px solid ${BORDER}` }}>
        <div className="grid2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, alignItems: 'center' }}>
          <div>
            <div style={EYEBROW}>Vehículos certificados</div>
            <h2 style={{ ...H2, margin: '10px 0 12px' }}>Compra un carro con peritaje y ficha completa, guiado por IA</h2>
            <p style={{ ...lead, margin: '0 0 20px' }}>Cada anuncio en Vehículos en venta incluye peritaje mecánico, historial verificado y una IA que responde tus preguntas sobre el vehículo antes de agendar una visita.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
              {['Peritaje mecánico verificado por un taller aliado', 'Historial completo de mantenimiento de la placa', 'Asistente IA que resuelve dudas antes de la visita'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, fontWeight: 400 }}>{CHECK()}{t}</div>
              ))}
            </div>
            <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 0 20px rgba(245,197,24,0.35)', textDecoration: 'none' }}>Explorar vehículos{ARROW}</Link>
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
              <div style={{ alignSelf: 'flex-start', maxWidth: '80%', padding: '10px 14px', borderRadius: '12px 12px 12px 2px', background: softTint(0.05), fontSize: 13, fontWeight: 300 }}>No — el peritaje del taller no reporta daños estructurales. Su último cambio de aceite fue hace 1.200 km.</div>
              <div style={{ alignSelf: 'flex-end', maxWidth: '80%', padding: '10px 14px', borderRadius: '12px 12px 2px 12px', background: GOLD, color: '#111', fontSize: 13, fontWeight: 500 }}>¿Cuándo vence el SOAT?</div>
              <div style={{ alignSelf: 'flex-start', maxWidth: '80%', padding: '10px 14px', borderRadius: '12px 12px 12px 2px', background: softTint(0.05), fontSize: 13, fontWeight: 300 }}>Vigente hasta noviembre — puedes verlo en Documentos del vehículo.</div>
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
                <span style={{ position: 'absolute', top: 9, right: 9, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: 'rgba(245,197,24,0.16)', border: `1px solid rgba(245,197,24,0.5)`, color: GOLD, fontSize: 10, fontWeight: 800 }}>Peritaje OK</span>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700 }}>{mp.model}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: GOLD }}>{mp.price}</span>
                </div>
                <div style={{ fontSize: 11.5, color: MUTED, marginTop: 3 }}>{mp.km} · {mp.city}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== COMPRA TU LLAVERO ===== */}
      <section id="h-buyfob" style={{ ...SECTION_MAX, padding: '56px clamp(20px,5vw,64px) 64px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 40px' }}>
          <div style={EYEBROW}>Llavero NFC</div>
          <h2 style={{ ...H2, margin: '10px 0 12px' }}>Compra tu llavero — 3 pasos, sin vueltas</h2>
          <p style={lead}>Vincúlalo a tu placa y tu ficha aparece al instante en cualquier taller.</p>
        </div>
        <div className="buyfob-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 44, maxWidth: 920, margin: '0 auto', alignItems: 'center' }}>
          {/* Left — Steps + benefits */}
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 36 }}>
              {[
                ['1', 'Elige tu llavero', 'Selecciona el llavero Premium que mejor se adapte a tu estilo.'],
                ['2', 'Confirma tu dirección', 'Ingresa tu placa y la dirección de envío. Validamos la cobertura en tu ciudad.'],
                ['3', 'Paga y listo', 'Acepta Stripe, Nequi, Bancolombia o contraentrega. Recibe tu llavero en 5 días hábiles.'],
              ].map(([n, t, d]) => (
                <div key={n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px 18px', borderRadius: 14, ...card() }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(245,197,24,0.14)', color: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{n}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{t}</div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.5, color: MUTED }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
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
                  <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, background: 'rgba(245,197,24,0.04)', border: `1px solid ${BORDER}` }}>
                    <span style={{ flexShrink: 0, lineHeight: 1, marginTop: 2 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 2 }}>{item.title}</div>
                      <div style={{ fontSize: 11, lineHeight: 1.45, color: MUTED }}>{item.desc}</div>
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
              <p style={{ fontWeight: 300, fontSize: 13, lineHeight: 1.5, color: MUTED, margin: '10px 0 18px' }}>Impreso en PLA con chip NFC. Tu ficha se abre al instante con un toque.</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 18, fontSize: 12, color: MUTED }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg> Encriptado</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg> Predictivo</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg> Expediente</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>$29.900</div>
              <div style={{ fontSize: 12, color: MUTED, marginBottom: 18 }}>Envío incluido · Llega en 5 días hábiles</div>
              <Link href="/#h-buyfob" style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 700, fontSize: 15, cursor: 'pointer', transition: 'opacity 0.2s', textAlign: 'center', textDecoration: 'none', display: 'block' }}>Comprar ahora</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: '44px clamp(20px,5vw,64px) 30px' }}>
        <div data-r="shopFooter" style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 22, flexWrap: 'wrap' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <CarLinkWordmark fontSize={20} iconSize={33} textColor={textColor} />
          </Link>
          <div data-r="shopFooterText" style={{ fontSize: 13.5, color: MUTED }}>© 2026 CarLink · Bogotá, Colombia · business@carlink.com.co</div>
        </div>
      </footer>
    </div>
  )
}
