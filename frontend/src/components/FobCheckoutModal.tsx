'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FOB_PRODUCTS, productById, COP, startPayment, getStripeLink, FobOrder } from '@/lib/checkout'

interface Props {
  isOpen: boolean
  onClose: () => void
  theme: 'light' | 'dark'
  initialProductId?: string
  plate?: string
  defaultEmail?: string
}

const GOLD = '#F5C518'
const GREEN = '#2ecc71'

export default function FobCheckoutModal({ isOpen, onClose, theme, initialProductId, plate, defaultEmail }: Props) {
  const [productId, setProductId] = useState(initialProductId || 'std')
  const [qty, setQty] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [notes, setNotes] = useState('')
  const [channel, setChannel] = useState<null | 'stripe' | 'whatsapp'>(null)

  useEffect(() => {
    if (isOpen) {
      setProductId(initialProductId || 'std')
      setQty(1); setChannel(null)
      setEmail(defaultEmail || '')
    }
  }, [isOpen, initialProductId, defaultEmail])

  const isDark = theme === 'dark'
  const panelBg = isDark ? 'rgba(16,16,16,0.98)' : 'rgba(247,246,242,0.99)'
  const border = isDark ? 'rgba(245,197,24,0.22)' : 'rgba(17,17,17,0.12)'
  const subtle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.08)'
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)'
  const inputBg = isDark ? 'rgba(0,0,0,0.35)' : '#ffffff'
  const textPrimary = isDark ? '#f5f3ec' : '#17171a'
  const textMuted = isDark ? '#8f8a7a' : '#7a756a'

  const product = productById(productId)
  const total = product.price * qty
  const stripeReady = !!getStripeLink(productId)
  const canPay = name.trim() && /.+@.+\..+/.test(email) && phone.trim() && address.trim() && city.trim()

  const label: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '.08em' }
  const input: React.CSSProperties = { padding: '10px 12px', background: inputBg, border: `1px solid ${subtle}`, borderRadius: 11, fontSize: 13, color: textPrimary, outline: 'none', width: '100%', fontFamily: 'inherit' }

  const pay = () => {
    if (!canPay) return
    const order: FobOrder = {
      id: `LLV-${Date.now().toString(36).toUpperCase()}`,
      productId, productName: product.name, quantity: qty, unitPrice: product.price, total,
      name: name.trim(), email: email.trim(), phone: phone.trim(), address: address.trim(), city: city.trim(),
      plate, notes: notes.trim() || undefined, createdAt: new Date().toISOString(),
    }
    setChannel(startPayment(order))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 105, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} />

          <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 780, maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: panelBg, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,.6)', color: textPrimary }}>

            {/* Header */}
            <div style={{ padding: '18px 22px', borderBottom: `1px solid ${subtle}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 40, height: 40, borderRadius: 12, background: GOLD, color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="4.5" /><path d="M10.5 12.5 20 3M17 6l2 2M14 9l2 2" /></svg>
                </span>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Comprar tu llavero NFC</h2>
                  <p style={{ fontSize: 11.5, color: textMuted, margin: '2px 0 0' }}>Sin registro · pago seguro con Stripe</p>
                </div>
              </div>
              <button onClick={onClose} aria-label="Cerrar" style={{ width: 36, height: 36, borderRadius: 10, background: cardBg, border: `1px solid ${subtle}`, color: textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
              {channel ? (
                <div style={{ textAlign: 'center', padding: '20px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                  <span style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(46,204,113,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  </span>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{channel === 'stripe' ? 'Te llevamos al pago seguro' : 'Confirmemos tu pedido'}</h3>
                  <p style={{ margin: 0, fontSize: 13.5, color: textMuted, maxWidth: 420, lineHeight: 1.6 }}>
                    {channel === 'stripe'
                      ? 'Abrimos la página segura de Stripe para completar el pago de tu llavero. Si no se abrió, revisa las ventanas emergentes.'
                      : 'Abrimos WhatsApp con el detalle de tu pedido para coordinar el pago seguro y el envío. Nuestro equipo te confirma en minutos.'}
                  </p>
                  <button onClick={onClose} style={{ padding: '12px 22px', borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Entendido</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="grid2">
                  {/* Left: product + qty */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={label}>Elige tu llavero</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {FOB_PRODUCTS.map(p => {
                        const on = productId === p.id
                        return (
                          <button key={p.id} onClick={() => setProductId(p.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, textAlign: 'left', padding: '12px 14px', borderRadius: 13, cursor: 'pointer', background: on ? 'rgba(245,197,24,0.1)' : cardBg, border: `1.5px solid ${on ? GOLD : subtle}` }}>
                            <span>
                              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>{p.name}{p.premium && <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 800, color: '#111', background: GOLD, padding: '2px 6px', borderRadius: 6 }}>TOP</span>}</span>
                              <span style={{ display: 'block', fontSize: 11.5, color: textMuted, marginTop: 2 }}>{p.desc}</span>
                            </span>
                            <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 16, color: on ? GOLD : textPrimary, flex: '0 0 auto' }}>{COP(p.price)}</span>
                          </button>
                        )
                      })}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <div style={label}>Cantidad</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 34, height: 34, borderRadius: 9, background: cardBg, border: `1px solid ${subtle}`, color: textPrimary, fontSize: 18, cursor: 'pointer' }}>−</button>
                        <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, fontSize: 15 }}>{qty}</span>
                        <button onClick={() => setQty(q => Math.min(10, q + 1))} style={{ width: 34, height: 34, borderRadius: 9, background: cardBg, border: `1px solid ${subtle}`, color: textPrimary, fontSize: 18, cursor: 'pointer' }}>+</button>
                      </div>
                    </div>

                    <div style={{ marginTop: 6, padding: 14, borderRadius: 13, background: cardBg, border: `1px solid ${subtle}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: textMuted }}><span>Subtotal</span><span>{COP(total)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: textMuted, margin: '6px 0' }}><span>Envío</span><span>Gratis</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 8, borderTop: `1px solid ${subtle}` }}><span style={{ fontWeight: 700 }}>Total</span><span style={{ fontFamily: "'Anton',sans-serif", fontSize: 24, color: GOLD }}>{COP(total)}</span></div>
                    </div>
                  </div>

                  {/* Right: shipping + pay */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    <div style={label}>Datos de envío</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><label style={label}>Nombre completo</label><input value={name} onChange={e => setName(e.target.value)} style={input} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><label style={label}>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tucorreo@gmail.com" style={input} /></div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><label style={label}>WhatsApp</label><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+57 3xx xxx xxxx" style={input} /></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><label style={label}>Dirección</label><input value={address} onChange={e => setAddress(e.target.value)} placeholder="Calle 00 #00-00" style={input} /></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><label style={label}>Ciudad</label><input value={city} onChange={e => setCity(e.target.value)} placeholder="Bogotá D.C." style={input} /></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><label style={label}>Notas (opcional)</label><input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Grabado, referencia, etc." style={input} /></div>

                    <button onClick={pay} disabled={!canPay} style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '14px', borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 14.5, cursor: canPay ? 'pointer' : 'not-allowed', opacity: canPay ? 1 : 0.5 }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></svg>
                      {stripeReady ? `Pagar ${COP(total)} con Stripe` : `Continuar · ${COP(total)}`}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, color: textMuted }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      Pago seguro procesado por Stripe · sin necesidad de registro
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
