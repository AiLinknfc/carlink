// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const getSession = vi.fn()
vi.mock('../supabase', () => ({ supabase: { auth: { getSession: (...a: unknown[]) => getSession(...a) } } }))

import { collectDiagnostics, type DiagnosticReport } from '../diagnostics'

const UA = {
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  winEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 Edg/126.0',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0',
  weird: 'curl/8.0',
}

function setNav(ua: string, extra: Record<string, unknown> = {}) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
  Object.defineProperty(navigator, 'onLine', { value: extra.onLine ?? true, configurable: true })
  Object.defineProperty(navigator, 'connection', { value: extra.connection, configurable: true })
}

const find = (r: DiagnosticReport, group: keyof DiagnosticReport['checks'], label: string) =>
  r.checks[group].find(c => c.label === label)

beforeEach(() => {
  getSession.mockResolvedValue({ data: { session: null } })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ version: 'abc123' }) }))
  delete (window as unknown as { NDEFReader?: unknown }).NDEFReader
  setNav(UA.androidChrome)
})
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('collectDiagnostics: dispositivo', () => {
  it.each([
    [UA.androidChrome, 'Android', 'Chrome'],
    [UA.iphone, 'iOS', 'Safari'],
    [UA.winEdge, 'Windows', 'Edge'],
    [UA.macSafari, 'macOS', 'Safari'],
    [UA.firefoxLinux, 'Linux', 'Firefox'],
    [UA.weird, 'Desconocido', 'Desconocido'],
  ])('detecta SO y navegador de %s', async (ua, os, browser) => {
    setNav(ua)
    const r = await collectDiagnostics({ plate: 'ABC123', city: 'Cali' })
    expect(find(r, 'device', 'Sistema operativo')?.value).toBe(os)
    expect(find(r, 'device', 'Navegador')?.value).toBe(browser)
  })

  it('arrastra placa/ciudad y quita la query de la URL (puede traer tokens)', async () => {
    window.history.replaceState({}, '', '/app?token=secreto&x=1')
    const r = await collectDiagnostics({ plate: 'ABC123', city: 'Cali' })
    expect(r.plate).toBe('ABC123')
    expect(r.city).toBe('Cali')
    expect(r.url).not.toContain('secreto')
    expect(r.url).not.toContain('?')
  })

  it('el id tiene formato DX-AAAAMMDD-XXXX', async () => {
    const r = await collectDiagnostics({ plate: '', city: '' })
    expect(r.id).toMatch(/^DX-\d{8}-[A-Z0-9]{1,4}$/)
  })
})

describe('collectDiagnostics: conexion y servidor', () => {
  it('sin internet: fail, pista de conexion, y sin pista de servidor duplicada', async () => {
    setNav(UA.androidChrome, { onLine: false })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')))
    const r = await collectDiagnostics({ plate: '', city: '' })
    expect(find(r, 'connection', 'Conexión a internet')?.state).toBe('fail')
    expect(find(r, 'service', 'Servidor de CarLink')?.value).toContain('sin conexión')
    expect(r.hints.some(h => h.startsWith('Sin internet'))).toBe(true)
    expect(r.hints.some(h => h.startsWith('El servidor no respondió'))).toBe(false)
  })

  it('en linea pero servidor caido: fail y pista del servidor', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('abort')))
    const r = await collectDiagnostics({ plate: '', city: '' })
    expect(find(r, 'service', 'Servidor de CarLink')).toMatchObject({ state: 'fail', value: 'No respondió a tiempo' })
    expect(r.hints.some(h => h.startsWith('El servidor no respondió'))).toBe(true)
  })

  it('HTTP 500: fail con el codigo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }))
    const r = await collectDiagnostics({ plate: '', city: '' })
    expect(find(r, 'service', 'Servidor de CarLink')?.value).toContain('503')
    expect(find(r, 'service', 'Servidor de CarLink')?.state).toBe('fail')
  })

  it('servidor ok: incluye version; respuesta sin JSON valido no rompe', async () => {
    let r = await collectDiagnostics({ plate: '', city: '' })
    expect(find(r, 'service', 'Versión del servicio')?.value).toBe('abc123')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => { throw new Error('x') } }))
    r = await collectDiagnostics({ plate: '', city: '' })
    expect(find(r, 'service', 'Servidor de CarLink')?.state).toBe('ok')
    expect(find(r, 'service', 'Versión del servicio')).toBeUndefined()
  })

  it('respuesta lenta (>2500 ms) es warn', async () => {
    const spy = vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValue(3000)
    const r = await collectDiagnostics({ plate: '', city: '' })
    spy.mockRestore()
    expect(find(r, 'service', 'Servidor de CarLink')?.state).toBe('warn')
  })

  it('calidad de red: 4g ok, 3g warn, y el downlink se muestra si existe', async () => {
    setNav(UA.androidChrome, { connection: { effectiveType: '4g', downlink: 10 } })
    let r = await collectDiagnostics({ plate: '', city: '' })
    expect(find(r, 'connection', 'Calidad de red')).toMatchObject({ state: 'ok', value: '4g (~10 Mbps)' })
    setNav(UA.androidChrome, { connection: { effectiveType: '3g' } })
    r = await collectDiagnostics({ plate: '', city: '' })
    expect(find(r, 'connection', 'Calidad de red')).toMatchObject({ state: 'warn', value: '3g' })
  })
})

