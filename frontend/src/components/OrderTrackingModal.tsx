'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/store/theme'
import { loadOrders, COP, getShippingProgress, type ShopOrder, type OrderStatus } from '@/lib/shop'

const GOLD = '#F5C518'

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pago pendiente',
  processing: 'Preparando envío',
  shipped: 'En camino',
  delivered: 'Entregado',
}

export default function OrderTrackingModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [orders, setOrders] = useState<ShopOrder[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  const bg = isDark ? 'rgba(14,14,14,0.95)' : 'rgba(255,255,255,0.97)'
  const text = isDark ? '#f5f3ec' : '#17171a'
  const muted = isDark ? '#8f8a7a' : '#6f6a5f'
  const subtle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,17,0.06)'
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'

  useEffect(() => {
    if (!isOpen) return
    const load = () => setOrders(loadOrders())
    load()
    const interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [isOpen])

  useEffect(() => {
    if (orders.length > 0 && !selected) setSelected(orders[0].id)
  }, [orders, selected])

  if (!isOpen) return null

  const order = orders.find(o => o.id === selected) || orders[0]

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 74, background: 'rgba(4,4,4,0.74)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} className="modal-panel" style={{ width: 480, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto', background: bg, border: `1px solid ${isDark ? 'rgba(245,197,24,0.22)' : 'rgba(17,17,17,0.1)'}`, borderRadius: 20, padding: 24, boxShadow: isDark ? '0 40px 90px rgba(0,0,0,.6)' : '0 40px 90px rgba(0,0,0,.12)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, color: text }}>Mis pedidos</div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(17,17,17,0.1)'}`, background: 'transparent', color: muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(245,197,24,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: text, marginBottom: 6 }}>Sin pedidos aún</div>
            <div style={{ fontSize: 13, color: muted, marginBottom: 20 }}>Cuando compres un llavero, tus pedidos aparecerán aquí</div>
            <button onClick={onClose} style={{ display: 'inline-flex', padding: '12px 24px', borderRadius: 12, background: GOLD, color: '#111', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>Cerrar</button>
          </div>
        ) : order ? (
          <div>
            {/* Order selector */}
            {orders.length > 1 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
                {orders.map(o => (
                  <button key={o.id} onClick={() => setSelected(o.id)} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 10, border: `1px solid ${selected === o.id ? GOLD : subtle}`, background: selected === o.id ? 'rgba(245,197,24,0.12)' : 'transparent', color: selected === o.id ? GOLD : muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    #{o.id}
                  </button>
                ))}
              </div>
            )}

            {/* Order header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.2)', marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: text }}>Pedido #{order.id}</div>
                <div style={{ fontSize: 12, color: muted }}>{STATUS_LABELS[order.status]} · {new Date(order.createdAt).toLocaleDateString('es-CO')}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: GOLD }}>{COP(order.total)}</div>
            </div>

            {/* Shipping progress */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: muted, marginBottom: 6 }}>
                <span>Progreso de envío</span>
                <span>{getShippingProgress(order.status)}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: subtle, overflow: 'hidden' }}>
                <div style={{ width: `${getShippingProgress(order.status)}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${GOLD}, ${order.status === 'delivered' ? '#2ecc71' : GOLD})`, transition: 'width 1s ease' }} />
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
                    <div style={{ fontSize: 13, fontWeight: 700, color: text }}>Tu llavero viene en curso</div>
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
                    <div style={{ fontSize: 13, fontWeight: 600, color: text }}>{item.productName}</div>
                    <div style={{ fontSize: 11, color: muted }}>{item.color.name} · {item.plateText} · x{item.quantity}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: text }}>{COP(item.total)}</div>
                </div>
              ))}
            </div>

            {/* Shipping info */}
            <div style={{ padding: 12, borderRadius: 10, background: cardBg, border: `1px solid ${subtle}`, fontSize: 12, color: muted, marginBottom: 14 }}>
              <div style={{ fontWeight: 600, color: text, marginBottom: 4 }}>Datos de envío</div>
              <div>{order.name}</div>
              <div>{order.address}, {order.city}</div>
              <div>{order.phone} · {order.email}</div>
            </div>

            {/* Buy another */}
            <button onClick={onClose} style={{ display: 'block', width: '100%', textAlign: 'center', padding: 14, borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 0 20px rgba(245,197,24,0.3)' }}>
              Cerrar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
