// @vitest-environment jsdom
// @vitest-environment-options {"url": "https://carlink.example/app/checkout?x=1"}
import { it, expect, vi } from 'vitest'

// Fuera de localhost si se manda redirectUrl (la pagina actual).
it('en un dominio real manda redirectUrl con la URL actual', async () => {
  vi.stubEnv('NEXT_PUBLIC_WOMPI_PUBLIC_KEY', 'pub_test_falsa')
  const ctor = vi.fn(function (this: { open: unknown }, _cfg?: unknown) {
    this.open = (cb: (r: unknown) => void) => cb({})
  })
  ;(window as unknown as { WidgetCheckout: unknown }).WidgetCheckout = ctor
  const { openWompiCheckout } = await import('../wompi')
  await openWompiCheckout({ reference: 'R', amountInCents: 1, currency: 'COP', integritySignature: 's' })
  expect(window.location.hostname).toBe('carlink.example')
  expect((ctor.mock.calls[0][0] as { redirectUrl?: string }).redirectUrl).toBe('https://carlink.example/app/checkout?x=1')
  vi.unstubAllEnvs()
})
