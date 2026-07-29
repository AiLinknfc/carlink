'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useShopCart } from '@/lib/shop-cart-context'
import { COP, processPayment, type ShopOrder, type PaymentChannel } from '@/lib/shop'
import { useTheme } from '@/store/theme'

const GOLD = '#F5C518'

type Step = 'form' | 'payment' | 'done'

const PAYMENT_METHODS = [
  { id: 'card', name: 'Tarjeta de crédito / débito', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg> },
  { id: 'nequi', name: 'Nequi', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg> },
  { id: 'bancolombia', name: 'Bancolombia', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4"/></svg> },
  { id: 'whatsapp', name: 'WhatsApp (pago contraentrega)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg> },
]

export default function CheckoutClient() {
  const { cart, clear } = useShopCart()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [step, setStep] = useState<Step>('form')
  const [payMethod, setPayMethod] = useState('card')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [notes, setNotes] = useState('')
  const [orderId, setOrderId] = useState('')

  const border = isDark ? 'rgba(245,197,24,0.15)' : 'rgba(17,17,17,0.08)'
  const subtle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,17,0.06)'
  const text = isDark ? '#f5f3ec' : '#17171a'
  const muted = isDark ? '#8f8a7a' : '#6f6a5f'
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'
  const inputBg = isDark ? 'rgba(0,0,0,0.3)' : '#fff'

  const canPay = name.trim() && /.+@.+\..+/.test(email) && phone.trim() && address.trim() && city.trim()

  const inputStyle: React.CSSProperties = {
    padding: '10px 12px', background: inputBg, border: `1px solid ${subtle}`,
    borderRadius: 10, fontSize: 13, color: text, outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4,
  }

  const handlePay = () => {
    if (!canPay) return
    const id = `CL-${Date.now().toString(36).toUpperCase()}`
    const order: ShopOrder = {
      id,
      items: cart.items,
      total: cart.total,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      paymentMethod: payMethod as ShopOrder['paymentMethod'],
      status: 'pending',
      createdAt: new Date().toISOString(),
      estimatedDelivery: new Date(Date.now() + 5 * 86400000).toISOString(),
      notes: notes.trim() || undefined,
    }
    processPayment(order)
    setOrderId(id)
    clear()
    setStep('done')
  }

  if (cart.items.length === 0 && step !== 'done') {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(245,197,24,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Tu carrito está vacío</div>
        <div style={{ fontSize: 14, color: muted, marginBottom: 24 }}>Agrega un llavero NFC para continuar</div>
        <a href="/shop" style={{ display: 'inline-flex', padding: '12px 24px', borderRadius: 12, background: GOLD, color: '#111', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Ver tienda</a>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div style={{ maxWidth: 500, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(46,204,113,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.2"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
        </motion.div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Pedido confirmado</div>
        <div style={{ fontSize: 14, color: muted, marginBottom: 6 }}>Tu llavero viene en camino</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: GOLD, marginBottom: 24 }}>Pedido #{orderId}</div>

        {/* Waiting counter */}
        <div style={{ padding: 20, borderRadius: 16, background: cardBg, border: `1px solid ${subtle}`, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 12 }}>
            <div style={{ position: 'relative', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${GOLD}`, opacity: 0, animation: `nfcRipple 2.6s ease-out infinite`, animationDelay: `${i * 0.85}s` }} />
              ))}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Tu llavero viene en curso</div>
              <div style={{ fontSize: 12, color: muted }}>Llega en 3-5 días hábiles</div>
            </div>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: subtle, overflow: 'hidden' }}>
            <div style={{ width: '15%', height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${GOLD}, #2ecc71)`, animation: 'progressPulse 2s ease-in-out infinite' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <a href="/shop/orders" style={{ padding: '11px 22px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: text, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>Ver mis pedidos</a>
          <a href="/shop" style={{ padding: '11px 22px', borderRadius: 10, border: 'none', background: GOLD, color: '#111', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Comprar otro</a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px clamp(16px,4vw,40px)' }}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Checkout</div>
      <div style={{ fontSize: 13, color: muted, marginBottom: 24 }}>Completa tus datos para recibir tu llavero</div>

      {/* Steps */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {[['1', 'Datos'], ['2', 'Pago'], ['3', 'Listo']].map(([n, l], i) => (
          <div key={n} style={{ flex: 1, textAlign: 'center', padding: 10, borderRadius: 12, background: i <= (step === 'form' ? 0 : 1) ? 'rgba(245,197,24,0.12)' : cardBg, border: `1px solid ${i <= (step === 'form' ? 0 : 1) ? GOLD : subtle}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: i <= (step === 'form' ? 0 : 1) ? GOLD : muted }}>{n}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: i <= (step === 'form' ? 0 : 1) ? text : muted }}>{l}</div>
          </div>
        ))}
      </div>

      {step === 'form' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="grid2">
            <div>
              <div style={labelStyle}>Nombre completo</div>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Juan Pérez" style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>Email</div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@gmail.com" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="grid2">
            <div>
              <div style={labelStyle}>WhatsApp</div>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+57 3xx xxx xxxx" style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>Ciudad</div>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="Bogotá D.C." style={inputStyle} />
            </div>
          </div>
          <div>
            <div style={labelStyle}>Dirección de envío</div>
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Calle 00 #00-00" style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Notas (opcional)</div>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Instrucciones de entrega" style={inputStyle} />
          </div>
          <button onClick={() => canPay && setStep('payment')} disabled={!canPay} style={{
            padding: 14, borderRadius: 12, border: 'none', background: GOLD, color: '#111',
            fontWeight: 800, fontSize: 14, cursor: canPay ? 'pointer' : 'not-allowed', opacity: canPay ? 1 : 0.5,
          }}>Continuar al pago</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Order summary */}
          <div style={{ padding: 16, borderRadius: 14, background: cardBg, border: `1px solid ${subtle}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Resumen del pedido</div>
            {cart.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: i > 0 ? `1px solid ${subtle}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: item.color.hex, border: `1px solid ${item.color.ring}` }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.productName}</div>
                    <div style={{ fontSize: 11, color: muted }}>{item.color.name} x{item.quantity}</div>
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: GOLD }}>{COP(item.total)}</div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 6, borderTop: `1px solid ${subtle}` }}>
              <span style={{ fontWeight: 700 }}>Total</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: GOLD }}>{COP(cart.total)}</span>
            </div>
          </div>

          {/* Payment methods */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Método de pago</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PAYMENT_METHODS.map(pm => {
                const active = payMethod === pm.id
                return (
                  <button key={pm.id} onClick={() => setPayMethod(pm.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12,
                    cursor: 'pointer', textAlign: 'left', fontSize: 14, fontWeight: 600,
                    background: active ? 'rgba(245,197,24,0.12)' : cardBg,
                    border: `1.5px solid ${active ? GOLD : subtle}`,
                    color: active ? text : muted, transition: 'all .15s',
                  }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${active ? GOLD : '#6f6a5f'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                      {active && <span style={{ width: 8, height: 8, borderRadius: '50%', background: GOLD }} />}
                    </span>
                    {pm.icon}
                    {pm.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep('form')} style={{ flex: 1, padding: 13, borderRadius: 12, border: `1px solid ${subtle}`, background: 'transparent', color: muted, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Atrás</button>
            <button onClick={handlePay} style={{ flex: 2, padding: 13, borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 0 24px rgba(245,197,24,0.4)' }}>
              Pagar {COP(cart.total)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
