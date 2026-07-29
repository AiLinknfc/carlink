'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PLATE_COLOR_SCHEMES, COP, processPayment, type ShopOrder } from '@/lib/shop'
import { SUPPORT_WHATSAPP } from '@/lib/checkout'
import { getPlateDisplay } from '@/lib/plate'
import { CITIES } from '@/lib/constants'

const GOLD = '#F5C518'

type Step = 'customize' | 'shipping' | 'payment' | 'done'

interface Props {
  isOpen: boolean
  onClose: () => void
  theme: 'light' | 'dark'
  plateText: string
  plateType: string
  city: string
}

const PLATE_TYPES = [
  { id: 'particular', name: 'Particular', letterLen: 3, numLen: 3 },
  { id: 'moto', name: 'Moto', letterLen: 3, numLen: 3, moto: true },
  { id: 'publico', name: 'Público', letterLen: 3, numLen: 3 },
  { id: 'diplomatica', name: 'Diplomática', letterLen: 2, numLen: 4 },
  { id: 'carga', name: 'Carga', letterLen: 3, numLen: 3 },
  { id: 'remolque', name: 'Remolque', letterLen: 1, numLen: 5 },
  { id: 'clasico', name: 'Clásico', letterLen: 3, numLen: 3 },
]

const PLATE_BG: Record<string, { bg: string; ink: string; label: string }> = {
  particular:  { bg: 'linear-gradient(178deg,#F8D64B 0%,#F2C21A 62%,#E7B412 100%)', ink: '#111116', label: '#141414' },
  moto:        { bg: 'linear-gradient(178deg,#F8D64B 0%,#F2C21A 62%,#E7B412 100%)', ink: '#111116', label: '#141414' },
  publico:     { bg: 'linear-gradient(178deg,#ffffff 0%,#eef0f2 60%,#dde1e6 100%)', ink: '#0c1a12', label: '#0c1a12' },
  diplomatica: { bg: 'linear-gradient(178deg,#2340d6 0%,#1531a8 60%,#0f2688 100%)', ink: '#ffffff', label: '#ffffff' },
  carga:       { bg: 'linear-gradient(178deg,#cc2222 0%,#a81818 60%,#8a1212 100%)', ink: '#ffffff', label: '#ffffff' },
  remolque:    { bg: 'linear-gradient(178deg,#1a6b3c 0%,#145530 60%,#0f4426 100%)', ink: '#ffffff', label: '#ffffff' },
  clasico:     { bg: 'linear-gradient(90deg,#2e4a75 0%,#2e4a75 22%,#e8e0d0 22%,#e8e0d0 78%,#2e4a75 78%,#2e4a75 100%)', ink: '#111116', label: '#2e4a75' },
}

const PLATE_TAGS: Record<string, string> = {
  particular: '', moto: '', publico: 'PÚBLICO', diplomatica: 'CD', carga: 'CARGA', remolque: '', clasico: 'ANTIGUO',
}

const PAYMENT_METHODS = [
  { id: 'card', name: 'Tarjeta de crédito / débito', icon: '💳' },
  { id: 'nequi', name: 'Nequi', icon: '📱' },
  { id: 'bancolombia', name: 'Bancolombia', icon: '🏦' },
  { id: 'whatsapp', name: 'WhatsApp (pago contraentrega)', icon: '💬' },
]

