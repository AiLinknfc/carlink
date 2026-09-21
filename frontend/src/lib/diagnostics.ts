import { supabase } from './supabase'

/* Autodiagnóstico de soporte: reúne, EN EL NAVEGADOR de quien lo pide, datos técnicos reales
   para adjuntar a un ticket (dispositivo, conexión, estado del servidor, sesión y soporte NFC).
   Nada se envía a CarLink automáticamente: la persona descarga el PDF y decide si lo adjunta.
   No incluye contraseñas, tokens, documentos ni datos del vehículo más allá de la placa/ciudad
   que ya se ven en pantalla; el correo se muestra enmascarado. */


export type CheckState = 'ok' | 'warn' | 'fail' | 'info'

export interface DiagnosticCheck {
  label: string
  value: string
  state: CheckState
}

export interface DiagnosticReport {
  id: string
  generatedAt: string
  url: string
  plate: string
  city: string
  checks: {
    device: DiagnosticCheck[]
    connection: DiagnosticCheck[]
    service: DiagnosticCheck[]
    session: DiagnosticCheck[]
    nfc: DiagnosticCheck[]
  }
  summary: { ok: number; warn: number; fail: number }
  hints: string[]
}

const maskEmail = (e: string) => {
  const [u, d] = e.split('@')
  if (!d) return '(sin correo)'
  return `${u.slice(0, 2)}${'*'.repeat(Math.max(1, u.length - 2))}@${d}`
}

const newId = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `DX-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${rnd}`
}

function browserName(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge'
  if (/OPR\//.test(ua)) return 'Opera'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Safari\//.test(ua)) return 'Safari'
  return 'Desconocido'
}

function osName(ua: string): string {
  if (/Android/.test(ua)) return 'Android'
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Mac OS X/.test(ua)) return 'macOS'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Desconocido'
}

export async function collectDiagnostics(ctx: { plate: string; city: string }): Promise<DiagnosticReport> {
  const nav = typeof navigator !== 'undefined' ? navigator : ({} as Navigator)
  const ua = nav.userAgent || ''
  const os = osName(ua)
  const conn = (nav as Navigator & { connection?: { effectiveType?: string; downlink?: number } }).connection

  const device: DiagnosticCheck[] = [
    { label: 'Sistema operativo', value: os, state: 'info' },
    { label: 'Navegador', value: browserName(ua), state: 'info' },
    { label: 'Idioma / zona horaria', value: `${nav.language || '?'} / ${Intl.DateTimeFormat().resolvedOptions().timeZone}`, state: 'info' },
    { label: 'Pantalla / ventana', value: `${screen.width}x${screen.height} / ${window.innerWidth}x${window.innerHeight}`, state: 'info' },
    { label: 'Tema activo', value: document.documentElement.getAttribute('data-theme') === 'light' ? 'Claro' : 'Oscuro', state: 'info' },
  ]

  const online = nav.onLine !== false
  const connection: DiagnosticCheck[] = [
    { label: 'Conexión a internet', value: online ? 'Conectado' : 'Sin conexión', state: online ? 'ok' : 'fail' },
  ]
  if (conn?.effectiveType) {
    connection.push({ label: 'Calidad de red', value: `${conn.effectiveType}${conn.downlink ? ` (~${conn.downlink} Mbps)` : ''}`, state: conn.effectiveType === '4g' ? 'ok' : 'warn' })
  }

  // Estado real del servidor: /api/health (mismo origen, vía el proxy de la app; sin CORS) con tiempo de respuesta.
  const service: DiagnosticCheck[] = []
  const t0 = performance.now()
  try {
    const ctl = new AbortController()
    const to = setTimeout(() => ctl.abort(), 8000)
    const res = await fetch('/api/health', { signal: ctl.signal, cache: 'no-store' })
    clearTimeout(to)
    const ms = Math.round(performance.now() - t0)
    if (res.ok) {
      const j = await res.json().catch(() => ({}))
      service.push({ label: 'Servidor de CarLink', value: `Responde (${ms} ms)`, state: ms > 2500 ? 'warn' : 'ok' })
      if (j.version) service.push({ label: 'Versión del servicio', value: String(j.version), state: 'info' })
    } else {
      service.push({ label: 'Servidor de CarLink', value: `Respondió con error HTTP ${res.status}`, state: 'fail' })
    }
  } catch {
    service.push({ label: 'Servidor de CarLink', value: online ? 'No respondió a tiempo' : 'No se pudo consultar (sin conexión)', state: 'fail' })
  }

  // Sesión (sin tokens).
  const session: DiagnosticCheck[] = []
  try {
    const { data } = await supabase.auth.getSession()
    const s = data.session
    if (s) {
      const mins = s.expires_at ? Math.round((s.expires_at * 1000 - Date.now()) / 60000) : null
      session.push({ label: 'Sesión', value: `Iniciada (${maskEmail(s.user.email || '')})`, state: 'ok' })
      if (mins !== null) session.push({ label: 'Vigencia del acceso', value: mins > 0 ? `${mins} min` : 'Vencido: vuelve a iniciar sesión', state: mins > 0 ? 'ok' : 'warn' })
    } else {
      session.push({ label: 'Sesión', value: 'No hay sesión iniciada', state: 'info' })
    }
  } catch {
    session.push({ label: 'Sesión', value: 'No se pudo consultar', state: 'warn' })
  }

  // NFC: Web NFC solo existe en Chrome de Android; iPhone y otros leen NFC a nivel del sistema,
  // así que la ausencia de NDEFReader NO significa que el llavero no vaya a funcionar.
  const webNfc = 'NDEFReader' in window
  const nfc: DiagnosticCheck[] = [
    { label: 'Lectura NFC desde el navegador', value: webNfc ? 'Disponible' : 'No disponible en este navegador', state: 'info' },
  ]
  if (os === 'iOS') nfc.push({ label: 'Nota iPhone', value: 'Lee el llavero con la cámara o el lector del sistema, no desde el navegador', state: 'info' })
  if (os === 'Windows' || os === 'macOS' || os === 'Linux') nfc.push({ label: 'Nota equipo de escritorio', value: 'Los computadores no leen llaveros NFC; usa un celular', state: 'warn' })

  const all = [...device, ...connection, ...service, ...session, ...nfc]
  const summary = {
    ok: all.filter(c => c.state === 'ok').length,
    warn: all.filter(c => c.state === 'warn').length,
    fail: all.filter(c => c.state === 'fail').length,
  }

  const hints: string[] = []
  if (!online) hints.push('Sin internet: conéctate a una red Wi-Fi o datos móviles y vuelve a intentarlo.')
  if (service.some(c => c.state === 'fail') && online) hints.push('El servidor no respondió desde tu conexión: intenta de nuevo en unos minutos; si persiste, adjunta este reporte a tu ticket.')
  if (session.some(c => c.value.startsWith('Vencido'))) hints.push('Tu acceso venció: cierra sesión y vuelve a entrar.')
  if (os === 'Android' && !webNfc) hints.push('Para leer el llavero, activa NFC en los ajustes del celular y usa Chrome.')
  if (os === 'iOS') hints.push('En iPhone acerca la parte superior del teléfono al llavero con la pantalla encendida.')
  if (hints.length === 0) hints.push('No encontramos fallas técnicas en este dispositivo. Describe el problema en tu ticket y adjunta este reporte.')

  return { id: newId(), generatedAt: new Date().toISOString(), url: window.location.href.split('?')[0], plate: ctx.plate, city: ctx.city, checks: { device, connection, service, session, nfc }, summary, hints }
}
