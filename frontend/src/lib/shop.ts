// ── Tienda CarLink: llaveros NFC personalizables ──
// Carrito público (sin auth), pago múltiple, seguimiento post-compra.

import { SUPPORT_WHATSAPP } from './checkout'

/* ─── Plate-based color schemes ─── */
export interface PlateColors {
  bg: string
  bgLabel: string
  accent: string
  ring: string
}

export const PLATE_COLOR_SCHEMES: Record<string, PlateColors> = {
  particular:  { bg: 'linear-gradient(160deg,#F8D64B,#E7B412)', bgLabel: '#141414', accent: '#F5C518', ring: 'rgba(245,197,24,0.45)' },
  moto:        { bg: 'linear-gradient(160deg,#F8D64B,#E7B412)', bgLabel: '#141414', accent: '#F5C518', ring: 'rgba(245,197,24,0.45)' },
  publico:     { bg: 'linear-gradient(160deg,#ffffff,#dde1e6)', bgLabel: '#0c1a12', accent: '#2ecc71', ring: 'rgba(46,204,113,0.4)' },
  diplomatica: { bg: 'linear-gradient(160deg,#2340d6,#0f2688)', bgLabel: '#ffffff', accent: '#6c8cff', ring: 'rgba(108,140,255,0.45)' },
  carga:       { bg: 'linear-gradient(160deg,#cc2222,#8a1212)', bgLabel: '#ffffff', accent: '#ff6b6b', ring: 'rgba(255,107,107,0.45)' },
  remolque:    { bg: 'linear-gradient(160deg,#1a6b3c,#0f4426)', bgLabel: '#ffffff', accent: '#2ecc71', ring: 'rgba(46,204,113,0.4)' },
  clasico:     { bg: 'linear-gradient(90deg,#2e4a75 22%,#e8e0d0 22%,#e8e0d0 78%,#2e4a75 78%)', bgLabel: '#e8e0d0', accent: '#6c8cff', ring: 'rgba(108,140,255,0.4)' },
}

/* ─── Available fob colors (physical product colors) ─── */
export interface FobColor {
  id: string
  name: string
  hex: string
  ring: string
}

export const FOB_COLORS: FobColor[] = [
  { id: 'gold',    name: 'Dorado CarLink',  hex: '#F5C518', ring: 'rgba(245,197,24,0.5)' },
  { id: 'black',   name: 'Negro mate',       hex: '#1a1a1a', ring: 'rgba(255,255,255,0.15)' },
  { id: 'silver',  name: 'Plata cepillada',  hex: '#c0c0c0', ring: 'rgba(192,192,192,0.4)' },
  { id: 'blue',    name: 'Azul profundo',    hex: '#1e3a8a', ring: 'rgba(30,58,138,0.5)' },
  { id: 'red',     name: 'Rojo racing',      hex: '#dc2626', ring: 'rgba(220,38,38,0.5)' },
  { id: 'green',   name: 'Verde bosque',     hex: '#166534', ring: 'rgba(22,101,52,0.5)' },
  { id: 'white',   name: 'Blanco perla',     hex: '#f5f5f4', ring: 'rgba(245,245,244,0.5)' },
]

/* ─── Products ─── */
export interface ShopProduct {
  id: string
  name: string
  desc: string
  price: number
  image?: string
  premium?: boolean
  customizable?: boolean
}

export const SHOP_PRODUCTS: ShopProduct[] = [
  { id: 'fob-std', name: 'Llavero NFC CarLink', desc: 'Impreso en PLA con chip NFC programado con tu placa.', price: 49900, customizable: true },
]

/* ─── Cart ─── */
export interface CartItem {
  id: string
  productId: string
  productName: string
  color: FobColor
  plateText: string
  plateType: string
  engraving?: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Cart {
  items: CartItem[]
  total: number
  count: number
}

/* ─── Orders ─── */
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered'

export interface ShopOrder {
  id: string
  items: CartItem[]
  total: number
  name: string
  email: string
  phone: string
  address: string
  city: string
  paymentMethod: 'card' | 'nequi' | 'bancolombia' | 'whatsapp'
  status: OrderStatus
  createdAt: string
  estimatedDelivery?: string
  userId?: string
  notes?: string
}

/* ─── Payment channel result ─── */
export type PaymentChannel = 'stripe' | 'nequi' | 'bancolombia' | 'whatsapp'

/* ─── Helpers ─── */
export const COP = (n: number) => '$' + n.toLocaleString('es-CO')

export function shopProductById(id: string): ShopProduct {
  return SHOP_PRODUCTS.find(p => p.id === id) || SHOP_PRODUCTS[0]
}

export function getEstimatedDelivery(): string {
  const d = new Date()
  d.setDate(d.getDate() + 5)
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* ─── Cart localStorage ─── */
const CART_KEY = 'carlink_shop_cart'

export function loadCart(): Cart {
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (raw) {
      const items: CartItem[] = JSON.parse(raw)
      return { items, total: items.reduce((s, i) => s + i.total, 0), count: items.reduce((s, i) => s + i.quantity, 0) }
    }
  } catch { /* ignore */ }
  return { items: [], total: 0, count: 0 }
}

export function saveCart(cart: Cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart.items))
}

