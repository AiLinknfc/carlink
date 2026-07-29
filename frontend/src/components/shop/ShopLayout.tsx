'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useShopCart } from '@/lib/shop-cart-context'
import CartDrawer from '@/components/shop/CartDrawer'
import { useTheme } from '@/store/theme'

const GOLD = '#F5C518'

const NAV_ITEMS = [
  { href: '/shop', label: 'Tienda', icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? GOLD : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
  )},
  { href: '/about', label: 'Nosotros', icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? GOLD : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
  )},
  { href: '/shop/orders', label: 'Pedidos', icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? GOLD : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  )},
]

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { cart } = useShopCart()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [cartOpen, setCartOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const bg = isDark ? '#0a0a0a' : '#f7f6f2'
  const cardBg = isDark ? 'rgba(20,20,20,0.95)' : 'rgba(255,255,255,0.95)'
  const border = isDark ? 'rgba(245,197,24,0.15)' : 'rgba(17,17,17,0.08)'
  const text = isDark ? '#f5f3ec' : '#17171a'
  const muted = isDark ? '#8f8a7a' : '#6f6a5f'

  return (
    <div style={{ minHeight: '100dvh', background: bg, color: text, fontFamily: 'var(--font-ui)', paddingBottom: 72 }}>
      {/* Top bar */}
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
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: muted, marginLeft: 4 }}>Tienda</span>
        </Link>

        <button onClick={() => setCartOpen(true)} style={{ position: 'relative', width: 40, height: 40, borderRadius: 11, border: `1px solid ${border}`, background: 'transparent', color: text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
          {mounted && cart.count > 0 && (
            <span style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: GOLD, color: '#111', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cart.count}</span>
          )}
        </button>
      </header>

      {/* Main content */}
      <main style={{ minHeight: 'calc(100dvh - 130px)' }}>
        {children}
      </main>

      {/* Bottom nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        display: 'flex', alignItems: 'stretch', justifyContent: 'center', gap: 0,
        padding: '0', height: 64,
        background: cardBg, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderTop: `1px solid ${border}`,
        boxShadow: isDark ? '0 -8px 32px rgba(0,0,0,.5)' : '0 -8px 32px rgba(0,0,0,.08)',
      }}>
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href || (item.href === '/shop' && pathname === '/')
          return (
            <Link key={item.href} href={item.href} style={{
              flex: 1, maxWidth: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              textDecoration: 'none', color: active ? GOLD : muted, fontSize: 10, fontWeight: active ? 700 : 500,
              letterSpacing: '.04em', textTransform: 'uppercase',
              borderTop: active ? `2px solid ${GOLD}` : '2px solid transparent',
              transition: 'all .2s',
            }}>
              {item.icon(active)}
              {item.label}
            </Link>
          )
        })}
        {/* Cart floating button */}
        <button onClick={() => setCartOpen(true)} style={{
          position: 'absolute', bottom: 12, right: 'calc(50% - 160px)',
          width: 52, height: 52, borderRadius: '50%',
          background: GOLD, color: '#111', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(245,197,24,0.5)',
          transition: 'transform .2s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
          {mounted && cart.count > 0 && (
            <span style={{ position: 'absolute', top: -2, right: -2, width: 22, height: 22, borderRadius: '50%', background: '#ff4d6a', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${bg}` }}>{cart.count}</span>
          )}
        </button>
      </nav>

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} theme={theme} />
    </div>
  )
}
