import Link from 'next/link'
import AboutContent from '@/components/AboutContent'

export const metadata = { title: 'Sobre CarLink' }

export default function NosotrosPage() {
  return (
    <>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px clamp(16px,4vw,40px) 0' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', textDecoration: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Volver al inicio
        </Link>
      </div>
      <AboutContent />
    </>
  )
}
