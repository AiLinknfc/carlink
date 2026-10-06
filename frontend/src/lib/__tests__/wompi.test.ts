// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type Mod = typeof import('../wompi')
const SRC = 'https://checkout.wompi.co/widget.js'

// loadPromise es estado de modulo: se reimporta limpio en cada test.
async function fresh(): Promise<Mod> {
  vi.resetModules()
  return import('../wompi')
}

const opts = {
  reference: 'CL-REF-1', amountInCents: 4990000, currency: 'COP', integritySignature: 'firma-falsa-abc',
}

function installWidget(onOpen?: (cb: (r: unknown) => void) => void) {
  const ctor = vi.fn(function (this: { open: unknown }, _cfg?: unknown) {
    this.open = (cb: (r: unknown) => void) => onOpen?.(cb)
  })
  ;(window as unknown as { WidgetCheckout: unknown }).WidgetCheckout = ctor
  return ctor
}

beforeEach(() => {
  document.head.innerHTML = ''
  delete (window as unknown as { WidgetCheckout?: unknown }).WidgetCheckout
  vi.stubEnv('NEXT_PUBLIC_WOMPI_PUBLIC_KEY', 'pub_test_falsa')
})
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers() })

describe('loadWompiWidget', () => {
  it('inyecta el script una sola vez aunque se llame varias veces', async () => {
    const { loadWompiWidget } = await fresh()
    const p1 = loadWompiWidget()
    const p2 = loadWompiWidget()
    expect(p1).toBe(p2)
    expect(document.querySelectorAll(`script[src="${SRC}"]`)).toHaveLength(1)
    document.querySelector<HTMLScriptElement>('script')!.onload!(new Event('load'))
    await expect(p1).resolves.toBeUndefined()
  })

  it('resuelve de inmediato si el widget ya existe', async () => {
    installWidget()
    const { loadWompiWidget } = await fresh()
    await expect(loadWompiWidget()).resolves.toBeUndefined()
    expect(document.querySelectorAll('script')).toHaveLength(0)
  })

  it('rechaza si el script falla al cargar', async () => {
    const { loadWompiWidget } = await fresh()
    const p = loadWompiWidget()
    document.querySelector<HTMLScriptElement>('script')!.onerror!(new Event('error'))
    await expect(p).rejects.toThrow('No se pudo cargar')
  })

  it('rechaza a los 8s si el script nunca responde y permite reintentar', async () => {
    vi.useFakeTimers()
    const { loadWompiWidget } = await fresh()
    const p = loadWompiWidget()
    const assertion = expect(p).rejects.toThrow('tardó demasiado')
    await vi.advanceTimersByTimeAsync(7999)
    await vi.advanceTimersByTimeAsync(2)
    await assertion
    // el reintento crea una promesa nueva (no reutiliza la fallida)
    const p2 = loadWompiWidget()
    expect(p2).not.toBe(p)
    p2.catch(() => {})
  })

  it('reutiliza un script ya presente en el DOM', async () => {
    const s = document.createElement('script')
    s.src = SRC
    document.head.appendChild(s)
    const { loadWompiWidget } = await fresh()
    const p = loadWompiWidget()
    expect(document.querySelectorAll('script')).toHaveLength(1)
    s.dispatchEvent(new Event('load'))
    await expect(p).resolves.toBeUndefined()
  })
})

describe('openWompiCheckout', () => {
  it('falla claro si no hay llave publica', async () => {
    vi.stubEnv('NEXT_PUBLIC_WOMPI_PUBLIC_KEY', '')
    installWidget()
    const { openWompiCheckout } = await fresh()
    await expect(openWompiCheckout(opts)).rejects.toThrow('NEXT_PUBLIC_WOMPI_PUBLIC_KEY')
  })

  it('pasa monto, referencia y firma EXACTAMENTE como vienen del backend', async () => {
    const ctor = installWidget(cb => cb({ transaction: { id: 't1', status: 'APPROVED', reference: 'CL-REF-1' } }))
    const { openWompiCheckout } = await fresh()
    const tx = await openWompiCheckout({ ...opts, customerData: { email: 'a@b.co', fullName: 'Ana', phoneNumber: '3124033960', phoneNumberPrefix: '+57' } })
    expect(tx).toEqual({ id: 't1', status: 'APPROVED', reference: 'CL-REF-1' })
    const cfg = ctor.mock.calls[0][0] as Record<string, unknown>
    expect(cfg).toMatchObject({
      currency: 'COP', amountInCents: 4990000, reference: 'CL-REF-1', publicKey: 'pub_test_falsa',
      signature: { integrity: 'firma-falsa-abc' },
    })
    expect((cfg.customerData as { email: string }).email).toBe('a@b.co')
  })

  it('en localhost no manda redirectUrl (Wompi lo bloquea con 403)', async () => {
    const ctor = installWidget(cb => cb({}))
    const { openWompiCheckout } = await fresh()
    expect(window.location.hostname).toBe('localhost')
    await openWompiCheckout(opts)
    expect((ctor.mock.calls[0][0] as { redirectUrl?: string }).redirectUrl).toBeUndefined()
  })

  it('si la persona cierra el widget sin pagar resuelve undefined, sin error', async () => {
    installWidget(cb => cb({}))
    const { openWompiCheckout } = await fresh()
    await expect(openWompiCheckout(opts)).resolves.toBeUndefined()
  })

  it('callback con resultado null/undefined tampoco lanza', async () => {
    installWidget(cb => cb(undefined))
    const { openWompiCheckout } = await fresh()
    await expect(openWompiCheckout(opts)).resolves.toBeUndefined()
  })

  it('propaga el estado DECLINED tal cual (el llamador decide)', async () => {
    installWidget(cb => cb({ transaction: { id: 't2', status: 'DECLINED', reference: 'CL-REF-1' } }))
    const { openWompiCheckout } = await fresh()
    expect((await openWompiCheckout(opts))?.status).toBe('DECLINED')
  })
})
