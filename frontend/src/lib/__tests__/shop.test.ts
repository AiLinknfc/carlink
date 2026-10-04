// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  addToCart, updateCartItemQty, removeFromCart, loadCart, clearCart, FOB_COLORS, shopWhatsappUrl,
  saveOrder, loadOrders, getOrderById, linkOrderToUser, getUserOrders, getPendingOrders,
  getShippingProgress, getDaysSinceCreation, shopProductById, SHOP_PRODUCTS, processPayment, COP,
  type CartItem, type ShopOrder,
} from '../shop'
import { SUPPORT_WHATSAPP } from '../checkout'

const item = (over: Partial<CartItem> = {}): CartItem => ({
  id: 'x', productId: 'fob-std', productName: 'Llavero NFC CarLink', color: FOB_COLORS[0],
  plateText: 'ABC123', plateType: 'particular', engraving: undefined, quantity: 1, unitPrice: 49900, total: 49900, ...over,
})

const mkOrder = (over: Partial<ShopOrder> = {}): ShopOrder => ({
  id: 'O1', items: [item({ quantity: 2, total: 99800 })], total: 99800, name: 'Ana', email: 'a@b.co', phone: '312',
  address: 'Calle 1', city: 'Cali', paymentMethod: 'whatsapp', status: 'pending', createdAt: '2026-09-25T00:00:00Z', ...over,
})

beforeEach(() => { window.localStorage.clear() })

describe('carrito: totales', () => {
  it('addToCart calcula total y cantidad', () => {
    const c = addToCart(item({ quantity: 2, total: 99800 }))
    expect(c.total).toBe(99800)
    expect(c.count).toBe(2)
    expect(loadCart().total).toBe(99800)
  })

  it('mismo producto, color y grabado se fusiona sumando cantidad y recalculando total', () => {
    addToCart(item({ quantity: 1, total: 49900 }))
    const c = addToCart(item({ quantity: 2, total: 99800 }))
    expect(c.items).toHaveLength(1)
    expect(c.items[0].quantity).toBe(3)
    expect(c.items[0].total).toBe(149700)
    expect(c.total).toBe(149700)
  })

  it('distinto color o distinto grabado quedan como lineas separadas', () => {
    addToCart(item())
    addToCart(item({ color: FOB_COLORS[1] }))
    const c = addToCart(item({ engraving: 'JR' }))
    expect(c.items).toHaveLength(3)
    expect(c.count).toBe(3)
    expect(c.total).toBe(149700)
  })

  it('placas distintas no deben fusionarse en la misma linea', () => {
    addToCart(item({ plateText: 'ABC123' }))
    const c = addToCart(item({ plateText: 'XYZ987' }))
    expect(c.items).toHaveLength(2)
  })

  it('fusionar lineas no debe superar el maximo de 10 unidades', () => {
    addToCart(item({ quantity: 6, total: 6 * 49900 }))
    const c = addToCart(item({ quantity: 6, total: 6 * 49900 }))
    expect(c.items[0].quantity).toBeLessThanOrEqual(10)
  })
})

describe('updateCartItemQty', () => {
  beforeEach(() => { addToCart(item()) })

  it('acota entre 1 y 10 y recalcula el total', () => {
    expect(updateCartItemQty('0', 5).total).toBe(5 * 49900)
    expect(updateCartItemQty('0', 99).items[0].quantity).toBe(10)
    expect(updateCartItemQty('0', 0).items[0].quantity).toBe(1)
    expect(updateCartItemQty('0', -4).items[0].quantity).toBe(1)
    expect(updateCartItemQty('0', 3).count).toBe(3)
  })

  it('indice inexistente o no numerico no modifica el carrito', () => {
    expect(updateCartItemQty('7', 5).count).toBe(1)
    expect(updateCartItemQty('abc', 5).count).toBe(1)
  })
})

describe('removeFromCart', () => {
  it('quita la linea indicada y recalcula', () => {
    addToCart(item())
    addToCart(item({ color: FOB_COLORS[1], quantity: 2, total: 99800 }))
    const c = removeFromCart('0')
    expect(c.items).toHaveLength(1)
    expect(c.items[0].color.id).toBe('black')
    expect(c.total).toBe(99800)
    expect(c.count).toBe(2)
  })

  it('indice fuera de rango no borra nada', () => {
    addToCart(item())
    expect(removeFromCart('5').items).toHaveLength(1)
  })

  it('indice no numerico no debe borrar la primera linea', () => {
    addToCart(item())
    expect(removeFromCart('abc').items).toHaveLength(1)
  })

  it('indice negativo no debe borrar la ultima linea', () => {
    addToCart(item())
    addToCart(item({ color: FOB_COLORS[1] }))
    expect(removeFromCart('-1').items).toHaveLength(2)
  })
})

