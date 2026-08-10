'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { 
  ShoppingBag, Minus, Plus, CreditCard, Lock, CheckCircle, 
  Package, Truck, ArrowRight, ArrowLeft, Sparkles
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

const PRICES = {
  base: 45000,
  matte: 0,
  glossy: 5000,
  metallic: 12000,
  text: 0,
  image: 8000,
  qr: 3000,
}

const STEPS = ['Resumen', 'Pago', 'Confirmación']

export function Shop() {
  const [step, setStep] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [finish, setFinish] = useState<'matte' | 'glossy' | 'metallic'>('glossy')
  const [email, setEmail] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const unitPrice = PRICES.base + PRICES[finish]
  const total = unitPrice * quantity
  const discount = quantity >= 5 ? 0.15 : quantity >= 3 ? 0.10 : 0
  const finalTotal = total * (1 - discount)

  const handleQuantityChange = (delta: number) => {
    setQuantity(prev => Math.max(1, Math.min(100, prev + delta)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step < 2) {
      setStep(prev => prev + 1)
      return
    }

    setIsProcessing(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsProcessing(false)
    setIsComplete(true)
  }

  const handleBack = () => {
    if (step > 0) setStep(prev => prev - 1)
  }

  if (isComplete) {
    return (
      <section id="tienda" className="relative py-20 lg:py-32">
        <div className="relative z-10 max-w-[var(--content-max)] mx-auto px-[var(--gutter)]">
          <div className="shop-success flex flex-col items-center justify-center min-h-[400px] text-center">
            <div className="check-burst w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{
              background: 'linear-gradient(135deg, rgba(46,204,113,0.2), rgba(46,204,113,0.04))',
              border: '1px solid rgba(46,204,113,0.4)',
              boxShadow: '0 0 32px rgba(46,204,113,0.3)',
            }}>
              <CheckCircle className="w-10 h-10 text-[var(--ai-success)]" />
            </div>
            <h3 className="h3 font-semibold mb-2">¡Pedido Confirmado!</h3>
            <p className="text-fg-muted mb-1">Tu número de orden es: <span className="mono font-medium text-fg">CL-{Date.now().toString(36).toUpperCase()}</span></p>
            <p className="text-sm text-fg-muted mb-6">Recibirás un correo con los detalles de tu pedido y seguimiento de fabricación.</p>
            <button 
              className="btn btn--primary"
              onClick={() => { setIsComplete(false); setStep(0); setQuantity(1) }}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Hacer otro pedido</span>
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="tienda" className="relative py-20 lg:py-32">
      <div className="relative z-10 max-w-[var(--content-max)] mx-auto px-[var(--gutter)]">
        <div className="shop-head max-w-2xl mb-10 text-center mx-auto">
          <span className="eyebrow inline-block mb-4">Tienda</span>
          <h2 className="h1 mb-6">Configura y <span className="brand-grad">ordena tu llavero</span></h2>
          <p className="lead max-w-xl mx-auto">
            Diseña, personaliza y recibe tu llavero NFC en 5 días hábiles. 
            Envío gratis en pedidos superiores a 3 unidades.
          </p>
        </div>

        <div className="shop-steps flex justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div 
              key={i} 
              className={cn(
                'shop-step flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                i < step && 'is-done',
                i === step && 'is-active'
              )}
            >
              <span className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold" style={{
                background: i <= step ? 'var(--ai-violet)' : 'rgba(255,255,255,0.06)',
                color: i <= step ? 'white' : 'var(--fg-dim)',
              }}>
                {i < step ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{s}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="shop-grid grid lg:grid-cols-[1fr_1.1fr] gap-6 items-start">
            {step === 0 && (
              <>
                <div className="shop-preview rounded-2xl border border-border p-6" style={{
                  background: 'rgba(12,12,22,0.7)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}>
                  <div className="shop-preview__title text-xs font-bold tracking-widest uppercase text-[var(--ai-violet-bright)] mb-4">
                    Resumen del Pedido
                  </div>
                  <ul className="cfg-summary space-y-3">
                    <li className="flex justify-between items-center gap-4 p-3 rounded-xl" style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border)',
                    }}>
                      <span className="cfg-summary__k text-xs tracking-widest uppercase text-fg-dim font-semibold">Producto</span>
                      <span className="cfg-summary__v flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[var(--ai-violet)] to-[var(--ai-violet-deep)]" />
                        <span>Llavero NFC Personalizado</span>
                      </span>
                    </li>
                    <li className="flex justify-between items-center gap-4 p-3 rounded-xl" style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border)',
                    }}>
                      <span className="cfg-summary__k text-xs tracking-widest uppercase text-fg-dim font-semibold">Acabado</span>
                      <span className="cfg-summary__v capitalize">{finish}</span>
                    </li>
                    <li className="flex justify-between items-center gap-4 p-3 rounded-xl" style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border)',
                    }}>
                      <span className="cfg-summary__k text-xs tracking-widest uppercase text-fg-dim font-semibold">Cantidad</span>
                      <span className="cfg-summary__v">{quantity} unidades</span>
                    </li>
                  </ul>
                  
                  {discount > 0 && (
                    <div className="shop-incentive flex items-center gap-2 mt-4 p-3 rounded-full text-sm font-medium" style={{
                      background: 'rgba(177,79,255,0.08)',
                      border: '1px solid rgba(177,79,255,0.25)',
                      color: 'var(--ai-violet-bright)',
                    }}>
                      <Sparkles className="w-4 h-4" />
                      <span>Descuento por volumen: {Math.round(discount * 100)}%</span>
                    </div>
                  )}

                  <div className="shop-eta flex items-center gap-2 mt-3 text-sm text-fg-muted" style={{
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '999px',
                    border: '1px solid var(--border)',
                  }}>
                    <Truck className="w-4 h-4" />
                    <span>Envío estimado: 5 días hábiles</span>
                  </div>
                </div>

                <div className="shop-card rounded-2xl border border-border p-6" style={{
                  background: 'rgba(12,12,22,0.7)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}>
                  <div className="shop-preview__title text-xs font-bold tracking-widest uppercase text-[var(--ai-violet-bright)] mb-4">
                    Configuración
                  </div>
                  
                  <div className="shop-stage space-y-4">
                    <div className="qty rounded-xl p-4" style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border)',
                    }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">Cantidad</span>
                        <span className="text-xs text-fg-muted">Desde {formatPrice(PRICES.base)} c/u</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(-1)}
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-lg transition-all"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--border)',
                            color: 'var(--fg)',
                          }}
                          aria-label="Disminuir cantidad"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <span className="qty-num text-2xl font-bold min-w-[48px] text-center">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(1)}
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-lg transition-all"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--border)',
                            color: 'var(--fg)',
                          }}
                          aria-label="Aumentar cantidad"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                        <span className="ml-auto text-sm text-fg-muted">× {formatPrice(unitPrice)}</span>
                      </div>
                      <div className="qty-presets grid grid-cols-4 gap-2 mt-3">
                        {[1, 3, 5, 10].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setQuantity(preset)}
                            className={cn(
                              'qty-presets-btn px-3 py-2 rounded-xl text-sm font-medium transition-all',
                              quantity === preset && 'is-on'
                            )}
                            style={{
                              background: quantity === preset ? 'rgba(177,79,255,0.12)' : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${quantity === preset ? 'rgba(177,79,255,0.55)' : 'var(--border)'}`,
                              color: quantity === preset ? 'var(--ai-violet-bright)' : 'var(--fg-muted)',
                            }}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="finish-options rounded-xl p-4" style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border)',
                    }}>
                      <div className="text-xs font-bold tracking-widest uppercase text-fg-dim mb-3">Acabado</div>
                      <div className="grid grid-cols-3 gap-2">
                        {(['matte', 'glossy', 'metallic'] as const).map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setFinish(f)}
                            className={cn(
                              'finish-btn p-3 rounded-xl text-center transition-all',
                              finish === f && 'is-active'
                            )}
                            style={{
                              background: finish === f ? 'rgba(177,79,255,0.12)' : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${finish === f ? 'rgba(177,79,255,0.55)' : 'var(--border)'}`,
                              color: finish === f ? 'var(--ai-violet-bright)' : 'var(--fg-muted)',
                            }}
                          >
                            <div className="text-sm font-medium capitalize">{f}</div>
                            <div className="text-xs mt-1">
                              {f === 'matte' ? 'Sin costo' : `+${formatPrice(PRICES[f])}`}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <div className="shop-card rounded-2xl border border-border p-6" style={{
                background: 'rgba(12,12,22,0.7)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}>
                <div className="shop-preview__title text-xs font-bold tracking-widest uppercase text-[var(--ai-violet-bright)] mb-6">
                  Información de Pago
                </div>
                
                <div className="shop-stage space-y-4">
                  <div className="field">
                    <label className="eyebrow block mb-2 text-xs">Correo Electrónico</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="w-full px-4 py-3 rounded-xl text-base outline-none transition-all"
                      style={{
                        background: 'rgba(20,20,31,0.7)',
                        border: '1px solid var(--border)',
                        color: 'var(--fg)',
                        fontFamily: 'inherit',
                      }}
                      required
                    />
                    <p className="field-help text-xs text-fg-dim mt-2">Recibirás la confirmación y seguimiento aquí</p>
                  </div>

                  <div className="field">
                    <label className="eyebrow block mb-2 text-xs">Número de Tarjeta</label>
                    <div className="card-row flex items-center gap-2 rounded-xl px-4 py-3" style={{
                      background: 'rgba(20,20,31,0.7)',
                      border: '1px solid var(--border)',
                    }}>
                      <CreditCard className="w-5 h-5 text-fg-muted flex-shrink-0" />
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim().slice(0, 19))}
                        placeholder="0000 0000 0000 0000"
                        className="flex-1 bg-transparent border-none outline-none text-base font-mono tracking-wider"
                        style={{ color: 'var(--fg)' }}
                        required
                      />
                    </div>
                  </div>

                  <div className="shop-row grid grid-cols-2 gap-3">
                    <div className="field">
                      <label className="eyebrow block mb-2 text-xs">Vencimiento</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5))}
                        placeholder="MM/AA"
                        className="w-full px-4 py-3 rounded-xl text-base outline-none transition-all font-mono"
                        style={{
                          background: 'rgba(20,20,31,0.7)',
                          border: '1px solid var(--border)',
                          color: 'var(--fg)',
                          fontFamily: 'inherit',
                        }}
                        required
                      />
                    </div>
                    <div className="field">
                      <label className="eyebrow block mb-2 text-xs">CVC</label>
                      <input
                        type="text"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="123"
                        className="w-full px-4 py-3 rounded-xl text-base outline-none transition-all font-mono"
                        style={{
                          background: 'rgba(20,20,31,0.7)',
                          border: '1px solid var(--border)',
                          color: 'var(--fg)',
                          fontFamily: 'inherit',
                        }}
                        required
                      />
                    </div>
                  </div>

                  <div className="shop-trust flex items-center gap-2 text-xs text-fg-dim mt-2">
                    <Lock className="w-4 h-4" />
                    <span>Pago seguro encriptado con SSL · No almacenamos datos de tarjeta</span>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="shop-card rounded-2xl border border-border p-6" style={{
                background: 'rgba(12,12,22,0.7)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}>
                <div className="shop-preview__title text-xs font-bold tracking-widest uppercase text-[var(--ai-violet-bright)] mb-6">
                  Resumen del Pedido
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                    <div className="text-sm font-medium mb-2">Llavero NFC Personalizado</div>
                    <div className="text-xs text-fg-muted space-y-1">
                      <p>• Acabado: <span className="capitalize">{finish}</span></p>
                      <p>• Cantidad: {quantity} unidades</p>
                      <p>• Precio unitario: {formatPrice(unitPrice)}</p>
                      {discount > 0 && <p className="text-[var(--ai-success)]">• Descuento volumen: -{Math.round(discount * 100)}%</p>}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                    <div className="text-sm font-medium mb-2">Envío</div>
                    <div className="text-xs text-fg-muted">
                      <p>• Método: Envío estándar (5 días hábiles)</p>
                      <p>• Dirección: Se enviará a <span className="text-fg">{email}</span></p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                    <div className="text-sm font-medium mb-2">Pago</div>
                    <div className="text-xs text-fg-muted">
                      <p>• Tarjeta: **** **** **** {cardNumber.slice(-4) || '0000'}</p>
                      <p>• Correo: {email}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="shop-totals rounded-2xl border border-border p-6" style={{
              background: 'rgba(12,12,22,0.7)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-muted">Subtotal ({quantity} {quantity === 1 ? 'unidad' : 'unidades'})</span>
                  <span>{formatPrice(total)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--ai-success)]">Descuento volumen (-{Math.round(discount * 100)}%)</span>
                    <span className="text-[var(--ai-success)]">-{formatPrice(total - finalTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-fg-muted">Envío</span>
                  <span className={quantity >= 3 ? 'text-[var(--ai-success)] font-medium' : ''}>
                    {quantity >= 3 ? 'Gratis' : formatPrice(8000)}
                  </span>
                </div>
                <div className="pt-3 border-t border-dashed flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-[var(--ai-violet-bright)]">{formatPrice(finalTotal + (quantity < 3 ? 8000 : 0))}</span>
                </div>
              </div>

              <div className="shop-cta mt-6">
                <button 
                  type="submit" 
                  className="btn btn--primary w-full justify-center gap-2"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <span className="animate-spin">⟳</span>
                      <span>Procesando...</span>
                    </>
                  ) : step < 2 ? (
                    <>
                      <span>Continuar</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Pagar {formatPrice(finalTotal + (quantity < 3 ? 8000 : 0))}</span>
                    </>
                  )}
                </button>
              </div>

              {step > 0 && (
                <button 
                  type="button"
                  onClick={handleBack}
                  className="btn btn--ghost w-full justify-center gap-2 mt-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </section>
  )
}