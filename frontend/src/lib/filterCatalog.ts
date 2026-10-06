/* Catálogo de filtros que se pueden registrar, según el tipo de vehículo. El tipo se detecta solo
   (moto o carro) a partir de la clase de la tarjeta / categoría de placa: el usuario nunca lo elige.
   Cada filtro es EXCLUSIVO en el registro: tiene su propio ciclo de vida útil, así que el próximo
   servicio de un filtro no se puede mezclar con el de otro. Las opciones van de más a menos popular.
   Los demás vehículos (camión, bus, camioneta...) usan las opciones de carro. */
import { showsParticleFilter } from '@/lib/fuelType'

export type VehicleKind = 'carro' | 'moto' | 'pesado'
export type FilterIcon = 'oil' | 'air' | 'cabin' | 'fuel' | 'transmission' | 'particle'

export interface FilterOption {
  /** Clave del campo en el formulario (`extra[key]`). */
  key: string
  /** Nombre de la pieza en Control de partes. */
  part: string
  label: string
  /** Ciclo típico, para mostrarlo en la card. */
  hint: string
  lifespanKm: number
  icon: FilterIcon
  /** Aclaración cuando solo aplica a algunos vehículos. */
  note?: string
}

/* Tipo de vehículo, detectado solo: moto, pesado (camión, bus...) o carro (todo lo demás). Lo usan los
   filtros y las baterías. */
export function vehicleKindOf(bodyType?: string | null, plateType?: string | null): VehicleKind {
  const norm = (v?: string | null) => (v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
  const body = norm(bodyType), plate = norm(plateType)
  if (body === 'moto' || plate === 'moto') return 'moto'
  if (plate === 'carga' || /\bcamion(?!eta)|\bbus\b|buseta|volqueta|tracto|\bfurgon\b|trailer/.test(body)) return 'pesado'
  return 'carro'
}

const km = (n: number) => `Cada ~${n.toLocaleString('es')} km`

const CAR: FilterOption[] = [
  { key: 'oil_filter', part: 'Filtro de aceite', label: 'Aceite', hint: km(10000), lifespanKm: 10000, icon: 'oil' },
  { key: 'air_filter', part: 'Filtro de aire', label: 'Aire del motor', hint: km(15000), lifespanKm: 15000, icon: 'air' },
  { key: 'cabin_filter', part: 'Filtro de habitáculo', label: 'Habitáculo / A/C', hint: km(15000), lifespanKm: 15000, icon: 'cabin' },
  { key: 'fuel_filter', part: 'Filtro de combustible', label: 'Combustible', hint: km(20000), lifespanKm: 20000, icon: 'fuel' },
  { key: 'transmission_filter', part: 'Filtro de transmisión', label: 'Transmisión', hint: km(60000), lifespanKm: 60000, icon: 'transmission', note: 'Si tu transmisión lo tiene' },
]
const PARTICLE: FilterOption = { key: 'particle_filter', part: 'Filtro de partículas', label: 'Partículas (DPF)', hint: km(100000), lifespanKm: 100000, icon: 'particle', note: 'Motores diésel' }

const MOTO: FilterOption[] = [
  { key: 'oil_filter', part: 'Filtro de aceite', label: 'Aceite', hint: km(5000), lifespanKm: 5000, icon: 'oil' },
  { key: 'air_filter', part: 'Filtro de aire', label: 'Aire', hint: km(10000), lifespanKm: 10000, icon: 'air' },
  { key: 'fuel_filter', part: 'Filtro de combustible', label: 'Combustible', hint: km(20000), lifespanKm: 20000, icon: 'fuel', note: 'Motos de inyección' },
]

/* Opciones del vehículo. El filtro de partículas solo se ofrece en carros diésel (o con combustible
   aún sin definir, para no dejar sin opción a un diésel real). */
export function filterOptions(kind: VehicleKind, fuel?: string | null): FilterOption[] {
  if (kind === 'moto') return MOTO
  // Pesados y demás usan las opciones de carro.
  return showsParticleFilter(fuel) ? [...CAR, PARTICLE] : CAR
}

/* Todas las claves posibles, para limpiar la selección al cambiar de opción. */
export const ALL_FILTER_KEYS = [...CAR, PARTICLE, ...MOTO].map(o => o.key).filter((k, i, a) => a.indexOf(k) === i)

/* Vida útil de una pieza-filtro según el tipo de vehículo (el filtro de aceite de una moto se
   cambia mucho antes que el de un carro). */
export function filterLifespanKm(kind: VehicleKind, part: string): number | undefined {
  return [...(kind === 'moto' ? MOTO : CAR), PARTICLE].find(o => o.part === part)?.lifespanKm
}

export function chosenFilter(extra: Record<string, any>): string | null {
  return ALL_FILTER_KEYS.find(k => extra[k] === true) ?? null
}

/* Marcas habituales para sugerir (la marca es opcional y se puede escribir cualquiera). "Original"
   cubre el repuesto del fabricante del vehículo. */
const CAR_BRANDS = ['Original (OEM)', 'Mann-Filter', 'Bosch', 'Fram', 'Mahle', 'Wix', 'Hengst', 'Purolator', 'Sakura', 'Ryco', 'Filtron', 'UFI', 'Champion', 'K&N', 'Denso']
const MOTO_BRANDS = ['Original (OEM)', 'HifloFiltro', 'K&N', 'Mahle', 'Sakura', 'Emgo', 'Twin Air', 'Champion', 'Bosch', 'Mann-Filter']

export function filterBrands(kind: VehicleKind): string[] {
  return kind === 'moto' ? MOTO_BRANDS : CAR_BRANDS
}
