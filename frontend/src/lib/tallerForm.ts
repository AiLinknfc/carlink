/* Validaciones, normalizadores y ayudas del formulario de postulación de talleres (landing /taller) y
   la fusión de la cobertura fija con las postulaciones reales. Funciones puras: se prueban en
   __tests__/tallerForm.test.ts. El backend vuelve a validar todo (workshop_applications.py). */

// ── Ciudad ──

/** Clave para tratar igual "Bogotá D.C.", "bogota" y "BOGOTÁ". Misma regla que `_city_key` del backend. */
export function cityKey(city: string): string {
  const folded = city.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return folded.replace(/\bd\.?\s?c\.?\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()
}

export const CITIES = [
  'Bogotá D.C.', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga', 'Cúcuta', 'Pereira', 'Manizales',
  'Santa Marta', 'Ibagué', 'Villavicencio', 'Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Armenia', 'Neiva',
  'Pasto', 'Popayán', 'Montería', 'Valledupar', 'Sincelejo', 'Riohacha', 'Florencia', 'Yopal', 'Quibdó',
  'Soacha', 'Bello', 'Itagüí', 'Envigado', 'Floridablanca', 'Girón', 'Piedecuesta', 'Palmira', 'Buenaventura',
  'Tuluá', 'Zipaquirá', 'Chía', 'Girardot', 'Fusagasugá', 'Facatativá', 'Barrancabermeja', 'Ocaña', 'Pamplona',
]

/** Devuelve el nombre de la lista si el texto coincide con una ciudad conocida, o el texto tal cual. */
export function canonicalCity(raw: string): string {
  const k = cityKey(raw)
  return CITIES.find(c => cityKey(c) === k) ?? raw.trim()
}

// ── NIT ──

const NIT_WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]

export function nitCheckDigit(base: string): number {
  const total = [...base].reverse().reduce((a, d, i) => a + Number(d) * NIT_WEIGHTS[i], 0)
  const mod = total % 11
  return mod === 0 || mod === 1 ? mod : 11 - mod
}

export type NitCheck =
  | { status: 'ok'; value: string }
  | { status: 'missing_dv'; value: string; suggestion: string }
  | { status: 'bad_dv'; value: string; suggestion: string }
  | { status: 'invalid' }

/** Analiza lo que escribió la persona: NIT completo, sin dígito de verificación, con dígito errado o inválido. */
export function checkNit(raw: string): NitCheck {
  const clean = raw.trim().replace(/[\s.]/g, '')
  const full = clean.match(/^(\d{6,15})-(\d)$/)
  if (full) {
    const expected = nitCheckDigit(full[1])
    return expected === Number(full[2])
      ? { status: 'ok', value: clean }
      : { status: 'bad_dv', value: clean, suggestion: `${full[1]}-${expected}` }
  }
  const digits = clean.match(/^\d{6,16}$/)
  if (digits) {
    // 10 dígitos pegados sin guion: lo más común es "9 de base + 1 de verificación".
    if (clean.length === 10) {
      const base = clean.slice(0, 9)
      if (nitCheckDigit(base) === Number(clean[9])) return { status: 'ok', value: `${base}-${clean[9]}` }
    }
    if (clean.length <= 15) return { status: 'missing_dv', value: clean, suggestion: `${clean}-${nitCheckDigit(clean)}` }
  }
  return { status: 'invalid' }
}

export function validNit(raw: string): boolean {
  return checkNit(raw).status === 'ok'
}

// ── Contacto ──

/** Celular colombiano (10 dígitos, empieza en 3) o fijo (10 dígitos, empieza en 60). Acepta +57. */
export function phoneDigits(raw: string): string {
  let d = raw.replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('57')) d = d.slice(2)
  return d
}

export function validPhone(raw: string): boolean {
  const d = phoneDigits(raw)
  return /^3\d{9}$/.test(d) || /^60\d{8}$/.test(d)
}

export function formatPhone(raw: string): string {
  const d = phoneDigits(raw)
  if (/^3\d{9}$/.test(d)) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
  if (/^60\d{8}$/.test(d)) return `(${d.slice(0, 3)}) ${d.slice(3, 6)} ${d.slice(6)}`
  return raw.trim()
}

export function validEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/.test(raw.trim())
}

const DOMAIN_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gamil.com': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmal.com': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'outlook.con': 'outlook.com',
  'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com',
}

/** Si el dominio parece un error de tipeo conocido, devuelve el correo corregido. */
export function emailSuggestion(raw: string): string | null {
  const v = raw.trim()
  const at = v.lastIndexOf('@')
  if (at < 1) return null
  const fixed = DOMAIN_TYPOS[v.slice(at + 1).toLowerCase()]
  return fixed ? `${v.slice(0, at)}@${fixed}` : null
}

