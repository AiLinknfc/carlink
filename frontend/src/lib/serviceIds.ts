/* Ids de tipo de servicio. El formulario de servicio (ServiceFormModal) y la base usan los ids con
   tilde ("Batería", "Suspensión", "Transmisión"); la pantalla de Inicio usaba los mismos sin tilde
   ("Bateria"...). Al abrir el formulario desde Inicio llegaba "Bateria", que no coincidía con ningún
   tipo: el formulario salía sin campos (sin el wizard de batería) y el registro se habría guardado con
   otro nombre. Este mapa lleva cualquiera de las dos grafías al id canónico. */
const CANONICAL: Record<string, string> = {
  bateria: 'Batería',
  suspension: 'Suspensión',
  transmision: 'Transmisión',
}

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

export function canonicalServiceId(id: string | null | undefined): string {
  if (!id) return ''
  return CANONICAL[strip(id)] ?? id
}

export const sameService = (a: string | null | undefined, b: string | null | undefined) =>
  canonicalServiceId(a) === canonicalServiceId(b)
