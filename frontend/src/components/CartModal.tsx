'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PLATE_COLOR_SCHEMES, COP } from '@/lib/shop'
import { SUPPORT_WHATSAPP } from '@/lib/checkout'
import { getPlateDisplay, getPlateConfig, type PlateType } from '@/lib/plate'
import { apiGet, apiPost } from '@/lib/api'
import { openWompiCheckout } from '@/lib/wompi'
import Plate3D from '@/components/Plate3D'
import { Icon } from '@/lib/icons_new'
import { CITIES } from '@/lib/constants'

const GOLD = '#F5C518'

// apiPost/apiGet no tienen timeout propio (heredado de lib/api.ts, usado en
// toda la app) — si `getAccessToken()` o el fetch se cuelgan sin lanzar
// error, el botón de pago se quedaba en "Procesando..." para siempre sin
// ninguna pista de qué falló. Esto lo convierte en un error visible a los
// 12s en vez de un cuelgue silencioso.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} tardó demasiado (¿problema de red?)`)), ms)
    promise.then(v => { clearTimeout(timer); resolve(v) }, e => { clearTimeout(timer); reject(e) })
  })
}

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
  { id: 'particular', name: 'Particular', letterLen: 3, numLen: 3, showLabel: false },
  { id: 'moto', name: 'Moto', letterLen: 3, numLen: 3, moto: true, showLabel: false },
  { id: 'publico', name: 'Público', letterLen: 3, numLen: 3, showLabel: false },
  { id: 'diplomatica', name: 'Diplomática', letterLen: 2, numLen: 4, showLabel: true },
  { id: 'carga', name: 'Carga', letterLen: 1, numLen: 4, showLabel: true },
  { id: 'remolque', name: 'Remolque', letterLen: 1, numLen: 5, showLabel: true },
  { id: 'clasico', name: 'Clásico', letterLen: 3, numLen: 3, showLabel: false },
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