export function addToCart(item: CartItem): Cart {
  const cart = loadCart()
  const existing = cart.items.findIndex(i => i.productId === item.productId && i.color.id === item.color.id && i.engraving === item.engraving)
  if (existing >= 0) {
    cart.items[existing].quantity += item.quantity
    cart.items[existing].total = cart.items[existing].quantity * cart.items[existing].unitPrice
  } else {
    cart.items.push(item)
  }
  cart.total = cart.items.reduce((s, i) => s + i.total, 0)
  cart.count = cart.items.reduce((s, i) => s + i.quantity, 0)
  saveCart(cart)
  return cart
}

export function updateCartItemQty(index: string, qty: number): Cart {
  const cart = loadCart()
  const idx = parseInt(index)
  if (cart.items[idx]) {
    cart.items[idx].quantity = Math.max(1, Math.min(10, qty))
    cart.items[idx].total = cart.items[idx].quantity * cart.items[idx].unitPrice
  }
  cart.total = cart.items.reduce((s, i) => s + i.total, 0)
  cart.count = cart.items.reduce((s, i) => s + i.quantity, 0)
  saveCart(cart)
  return cart
}

export function removeFromCart(index: string): Cart {
  const cart = loadCart()
  cart.items.splice(parseInt(index), 1)
  cart.total = cart.items.reduce((s, i) => s + i.total, 0)
  cart.count = cart.items.reduce((s, i) => s + i.quantity, 0)
  saveCart(cart)
  return cart
}

export function clearCart() {
  localStorage.removeItem(CART_KEY)
}

/* ─── Orders localStorage ─── */
const ORDERS_KEY = 'carlink_shop_orders'

export function loadOrders(): ShopOrder[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveOrder(order: ShopOrder) {
  const orders = loadOrders()
  orders.unshift(order)
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
}

export function getOrderById(id: string): ShopOrder | undefined {
  return loadOrders().find(o => o.id === id)
}

export function linkOrderToUser(orderId: string, userId: string) {
  const orders = loadOrders()
  const order = orders.find(o => o.id === orderId)
  if (order) {
    order.userId = userId
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
  }
}

export function getUserOrders(userId: string): ShopOrder[] {
  return loadOrders().filter(o => o.userId === userId)
}

export function getPendingOrders(): ShopOrder[] {
  return loadOrders().filter(o => o.status !== 'delivered')
}

/* ─── WhatsApp deep link ─── */
export function shopWhatsappUrl(order: { id: string; items: CartItem[]; total: number; name: string; phone: string; address: string; city: string }): string {
  const lines = [
    '¡Hola CarLink! Quiero comprar mi llavero NFC 🔑',
    ...order.items.map(i => `• ${i.productName} (${i.color.name}) x${i.quantity}`),
    `• Total: ${COP(order.total)}`,
    `• Nombre: ${order.name}`,
    `• Envío: ${order.address}, ${order.city}`,
    `• Contacto: ${order.phone}`,
    `• Pedido: ${order.id}`,
  ]
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`
}

/* ─── Payment processing ─── */
export function processPayment(order: ShopOrder): PaymentChannel {
  saveOrder(order)
  if (order.paymentMethod === 'nequi' || order.paymentMethod === 'bancolombia' || order.paymentMethod === 'whatsapp') {
    window.open(shopWhatsappUrl(order), '_blank')
    return 'whatsapp'
  }
  const stripeLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK
  if (stripeLink) {
    const sep = stripeLink.includes('?') ? '&' : '?'
    window.location.href = `${stripeLink}${sep}prefilled_email=${encodeURIComponent(order.email)}&client_reference_id=${encodeURIComponent(order.id)}`
    return 'stripe'
  }
  window.open(shopWhatsappUrl(order), '_blank')
  return 'whatsapp'
}

/* ─── Waiting counter helper ─── */
export function getDaysSinceCreation(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
}

export function getShippingProgress(status: OrderStatus): number {
  const map: Record<OrderStatus, number> = { pending: 10, processing: 40, shipped: 75, delivered: 100 }
  return map[status]
}