describe('persistencia del carrito', () => {
  it('JSON corrupto devuelve carrito vacio', () => {
    window.localStorage.setItem('carlink_shop_cart', '[roto')
    expect(loadCart()).toEqual({ items: [], total: 0, count: 0 })
  })

  it('clearCart vacia', () => {
    addToCart(item())
    clearCart()
    expect(loadCart().count).toBe(0)
  })
})

describe('pedidos locales', () => {
  it('saveOrder pone el nuevo primero y getOrderById lo encuentra', () => {
    saveOrder(mkOrder({ id: 'A' }))
    saveOrder(mkOrder({ id: 'B' }))
    expect(loadOrders().map(o => o.id)).toEqual(['B', 'A'])
    expect(getOrderById('A')?.id).toBe('A')
    expect(getOrderById('Z')).toBeUndefined()
  })

  it('linkOrderToUser asocia solo ese pedido y getUserOrders filtra', () => {
    saveOrder(mkOrder({ id: 'A' }))
    saveOrder(mkOrder({ id: 'B' }))
    linkOrderToUser('A', 'u1')
    linkOrderToUser('no-existe', 'u1')
    expect(getUserOrders('u1').map(o => o.id)).toEqual(['A'])
    expect(getUserOrders('u2')).toEqual([])
  })

  it('getPendingOrders excluye entregados', () => {
    saveOrder(mkOrder({ id: 'A', status: 'delivered' }))
    saveOrder(mkOrder({ id: 'B', status: 'shipped' }))
    expect(getPendingOrders().map(o => o.id)).toEqual(['B'])
  })

  it('loadOrders con JSON corrupto devuelve vacio', () => {
    window.localStorage.setItem('carlink_shop_orders', 'nope')
    expect(loadOrders()).toEqual([])
  })
})

describe('helpers', () => {
  it('getShippingProgress es monotono y llega a 100', () => {
    const v = (['pending', 'processing', 'shipped', 'delivered'] as const).map(getShippingProgress)
    expect(v).toEqual([...v].sort((a, b) => a - b))
    expect(v[3]).toBe(100)
  })

  it('getDaysSinceCreation cuenta dias completos', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-25T12:00:00Z'))
    try {
      expect(getDaysSinceCreation('2026-09-25T00:00:00Z')).toBe(0)
      expect(getDaysSinceCreation('2026-09-23T11:00:00Z')).toBe(2)
      expect(getDaysSinceCreation('2026-09-23T13:00:00Z')).toBe(1)
    } finally { vi.useRealTimers() }
  })

  it('shopProductById cae al primero y COP formatea', () => {
    expect(shopProductById('x')).toBe(SHOP_PRODUCTS[0])
    expect(COP(99800)).toBe('$99.800')
  })

  it('shopWhatsappUrl lista cada item con color y total', () => {
    const o = mkOrder()
    const url = shopWhatsappUrl(o)
    expect(url.startsWith(`https://wa.me/${SUPPORT_WHATSAPP}?text=`)).toBe(true)
    const text = new URL(url).searchParams.get('text') || ''
    expect(text).toContain('Llavero NFC CarLink (Dorado CarLink) x2')
    expect(text).toContain('Total: $99.800')
    expect(text).toContain('Pedido: O1')
  })
})

describe('processPayment', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs() })

  it('nequi/bancolombia/whatsapp abren WhatsApp y guardan el pedido', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    for (const m of ['nequi', 'bancolombia', 'whatsapp'] as const) {
      expect(processPayment(mkOrder({ id: m, paymentMethod: m }))).toBe('whatsapp')
    }
    expect(open).toHaveBeenCalledTimes(3)
    expect(loadOrders()).toHaveLength(3)
  })

  it('tarjeta sin link de Stripe cae a WhatsApp', () => {
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PAYMENT_LINK', '')
    vi.spyOn(window, 'open').mockImplementation(() => null)
    expect(processPayment(mkOrder({ paymentMethod: 'card' }))).toBe('whatsapp')
  })
})