// Wompi ya ofrece tarjeta, Nequi, PSE y botón Bancolombia dentro de su propio
// widget — tener 3 radios separados para eso era la maqueta (ninguno cambiaba
// el cobro real). Queda un solo método real + el respaldo manual de WhatsApp.
const PAYMENT_METHODS = [
  { id: 'wompi', name: 'Tarjeta, Nequi, PSE o Bancolombia', icon: 'CreditCard' as const },
  { id: 'whatsapp', name: 'Coordinar pago por WhatsApp', icon: 'MessageCircle' as const },
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
  const [selectedType, setSelectedType] = useState('')
  const [plateLetters, setPlateLetters] = useState('')
  const [plateNumbers, setPlateNumbers] = useState('')
  const [plateCity, setPlateCity] = useState('')
  const [cityOpen, setCityOpen] = useState(false)
  const [citySelected, setCitySelected] = useState(false)
  const [plateExists, setPlateExists] = useState(false)
  const [plateOwnedByYou, setPlateOwnedByYou] = useState(false)
  const [plateChecking, setPlateChecking] = useState(false)
  const [qty, setQty] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [shipCity, setShipCity] = useState('')
  const [payMethod, setPayMethod] = useState('wompi')
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [touched, setTouched] = useState({ letters: false, numbers: false, city: false })
  const [typeConfirmed, setTypeConfirmed] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [notes, setNotes] = useState('')
  const [shipCityOpen, setShipCityOpen] = useState(false)
  const [shipCitySelected, setShipCitySelected] = useState(false)
  // Escape hatch para quien vive en un pueblo que no está en CITIES (esa
  // lista son ~32 departamentos con sus ciudades principales, no los 1.100+
  // municipios de Colombia) — sin esto, esa persona no podía terminar la
  // compra de ninguna manera.
  const [shipCityFreeform, setShipCityFreeform] = useState(false)
  const cityRef = useRef<HTMLDivElement>(null)
  const shipCityRef = useRef<HTMLDivElement>(null)
  const lettersRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false)
      if (shipCityRef.current && !shipCityRef.current.contains(e.target as Node)) setShipCityOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const currentType = PLATE_TYPES.find(t => t.id === selectedType) || PLATE_TYPES[0]
  const pBg = PLATE_BG[selectedType] || PLATE_BG.particular
  const plateColors = PLATE_COLOR_SCHEMES[selectedType] || PLATE_COLOR_SCHEMES.particular
  const fullPlate = `${plateLetters}-${plateNumbers}`
  const displayPlate = getPlateDisplay(fullPlate)
  const platePlaceholder = getPlateConfig((currentType.id || 'particular') as PlateType).placeholder
  const [placeholderLetters, placeholderNumbers] = platePlaceholder.split('-')
  // La mini placa nunca debe verse vacía: si aún no hay letras ni números, mostramos el
  // ejemplo del tipo seleccionado; en cuanto la persona escribe algo, se ve lo escrito.
  const previewPlate = (plateLetters || plateNumbers) ? fullPlate : platePlaceholder
  const productPrice = 49900
  const total = productPrice * qty

  const isTypeOk = typeConfirmed && selectedType !== ''
  const isLettersOk = touched.letters && plateLetters.trim().length >= currentType.letterLen
  const isNumbersOk = touched.numbers && plateNumbers.trim().length >= (currentType.moto ? 2 : currentType.numLen)
  const isCityOk = citySelected && plateCity.trim().length > 0
  const canContinue = isTypeOk && isLettersOk && isNumbersOk && isCityOk && !plateExists && !plateChecking

  const isEmailValid = /.+@.+\..+/.test(email)
  const isPhoneValid = /^\d{10}$/.test(phone)
  const isShipCityOk = (shipCitySelected && CITIES.includes(shipCity)) || (shipCityFreeform && shipCity.trim().length >= 2)
  const canPay = !!name.trim() && isEmailValid && isPhoneValid && address.trim().length >= 5 && isShipCityOk
  const shipCityMatches = shipCity.trim()
    ? CITIES.filter(c => c.toLowerCase().includes(shipCity.trim().toLowerCase()))
    : CITIES

  // Antes de dejar avanzar la compra, confirmamos contra la base real si la
  // placa ya está asociada a un vehículo existente (GET /vehicles/plate-check,
  // público, no requiere sesión). Si es de otra cuenta hay que verificar
  // identidad; si es de la cuenta logueada, es un posible reemplazo/duplicado
  // — en ambos casos se bloquea "Continuar" y se pide contactar soporte.
  useEffect(() => {
    if (!(isLettersOk && isNumbersOk && isCityOk)) {
      setPlateExists(false)
      setPlateOwnedByYou(false)
      setPlateChecking(false)
      return
    }
    let cancelled = false
    setPlateChecking(true)
    const timer = setTimeout(async () => {
      const res = await apiGet<{ exists: boolean; owned_by_you: boolean }>(`/vehicles/plate-check?plate=${encodeURIComponent(fullPlate)}`)
      if (cancelled) return
      setPlateExists(res?.exists ?? false)
      setPlateOwnedByYou(res?.owned_by_you ?? false)
      setPlateChecking(false)
    }, 400)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [fullPlate, isLettersOk, isNumbersOk, isCityOk])

  const inputStyle: React.CSSProperties = {
    padding: '10px 12px', background: inputBg, border: `1px solid ${subtle}`,
    borderRadius: 10, fontSize: 13, color: text, outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box',
  }
  const inputErrorStyle: React.CSSProperties = {
    ...inputStyle, border: '1.5px solid #ef4444',
  }
  const fieldLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase' as const, letterSpacing: '.1em', marginBottom: 4,
  }

  const handleLetters = (v: string) => {
    let val = v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, currentType.letterLen)
    if (selectedType === 'remolque') val = val.replace(/[^RS]/g, '')
    setPlateLetters(val)
    setTouched(t => ({ ...t, letters: true }))
    setShowErrors(false)
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
    setTouched(t => ({ ...t, numbers: true }))
    setShowErrors(false)
  }

  const handlePay = async () => {
    if (!canPay || paying) return
    setPayError(null)
    setPaying(true)
    try {
      // La orden se crea en el backend ANTES de cobrar — el monto siempre lo
      // calcula el backend (49.900 * cantidad), nunca se manda un precio
      // desde acá. Devuelve la referencia + la firma de integridad que el
      // widget de Wompi necesita para no dejar alterar el monto.
      const created = await withTimeout(apiPost<{ order_id: string; reference: string; amount_in_cents: number; currency: string; integrity_signature: string }>('/shop/orders', {
        plate_text: fullPlate, plate_type: selectedType, plate_city: plateCity, quantity: qty,
        customer_name: name.trim(), customer_email: email.trim(), customer_phone: phone,
        shipping_address: address.trim(), shipping_city: shipCity.trim(), notes: notes.trim(),
      }), 12000, 'Crear la orden')
      if (!created) throw new Error('No se pudo crear la orden')

      if (payMethod === 'whatsapp') {
        const msg = `¡Hola CarLink! Quiero pagar mi llavero NFC\n• Pedido: ${created.reference}\n• Placa: ${fullPlate} (${plateCity})\n• Cantidad: ${qty}\n• Total: ${COP(total)}\n• Nombre: ${name.trim()}\n• Envío: ${address.trim()}, ${shipCity.trim()}\n• Contacto: +57 ${phone} · ${email.trim()}`
        window.open(`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank')
        setOrderId(created.reference)
        setStep('done')
        return
      }

      const transaction = await openWompiCheckout({
        reference: created.reference,
        amountInCents: created.amount_in_cents,
        currency: created.currency,
        integritySignature: created.integrity_signature,
        customerData: { email: email.trim(), fullName: name.trim(), phoneNumber: phone, phoneNumberPrefix: '+57' },
        shippingAddress: { addressLine1: address.trim(), city: shipCity.trim(), region: shipCity.trim(), country: 'CO', phoneNumber: phone, name: name.trim() },
      })
      if (!transaction) return // cerró el widget sin pagar — se queda en este paso, no es un error

      // Nunca se confía en el status que reporta el navegador: el backend
      // vuelve a preguntarle a Wompi directamente con la llave privada.
      const confirmed = await withTimeout(apiPost<{ status: string }>(`/shop/orders/${created.reference}/confirm`, { transaction_id: transaction.id }), 15000, 'Confirmar el pago')
      if (confirmed?.status === 'approved') {
        setOrderId(created.reference)
        setStep('done')
      } else if (confirmed?.status === 'declined' || confirmed?.status === 'error') {
        setPayError('El pago no se pudo procesar. Puedes intentar de nuevo o coordinar por WhatsApp.')
      } else {
        setPayError(`Estamos confirmando tu pago. Si no se actualiza en unos minutos, escríbenos con tu referencia ${created.reference}.`)
      }
    } catch (e) {
      const detail = e instanceof Error ? e.message : ''
      setPayError(`No pudimos conectar con la pasarela de pagos${detail ? ` (${detail})` : ''}. Intenta de nuevo o paga por WhatsApp.`)
    } finally {
      setPaying(false)
    }
  }

  const reset = () => {
    setStep('customize')
    setSelectedType('')
    setPlateLetters('')
    setPlateNumbers('')
    setPlateCity('')
    setCitySelected(false)
    setTypeConfirmed(false)
    setPlateExists(false)
    setQty(1)
    setName(''); setEmail(''); setPhone(''); setAddress(''); setShipCity(''); setNotes('')
    setOrderId(''); setPayMethod('wompi'); setCityOpen(false)
    setShipCityOpen(false); setShipCitySelected(false); setShipCityFreeform(false)
    setPaying(false); setPayError(null)
    setTouched({ letters: false, numbers: false, city: false })
    setShowErrors(false)
  }

  const stepLabels = ['Tu placa', 'Envío', 'Pago', 'Listo']
  const stepIdx = step === 'customize' ? 0 : step === 'shipping' ? 1 : step === 'payment' ? 2 : 3

  const miniPlateConfig = PLATE_TYPES.find(t => t.id === selectedType)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(8px,3vw,20px)' }}>
          <div onClick={() => { reset(); onClose() }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} />
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.98 }}
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
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
                    {payMethod === 'whatsapp' ? 'Pedido registrado' : 'Pago confirmado'}
                  </div>
                  <div style={{ fontSize: 13, color: muted, marginBottom: 4 }}>
                    {payMethod === 'whatsapp' ? 'Te contactamos por WhatsApp para coordinar el pago' : 'Tu llavero viene en curso'}
                  </div>
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
                    <Plate3D
                      plate={previewPlate}
                      city={plateCity || 'CIUDAD'}
                      bg={pBg.bg}
                      inkColor={pBg.ink}
                      labelColor={pBg.label}
                      showLabel={miniPlateConfig?.showLabel ?? false}
                      size="md"
                    />

                    {/* Type chips (right) */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={fieldLabel}>Tipo de placa <span style={{ color: GOLD }}>*</span></div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                        {PLATE_TYPES.map(pt => {
                          const on = selectedType === pt.id
                          return (
                            <button key={pt.id} onClick={() => { setSelectedType(pt.id); setPlateLetters(''); setPlateNumbers(''); setTouched({ letters: false, numbers: false, city: false }); setTypeConfirmed(true); setShowErrors(false); setTimeout(() => lettersRef.current?.focus(), 50) }} title={pt.name}
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
                      <div style={fieldLabel}>Ciudad de la placa <span style={{ color: GOLD }}>*</span></div>
                      <button onClick={() => { setCityOpen(!cityOpen); setTouched(t => ({ ...t, city: true })) }} type="button"
                        style={{ width: '100%', height: 42, padding: '0 12px', background: cardBg, border: `1px solid ${showErrors && !isCityOk ? '#ef4444' : subtle}`, borderRadius: 10, color: plateCity ? citySelect : label, fontSize: 13, fontWeight: 500, outline: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', fontFamily: 'inherit' }}>
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
                          <button key={c} onClick={() => { setPlateCity(c); setCityOpen(false); setCitySelected(true); setShowErrors(false) }} type="button"
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
                      <div style={fieldLabel}>Número de placa <span style={{ color: GOLD }}>*</span></div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 0,
                        background: cardBg, border: `1px solid ${showErrors && (!isLettersOk || !isNumbersOk) ? '#ef4444' : subtle}`, borderRadius: 10, padding: '0 12px', height: 42,
                      }}>
                        <input ref={lettersRef} value={plateLetters} onChange={e => handleLetters(e.target.value)}
                          maxLength={currentType.letterLen} placeholder={placeholderLetters}
                          style={{ width: Math.max(36, currentType.letterLen * 18), border: 'none', background: 'transparent', color: GOLD, fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '.06em', textTransform: 'uppercase', outline: 'none', padding: '2px 0', textAlign: 'right' }} />
                        <span style={{ color: GOLD, fontFamily: 'var(--font-display)', fontSize: 20, lineHeight: 1, opacity: 0.5, padding: '0 4px' }}>-</span>
                        <input value={plateNumbers} onChange={e => handleNumbers(e.target.value)}
                          maxLength={currentType.moto ? 3 : currentType.numLen} placeholder={placeholderNumbers}
                          style={{ width: Math.max(36, (currentType.moto ? 3 : currentType.numLen) * 18), border: 'none', background: 'transparent', color: GOLD, fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '.06em', textTransform: 'uppercase', outline: 'none', padding: '2px 0', textAlign: 'left' }} />
                      </div>
                      {plateChecking && <div style={{ fontSize: 10, color: muted, marginTop: 4 }}>Verificando placa...</div>}
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

                  {plateExists && (
                    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" style={{ flex: '0 0 auto' }}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                      <span style={{ fontSize: 11, color: '#ef4444' }}>
                        {plateOwnedByYou
                          ? 'Ya tienes esta placa registrada en tu cuenta. Si necesitas un llavero de reemplazo o es un pedido duplicado, '
                          : 'Esta placa ya está registrada por otra cuenta. Verifica tu cuenta para continuar — si crees que es un error, '}
                        <a href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(`¡Hola CarLink! Quiero comprar un llavero NFC para la placa ${fullPlate} y el sistema me dice que ya está registrada. ¿Me ayudan a verificarlo?`)}`}
                          target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: '#ef4444' }}>
                          contáctanos
                        </a>.
                      </span>
                    </div>
                  )}

                  <button onClick={() => { if (!canContinue) { setShowErrors(true) } else { setStep('shipping') } }}
                    style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 14, cursor: canContinue ? 'pointer' : 'not-allowed', opacity: canContinue ? 1 : 0.5 }}>
                    Continuar
                  </button>
                  {showErrors && !canContinue && (
                    <div style={{ fontSize: 11, color: '#ef4444', textAlign: 'center', marginTop: 2 }}>
                      {!isTypeOk && 'Selecciona el tipo de placa'}
                      {!isTypeOk && (!isLettersOk || !isNumbersOk || !isCityOk) && ' · '}
                      {!isLettersOk && 'Incomplete letras de placa'}
                      {!isLettersOk && (!isNumbersOk || !isCityOk) && ' · '}
                      {!isNumbersOk && 'Incomplete números de placa'}
                      {!isNumbersOk && !isCityOk && ' · '}
                      {!isCityOk && 'Selecciona la ciudad'}
                    </div>
                  )}
                </div>
              ) : step === 'shipping' ? (
                /* ─── STEP 2: SHIPPING ─── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 12, color: muted, marginBottom: 2 }}>La ciudad de envío puede ser diferente a la ciudad de la placa ({plateCity}).</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="grid2">
                    <div>
                      <div style={fieldLabel}>Nombre <span style={{ color: GOLD }}>*</span></div>
                      <input value={name} onChange={e => setName(e.target.value)} placeholder="Juan Pérez" style={inputStyle} />
                    </div>
                    <div>
                      <div style={fieldLabel}>Email <span style={{ color: GOLD }}>*</span></div>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" style={email && !isEmailValid ? inputErrorStyle : inputStyle} />
                      {email && !isEmailValid && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>Ingresa un correo válido</div>}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="grid2">
                    <div>
                      <div style={fieldLabel}>WhatsApp <span style={{ color: GOLD }}>*</span></div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <div style={{ ...inputStyle, flex: '0 0 auto', width: 42, padding: '10px 0', textAlign: 'center', color: muted, fontWeight: 700, userSelect: 'none' }}>+57</div>
                        <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          inputMode="numeric" placeholder="3001234567" maxLength={10}
                          style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
                      </div>
                      {/* Barra que se va llenando a medida que escribe, para orientar cuántos dígitos faltan sin necesidad de leer texto. */}
                      <div style={{ marginTop: 5, height: 3, borderRadius: 2, background: subtle, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(phone.length / 10) * 100}%`, background: isPhoneValid ? '#2ecc71' : GOLD, transition: 'width .15s ease, background .15s' }} />
                      </div>
                      <div style={{ fontSize: 10, color: muted, marginTop: 3 }}>
                        {phone.length === 0 ? '10 dígitos, sin el +57' : isPhoneValid ? 'Número completo' : `Faltan ${10 - phone.length} dígito${10 - phone.length === 1 ? '' : 's'}`}
                      </div>
                    </div>
                    <div style={{ position: 'relative' }} ref={shipCityRef}>
                      <div style={fieldLabel}>Ciudad de envío <span style={{ color: GOLD }}>*</span></div>
                      <input value={shipCity} autoComplete="off"
                        onChange={e => { setShipCity(e.target.value); setShipCitySelected(false); setShipCityFreeform(false); setShipCityOpen(true) }}
                        onFocus={() => setShipCityOpen(true)}
                        placeholder="Escribe tu ciudad o pueblo..." style={inputStyle} />
                      {shipCityOpen && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 4, maxHeight: 220, overflowY: 'auto', background: menuBg, border: `1px solid ${menuBorder}`, borderRadius: 10, boxShadow: '0 16px 48px rgba(0,0,0,.6)' }}>
                          {shipCityMatches.length === 0 ? (
                            <div style={{ padding: '8px 12px', fontSize: 12, color: muted }}>Sin resultados</div>
                          ) : shipCityMatches.map(c => (
                            <button key={c} type="button" onClick={() => { setShipCity(c); setShipCitySelected(true); setShipCityFreeform(false); setShipCityOpen(false) }}
                              style={{
                                display: 'block', width: '100%', padding: '8px 12px', border: 'none',
                                background: shipCity === c ? 'rgba(245,197,24,0.15)' : 'transparent',
                                color: shipCity === c ? GOLD : citySelect,
                                fontSize: 13, fontWeight: shipCity === c ? 700 : 500,
                                textAlign: 'left', cursor: 'pointer',
                              }}
                              onMouseEnter={e => { if (shipCity !== c) e.currentTarget.style.background = menuHover }}
                              onMouseLeave={e => { if (shipCity !== c) e.currentTarget.style.background = 'transparent' }}>
                              {c}
                            </button>
                          ))}
                          {/* Escape hatch: pueblos/municipios que no están en la lista curada. */}
                          <button type="button"
                            onClick={() => { setShipCityFreeform(true); setShipCitySelected(false); setShipCityOpen(false) }}
                            disabled={!shipCity.trim()}
                            style={{
                              display: 'block', width: '100%', padding: '8px 12px', border: 'none',
                              borderTop: `1px solid ${subtle}`, background: 'transparent', color: shipCity.trim() ? GOLD : muted,
                              fontSize: 12, fontWeight: 600, textAlign: 'left', cursor: shipCity.trim() ? 'pointer' : 'default',
                            }}
                            onMouseEnter={e => { if (shipCity.trim()) e.currentTarget.style.background = menuHover }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                            {shipCity.trim() ? `Mi ciudad es "${shipCity.trim()}" (no está en la lista)` : 'Escribe el nombre de tu ciudad o pueblo'}
                          </button>
                        </div>
                      )}
                      {shipCityFreeform && !shipCityOpen && <div style={{ fontSize: 10, color: GOLD, marginTop: 2 }}>Ciudad escrita a mano — verificamos cobertura al coordinar el envío</div>}
                      {shipCity && !isShipCityOk && !shipCityOpen && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>Selecciona una ciudad de la lista o marca &quot;no está en la lista&quot;</div>}
                    </div>
                  </div>
                  <div>
                    <div style={fieldLabel}>Dirección <span style={{ color: GOLD }}>*</span></div>
                    <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Cra 7 #45-12, Apto 301" style={address && address.length < 5 ? inputErrorStyle : inputStyle} />
                    {address && address.length < 5 && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>Mínimo 5 caracteres</div>}
                  </div>
                  <div>
                    <div style={fieldLabel}>Notas de entrega (opcional)</div>
                    <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Barrio, conjunto, apto, torre, indicaciones de acceso..." style={inputStyle} />
                  </div>
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
                      <Plate3D
                        plate={fullPlate}
                        city={plateCity}
                        bg={pBg.bg}
                        inkColor={pBg.ink}
                        labelColor={pBg.label}
                        showLabel={false}
                        size="sm"
                      />
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
                        <span style={{ display: 'flex', color: payMethod === pm.id ? GOLD : muted }}><Icon type={pm.icon} size={18} strokeWidth={1.8} /></span>
                        <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${payMethod === pm.id ? GOLD : '#6f6a5f'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>{payMethod === pm.id && <span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD }} />}</span>
                        {pm.name}
                      </button>
                    ))}
                  </div>

                  {payError && (
                    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 11, color: '#ef4444' }}>
                      {payError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setStep('shipping')} disabled={paying} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${subtle}`, background: 'transparent', color: muted, fontWeight: 600, fontSize: 13, cursor: paying ? 'not-allowed' : 'pointer', opacity: paying ? 0.6 : 1 }}>Atrás</button>
                    <button onClick={handlePay} disabled={!canPay || paying} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 13, cursor: (canPay && !paying) ? 'pointer' : 'not-allowed', opacity: (canPay && !paying) ? 1 : 0.5 }}>
                      {paying ? 'Procesando...' : payMethod === 'whatsapp' ? `Continuar por WhatsApp` : `Pagar ${COP(total)}`}
                    </button>
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
