/* Eventos de conversión del Meta Pixel (el script lo carga components/MetaPixel.tsx solo en
   páginas públicas). En rutas privadas (/app, /nfc, ...) window.fbq no existe y esto no hace
   nada, a propósito. Nunca se manda correo, teléfono, nombre ni placa: solo valor y moneda.
   Nunca lanza: el pixel no puede romper un registro ni un pago. */

type PixelParams = Record<string, string | number | boolean>

export function fbqTrack(event: string, params: PixelParams = {}, eventId?: string) {
  try {
    if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
    if (eventId) window.fbq('track', event, params, { eventID: eventId })
    else window.fbq('track', event, params)
  } catch {
    /* nunca propagar */
  }
}
