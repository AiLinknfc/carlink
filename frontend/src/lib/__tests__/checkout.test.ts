// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  COP, productById, FOB_PRODUCTS, getStripeLink, whatsappOrderUrl, activationCodeWhatsappUrl,
  saveFobOrder, startPayment, SUPPORT_WHATSAPP, ACTIVATION_BOT_WHATSAPP, type FobOrder,
} from '../checkout'

const order: FobOrder = {
  id: 'CL-123', productId: 'std', productName: 'Llavero NFC CarLink', quantity: 2, unitPrice: 49900, total: 99800,
  name: 'Ana Muñoz', email: 'ana+test@ejemplo.co', phone: '3124033960', address: 'Cra 7 # 12-34 & Torre 2', city: 'Bogotá',
  plate: 'ABC123', notes: 'Dejar en porteria', createdAt: '2026-09-25T00:00:00Z',
}

const decodeText = (url: string) => decodeURIComponent(new URL(url).searchParams.get('text') || '')

describe('COP', () => {
  it('formatea con separador de miles colombiano', () => {
    expect(COP(49900)).toBe('$49.900')
    expect(COP(0)).toBe('$0')
    expect(COP(1234567)).toBe('$1.234.567')
  })
})

describe('productById', () => {
  it('devuelve el producto o el primero como fallback', () => {
    expect(productById('std').id).toBe('std')
    expect(productById('no-existe')).toBe(FOB_PRODUCTS[0])
  })
})

describe('getStripeLink', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('sin variables devuelve null', () => {
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PAYMENT_LINK', '')
    vi.stubEnv('NEXT_PUBLIC_STRIPE_LINK_STD', '')
    expect(getStripeLink('std')).toBeNull()
    expect(getStripeLink('otro')).toBeNull()
  })

  it('el link especifico gana sobre el generico y el generico es respaldo', () => {
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PAYMENT_LINK', 'https://buy.stripe.com/generic')
    vi.stubEnv('NEXT_PUBLIC_STRIPE_LINK_STD', 'https://buy.stripe.com/std')
    vi.stubEnv('NEXT_PUBLIC_STRIPE_LINK_PREM', '')
    expect(getStripeLink('std')).toBe('https://buy.stripe.com/std')
    expect(getStripeLink('prem')).toBe('https://buy.stripe.com/generic')
    expect(getStripeLink('desconocido')).toBe('https://buy.stripe.com/generic')
  })
})

describe('whatsappOrderUrl', () => {
  it('apunta al soporte y el texto decodificado conserva tildes, &, # y saltos de linea', () => {
    const url = whatsappOrderUrl(order)
    expect(url.startsWith(`https://wa.me/${SUPPORT_WHATSAPP}?text=`)).toBe(true)
    const text = decodeText(url)
    expect(text).toContain('Total: $99.800')
    expect(text).toContain('Nombre: Ana Muñoz')
    expect(text).toContain('Envío: Cra 7 # 12-34 & Torre 2, Bogotá')
    expect(text).toContain('ana+test@ejemplo.co')
    expect(text.split('\n').length).toBe(9)
    // los caracteres reservados no deben romper la query
    expect(new URL(url).searchParams.get('text')).toBe(text)
  })

  it('omite placa y notas cuando no hay (sin lineas vacias)', () => {
    const text = decodeText(whatsappOrderUrl({ ...order, plate: undefined, notes: '' }))
    expect(text).not.toContain('Placa')
    expect(text).not.toContain('Notas')
    expect(text.split('\n').every(l => l.trim() !== '')).toBe(true)
  })
})

describe('activationCodeWhatsappUrl', () => {
  it('usa el numero del bot y codifica la referencia', () => {
    const url = activationCodeWhatsappUrl('CL 9/9&x')
    expect(url.startsWith(`https://wa.me/${ACTIVATION_BOT_WHATSAPP}?text=`)).toBe(true)
    expect(decodeText(url)).toContain('pedido CL 9/9&x')
    expect(ACTIVATION_BOT_WHATSAPP).not.toBe(SUPPORT_WHATSAPP)
  })
})

describe('saveFobOrder / startPayment', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.unstubAllEnvs()
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PAYMENT_LINK', '')
    vi.stubEnv('NEXT_PUBLIC_STRIPE_LINK_STD', '')
  })
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

  it('saveFobOrder pone el pedido nuevo primero', () => {
    saveFobOrder({ ...order, id: 'A' })
    saveFobOrder({ ...order, id: 'B' })
    const list = JSON.parse(window.localStorage.getItem('carlink_fob_orders') || '[]')
    expect(list.map((o: FobOrder) => o.id)).toEqual(['B', 'A'])
  })

  it('saveFobOrder tolera almacenamiento corrupto sin lanzar', () => {
    window.localStorage.setItem('carlink_fob_orders', '{roto')
    expect(() => saveFobOrder(order)).not.toThrow()
  })

  it('sin link de Stripe cae a WhatsApp y abre ventana nueva', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    expect(startPayment(order)).toBe('whatsapp')
    expect(open).toHaveBeenCalledTimes(1)
    expect(String(open.mock.calls[0][0])).toContain('wa.me/')
  })

  it('con link de Stripe redirige con email y referencia codificados', () => {
    vi.stubEnv('NEXT_PUBLIC_STRIPE_LINK_STD', 'https://buy.stripe.com/std')
    const loc = { href: '' }
    vi.stubGlobal('window', Object.assign(Object.create(window), { location: loc, localStorage: window.localStorage }))
    try {
      expect(startPayment(order)).toBe('stripe')
    } finally {
      vi.unstubAllGlobals()
    }
    const u = new URL(loc.href)
    expect(u.origin + u.pathname).toBe('https://buy.stripe.com/std')
    expect(u.searchParams.get('prefilled_email')).toBe('ana+test@ejemplo.co')
    expect(u.searchParams.get('client_reference_id')).toBe('CL-123')
  })

  it('si el link de Stripe ya trae query usa & en vez de ?', () => {
    vi.stubEnv('NEXT_PUBLIC_STRIPE_LINK_STD', 'https://buy.stripe.com/std?locale=es')
    const loc = { href: '' }
    vi.stubGlobal('window', Object.assign(Object.create(window), { location: loc, localStorage: window.localStorage }))
    try { startPayment(order) } finally { vi.unstubAllGlobals() }
    expect(loc.href).toContain('?locale=es&prefilled_email=')
    expect(loc.href.split('?').length).toBe(2)
  })
})
