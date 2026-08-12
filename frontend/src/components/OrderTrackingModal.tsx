'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/store/theme'
import { useAuth } from '@/store/auth'
import { shopOrderApi } from '@/lib/api'
import { useRatingPrompts } from '@/lib/useRatingPrompts'
import { RatingPromptModal } from '@/components/RatingPrompt'
import type { ShopOrderDetail, ShopOrderPaymentStatus } from '@/lib/types'

const GOLD = '#F5C518'

const PAYMENT_STATUS_LABELS: Record<ShopOrderPaymentStatus, string> = {
  pending: 'Pago pendiente',
  approved: 'Pago confirmado',
  declined: 'Pago rechazado',
  voided: 'Pago anulado',
  error: 'Error en el pago',
}

const COP = (cents: number) => '$' + Math.round(cents / 100).toLocaleString('es-CO')

// "Mis pedidos" — modo cliente: siempre solo lo que compró quien está mirando,
// siempre de solo lectura (estado del pago + 3 pasos del envío). Adjuntar guía
// y mover las etapas es exclusivo del panel Admin NFC (app/admin/page.tsx,
// pestaña "Pedidos") — no vive acá aunque quien mire sea la cuenta admin.
export default function OrderTrackingModal({ isOpen, onClose, onBuyAnother }: { isOpen: boolean; onClose: () => void; onBuyAnother: () => void }) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const isDark = theme === 'dark'

  const [orders, setOrders] = useState<ShopOrderDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const { shouldPrompt, dismiss, submitReview } = useRatingPrompts()
  const [showDeliveredPrompt, setShowDeliveredPrompt] = useState(false)

  const bg = isDark ? 'rgba(14,14,14,0.95)' : 'rgba(255,255,255,0.97)'
  const text = isDark ? '#f5f3ec' : '#17171a'
  const muted = isDark ? '#8f8a7a' : '#6f6a5f'
  const subtle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,17,0.06)'
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'

  const load = useCallback(async () => {
    setLoading(true)
    const res = await shopOrderApi.list()
    setOrders(res ?? [])
    setLoading(false)
    // Sin polling — se revisa cada vez que se abre "Mis pedidos", no en vivo
    // mientras la app está inactiva (ver plan del feature de prompts).
    if ((res ?? []).some(o => o.fulfillment_status === 'delivered') && shouldPrompt('product')) {
      setShowDeliveredPrompt(true)
    }
  }, [shouldPrompt])

  // Un solo fetch al abrir — datos reales, ya no hay simulación local con
  // setInterval como antes.
  useEffect(() => {
    if (!isOpen || !user) return
    setSelected(null)
    load()
  }, [isOpen, user, load])

  useEffect(() => {
    if (orders.length > 0 && !selected) setSelected(orders[0].reference)
  }, [orders, selected])

  if (!isOpen) return null

  const backdropStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 74, background: 'rgba(4,4,4,0.74)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }
  const panelStyle: React.CSSProperties = { width: 480, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto', background: bg, border: `1px solid ${isDark ? 'rgba(245,197,24,0.22)' : 'rgba(17,17,17,0.1)'}`, borderRadius: 20, padding: 24, boxShadow: isDark ? '0 40px 90px rgba(0,0,0,.6)' : '0 40px 90px rgba(0,0,0,.12)' }
  const closeBtnStyle: React.CSSProperties = { width: 34, height: 34, borderRadius: 9, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(17,17,17,0.1)'}`, background: 'transparent', color: muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }

  // /app ya redirige a "/" si no hay sesión (app/page.tsx), así que en la
  // práctica esto no debería alcanzar a mostrarse — pero si "Mis pedidos" se
  // usa en algún lado sin ese guard más adelante, no debe reventar.
  if (!user) {
    return (
      <div onClick={onClose} style={backdropStyle}>
        <div onClick={e => e.stopPropagation()} className="modal-panel" style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, color: text }}>Mis pedidos</div>
            <button onClick={onClose} style={closeBtnStyle}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 6 }}>Inicia sesión para ver tus pedidos</div>
            <div style={{ fontSize: 13, color: muted, marginBottom: 20 }}>Necesitas tu cuenta para consultar el estado de tus compras.</div>
            <button onClick={onClose} style={{ display: 'inline-flex', padding: '12px 24px', borderRadius: 12, background: GOLD, color: '#111', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>Cerrar</button>
          </div>
        </div>
      </div>
    )
  }

  const order = orders.find(o => o.reference === selected) || orders[0]

  return (
    <>
    <div onClick={onClose} style={backdropStyle}>
      <div onClick={e => e.stopPropagation()} className="modal-panel" style={panelStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, color: text }}>Mis pedidos</div>
          <button onClick={onClose} style={closeBtnStyle}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 20px', fontSize: 13, color: muted }}>Cargando…</div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(245,197,24,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: text, marginBottom: 6 }}>Sin pedidos aún</div>
            <div style={{ fontSize: 13, color: muted, marginBottom: 20 }}>Cuando compres un llavero, tus pedidos aparecerán aquí</div>
            <button onClick={onBuyAnother} style={{ display: 'inline-flex', padding: '12px 24px', borderRadius: 12, background: GOLD, color: '#111', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>Comprar un llavero</button>
          </div>
        ) : order ? (
          <div>
            {/* Order selector */}
            {orders.length > 1 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
                {orders.map(o => (
                  <button key={o.reference} onClick={() => setSelected(o.reference)} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 10, border: `1px solid ${selected === o.reference ? GOLD : subtle}`, background: selected === o.reference ? 'rgba(245,197,24,0.12)' : 'transparent', color: selected === o.reference ? GOLD : muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    #{o.reference.slice(-8)}
                  </button>
                ))}
              </div>
            )}

            {/* Order header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.2)', marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: text }}>Pedido {order.reference}</div>
                <div style={{ fontSize: 12, color: muted }}>{new Date(order.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: GOLD }}>{COP(order.amount_in_cents)}</div>
            </div>

            {/* Estado */}
            {order.status !== 'approved' ? (
              <div style={{ padding: 14, borderRadius: 12, marginBottom: 16, textAlign: 'center', fontSize: 13, fontWeight: 700, background: order.status === 'pending' ? 'rgba(245,197,24,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${order.status === 'pending' ? 'rgba(245,197,24,0.3)' : 'rgba(239,68,68,0.3)'}`, color: order.status === 'pending' ? GOLD : '#ef4444' }}>
                {PAYMENT_STATUS_LABELS[order.status]}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                {(['Pagado', 'Enviado', 'Entregado'] as const).map((label, i) => {
                  const step = order.fulfillment_status === 'delivered' ? 3 : order.fulfillment_status === 'shipped' ? 2 : 1
                  const done = i + 1 <= step
                  return (
                    <div key={label} style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 8, background: done ? 'rgba(245,197,24,0.12)' : cardBg, border: `1px solid ${done ? GOLD : subtle}` }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: done ? GOLD : muted }}>{label}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {order.tracking_note && (
              <div style={{ fontSize: 12, color: muted, marginBottom: 14 }}><strong style={{ color: text }}>Seguimiento:</strong> {order.tracking_note}</div>
            )}

            {/* Item */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: GOLD, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: text }}>Llavero NFC CarLink</div>
                <div style={{ fontSize: 11, color: muted }}>Placa {order.plate_text} · x{order.quantity}</div>
              </div>
            </div>

            {/* Shipping info */}
            <div style={{ padding: 12, borderRadius: 10, background: cardBg, border: `1px solid ${subtle}`, fontSize: 12, color: muted, marginBottom: 14 }}>
              <div style={{ fontWeight: 600, color: text, marginBottom: 4 }}>Datos de envío</div>
              <div>{order.customer_name}</div>
              <div>{order.shipping_address}, {order.shipping_city}</div>
              <div>{order.customer_phone} · {order.customer_email}</div>
            </div>

            {/* Buy another — lo único que puede hacer acá quien compra */}
            <button onClick={onBuyAnother} style={{ display: 'block', width: '100%', textAlign: 'center', padding: 14, borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 0 20px rgba(245,197,24,0.3)' }}>
              Comprar otro
            </button>
          </div>
        ) : null}
      </div>
    </div>
    {showDeliveredPrompt && (
      <RatingPromptModal
        title="¿Qué tal el llavero NFC?"
        hint="Tu pedido ya fue entregado — contanos qué te pareció el producto."
        targetType="product"
        onSubmit={(rating, comment) => submitReview({ target_type: 'product', rating, comment })}
        onDismiss={() => { dismiss('product'); setShowDeliveredPrompt(false) }}
      />
    )}
    </>
  )
}