/** Sitio web opcional: agrega https:// si falta. Devuelve null si no parece un dominio. */
export function normalizeWebsite(raw: string): string | null {
  const v = raw.trim()
  if (!v) return ''
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`
  try {
    const u = new URL(withProto)
    return /^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(u.hostname) ? withProto : null
  } catch { return null }
}

/** Instagram opcional: acepta @usuario, usuario o la URL del perfil. Devuelve "@usuario" o null si es inválido. */
export function normalizeInstagram(raw: string): string | null {
  let v = raw.trim()
  if (!v) return ''
  v = v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '').replace(/^@/, '')
  return /^[A-Za-z0-9._]{1,30}$/.test(v) ? `@${v}` : null
}

// ── Tipo de organización (docs/PLAN_ALIADOS_NEGOCIO.md) ──

export type BusinessKind = 'taller' | 'cda' | 'concesionario' | 'compraventa' | 'repuestos'
export const BUSINESS_KINDS: { v: BusinessKind; l: string; hint: string }[] = [
  { v: 'taller', l: 'Taller o servicio automotriz', hint: 'Mecánica, latonería, llantas, lubricentro, CDA...' },
  { v: 'cda', l: 'Centro de diagnóstico automotor (CDA)', hint: 'Revisión técnico-mecánica y de gases.' },
  { v: 'concesionario', l: 'Concesionario', hint: 'Vende vehículos nuevos o usados de una o varias marcas.' },
  { v: 'compraventa', l: 'Compraventa de vehículos', hint: 'Compra y vende vehículos usados.' },
  { v: 'repuestos', l: 'Proveedor de repuestos', hint: 'Vende repuestos, accesorios o insumos del sector.' },
]
export const KIND_LABEL: Record<string, string> = Object.fromEntries(BUSINESS_KINDS.map(k => [k.v, k.l]))

/** Qué se pide en "especialidades" según el tipo: taller -> especialidades; concesionario -> marcas; el resto no la usa. */
export function specialtiesMode(kind: string): 'taller' | 'brands' | null {
  return kind === 'taller' ? 'taller' : kind === 'concesionario' ? 'brands' : null
}

// ── Ayudas de opciones ──

export const CONTACT_ROLES = ['Propietario', 'Gerente', 'Administrador', 'Jefe de taller', 'Asesor de servicio', 'Compras']

export const SPECIALTIES = [
  'Cambio de aceite', 'Frenos', 'Suspensión y dirección', 'Motor', 'Diagnóstico electrónico', 'Alineación y balanceo',
  'Aire acondicionado', 'Sistema eléctrico', 'Transmisión y embrague', 'Latonería y pintura', 'Llantas', 'Escape',
]

export function toggleToken(csv: string, token: string): string {
  const parts = csv.split(',').map(s => s.trim()).filter(Boolean)
  const next = parts.some(p => p.toLowerCase() === token.toLowerCase()) ? parts.filter(p => p.toLowerCase() !== token.toLowerCase()) : [...parts, token]
  return next.join(', ')
}

export function hasToken(csv: string, token: string): boolean {
  return csv.split(',').some(p => p.trim().toLowerCase() === token.toLowerCase())
}

// ── Lectura de la Cámara de Comercio ──

export interface ScannedFields {
  legal_name?: string | null; name?: string | null; nit?: string | null; city?: string | null
  address?: string | null; phone?: string | null; email?: string | null; business_type?: string | null
}

export const BUSINESS_TYPE_VALUES = ['mecanica_general', 'latoneria_pintura', 'llantas_alineacion', 'electrico', 'lubricentro', 'tecnicentro', 'repuestos', 'otro']

/** Convierte lo leído por el OCR en valores del formulario; descarta lo que no pasa una validación mínima. */
export function fromScan(s: ScannedFields): Partial<Record<'legal_name' | 'name' | 'nit' | 'city' | 'address' | 'phone' | 'email' | 'business_kind' | 'business_type', string>> {
  const out: Partial<Record<'legal_name' | 'name' | 'nit' | 'city' | 'address' | 'phone' | 'email' | 'business_kind' | 'business_type', string>> = {}
  const clean = (v?: string | null) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '')
  if (clean(s.legal_name)) out.legal_name = clean(s.legal_name).slice(0, 160)
  if (clean(s.name)) out.name = clean(s.name).slice(0, 120)
  if (clean(s.nit)) {
    const c = checkNit(clean(s.nit))
    if (c.status === 'ok') out.nit = c.value
    else if (c.status === 'missing_dv') out.nit = c.suggestion
    else if (c.status === 'bad_dv') out.nit = c.value // se deja tal cual: el campo mostrará el error para que la persona lo corrija
  }
  if (clean(s.city)) out.city = canonicalCity(clean(s.city)).slice(0, 80)
  if (clean(s.address)) out.address = clean(s.address).slice(0, 200)
  if (clean(s.phone) && validPhone(clean(s.phone))) out.phone = formatPhone(clean(s.phone))
  if (clean(s.email) && validEmail(clean(s.email))) out.email = clean(s.email).toLowerCase()
  if (s.business_type === 'repuestos') out.business_kind = 'repuestos'
  else if (s.business_type && BUSINESS_TYPE_VALUES.includes(s.business_type)) { out.business_kind = 'taller'; out.business_type = s.business_type }
  return out
}

// ── Cobertura: ciudades fijas + postulaciones reales ──

export interface LiveWorkshop { city: string; key: string; lat: number | null; lng: number | null; name: string | null }
export interface CoverageCity { city: string; count: number }

/** Suma las postulaciones reales a la cobertura fija. Las ciudades nuevas se agregan al final.
    Devuelve también el total de postulaciones y cuántas ciudades nuevas aparecieron. */
export function mergeCoverage(base: CoverageCity[], live: LiveWorkshop[]): { coverage: CoverageCity[]; liveCount: number; newCities: number } {
  const coverage = base.map(c => ({ ...c }))
  const byKey = new Map(coverage.map(c => [cityKey(c.city), c]))
  let newCities = 0
  for (const w of live) {
    const k = w.key || cityKey(w.city)
    if (!k) continue
    const hit = byKey.get(k)
    if (hit) hit.count += 1
    else {
      const row = { city: canonicalCity(w.city), count: 1 }
      coverage.push(row); byKey.set(k, row); newCities += 1
    }
  }
  return { coverage, liveCount: live.length, newCities }
}
