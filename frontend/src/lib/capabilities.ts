/* Capacidades por tipo de negocio y estado del acceso (docs/PLAN_ALIADOS_NEGOCIO.md, secciones 10 y 11).
   La lista la manda el backend en GET /workshops/me (`capabilities`); acá solo se usa para dibujar el menú.
   El backend es quien rechaza de verdad (403 `capability_not_available`, 402 `access_expired`). */

/** Qué capacidad necesita cada sección del menú del panel (`resumen` es de todos). */
export const TAB_CAPABILITY: Record<string, string> = {
  clientes: 'clientes',
  ordenes: 'ordenes',
  inventario: 'inventario',
  citas: 'citas',
  notificaciones: 'notificaciones',
  rentabilidad: 'rentabilidad',
  alianza: 'alianza',
  ventas: 'vehiculos_venta',
  revisiones: 'revisiones',
  consignacion: 'consignacion',
}

interface WithCaps { capabilities?: string[] | null }

/** Sin la lista (backend viejo o negocio aún cargando) se permite todo: nunca un panel en blanco por un dato que falta. */
export function canUse(workshop: WithCaps | null | undefined, capability: string): boolean {
  if (!workshop?.capabilities) return true
  return workshop.capabilities.includes(capability)
}

export function tabAllowed(workshop: WithCaps | null | undefined, tabId: string): boolean {
  const cap = TAB_CAPABILITY[tabId]
  return !cap || canUse(workshop, cap)
}

/** Texto corto de los días que quedan de acceso: "quedan 340 días" o "quedan 11 meses". */
export function remainingLabel(days: number): string {
  if (days > 90) { const m = Math.round(days / 30); return `quedan ${m} meses` }
  return `quedan ${days} ${days === 1 ? 'día' : 'días'}`
}

/** Texto del aviso del menú lateral según el plan de acceso. */
export function accessBannerTitle(plan: string | null | undefined, days: number): string {
  if (plan === 'founder') return `Acceso gratuito de aliado fundador · ${remainingLabel(days)}`
  return `Prueba gratuita · ${remainingLabel(days)}`
}