describe('collectDiagnostics: sesion', () => {
  it('enmascara el correo y nunca expone tokens', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok-secreto', user: { email: 'andres@ejemplo.co' }, expires_at: Math.floor(Date.now() / 1000) + 3600 } } })
    const r = await collectDiagnostics({ plate: '', city: '' })
    const s = find(r, 'session', 'Sesión')!
    expect(s.value).toBe('Iniciada (an****@ejemplo.co)')
    expect(JSON.stringify(r)).not.toContain('tok-secreto')
    expect(JSON.stringify(r)).not.toContain('andres@')
    expect(find(r, 'session', 'Vigencia del acceso')).toMatchObject({ state: 'ok' })
  })

  it('correo de 1 o 2 letras se enmascara con al menos un asterisco', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { email: 'a@x.co' } } } })
    const r = await collectDiagnostics({ plate: '', city: '' })
    expect(find(r, 'session', 'Sesión')?.value).toBe('Iniciada (a*@x.co)')
  })

  it('sesion sin correo muestra (sin correo)', async () => {
    getSession.mockResolvedValue({ data: { session: { user: {} } } })
    const r = await collectDiagnostics({ plate: '', city: '' })
    expect(find(r, 'session', 'Sesión')?.value).toContain('(sin correo)')
  })

  it('token vencido: warn y pista de volver a entrar', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { email: 'ab@x.co' }, expires_at: Math.floor(Date.now() / 1000) - 600 } } })
    const r = await collectDiagnostics({ plate: '', city: '' })
    expect(find(r, 'session', 'Vigencia del acceso')?.state).toBe('warn')
    expect(r.hints.some(h => h.startsWith('Tu acceso venció'))).toBe(true)
  })

  it('sin sesion es info; si supabase lanza, warn y no se cae', async () => {
    let r = await collectDiagnostics({ plate: '', city: '' })
    expect(find(r, 'session', 'Sesión')?.state).toBe('info')
    getSession.mockRejectedValue(new Error('boom'))
    r = await collectDiagnostics({ plate: '', city: '' })
    expect(find(r, 'session', 'Sesión')?.state).toBe('warn')
  })
})

describe('collectDiagnostics: NFC, resumen y pistas', () => {
  it('Android sin Web NFC sugiere activar NFC y usar Chrome', async () => {
    const r = await collectDiagnostics({ plate: '', city: '' })
    expect(find(r, 'nfc', 'Lectura NFC desde el navegador')?.value).toContain('No disponible')
    expect(r.hints.some(h => h.includes('activa NFC'))).toBe(true)
  })

  it('Android con NDEFReader no da esa pista', async () => {
    ;(window as unknown as { NDEFReader: unknown }).NDEFReader = class {}
    const r = await collectDiagnostics({ plate: '', city: '' })
    expect(r.hints.some(h => h.includes('activa NFC'))).toBe(false)
  })

  it('iPhone: nota y pista especificas; escritorio: nota warn', async () => {
    setNav(UA.iphone)
    let r = await collectDiagnostics({ plate: '', city: '' })
    expect(find(r, 'nfc', 'Nota iPhone')).toBeDefined()
    expect(r.hints.some(h => h.startsWith('En iPhone'))).toBe(true)
    setNav(UA.winEdge)
    r = await collectDiagnostics({ plate: '', city: '' })
    expect(find(r, 'nfc', 'Nota equipo de escritorio')?.state).toBe('warn')
  })

  it('el resumen cuenta ok/warn/fail de todos los grupos', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('x')))
    setNav(UA.winEdge, { connection: { effectiveType: '3g' } })
    const r = await collectDiagnostics({ plate: '', city: '' })
    const all = Object.values(r.checks).flat()
    expect(r.summary).toEqual({
      ok: all.filter(c => c.state === 'ok').length,
      warn: all.filter(c => c.state === 'warn').length,
      fail: all.filter(c => c.state === 'fail').length,
    })
    expect(r.summary.fail).toBe(1)
    expect(r.summary.warn).toBe(2) // 3g + nota escritorio
  })

  it('sin hallazgos devuelve la pista generica unica', async () => {
    setNav(UA.firefoxLinux)
    ;(window as unknown as { NDEFReader: unknown }).NDEFReader = class {}
    // Linux agrega nota warn de escritorio pero ninguna pista; no hay otras pistas.
    const r = await collectDiagnostics({ plate: '', city: '' })
    expect(r.hints).toHaveLength(1)
    expect(r.hints[0]).toContain('No encontramos fallas técnicas')
  })
})
