'use client'

import { useState } from 'react'
import Link from 'next/link'
import CarLinkLogo from '@/components/CarLinkLogo'
import SiteFooter from '@/components/SiteFooter'
import PolicyModal, { type PolicyTab } from '@/components/PolicyModal'
import { useTheme } from '@/store/theme'
import SiteBackdrop, { backdropPageBg } from '@/components/SiteBackdrop'

/* Marco común de las páginas de empresa (Nosotros, Blog, Trabaja con nosotros): mismo header
   y mismo footer que el resto del sitio, con los estilos por variables CSS de las guías de diseño. */

const NAV: [string, string][] = [
  ['/nosotros', 'Nosotros'],
  ['/blog', 'Blog'],
  ['/taller', 'Para talleres'],
  ['/trabaja', 'Trabaja con nosotros'],
]

export default function PublicChrome({ children }: { children: React.ReactNode }) {
  const { isDark, toggleTheme } = useTheme()
  const [policy, setPolicy] = useState<PolicyTab | null>(null)

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: backdropPageBg(isDark ? 'dark' : 'light'), color: 'var(--text-1)', fontFamily: 'var(--font-ui)' }}>
      <SiteBackdrop theme={isDark ? 'dark' : 'light'} />
      <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .pc-nav-m{display:none}
        @media(max-width:820px){ .pc-nav{display:none !important} .pc-nav-m{display:flex} }
        @media(max-width:420px){ .pc-cta{display:none !important} }
      `}</style>
      <header style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '10px clamp(16px,4vw,40px)', background: isDark ? 'rgba(6,6,6,0.72)' : 'rgba(247,246,242,0.8)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(16px)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '.01em', color: 'inherit', textDecoration: 'none' }}>
          <CarLinkLogo size={33} />
          <span>Car<span style={{ color: 'var(--accent)' }}>Link</span></span>
        </Link>
        <nav className="pc-nav" aria-label="Principal" style={{ display: 'flex', alignItems: 'center', gap: 26, fontSize: 14, fontWeight: 500 }}>
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} style={{ color: 'var(--text-2)', textDecoration: 'none' }}>{label}</Link>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" onClick={toggleTheme} aria-label="Cambiar entre modo claro y oscuro" title="Cambiar apariencia"
            style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isDark
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>}
          </button>
          <Link href="/" className="pc-cta" style={{ padding: '8px 14px', borderRadius: 10, background: 'var(--accent)', color: '#111', fontWeight: 700, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>Ir al inicio</Link>
        </div>
      </header>

      <nav className="pc-nav-m" aria-label="Secciones de empresa" style={{ position: 'sticky', top: 56, zIndex: 40, gap: 8, overflowX: 'auto', padding: '8px clamp(16px,4vw,40px)', background: isDark ? 'rgba(6,6,6,0.72)' : 'rgba(247,246,242,0.8)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border)', scrollbarWidth: 'none' }}>
        {NAV.map(([href, label]) => (
          <Link key={href} href={href} style={{ flex: '0 0 auto', padding: '7px 13px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)', fontSize: 12.5, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>{label}</Link>
        ))}
      </nav>

      <main style={{ flex: 1 }}>{children}</main>

      <SiteFooter theme={isDark ? 'dark' : 'light'} onOpenPolicy={setPolicy} />
      <PolicyModal isOpen={policy !== null} onClose={() => setPolicy(null)} tab={policy ?? 'privacy'} theme={isDark ? 'dark' : 'light'} plateText="" city="" />
      </div>
    </div>
  )
}
