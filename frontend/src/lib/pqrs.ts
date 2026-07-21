// PQRS store — Peticiones, Quejas, Reclamos y Sugerencias.
// Canal compartido entre el agente del landing (donde el usuario reporta) y la
// bandeja dentro de la app (donde el servicio técnico atiende). Se persiste en
// localStorage para que el incidente/mejora sea visible sin backend.

export type PqrsKind = 'peticion' | 'queja' | 'reclamo' | 'sugerencia'
export type PqrsStatus = 'nuevo' | 'en_revision' | 'resuelto'

export interface PqrsMsg {
  role: 'bot' | 'user'
  text: string
}

export interface PqrsEntry {
  id: string
  ticket: string
  kind: PqrsKind
  category: string
  categoryLabel: string
  carModel?: string
  message: string
  email?: string
  plate?: string
  city?: string
  status: PqrsStatus
  createdAt: string
  transcript: PqrsMsg[]
}

const KEY = 'carlink_pqrs'
const EVENT = 'carlink_pqrs_changed'

export const KIND_LABEL: Record<PqrsKind, string> = {
  peticion: 'Petición',
  queja: 'Queja',
  reclamo: 'Reclamo',
  sugerencia: 'Sugerencia',
}

export const STATUS_LABEL: Record<PqrsStatus, string> = {
  nuevo: 'Nuevo',
  en_revision: 'En revisión',
  resuelto: 'Resuelto',
}

export function getPqrs(): PqrsEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    const list = raw ? (JSON.parse(raw) as PqrsEntry[]) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function persist(list: PqrsEntry[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list))
    window.dispatchEvent(new CustomEvent(EVENT))
  } catch {
    /* ignore */
  }
}

export function addPqrs(entry: Omit<PqrsEntry, 'id' | 'ticket' | 'status' | 'createdAt'>): PqrsEntry {
  const full: PqrsEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ticket: `PQ-${Math.floor(Math.random() * 90000 + 10000)}`,
    status: 'nuevo',
    createdAt: new Date().toISOString(),
  }
  const list = getPqrs()
  list.unshift(full)
  persist(list)
  return full
}

export function updatePqrsStatus(id: string, status: PqrsStatus) {
  const list = getPqrs().map(e => (e.id === id ? { ...e, status } : e))
  persist(list)
}

// Notifica cambios en la misma pestaña (CustomEvent) y entre pestañas (storage).
export function subscribePqrs(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onLocal = () => cb()
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb() }
  window.addEventListener(EVENT, onLocal)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, onLocal)
    window.removeEventListener('storage', onStorage)
  }
}
