// Checkout del llavero NFC — no requiere autenticación.
// El pago se realiza en una página segura alojada por Stripe (Stripe Payment Link).
// Configura los links en variables de entorno (ver getStripeLink). Mientras no
// existan, se ofrece un cierre de compra por WhatsApp como respaldo de confianza.

export const SUPPORT_WHATSAPP = '573164976104' // +57 316 497 6104

export interface FobProduct {
  id: string
  name: string
  desc: string
  price: number // COP
  premium?: boolean
}

export const FOB_PRODUCTS: FobProduct[] = [
  { id: 'std', name: 'Llavero Estándar', desc: 'Aro metálico, grabado con tu placa.', price: 49900 },
  { id: 'prem', name: 'Llavero Premium', desc: 'Acero cepillado + envío express.', price: 79900, premium: true },
  { id: 'custom', name: 'Llavero Personalizado', desc: 'Tu logo o diseño propio.', price: 99900 },
]

export interface FobOrder {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  total: number
  name: string
  email: string
  phone: string
  address: string
  city: string
  plate?: string
  notes?: string
  createdAt: string
}

export const COP = (n: number) => '$' + n.toLocaleString('es-CO')

export function productById(id: string): FobProduct {
  return FOB_PRODUCTS.find(p => p.id === id) || FOB_PRODUCTS[0]
}

// Stripe Payment Link por producto (o uno genérico). Se pega la URL de Stripe
// (https://buy.stripe.com/...) en estas variables de entorno públicas.
export function getStripeLink(productId: string): string | null {
  // Referencias directas para que Next.js inyecte las variables públicas en build.
  const generic = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || null
  if (productId === 'std') return process.env.NEXT_PUBLIC_STRIPE_LINK_STD || generic
  if (productId === 'prem') return process.env.NEXT_PUBLIC_STRIPE_LINK_PREM || generic
  if (productId === 'custom') return process.env.NEXT_PUBLIC_STRIPE_LINK_CUSTOM || generic
  return generic
}

export function saveFobOrder(order: FobOrder) {
  try {
    const raw = window.localStorage.getItem('carlink_fob_orders')
    const list = raw ? JSON.parse(raw) : []
    list.unshift(order)
    window.localStorage.setItem('carlink_fob_orders', JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export function whatsappOrderUrl(order: FobOrder): string {
  const lines = [
    '¡Hola CarLink! Quiero comprar mi llavero NFC 🔑',
    `• Producto: ${order.productName} (x${order.quantity})`,
    `• Total: ${COP(order.total)}`,
    `• Nombre: ${order.name}`,
    order.plate ? `• Placa: ${order.plate}` : '',
    `• Envío: ${order.address}, ${order.city}`,
    `• Contacto: ${order.phone} · ${order.email}`,
    order.notes ? `• Notas: ${order.notes}` : '',
    `• Pedido: ${order.id}`,
  ].filter(Boolean)
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`
}

// Redirige al pago. Devuelve 'stripe' o 'whatsapp' según el canal usado.
export function startPayment(order: FobOrder): 'stripe' | 'whatsapp' {
  saveFobOrder(order)
  const link = getStripeLink(order.productId)
  if (link) {
    const sep = link.includes('?') ? '&' : '?'
    const url = `${link}${sep}prefilled_email=${encodeURIComponent(order.email)}&client_reference_id=${encodeURIComponent(order.id)}`
    window.location.href = url
    return 'stripe'
  }
  window.open(whatsappOrderUrl(order), '_blank')
  return 'whatsapp'
}
