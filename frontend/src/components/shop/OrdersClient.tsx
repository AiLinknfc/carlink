'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/store/theme'
import { loadOrders, COP, getEstimatedDelivery, getShippingProgress, type ShopOrder, type OrderStatus } from '@/lib/shop'
import { motion } from 'framer-motion'

const GOLD = '#F5C518'

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pago pendiente',
  processing: 'Preparando envío',
  shipped: 'En camino',
  delivered: 'Entregado',
}

const STATUS_ICONS: Record<OrderStatus, string> = {
  pending: '⏳',
  processing: '📦',
  shipped: '🚚',
  delivered: '✅',
}

export default function OrdersClient() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [orders, setOrders] = useState<ShopOrder[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  const border = isDark ? 'rgba(245,197,24,0.15)' : 'rgba(17,17,17,0.08)'
  const subtle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,17,0.06)'
  const text = isDark ? '#f5f3ec' : '#17171a'
  const muted = isDark ? '#8f8a7a' : '#6f6a5f'
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'

  useEffect(() => {
    setOrders(loadOrders())
    const interval = setInterval(() => setOrders(loadOrders()), 3000)
    return () => clearInterval(interval)
  }, [])

  if (orders.length === 0) {
    return (
      <div style={{ maxWidth: 500, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(245,197,24,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Sin pedidos aún</div>
        <div style={{ fontSize: 14, color: muted, marginBottom: 24 }}>Cuando compres un llavero, tus pedidos aparecerán aquí</div>
        <a href="/shop" style={{ display: 'inline-flex', padding: '12px 24px', borderRadius: 12, background: GOLD, color: '#111', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Explorar tienda</a>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px clamp(16px,4vw,40px)' }}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Mis pedidos</div>
      <div style={{ fontSize: 13, color: muted, marginBottom: 24 }}>Seguimiento de tus llaveros NFC</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {orders.map(order => {
          const isOpen = selected === order.id
          const progress = getShippingProgress(order.status)
          return (
            <div key={order.id} style={{ borderRadius: 16, background: cardBg, border: `1px solid ${isOpen ? GOLD : subtle}`, overflow: 'hidden', transition: 'border-color .2s' }}>
              <button onClick={() => setSelected(isOpen ? null : order.id)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px',
                background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245,197,24,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flex: '0 0 auto' }}>
                  {STATUS_ICONS[order.status]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Pedido #{order.id}</div>
                  <div style={{ fontSize: 12, color: muted }}>{STATUS_LABELS[order.status]} · {new Date(order.createdAt).toLocaleDateString('es-CO')}</div>
                </div>
                <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: GOLD }}>{COP(order.total)}</div>
                  <div style={{ fontSize: 11, color: muted }}>{order.items.length} {order.items.length === 1 ? 'artículo' : 'artículos'}</div>
                </div>
              </button>

              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '0 18px 18px' }}>
                    {/* Progress bar */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: muted, marginBottom: 6 }}>
                        <span>Progreso de envío</span>
                        <span>{progress}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 999, background: subtle, overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1 }} style={{
                          height: '100%', borderRadius: 999,
                          background: `linear-gradient(90deg, ${GOLD}, ${order.status === 'delivered' ? '#2ecc71' : GOLD})`,
                        }} />
                      </div>
                    </div>

                    {/* Waiting message */}
                    {order.status !== 'delivered' && (
                      <div style={{ padding: 14, borderRadius: 12, background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.2)', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ position: 'relative', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {[0, 1, 2].map(i => (
                              <div key={i} style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `2px solid ${GOLD}`, opacity: 0, animation: `nfcRipple 2.6s ease-out infinite`, animationDelay: `${i * 0.85}s` }} />
                            ))}
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>Tu llavero viene en curso</div>
                            <div style={{ fontSize: 12, color: muted }}>Estimado: {order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '3-5 días'}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                      {order.items.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: item.color.hex, border: `1px solid ${item.color.ring}` }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{item.productName}</div>
                            <div style={{ fontSize: 11, color: muted }}>{item.color.name} · {item.plateText} · x{item.quantity}</div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{COP(item.total)}</div>
                        </div>
                      ))}
                    </div>

                    {/* Shipping info */}
                    <div style={{ padding: 12, borderRadius: 10, background: cardBg, border: `1px solid ${subtle}`, fontSize: 12, color: muted }}>
                      <div style={{ fontWeight: 600, color: text, marginBottom: 4 }}>Datos de envío</div>
                      <div>{order.name}</div>
                      <div>{order.address}, {order.city}</div>
                      <div>{order.phone} · {order.email}</div>
                    </div>

                    {order.status !== 'delivered' && (
                      <a href="/shop" style={{ display: 'block', textAlign: 'center', marginTop: 14, padding: 12, borderRadius: 10, border: 'none', background: 'rgba(245,197,24,0.12)', color: GOLD, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                        Comprar otro llavero
                      </a>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
