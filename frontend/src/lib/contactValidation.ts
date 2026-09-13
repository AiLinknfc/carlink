import { isValidPhoneNumber } from 'libphonenumber-js'

// Validación de "contact" (correo o celular) compartida por los formularios
// de captura de leads (LandingSections.tsx, shop/page.tsx) — feedback
// inmediato mientras la persona escribe. La validación que realmente manda
// es la del backend (app/services/contact_validation.py, misma librería base
// para celulares — phonenumbers es el puerto Python de libphonenumber); esto
// es solo para no dejar que alguien mande el formulario sin darse cuenta de
// que escribió mal el correo o el celular.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Región por defecto cuando el celular no trae indicativo ("+") — Colombia
// es el mercado del negocio. Si la persona escribe su propio indicativo
// (+1, +34, etc.) se valida contra ESE país, no contra este default.
const DEFAULT_PHONE_REGION = 'CO'

export type ContactCheck =
  | { status: 'empty' }
  | { status: 'valid'; type: 'email' | 'phone' }
  | { status: 'invalid' }

export function checkContact(raw: string): ContactCheck {
  const value = raw.trim()
  if (!value) return { status: 'empty' }
  if (EMAIL_RE.test(value)) return { status: 'valid', type: 'email' }
  try {
    if (isValidPhoneNumber(value, DEFAULT_PHONE_REGION)) return { status: 'valid', type: 'phone' }
  } catch {
    // isValidPhoneNumber lanza con entradas muy raras (no solo devuelve
    // false) — un error acá significa "no es un celular válido", no un bug.
  }
  return { status: 'invalid' }
}
