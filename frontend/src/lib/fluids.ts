/* Partes vs fluidos. Una PARTE es una pieza física que se reemplaza (pastillas, llantas, batería,
   amortiguadores, filtros…). Un FLUIDO se renueva por kilometraje o tiempo (aceite, refrigerante,
   líquido de frenos, aceite de transmisión). Los fluidos viven en "Control de servicios", no cuentan
   como "partes reemplazadas" y no aparecen en la lista de partes. Se clasifican por nombre, sin
   migración: las filas ya existentes en `parts` siguen igual. */

const normalize = (n: string) =>
  (n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

export const FLUID_NAMES = ['Aceite de motor', 'Aceite de caja', 'Aceite de transmisión', 'Refrigerante', 'Líquido de frenos'] as const

const FLUID_SET = new Set<string>(FLUID_NAMES.map(normalize))

export function isFluidPart(name: string | null | undefined): boolean {
  return FLUID_SET.has(normalize(name || ''))
}

/* Una fila por fluido: si hay duplicados (el mismo fluido registrado varias veces), la instalada más
   recientemente (mayor kilometraje). */
export function latestFluids<T extends { name: string; mileage_installed?: number | null }>(parts: T[]): T[] {
  const best = new Map<string, T>()
  for (const p of parts) {
    if (!isFluidPart(p.name)) continue
    const key = normalize(p.name)
    const cur = best.get(key)
    if (!cur || (p.mileage_installed ?? 0) > (cur.mileage_installed ?? 0)) best.set(key, p)
  }
  return FLUID_NAMES.map(n => best.get(normalize(n))).filter((p): p is T => !!p)
}

export type PartesView = 'todo' | 'partes' | 'servicios'

/* Pantalla a la que lleva elegir una categoría en Control de partes: solo fluidos (Motor = aceite) →
   Servicios; con piezas → Partes; sin nada en la categoría no cambia la vista. */
export function viewForCategory(nParts: number, nFluids: number, current: PartesView): PartesView {
  if (nFluids > 0 && nParts === 0) return 'servicios'
  if (nParts > 0) return 'partes'
  return current
}
