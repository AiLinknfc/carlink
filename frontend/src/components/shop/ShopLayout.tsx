'use client'

import Link from 'next/link'
import { useTheme } from '@/store/theme'

const GOLD = '#F5C518'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const bg = isDark ? '#0a0a0a' : '#f7f6f2'
  const cardBg = isDark ? 'rgba(20,20,20,0.95)' : 'rgba(255,255,255,0.95)'
  const border = isDark ? 'rgba(245,197,24,0.15)' : 'rgba(17,17,17,0.08)'
  const text = isDark ? '#f5f3ec' : '#17171a'
  const muted = isDark ? '#8f8a7a' : '#6f6a5f'

  return (
    <div style={{ minHeight: '100dvh', background: bg, color: text, fontFamily: 'var(--font-ui)' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px clamp(16px,4vw,40px)',
        background: cardBg, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${border}`,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-display)', fontSize: 20, textDecoration: 'none', color: text }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: GOLD, color: '#111' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          </span>
          Car<span style={{ color: GOLD }}>Link</span>
        </Link>
      </header>

      <main style={{ minHeight: 'calc(100dvh - 56px)' }}>
        {children}
      </main>
    </div>
  )
}
