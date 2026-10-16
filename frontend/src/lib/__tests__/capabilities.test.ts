import { describe, expect, it } from 'vitest'
import { accessBannerTitle, canUse, remainingLabel, tabAllowed } from '../capabilities'
import { effectiveSubscription } from '../constants'

describe('capacidades del menú', () => {
  const concesionario = { capabilities: ['perfil', 'clientes', 'notificaciones', 'documentos'] }
  it('oculta lo que el tipo no incluye', () => {
    expect(tabAllowed(concesionario, 'ordenes')).toBe(false)
    expect(tabAllowed(concesionario, 'inventario')).toBe(false)
    expect(tabAllowed(concesionario, 'clientes')).toBe(true)
    expect(tabAllowed(concesionario, 'resumen')).toBe(true) // resumen es de todos
  })
  it('sin lista de capacidades permite todo (backend viejo o cargando)', () => {
    expect(canUse(undefined, 'ordenes')).toBe(true)
    expect(canUse({ capabilities: null }, 'ordenes')).toBe(true)
  })
})

describe('textos del acceso', () => {
  it('meses cuando falta mucho, días cuando falta poco', () => {
    expect(remainingLabel(340)).toBe('quedan 11 meses')
    expect(remainingLabel(30)).toBe('quedan 30 días')
    expect(remainingLabel(1)).toBe('quedan 1 día')
  })
  it('el aliado fundador ve su propio mensaje', () => {
    expect(accessBannerTitle('founder', 200)).toContain('aliado fundador')
    expect(accessBannerTitle('trial', 5)).toBe('Prueba gratuita · quedan 5 días')
  })
})

describe('effectiveSubscription con datos del backend', () => {
  const longAgo = new Date(Date.now() - 400 * 86400000).toISOString()
  it('respeta "expired" aunque la cuenta sea reciente', () => {
    expect(effectiveSubscription('expired', null, new Date().toISOString())).toBe('expired')
  })
  it('un año de acceso: la cuenta creada hace 400 días sigue vigente si el backend dice trial con fecha futura', () => {
    const until = new Date(Date.now() + 30 * 86400000).toISOString()
    expect(effectiveSubscription('trial', until, longAgo)).toBe('trial')
  })
})
