/* Predicción del "Próximo servicio (km)" al registrar un servicio. Funciones puras para poder
   probarlas: el formulario (ServiceFormModal.tsx) solo reúne las entradas. */

/* Promedio de km al mes para convertir una vida útil en meses a kilómetros. */
export const AVG_KM_PER_MONTH = 1500

/* Vida útil a usar: la más corta de las piezas que este servicio renueva (la que se gasta primero
   manda); si no se eligió ninguna, la del tipo de servicio. */
export function pickLifespanKm(selectedPartKms: Array<number | null | undefined>, fallbackKm: number): number {
  const valid = selectedPartKms.filter((k): k is number => typeof k === 'number' && k > 0)
  return valid.length ? Math.min(...valid) : fallbackKm
}

/* Km del próximo servicio: lo que se alcance primero entre la vida útil en km y la de tiempo
   (meses × km/mes). Sin kilometraje válido o sin vida útil no hay predicción. */
export function predictNextKm(mileage: number, lifespanKm: number, lifespanMonths?: number | null): number | null {
  if (!Number.isFinite(mileage) || mileage <= 0 || !(lifespanKm > 0)) return null
  const byKm = mileage + lifespanKm
  if (!lifespanMonths || lifespanMonths <= 0) return byKm
  return Math.min(byKm, mileage + Math.round(AVG_KM_PER_MONTH * lifespanMonths))
}
