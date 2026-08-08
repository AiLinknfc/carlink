// Wompi Web Checkout Widget — checkout del llavero NFC (CartModal.tsx).
// El widget se abre como overlay sobre la propia página (no hay redirect a
// checkout.wompi.co). El monto y la firma de integridad SIEMPRE vienen del
// backend (POST /shop/orders) — este archivo nunca calcula ni conoce el
// secreto de integridad, solo usa la llave pública (NEXT_PUBLIC_WOMPI_PUBLIC_KEY,
// no es secreta, viaja al navegador a propósito).

declare global {
  interface Window {
    WidgetCheckout?: new (config: WompiWidgetConfig) => {
      open: (callback: (result: WompiWidgetResult) => void) => void
    }
  }
}

export interface WompiCustomerData {
  email: string
  fullName: string
  phoneNumber: string
  phoneNumberPrefix: string
}

export interface WompiShippingAddress {
  addressLine1: string
  city: string
  region: string
  country: string
  phoneNumber: string
  name: string
}

interface WompiWidgetConfig {
  currency: string
  amountInCents: number
  reference: string
  publicKey: string
  signature: { integrity: string }
  redirectUrl?: string
  customerData?: WompiCustomerData
  shippingAddress?: WompiShippingAddress
}

export interface WompiWidgetResult {
  transaction?: {
    id: string
    status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR'
    reference: string
  }
}

const WIDGET_SRC = 'https://checkout.wompi.co/widget.js'

function isLocalOrigin(): boolean {
  if (typeof window === 'undefined') return false
  return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)
}

let loadPromise: Promise<void> | null = null

/** Inyecta <script src="https://checkout.wompi.co/widget.js"> una sola vez,
 * sin importar cuántas veces se llame (reutiliza la promesa en curso). */
export function loadWompiWidget(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('loadWompiWidget: no DOM'))
  if (window.WidgetCheckout) return Promise.resolve()
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    // Si el script nunca dispara load ni error (bloqueado por una extensión,
    // firewall, DNS colgado, etc.) esto igual falla en 8s en vez de dejar el
    // botón de pago en "Procesando..." para siempre sin ninguna pista.
    const timer = setTimeout(() => {
      loadPromise = null
      reject(new Error('El widget de Wompi tardó demasiado en cargar (revisa tu conexión o si algo lo está bloqueando)'))
    }, 8000)
    const settle = (fn: () => void) => { clearTimeout(timer); fn() }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${WIDGET_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => settle(resolve))
      existing.addEventListener('error', () => settle(() => reject(new Error('No se pudo cargar el widget de Wompi'))))
      return
    }
    const script = document.createElement('script')
    script.src = WIDGET_SRC
    script.async = true
    script.onload = () => settle(resolve)
    script.onerror = () => settle(() => reject(new Error('No se pudo cargar el widget de Wompi')))
    document.head.appendChild(script)
  })
  return loadPromise
}

/** Abre el checkout de Wompi y resuelve con el resultado de la transacción.
 * `undefined` si la persona cierra el widget sin completar el pago (no es un error). */
export async function openWompiCheckout(opts: {
  reference: string
  amountInCents: number
  currency: string
  integritySignature: string
  customerData?: WompiCustomerData
  shippingAddress?: WompiShippingAddress
}): Promise<WompiWidgetResult['transaction'] | undefined> {
  const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY
  if (!publicKey) throw new Error('NEXT_PUBLIC_WOMPI_PUBLIC_KEY no está configurada')

  await loadWompiWidget()
  if (!window.WidgetCheckout) throw new Error('El widget de Wompi no cargó correctamente')

  const checkout = new window.WidgetCheckout({
    currency: opts.currency,
    amountInCents: opts.amountInCents,
    reference: opts.reference,
    publicKey,
    signature: { integrity: opts.integritySignature },
    // Wompi devuelve 403 (bloqueo de CloudFront) si redirect-url apunta a
    // localhost/127.0.0.1 — probado directamente contra su API: cualquier
    // otro dominio funciona, hasta http sin cifrar, solo localhost lo
    // rechaza. En local no hace falta de todas formas: la confirmación real
    // pasa por el callback de abajo + POST /shop/orders/{reference}/confirm,
    // nunca por este redirect. En producción, con un dominio real, esto
    // deja de aplicar y se manda igual que antes.
    redirectUrl: isLocalOrigin() ? undefined : window.location.href,
    customerData: opts.customerData,
    shippingAddress: opts.shippingAddress,
  })

  return new Promise(resolve => {
    checkout.open((result: WompiWidgetResult) => resolve(result?.transaction))
  })
}
