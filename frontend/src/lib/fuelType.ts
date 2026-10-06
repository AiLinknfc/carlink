/* Combustible del vehículo (vehicles.fuel_type, migración 068). Los valores son los
   canónicos que normaliza el backend (schemas.py FUEL_TYPES); '' = sin definir. */
export type FuelType = '' | 'gasolina' | 'diesel' | 'gas' | 'hibrido' | 'electrico'

export const FUEL_OPTIONS: { value: Exclude<FuelType, ''>; label: string }[] = [
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'diesel', label: 'Diésel' },
  { value: 'gas', label: 'Gas' },
  { value: 'hibrido', label: 'Híbrido' },
  { value: 'electrico', label: 'Eléctrico' },
]

export function fuelLabel(v: string | null | undefined): string {
  return FUEL_OPTIONS.find(o => o.value === v)?.label || ''
}

/* El filtro de partículas (DPF) solo existe en diésel. Con el combustible sin
   definir se sigue ofreciendo: ocultarlo dejaría sin opción a un diésel real que
   aún no completó el dato. */
export function showsParticleFilter(fuel: string | null | undefined): boolean {
  return !fuel || fuel === 'diesel'
}
