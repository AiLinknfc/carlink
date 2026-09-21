import Link from 'next/link'
import CarLinkLogo from '@/components/CarLinkLogo'
import type { PolicyTab } from '@/components/PolicyModal'
import { SUPPORT_WHATSAPP, SUPPORT_WHATSAPP_DISPLAY, SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY } from '@/lib/checkout'
import { LEGAL_ADDRESS } from '@/lib/legalContent'

/* Footer único de las dos landings (home `/` y `/taller`). Todos los enlaces son absolutos
   (`/#ancla`, `/taller#ancla`) para que funcionen igual desde cualquiera de las dos páginas.
   Si se agrega una sección enlazable a una landing, se agrega acá y no en cada página. */

const GOLD = '#F5C518'

interface Props {
  theme: 'light' | 'dark'
  onOpenPolicy: (tab: PolicyTab) => void
}

const CONDUCTORES: [string, string][] = [
  ['Cómo funciona', '/#h-como'],
  ['Llavero NFC y kit', '/#h-productos'],
  ['Precios', '/#h-productos'],
  ['Crear mi ficha gratis', '/register'],
]
const TALLERES: [string, string][] = [
  ['Postular mi taller', '/taller#registro'],
  ['Cómo funciona', '/taller#como'],
  ['Planes', '/taller#h-planes'],
  ['Cobertura', '/taller#h-cobertura'],
  ['Preguntas frecuentes', '/taller#faq'],
]
const EMPRESA: [string, string][] = [
  ['Nosotros', '/nosotros'],
  ['Blog y noticias', '/blog'],
  ['Trabaja con nosotros', '/trabaja'],
]
const LEGAL: [PolicyTab, string][] = [
  ['privacy', 'Privacidad de Datos'],
  ['terms', 'Uso, Planes y Espacio'],
  ['warranty', 'Términos de Garantía'],
  ['support', 'Soporte Técnico'],
]

export default function SiteFooter({ theme, onOpenPolicy }: Props) {
  const dark = theme !== 'light'
  const t = {
    text: dark ? '#f5f3ec' : '#17171a',
    muted: dark ? '#8f8a7a' : '#6f6a5f',
    line: dark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,17,0.07)',
  }
  const title: React.CSSProperties = { fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 16, color: t.text }
  const list: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, fontSize: 13.5, fontWeight: 300 }
  const link: React.CSSProperties = { color: t.muted, textDecoration: 'none', transition: 'color .15s' }
  const hover = (on: boolean) => (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.color = on ? GOLD : t.muted }

  const col = (heading: string, items: [string, string][]) => (
    <nav aria-label={heading}>
      <div style={title}>{heading}</div>
      <div style={list}>
        {items.map(([label, href]) => (
          <Link key={label} href={href} style={link} onMouseEnter={hover(true)} onMouseLeave={hover(false)}>{label}</Link>
        ))}
      </div>
    </nav>
  )

  return (
    <footer style={{ borderTop: `1px solid ${t.line}`, padding: '56px clamp(20px,5vw,64px) 28px', background: dark ? '#08080a' : '#ffffff', color: t.text }}>
      <style>{`
        .sf-grid{display:grid;grid-template-columns:1.25fr 1fr 1.15fr .9fr 1.1fr 1.6fr;gap:28px}
        @media(max-width:1100px){.sf-grid{grid-template-columns:repeat(3,1fr)}.sf-brand{grid-column:1/-1}}
        @media(max-width:640px){.sf-grid{grid-template-columns:1fr 1fr}.sf-brand,.sf-contact{grid-column:1/-1}}
      `}</style>
      <div className="sf-grid" style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div className="sf-brand">
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 14, color: 'inherit', textDecoration: 'none' }}>
            <CarLinkLogo size={33} />
            <span>Car<span style={{ color: GOLD }}>Link</span></span>
          </Link>
          <p style={{ fontWeight: 300, fontSize: 13.5, lineHeight: 1.6, color: t.muted, margin: '0 0 18px', maxWidth: '34ch' }}>
            La ficha técnica digital de tu vehículo, viva y verificada por talleres reales.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
        <a href="https://www.instagram.com/carlink.nfc/" target="_blank" rel="noreferrer" style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(45deg,#F58529,#DD2A7B,#8134AF,#515BD4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
        </a>
        <a href="https://www.facebook.com/carlink.nfc" target="_blank" rel="noreferrer" style={{ width: 34, height: 34, borderRadius: 9, background: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
        </a>
        <a href={`https://wa.me/${SUPPORT_WHATSAPP}`} target="_blank" rel="noreferrer" style={{ width: 34, height: 34, borderRadius: 9, background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#062b12' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.1-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5 0a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.6-1.2.1-.2 0-.3 0-.5s-.5-1.3-.7-1.7-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3A2.8 2.8 0 0 0 6.5 9c0 1.7 1.2 3.3 1.4 3.5s2.4 3.7 5.9 5c2.1.8 2.5.6 3 .6s1.4-.6 1.6-1.1.2-1 .1-1.1-.3-.1-.5-.2z" /></svg>
        </a>
          </div>
        </div>

        {col('Conductores', CONDUCTORES)}
        {col('Talleres y negocios', TALLERES)}
        {col('Empresa', EMPRESA)}

        <nav aria-label="Legal y soporte">
          <div style={title}>Legal y soporte</div>
          <div style={list}>
            {LEGAL.map(([tab, label]) => (
              <button key={tab} onClick={() => onOpenPolicy(tab)} style={{ ...link, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13.5, fontWeight: 300, fontFamily: 'inherit', textAlign: 'left' }}
                onMouseEnter={hover(true)} onMouseLeave={hover(false)}>{label}</button>
            ))}
          </div>
        </nav>

        <div className="sf-contact">
          <div style={title}>Contacto</div>
          <address style={{ ...list, fontStyle: 'normal', whiteSpace: 'nowrap' }}>
            <a href="https://maps.google.com/?q=Cl.+87+%2320-42+Bogotá" target="_blank" rel="noreferrer" style={link} onMouseEnter={hover(true)} onMouseLeave={hover(false)}>{LEGAL_ADDRESS}</a>
            <a href="mailto:business@carlink.com.co" style={link} onMouseEnter={hover(true)} onMouseLeave={hover(false)}>business@carlink.com.co</a>
            <a href={`tel:+${SUPPORT_PHONE}`} style={link} onMouseEnter={hover(true)} onMouseLeave={hover(false)}>Llamadas: {SUPPORT_PHONE_DISPLAY}</a>
            <a href={`https://wa.me/${SUPPORT_WHATSAPP}`} target="_blank" rel="noreferrer" style={link} onMouseEnter={hover(true)} onMouseLeave={hover(false)}>WhatsApp: {SUPPORT_WHATSAPP_DISPLAY}</a>
          </address>
        </div>
      </div>

      <div style={{ maxWidth: 1160, margin: '40px auto 0', paddingTop: 20, borderTop: `1px solid ${t.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 12, fontWeight: 300, color: t.muted }}>
        <span>© 2026 CarLink S.A.S. · Bogotá, Colombia · Todos los derechos reservados</span>
          <a href="https://ailink.com.co/" target="_blank" rel="noreferrer" title="Ir a AiLink"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999, background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.22)', color: t.muted, textDecoration: 'none', transition: 'all .16s', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.16)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.08)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.22)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19" /></svg>
            <span>Impulsado por <b style={{ fontWeight: 700, color: t.text }}>Ai<span style={{ color: GOLD }}>Link</span></b></span>
          </a>
      </div>
    </footer>
  )
}
