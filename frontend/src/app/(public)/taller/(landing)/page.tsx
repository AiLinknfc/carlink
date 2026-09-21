'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import CarLinkLogo from '@/components/CarLinkLogo'
import { analyticsApi } from '@/lib/api'
import { SUPPORT_WHATSAPP } from '@/lib/checkout'
import { useTheme } from '@/store/theme'
import PostulacionForm from '@/components/taller/PostulacionForm'
import PolicyModal, { type PolicyTab } from '@/components/PolicyModal'

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
  { text: '¿Tus clientes no vuelven porque nadie recuerda qué se le hizo a su carro?', icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> },
  { text: '¿Discuten la garantía porque no hay prueba de qué se cambió y cuándo?', icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /> },
  { text: '¿Pierdes tiempo buscando órdenes y facturas en papel?', icon: <><path d="M6 3h9l3 3v15H6z" /><path d="M15 3v3h3" /><path d="M9 12h6M9 16h4" /></> },
  { text: '¿Tu buen trabajo no lo ve quien compra un carro usado?', icon: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M21 21l-4.35-4.35" /></> },
]
const BENEFITS = [
  { title: 'Clientes que vuelven', desc: 'Cada servicio queda en la ficha del cliente, con recordatorios de su próximo mantenimiento a nombre de tu taller.' },
  { title: 'Garantías con respaldo', desc: 'La fecha, el kilometraje y el trabajo registrado sirven de evidencia si hay un reclamo.' },
  { title: 'Certificados y facturación', desc: 'Genera certificados y facturas numeradas desde la propia orden de trabajo.' },
  { title: 'Visibilidad en la red', desc: 'Un perfil público con reseñas reales y tu ubicación en el mapa de talleres aliados.' },
  { title: 'Todo tu taller en un panel', desc: 'Clientes, órdenes, inventario, citas y rentabilidad en un solo lugar.' },
  { title: 'Sin equipos ni instalaciones', desc: 'Funciona desde el navegador, en el celular o en el computador que ya tienes.' },
]
const STEPS = [
  { n: '1', title: 'Postula tu negocio', desc: 'Llena el formulario con tu NIT y tu logo. Toma unos minutos.' },
  { n: '2', title: 'Validamos tus datos', desc: 'Revisamos el NIT y la información del negocio y te respondemos por correo.' },
  { n: '3', title: 'Activa tu panel', desc: 'Al aprobarte creas tu cuenta de taller y empiezas con 7 días de prueba.' },
  { n: '4', title: 'Registra servicios', desc: 'Vincula el vehículo de tu cliente y registra cada servicio en su ficha.' },
]
const INCLUDES = ['Clientes y vehículos', 'Órdenes de trabajo', 'Inventario de repuestos', 'Citas y agenda', 'Notificaciones a clientes', 'Rentabilidad', 'Certificados y facturas', 'Documentos numerados', 'Perfil público con reseñas', 'Ficha pública del taller', 'Registro de mecánicos']