export default function CartModal({ isOpen, onClose, theme, plateText: initialPlateText, plateType: initialPlateType, city: initialCity }: Props) {
  const isDark = theme === 'dark'
  const bg = isDark ? 'rgba(14,14,14,0.98)' : 'rgba(255,255,255,0.99)'
  const border = isDark ? 'rgba(245,197,24,0.18)' : 'rgba(17,17,17,0.1)'
  const subtle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,17,0.06)'
  const text = isDark ? '#f5f3ec' : '#17171a'
  const muted = isDark ? '#8f8a7a' : '#6f6a5f'
  const label = isDark ? '#7c786e' : '#8a8578'
  const inputBg = isDark ? 'rgba(0,0,0,0.3)' : '#fff'
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'
  const menuBg = isDark ? '#141414' : '#ffffff'
  const menuBorder = isDark ? 'rgba(245,197,24,0.25)' : 'rgba(17,17,17,0.12)'
  const menuHover = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,17,0.05)'
  const citySelect = isDark ? '#f5f3ec' : '#17171a'

  const [step, setStep] = useState<Step>('customize')
  const [selectedType, setSelectedType] = useState(initialPlateType)
  const [plateLetters, setPlateLetters] = useState(() => initialPlateText.split('-')[0] || '')
  const [plateNumbers, setPlateNumbers] = useState(() => initialPlateText.split('-')[1] || '')
  const [plateCity, setPlateCity] = useState(initialCity)
  const [cityOpen, setCityOpen] = useState(false)
  const [qty, setQty] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [shipCity, setShipCity] = useState('')
  const [payMethod, setPayMethod] = useState('card')
  const [orderId, setOrderId] = useState('')
  const [notes, setNotes] = useState('')
  const cityRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const currentType = PLATE_TYPES.find(t => t.id === selectedType) || PLATE_TYPES[0]
  const pBg = PLATE_BG[selectedType] || PLATE_BG.particular
  const plateColors = PLATE_COLOR_SCHEMES[selectedType] || PLATE_COLOR_SCHEMES.particular
  const fullPlate = `${plateLetters}-${plateNumbers}`
  const displayPlate = getPlateDisplay(fullPlate)
  const productPrice = 49900
  const total = productPrice * qty
  const canContinue = plateLetters.trim().length >= currentType.letterLen && plateNumbers.trim().length >= (currentType.moto ? 2 : currentType.numLen) && plateCity.trim().length > 0
  const canPay = name.trim() && /.+@.+\..+/.test(email) && phone.trim() && address.trim() && shipCity.trim()

  const inputStyle: React.CSSProperties = {
    padding: '10px 12px', background: inputBg, border: `1px solid ${subtle}`,
    borderRadius: 10, fontSize: 13, color: text, outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box',
  }
  const fieldLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase' as const, letterSpacing: '.1em', marginBottom: 4,
  }

  const handleLetters = (v: string) => {
    setPlateLetters(v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, currentType.letterLen))
  }
  const handleNumbers = (v: string) => {
    const raw = v.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (currentType.moto) {
      const digits = raw.replace(/[^0-9]/g, '').slice(0, 2)
      const letter = raw.replace(/[^A-Z]/g, '').slice(0, 1)
      setPlateNumbers(digits + letter)
    } else {
      setPlateNumbers(raw.replace(/[^0-9]/g, '').slice(0, currentType.numLen))
    }
  }

  const handlePay = () => {
    if (!canPay) return
    const id = `CL-${Date.now().toString(36).toUpperCase()}`
    const order: ShopOrder = {
      id,
      items: [{ id: `${id}-item`, productId: 'fob-std', productName: 'Llavero NFC CarLink', color: { id: 'gold', name: 'Dorado CarLink', hex: '#F5C518', ring: 'rgba(245,197,24,0.5)' }, plateText: fullPlate, plateType: selectedType, quantity: qty, unitPrice: productPrice, total }],
      total,
      name: name.trim(), email: email.trim(), phone: phone.trim(), address: address.trim(), city: shipCity.trim(),
      paymentMethod: payMethod as ShopOrder['paymentMethod'],
      status: 'pending', createdAt: new Date().toISOString(),
      estimatedDelivery: new Date(Date.now() + 5 * 86400000).toISOString(),
    }
    processPayment(order)
    setOrderId(id)
    setStep('done')
  }

  const reset = () => {
    setStep('customize')
    setSelectedType(initialPlateType)
    setPlateLetters(initialPlateText.split('-')[0] || '')
    setPlateNumbers(initialPlateText.split('-')[1] || '')
    setPlateCity(initialCity)
    setQty(1)
    setName(''); setEmail(''); setPhone(''); setAddress(''); setShipCity(''); setNotes('')
    setOrderId(''); setPayMethod('card'); setCityOpen(false)
  }

  const stepLabels = ['Tu placa', 'Envío', 'Pago', 'Listo']
  const stepIdx = step === 'customize' ? 0 : step === 'shipping' ? 1 : step === 'payment' ? 2 : 3

  const miniPlateTag = PLATE_TAGS[selectedType]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(8px,3vw,20px)' }}>
          <div onClick={() => { reset(); onClose() }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} />
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto', background: bg, border: `1px solid ${border}`, borderRadius: 18, boxShadow: '0 40px 100px rgba(0,0,0,.6)', color: text }}>

            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${subtle}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: bg, zIndex: 2, borderRadius: '18px 18px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, background: GOLD, color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
                </span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>Comprar llavero NFC</div>
                  <div style={{ fontSize: 11, color: muted }}>Confirma los datos de tu placa</div>
                </div>
              </div>
              <button onClick={() => { reset(); onClose() }} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${subtle}`, background: 'transparent', color: muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Steps indicator */}
            {step !== 'done' && (
              <div style={{ display: 'flex', gap: 4, padding: '12px 20px 0' }}>
                {stepLabels.map((l, i) => (
                  <div key={l} style={{ flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 8, background: i <= stepIdx ? 'rgba(245,197,24,0.12)' : cardBg, border: `1px solid ${i <= stepIdx ? GOLD : subtle}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: i <= stepIdx ? GOLD : muted }}>{l}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ padding: '16px 20px 20px' }}>
              {step === 'done' ? (
                /* ─── CONFIRMATION ─── */
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(46,204,113,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.2"><path d="M20 6L9 17l-5-5"/></svg>
                    </div>
                  </motion.div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Pedido confirmado</div>
                  <div style={{ fontSize: 13, color: muted, marginBottom: 4 }}>Tu llavero viene en curso</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: GOLD, marginBottom: 20 }}>#{orderId}</div>
                  <div style={{ padding: 16, borderRadius: 14, background: cardBg, border: `1px solid ${subtle}`, marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                      <div style={{ position: 'relative', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {[0, 1, 2].map(i => (
                          <div key={i} style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `2px solid ${GOLD}`, opacity: 0, animation: `nfcRipple 2.6s ease-out infinite`, animationDelay: `${i * 0.85}s` }} />
                        ))}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>Llega en 5 días hábiles</div>
                        <div style={{ fontSize: 11, color: muted }}>Envío a domicilio gratis</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { reset(); onClose() }} style={{ flex: 1, padding: 11, borderRadius: 10, border: `1px solid ${subtle}`, background: 'transparent', color: muted, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cerrar</button>
                    <button onClick={reset} style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: 'rgba(245,197,24,0.12)', color: GOLD, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Comprar otro</button>
                  </div>
                </div>
              ) : step === 'customize' ? (
                /* ─── STEP 1: PLATE + CITY + TYPES ─── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Plate preview + Type chips side by side */}
                  <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
                    {/* Mini plate (left) */}
                    <div style={{ flex: '0 0 auto' }}>
                      <div style={{
                        width: 200, height: 78, borderRadius: 8,
                        background: pBg.bg,
                        boxShadow: '0 12px 30px rgba(0,0,0,.45), inset 0 2px 0 rgba(255,255,255,.4), inset 0 -4px 10px rgba(90,60,0,.18)',
                        display: 'flex', flexDirection: 'column',
                        position: 'relative', overflow: 'hidden',
                        cursor: 'default',
                      }}>
                        {miniPlateTag && (
                          <div style={{
                            position: 'absolute', top: 4, right: 6,
                            fontSize: 7, fontWeight: 800, letterSpacing: '.12em',
                            border: `1px solid ${pBg.label}`, borderRadius: 3,
                            padding: '1px 4px', color: pBg.label,
                          }}>
                            {miniPlateTag}
                          </div>
                        )}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{
                            fontFamily: 'var(--font-display)', fontSize: 38, letterSpacing: '.03em',
                            color: pBg.ink, textShadow: '0 1px 0 rgba(255,255,255,.22)',
                          }}>
                            {displayPlate || 'ABC-123'}
                          </span>
                        </div>
                        <div style={{
                          textAlign: 'center', fontSize: 9, fontWeight: 700,
                          letterSpacing: '.26em', textIndent: '.26em',
                          textTransform: 'uppercase', color: pBg.label,
                          paddingBottom: 6, marginTop: -4,
                        }}>
                          {plateCity || 'CIUDAD'}
                        </div>
                        {/* Shine overlay */}
                        <div style={{
                          position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%',
                          background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,.5) 48%, transparent 66%)',
                          animation: 'shineSweep 6s ease-in-out infinite',
                          pointerEvents: 'none',
                        }} />
                      </div>
                    </div>

                    {/* Type chips (right) */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={fieldLabel}>Tipo de placa</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                        {PLATE_TYPES.map(pt => {
                          const on = selectedType === pt.id
                          return (
                            <button key={pt.id} onClick={() => { setSelectedType(pt.id); setPlateLetters(''); setPlateNumbers('') }} title={pt.name}
                              style={{
                                padding: '5px 0', borderRadius: 6,
                                border: `1.5px solid ${on ? GOLD : subtle}`,
                                background: on ? 'rgba(245,197,24,0.14)' : cardBg,
                                color: on ? GOLD : muted,
                                fontWeight: 700, fontSize: 10, cursor: 'pointer',
                                transition: 'all .15s', textAlign: 'center',
                              }}>
                              {pt.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Plate + City row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="grid2">
                    {/* City input */}
                    <div style={{ position: 'relative' }} ref={cityRef}>
                      <div style={fieldLabel}>Ciudad de la placa</div>
                      <button onClick={() => setCityOpen(!cityOpen)} type="button"
                        style={{ width: '100%', height: 42, padding: '0 12px', background: cardBg, border: `1px solid ${subtle}`, borderRadius: 10, color: plateCity ? citySelect : label, fontSize: 13, fontWeight: 500, outline: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', fontFamily: 'inherit' }}>
                        <span>{plateCity || 'Selecciona'}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, transform: cityOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flex: '0 0 auto' }}>
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                      {cityOpen && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                        marginTop: 4, maxHeight: 180, overflowY: 'auto',
                        background: menuBg, border: `1px solid ${menuBorder}`,
                        borderRadius: 10, boxShadow: '0 16px 48px rgba(0,0,0,.6)',
                      }}>
                        {CITIES.map(c => (
                          <button key={c} onClick={() => { setPlateCity(c); setCityOpen(false) }} type="button"
                            style={{
                              display: 'block', width: '100%', padding: '8px 12px', border: 'none',
                              background: plateCity === c ? 'rgba(245,197,24,0.15)' : 'transparent',
                              color: plateCity === c ? GOLD : citySelect,
                              fontSize: 13, fontWeight: plateCity === c ? 700 : 500,
                              textAlign: 'left', cursor: 'pointer',
                            }}
                            onMouseEnter={e => { if (plateCity !== c) e.currentTarget.style.background = menuHover }}
                            onMouseLeave={e => { if (plateCity !== c) e.currentTarget.style.background = 'transparent' }}>
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                    </div>

                    {/* Plate input */}
                    <div>
                      <div style={fieldLabel}>Número de placa</div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 0,
                        background: cardBg, border: `1px solid ${subtle}`, borderRadius: 10, padding: '0 12px', height: 42,
                      }}>
                        <input value={plateLetters} onChange={e => handleLetters(e.target.value)}
                          maxLength={currentType.letterLen} placeholder={'A'.repeat(currentType.letterLen)}
                          style={{ width: 48, border: 'none', background: 'transparent', color: GOLD, fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '.06em', textTransform: 'uppercase', outline: 'none', padding: '2px 0', textAlign: 'right' }} />
                        <span style={{ color: GOLD, fontFamily: 'var(--font-display)', fontSize: 20, lineHeight: 1, opacity: 0.5, padding: '0 4px' }}>-</span>
                        <input value={plateNumbers} onChange={e => handleNumbers(e.target.value)}
                          maxLength={currentType.moto ? 3 : currentType.numLen} placeholder={currentType.moto ? '12D' : '123'}
                          style={{ width: 48, border: 'none', background: 'transparent', color: GOLD, fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '.06em', textTransform: 'uppercase', outline: 'none', padding: '2px 0', textAlign: 'left' }} />
                      </div>
                    </div>
                  </div>

                  {/* Quantity */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={fieldLabel}>Cantidad</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${subtle}`, background: 'transparent', color: text, fontSize: 16, cursor: 'pointer' }}>−</button>
                      <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{qty}</span>
                      <button onClick={() => setQty(q => Math.min(10, q + 1))} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${subtle}`, background: 'transparent', color: text, fontSize: 16, cursor: 'pointer' }}>+</button>
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{ padding: '12px 14px', borderRadius: 12, background: cardBg, border: `1px solid ${subtle}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Total</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: GOLD }}>{COP(total)}</span>
                  </div>

                  <button onClick={() => canContinue && setStep('shipping')} disabled={!canContinue}
                    style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 14, cursor: canContinue ? 'pointer' : 'not-allowed', opacity: canContinue ? 1 : 0.5 }}>
                    Continuar
                  </button>
                </div>
              ) : step === 'shipping' ? (
                /* ─── STEP 2: SHIPPING ─── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 12, color: muted, marginBottom: 2 }}>La ciudad de envío puede ser diferente a la ciudad de la placa ({plateCity}).</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="grid2">
                    <div><div style={fieldLabel}>Nombre</div><input value={name} onChange={e => setName(e.target.value)} placeholder="Juan Pérez" style={inputStyle} /></div>
                    <div><div style={fieldLabel}>Email</div><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@gmail.com" style={inputStyle} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="grid2">
                    <div><div style={fieldLabel}>WhatsApp</div><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+57 3xx xxx xxxx" style={inputStyle} /></div>
                    <div><div style={fieldLabel}>Ciudad de envío</div><input value={shipCity} onChange={e => setShipCity(e.target.value)} placeholder="Bogotá D.C." style={inputStyle} /></div>
                  </div>
                  <div><div style={fieldLabel}>Dirección</div><input value={address} onChange={e => setAddress(e.target.value)} placeholder="Calle 00 #00-00" style={inputStyle} /></div>
                  <div><div style={fieldLabel}>Notas (opcional)</div><input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Referencia, indicaciones, etc." style={inputStyle} /></div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setStep('customize')} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${subtle}`, background: 'transparent', color: muted, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Atrás</button>
                    <button onClick={() => canPay && setStep('payment')} disabled={!canPay} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 13, cursor: canPay ? 'pointer' : 'not-allowed', opacity: canPay ? 1 : 0.5 }}>Al pago</button>
                  </div>
                </div>
              ) : (
                /* ─── STEP 3: PAYMENT ─── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Order summary */}
                  <div style={{ padding: 12, borderRadius: 12, background: cardBg, border: `1px solid ${subtle}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 80, height: 39, borderRadius: 5,
                        background: pBg.bg,
                        display: 'flex', flexDirection: 'column',
                        position: 'relative', overflow: 'hidden',
                        flex: '0 0 auto',
                        boxShadow: '0 4px 12px rgba(0,0,0,.3)',
                      }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: pBg.ink, letterSpacing: '.02em' }}>{displayPlate}</span>
                        </div>
                        <div style={{ textAlign: 'center', fontSize: 4, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: pBg.label, paddingBottom: 3 }}>{plateCity}</div>
                        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%', background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,.4) 48%, transparent 66%)', pointerEvents: 'none' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>Llavero NFC CarLink</div>
                        <div style={{ fontSize: 11, color: muted }}>Placa {fullPlate} · {plateCity} · x{qty}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: GOLD }}>{COP(total)}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '.08em' }}>Método de pago</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {PAYMENT_METHODS.map(pm => (
                      <button key={pm.id} onClick={() => setPayMethod(pm.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 600, background: payMethod === pm.id ? 'rgba(245,197,24,0.12)' : cardBg, border: `1.5px solid ${payMethod === pm.id ? GOLD : subtle}`, color: payMethod === pm.id ? text : muted, transition: 'all .12s' }}>
                        <span style={{ fontSize: 18 }}>{pm.icon}</span>
                        <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${payMethod === pm.id ? GOLD : '#6f6a5f'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>{payMethod === pm.id && <span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD }} />}</span>
                        {pm.name}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setStep('shipping')} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${subtle}`, background: 'transparent', color: muted, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Atrás</button>
                    <button onClick={handlePay} disabled={!canPay} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 13, cursor: canPay ? 'pointer' : 'not-allowed', opacity: canPay ? 1 : 0.5 }}>Pagar {COP(total)}</button>
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
