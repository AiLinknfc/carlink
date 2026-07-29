'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useShopCart } from '@/lib/shop-cart-context'
import { COP } from '@/lib/shop'
import { useRouter } from 'next/navigation'

const GOLD = '#F5C518'

interface Props {
  isOpen: boolean
  onClose: () => void
  theme: 'light' | 'dark'
}

export default function CartDrawer({ isOpen, onClose, theme }: Props) {
  const { cart, updateQty, removeItem, clear } = useShopCart()
  const router = useRouter()
  const isDark = theme === 'dark'
  const bg = isDark ? 'rgba(14,14,14,0.98)' : 'rgba(255,255,255,0.99)'
  const border = isDark ? 'rgba(245,197,24,0.18)' : 'rgba(17,17,17,0.1)'
  const subtle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,17,0.06)'
  const text = isDark ? '#f5f3ec' : '#17171a'
  const muted = isDark ? '#8f8a7a' : '#6f6a5f'
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{ position: 'relative', width: '100%', maxWidth: 420, height: '100%', background: bg, borderLeft: `1px solid ${border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            {/* Header */}
            <div style={{ padding: '18px 20px', borderBottom: `1px solid ${subtle}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,197,24,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
                </span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>Mi carrito</div>
                  <div style={{ fontSize: 11, color: muted }}>{cart.count} {cart.count === 1 ? 'artículo' : 'artículos'}</div>
                </div>
              </div>
              <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${subtle}`, background: 'transparent', color: muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
              {cart.items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(245,197,24,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Tu carrito está vacío</div>
                  <div style={{ fontSize: 13, color: muted, marginBottom: 20 }}>Explora nuestros llaveros NFC y personaliza el tuyo</div>
                  <button onClick={() => { onClose(); router.push('/shop') }} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: GOLD, color: '#111', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Explorar tienda</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {cart.items.map((item, idx) => (
                    <div key={idx} style={{ padding: 14, borderRadius: 14, background: cardBg, border: `1px solid ${subtle}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        {/* Color swatch */}
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: item.color.hex, border: `2px solid ${item.color.ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', boxShadow: `0 0 12px ${item.color.ring}` }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={item.color.hex === '#f5f5f4' || item.color.hex === '#c0c0c0' ? '#333' : '#fff'} strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M6 12a6 6 0 016-6M8.5 12a3.5 3.5 0 013.5-3.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{item.productName}</div>
                          <div style={{ fontSize: 11, color: muted }}>{item.color.name} · {item.plateText}</div>
                          {item.engraving && <div style={{ fontSize: 11, color: GOLD, marginTop: 2 }}>Grabado: "{item.engraving}"</div>}
                        </div>
                        <button onClick={() => removeItem(String(idx))} style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: 'none', color: muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button onClick={() => updateQty(String(idx), item.quantity - 1)} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${subtle}`, background: 'transparent', color: text, fontSize: 14, cursor: 'pointer' }}>−</button>
                          <span style={{ fontSize: 13, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                          <button onClick={() => updateQty(String(idx), item.quantity + 1)} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${subtle}`, background: 'transparent', color: text, fontSize: 14, cursor: 'pointer' }}>+</button>
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: GOLD }}>{COP(item.total)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {cart.items.length > 0 && (
              <div style={{ padding: '14px 20px', borderTop: `1px solid ${subtle}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Total</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: GOLD }}>{COP(cart.total)}</span>
                </div>
                <button onClick={() => { onClose(); router.push('/shop/checkout') }}
                  style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 0 24px rgba(245,197,24,0.4)' }}>
                  Ir a pagar
                </button>
                <button onClick={clear} style={{ width: '100%', padding: 10, borderRadius: 10, border: 'none', background: 'transparent', color: muted, fontWeight: 500, fontSize: 12, cursor: 'pointer' }}>Vaciar carrito</button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