const FAQS = [
  { q: '¿Cuánto cuesta postularme?', a: 'Postularte no tiene costo. Si te aprobamos, creas tu cuenta de taller y empiezas con 7 días de prueba. El plan Taller aliado tiene la mensualidad que ves en esta página y nada se cobra sin que lo aceptes.' },
  { q: '¿Qué pasa después de enviar el formulario?', a: 'Validamos tu NIT y los datos del negocio y te escribimos por correo, normalmente en 2 días hábiles. Si te aprobamos, recibes un enlace para crear tu cuenta de taller con el mismo NIT.' },
  { q: '¿Qué datos me piden y para qué?', a: 'NIT, nombre del negocio, ubicación, contacto y logo, para validar que tu negocio existe y armar tu perfil en la red. Tu logo solo se muestra en el sitio si lo autorizas. Tratamos tus datos según la Ley 1581 de 2012.' },
  { q: '¿Qué ve mi taller de mis clientes?', a: 'Tu panel muestra únicamente a los clientes y vehículos de tu propio taller. El dueño del vehículo decide qué información de su ficha se muestra al público.' },
  { q: '¿Soy proveedor de repuestos u otro negocio del sector, puedo postularme?', a: 'Sí. Elige tu tipo de negocio en el formulario y revisamos cada caso. La red está pensada para talleres, pero también para quienes los abastecen.' },
  { q: '¿Necesito instalar algo o comprar equipos?', a: 'No. CarLink funciona desde el navegador de tu celular o computador. Tus clientes pueden usar un llavero NFC para compartir su historial, pero tu taller no necesita hardware.' },
  { q: '¿Puedo salir de la red cuando quiera?', a: 'Sí. Escribe a business@carlink.com.co y cerramos tu perfil y eliminamos tus datos, salvo lo que la ley nos obligue a conservar.' },
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

export default function TallerPage() {
  const { isDark, toggleTheme } = useTheme()

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

  const [faqOpen, setFaqOpen] = useState(-1)
  const [policyTab, setPolicyTab] = useState<PolicyTab | null>(null)
  const [activeCard, setActiveCard] = useState(-1)
  const [goneCards, setGoneCards] = useState<number[]>([])
  const mapRef = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    if (activeCard < 0 || activeCard > 6) return
    const t = setTimeout(() => {
      setGoneCards(prev => [...prev, activeCard])
      if (activeCard < 6) setActiveCard(activeCard + 1)
      else setTimeout(() => { setActiveCard(-1); setGoneCards([]) }, 800)
    }, 500)
    return () => clearTimeout(t)
  }, [activeCard])

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
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
    <div style={{ background: pageBg, color: textColor, fontFamily: 'var(--font-ui)', minHeight: '100vh', overflowX: 'hidden' }}>
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
          [data-r="shopFormGrid"]{grid-template-columns:1fr !important}
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

      {/* NAV */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '8px clamp(16px,4vw,40px)', background: navBg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(245,197,24,0.14)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '.01em' }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CarLinkLogo size={33} />
            <span>Car<span style={{ color: GOLD }}>Link</span></span>
          </Link>
        </div>
        <nav data-r="shopNavLinks" style={{ display: 'flex', alignItems: 'center', gap: 28, fontSize: 14.5, fontWeight: 500, color: MUTED }}>
          <a href="#problema" style={{ color: 'inherit', textDecoration: 'none' }}>El problema</a>
          <a href="#como" style={{ color: 'inherit', textDecoration: 'none' }}>Cómo funciona</a>
          <a href="#h-planes" style={{ color: 'inherit', textDecoration: 'none' }}>Planes</a>
          <a href="#faq" style={{ color: 'inherit', textDecoration: 'none' }}>FAQ</a>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <a href="#registro" style={{ padding: '6px 12px', borderRadius: 9, border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(17,17,17,0.12)'}`, background: 'transparent', color: MUTED, fontWeight: 600, fontSize: 12, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' }}>Postular</a>
          <Link href="/login" style={{ padding: '6px 12px', borderRadius: 9, border: 'none', background: GOLD, color: '#111', fontWeight: 700, fontSize: 12, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' }}>Iniciar sesión</Link>
          <button onClick={toggleTheme} title="Cambiar apariencia" aria-label="Cambiar modo claro u oscuro" style={{ position: 'relative', width: 56, height: 28, borderRadius: 999, border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(17,17,17,0.12)'}`, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 3px', transition: 'all .25s' }}>
            <span style={{ position: 'absolute', left: 7, fontSize: 10, opacity: isDark ? 0 : 1, transition: 'opacity .2s' }}>○</span>
            <span style={{ position: 'absolute', right: 6, color: '#111', opacity: isDark ? 1 : 0, transition: 'opacity .2s', display: 'inline-flex' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M9 2a1 1 0 0 0-1 1v3.06A8 8 0 0 0 4 13a1 1 0 0 0 1 1h1l1 6h10l1-6h1a1 1 0 0 0 1-1 8 8 0 0 0-4-6.94V3a1 1 0 0 0-1-1z" /></svg>
            </span>
            <span style={{ position: 'relative', zIndex: 1, width: 22, height: 22, borderRadius: '50%', background: isDark ? '#f5f3ec' : '#111', boxShadow: '0 2px 6px rgba(0,0,0,.35)', transform: `translateX(${isDark ? 28 : 0}px)`, transition: 'transform .25s cubic-bezier(0.34,1.56,0.64,1), background .25s' }} />
          </button>
        </div>
      </header>

      {/* HERO */}
      <section data-r="shopHero" style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 56, alignItems: 'center', maxWidth: 1280, margin: '0 auto', padding: 'clamp(52px,7vw,96px) clamp(20px,5vw,64px)', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 62% 44%,rgba(245,197,24,0.14),transparent 58%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, animation: 'shopFadeUp .7s both' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '7px 15px', borderRadius: 999, background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.3)', fontSize: 12.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: GOLD, marginBottom: 26 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: GOLD }} />Red de talleres aliados CarLink
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(38px,5.4vw,72px)', lineHeight: 1.02, margin: 0, textTransform: 'uppercase' as const }}>Tu taller, con el historial de cada cliente en <span style={{ color: GOLD }}>un solo toque</span>.</h1>
          <p style={{ fontSize: 'clamp(17px,1.7vw,21px)', lineHeight: 1.55, color: MUTED, margin: '26px 0 0', maxWidth: '52ch' }}>Únete a la red CarLink: registra cada servicio en la ficha digital de tu cliente, respalda tus garantías y hazte visible ante quienes buscan un taller de confianza. Talleres y proveedores de repuestos son bienvenidos.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginTop: 38 }}>
            <a href="#registro" data-r="shopCtaBtn" style={CTA_BTN}>Postular mi taller{ARROW}</a>
            <a href="#como" style={{ color: MUTED, fontSize: 15, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 4 }}>Ver cómo funciona</a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 32, fontSize: 13.5, color: MUTED, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>{CHECK()}Postularte no tiene costo</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>{CHECK()}Sin instalar equipos</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>{CHECK()}Respuesta por correo</span>
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
          <h2 style={H2}>¿Te suena familiar en tu taller?</h2>
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

      {/* BENEFICIOS */}
      <section style={SECTION}>
        <div style={{ textAlign: 'center', maxWidth: 660, margin: '0 auto 46px' }}>
          <div style={EYEBROW}>Beneficios</div>
          <h2 style={H2}>Lo que gana tu taller</h2>
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
          <h2 style={H2}>Cuatro pasos para unirte</h2>
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
          <a href="#registro" data-r="shopCtaBtn" style={CTA_BTN}>Postular mi taller{ARROW}</a>
        </div>
      </section>

      {/* QUÉ INCLUYE */}
      <section style={{ background: sectionAltBg, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={SECTION}>
          <div style={{ textAlign: 'center', maxWidth: 660, margin: '0 auto 44px' }}>
            <div style={EYEBROW}>Panel de taller</div>
            <h2 style={H2}>Todo lo que incluye tu panel</h2>
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
          <Link href="#registro" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 999, border: 'none', background: GOLD, color: '#111', fontWeight: 600, fontSize: 13.5, cursor: 'pointer', textDecoration: 'none' }}>
            ¿Tienes un taller? Únete a la red{ARROW}
          </Link>
        </div>
      </section>

      {/* ===== PLANES ===== */}
      <section id="h-planes" style={{ ...SECTION_MAX, padding: '64px clamp(20px,5vw,64px)', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 44px' }}>
          <div style={EYEBROW}>Planes</div>
          <h2 style={H2}>Un plan simple para tu taller</h2>
          <p style={{ ...lead, marginTop: 8 }}>Postularte es gratis y empiezas con 7 días de prueba. Tus clientes conductores usan CarLink sin costo.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 18, maxWidth: 820, margin: '0 auto' }}>
          {[
            { name: 'Taller aliado', price: '$79.900', period: '/mes', tag: 'Pruebalo ya!', border: 'rgba(245,197,24,0.4)', features: ['Clientes y fichas ilimitadas', 'Perfil público con reseñas', 'Certificados y facturación', 'Soporte prioritario'], cta: 'Postular mi taller', btnBg: GOLD, btnColor: '#111' },
            { name: 'Conductor', price: 'Gratis', period: '', tag: '', border: BORDER, features: ['Ficha técnica ilimitada', 'Historial y recordatorios', 'Descarga y Wallet', 'Galería y documentos'], cta: 'Crear mi ficha', btnBg: 'rgba(245,197,24,0.12)', btnColor: GOLD },
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
                ? <Link href="#registro" style={{ width: '100%', padding: 12, borderRadius: 11, border: 'none', background: pl.btnBg, color: pl.btnColor, fontWeight: 600, fontSize: 14, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', display: 'block' }}>{pl.cta}</Link>
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

      {/* ===== POSTULACIÓN ===== */}
      <section id="registro" style={{ background: goldCtaGradient, borderTop: '1px solid rgba(245,197,24,0.16)' }}>
        <div style={{ ...SECTION, maxWidth: 900 }}>
          <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 36px' }}>
            <div style={EYEBROW}>Únete a la red</div>
            <h2 style={{ ...H2, fontSize: 'clamp(28px,3.6vw,42px)' }}>Postula tu negocio a CarLink</h2>
            <p style={{ ...lead, marginTop: 12 }}>Talleres, proveedores de repuestos y negocios del sector: déjanos tus datos y tu logo. Validamos tu NIT y te respondemos por correo.</p>
          </div>
          <PostulacionForm onOpenPolicy={() => setPolicyTab('privacy')} isDark={isDark} muted={MUTED} border={BORDER} card={CARD} textColor={textColor} />
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
            <p style={{ fontSize: 12, color: MUTED, margin: '3px 0 0' }}>Nuestro equipo de soporte en Colombia responde por WhatsApp en 15 a 30 minutos.</p>
          </div>
          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Hola, tengo una pregunta sobre el llavero CarLink NFC')}`}
            target="_blank" rel="noopener noreferrer"
            onClick={() => analyticsApi.trackWhatsappClick('general_question', 'shop')}
            style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 24px', borderRadius: 999, background: '#25D366', color: '#062b12', fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: '.04em', textDecoration: 'none', boxShadow: '0 10px 26px rgba(37,211,102,0.25)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" /></svg>
            Hablar por WhatsApp
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: '44px clamp(20px,5vw,64px) 30px' }}>
        <div data-r="shopFooter" style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 22, flexWrap: 'wrap' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <CarLinkWordmark fontSize={20} iconSize={33} textColor={textColor} />
          </Link>
          <Link href="/" style={{ fontSize: 13.5, color: GOLD, textDecoration: 'none', fontWeight: 600 }}>¿Eres conductor? Conoce el llavero CarLink</Link>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13.5 }}>
            {([['privacy', 'Privacidad de Datos'], ['terms', 'Uso, Planes y Espacio'], ['warranty', 'Garantía'], ['support', 'Soporte']] as [PolicyTab, string][]).map(([t, l]) => (
              <button key={t} onClick={() => setPolicyTab(t)} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: MUTED, fontSize: 13.5, fontFamily: 'inherit' }}>{l}</button>
            ))}
          </div>
          <div data-r="shopFooterText" style={{ fontSize: 13.5, color: MUTED }}>© 2026 CarLink · Bogotá, Colombia · business@carlink.com.co</div>
        </div>
      </footer>
      <PolicyModal isOpen={policyTab !== null} onClose={() => setPolicyTab(null)} tab={policyTab ?? 'privacy'} theme={isDark ? 'dark' : 'light'} plateText="" city="" />
    </div>
  )
}
