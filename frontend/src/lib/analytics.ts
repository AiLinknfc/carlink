/* Analítica first-party (migración 060) — sin terceros, sin PII.
   anon_id: id aleatorio por navegador (localStorage). session_id: uno por
   pestaña (sessionStorage). Todo es best-effort: un fallo acá jamás debe
   afectar la UI, por eso todo va en try/catch y nada lanza hacia afuera.
   Eventos en lote (cola + flush cada 2 s o al ocultar la pestaña). */
import { getAccessToken } from './supabase'

interface QueuedEvent {
  anon_id: string
  session_id: string
  event: string
  path: string
  props: Record<string, string | number | boolean | null>
  referrer: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  device: 'mobile' | 'tablet' | 'desktop'
}

type Props = Record<string, string | number | boolean | null>

const ANON_KEY = 'carlink_anon_id'
const SESSION_KEY = 'carlink_session_id'
const UTM_KEY = 'carlink_utm'
const FLUSH_MS = 2000
const MAX_BATCH = 20
const IGNORED_PREFIXES = ['/admin', '/debug-sidebar']

const queue: QueuedEvent[] = []
let timer: ReturnType<typeof setTimeout> | null = null
let listenersReady = false

function randomId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
  }
}

function getOrCreate(storage: Storage | undefined, key: string): string {
  try {
    if (!storage) return randomId()
    let v = storage.getItem(key)
    if (!v || v.length < 8) {
      v = randomId()
      storage.setItem(key, v)
    }
    return v
  } catch {
    return randomId()
  }
}

function getDevice(): QueuedEvent['device'] {
  const w = window.innerWidth
  return w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop'
}

/* UTM: se toman de la URL de la primera página de la sesión y se
   recuerdan en sessionStorage, para atribuir también las páginas siguientes. */
function getUtm(): { utm_source: string; utm_medium: string; utm_campaign: string } {
  const empty = { utm_source: '', utm_medium: '', utm_campaign: '' }
  try {
    const params = new URLSearchParams(window.location.search)
    const fromUrl = {
      utm_source: (params.get('utm_source') || '').slice(0, 100),
      utm_medium: (params.get('utm_medium') || '').slice(0, 100),
      utm_campaign: (params.get('utm_campaign') || '').slice(0, 100),
    }
    if (fromUrl.utm_source || fromUrl.utm_medium || fromUrl.utm_campaign) {
      sessionStorage.setItem(UTM_KEY, JSON.stringify(fromUrl))
      return fromUrl
    }
    const saved = sessionStorage.getItem(UTM_KEY)
    return saved ? { ...empty, ...JSON.parse(saved) } : empty
  } catch {
    return empty
  }
}

async function flush(useBeacon = false) {
  if (timer) { clearTimeout(timer); timer = null }
  if (!queue.length) return
  const events = queue.splice(0, MAX_BATCH)
  const body = JSON.stringify({ events })
  try {
    if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/events', new Blob([body], { type: 'application/json' }))
    } else {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const token = await getAccessToken().catch(() => null)
      if (token) headers.Authorization = `Bearer ${token}`
      await fetch('/api/analytics/events', { method: 'POST', headers, body, keepalive: true })
    }
  } catch {
    /* best-effort: se descarta el lote */
  }
  if (queue.length) schedule()
}

function schedule() {
  if (timer) return
  timer = setTimeout(() => { void flush() }, FLUSH_MS)
}

function ensureListeners() {
  if (listenersReady || typeof document === 'undefined') return
  listenersReady = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush(true)
  })
  window.addEventListener('pagehide', () => { void flush(true) })
}

export function track(event: string, props: Props = {}, pathOverride?: string) {
  try {
    if (typeof window === 'undefined') return
    const path = pathOverride ?? window.location.pathname
    if (IGNORED_PREFIXES.some(p => path.startsWith(p))) return
    ensureListeners()
    let referrer = ''
    try { referrer = event === 'page_view' ? document.referrer.slice(0, 300) : '' } catch {}
    queue.push({
      anon_id: getOrCreate(window.localStorage, ANON_KEY),
      session_id: getOrCreate(window.sessionStorage, SESSION_KEY),
      event,
      path: path.slice(0, 300),
      props,
      referrer,
      ...getUtm(),
      device: getDevice(),
    })
    if (queue.length >= MAX_BATCH) void flush()
    else schedule()
  } catch {
    /* nunca propagar */
  }
}
