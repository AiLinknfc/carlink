/* Catálogo de aceites de motor — generado a partir de la carpeta `aceites/` que
   adjuntó el usuario (catalogo_aceites_vehiculos_base.csv, filtrado a categoria
   === 'Motor'; se excluyen filas de Moto 4T y Transmisión, fuera del alcance de
   la card "Aceite" que es solo aceite de motor). Fuente de los logos: la misma
   carpeta, copiados a frontend/public/oil-brands/ — ver el plan de este cambio.
   Alimenta el autocompletado de marca/producto en ServiceFormModal.tsx (paso
   "Producto" del wizard de Aceite). No todas las marcas tienen logo: cuando no
   hay uno, el autocomplete simplemente no muestra miniatura. */

export interface OilCatalogItem {
  marca: string
  /** Nombre de archivo en /oil-brands/, o undefined si no hay logo para esta marca. */
  logo?: string
  producto: string
  linea: string
  viscosidad: string
  tipoBase: string
}

export const OIL_CATALOG: OilCatalogItem[] = [
  { marca: 'Mobil', logo: 'mobil-1.png', producto: 'Mobil 1 ESP 5W-30', linea: 'Mobil 1', viscosidad: '5W-30', tipoBase: 'Sintético' },
  { marca: 'Mobil', logo: 'mobil-1.png', producto: 'Mobil 1 FS 0W-40', linea: 'Mobil 1', viscosidad: '0W-40', tipoBase: 'Sintético' },
  { marca: 'Mobil', logo: 'mobil-1.png', producto: 'Mobil Super 2000 10W-40', linea: 'Mobil Super', viscosidad: '10W-40', tipoBase: 'Semisintético' },
  { marca: 'Mobil', logo: 'mobil-1.png', producto: 'Mobil Delvac 1 ESP 5W-40', linea: 'Delvac', viscosidad: '5W-40', tipoBase: 'Sintético' },
  { marca: 'Shell', logo: 'shell.png', producto: 'Shell Helix Ultra 5W-40', linea: 'Helix', viscosidad: '5W-40', tipoBase: 'Sintético' },
  { marca: 'Shell', logo: 'shell.png', producto: 'Shell Helix HX8 5W-30', linea: 'Helix', viscosidad: '5W-30', tipoBase: 'Sintético' },
  { marca: 'Shell', logo: 'shell.png', producto: 'Shell Rimula R6 10W-40', linea: 'Rimula', viscosidad: '10W-40', tipoBase: 'Sintético' },
  { marca: 'Castrol', logo: 'castrol.png', producto: 'Castrol EDGE 5W-30', linea: 'EDGE', viscosidad: '5W-30', tipoBase: 'Sintético' },
  { marca: 'Castrol', logo: 'castrol.png', producto: 'Castrol MAGNATEC 10W-40', linea: 'MAGNATEC', viscosidad: '10W-40', tipoBase: 'Semisintético' },
  { marca: 'TotalEnergies', logo: 'totalenergies.png', producto: 'Quartz Ineo MC3 5W-30', linea: 'Quartz', viscosidad: '5W-30', tipoBase: 'Sintético' },
  { marca: 'TotalEnergies', logo: 'totalenergies.png', producto: 'Quartz 5000 SN 20W-50', linea: 'Quartz', viscosidad: '20W-50', tipoBase: 'Mineral' },
  { marca: 'TotalEnergies', logo: 'totalenergies.png', producto: 'Quartz Racing 10W-60', linea: 'Quartz', viscosidad: '10W-60', tipoBase: 'Sintético' },
  { marca: 'TotalEnergies', logo: 'totalenergies.png', producto: 'ELF Evolution 900 SXR 5W-40', linea: 'ELF', viscosidad: '5W-40', tipoBase: 'Sintético' },
  { marca: 'Valvoline', logo: 'valvoline.png', producto: 'Advanced Full Synthetic 5W-30', linea: 'Advanced', viscosidad: '5W-30', tipoBase: 'Sintético' },
  { marca: 'Valvoline', logo: 'valvoline.png', producto: 'MaxLife Full Synthetic 5W-30', linea: 'MaxLife', viscosidad: '5W-30', tipoBase: 'Sintético' },
  { marca: 'Valvoline', logo: 'valvoline.png', producto: 'Premium Protection Synthetic Blend 10W-40', linea: 'Premium Protection', viscosidad: '10W-40', tipoBase: 'Semisintético' },
  { marca: 'Valvoline', logo: 'valvoline.png', producto: 'Premium Blue Full Synthetic 5W-40', linea: 'Premium Blue', viscosidad: '5W-40', tipoBase: 'Sintético' },
  { marca: 'Motul', logo: 'motul.png', producto: '8100 X-clean EFE 5W-30', linea: '8100', viscosidad: '5W-30', tipoBase: 'Sintético' },
  { marca: 'Motul', logo: 'motul.png', producto: '8100 X-cess Gen2 5W-40', linea: '8100', viscosidad: '5W-40', tipoBase: 'Sintético' },
  { marca: 'Liqui Moly', logo: 'liqui-moly.svg', producto: 'Top Tec 4200 5W-30', linea: 'Top Tec', viscosidad: '5W-30', tipoBase: 'HC/Sintético' },
  { marca: 'Liqui Moly', logo: 'liqui-moly.svg', producto: 'Molygen New Generation 5W-30', linea: 'Molygen', viscosidad: '5W-30', tipoBase: 'HC/Sintético' },
  { marca: 'Repsol', logo: 'repsol.png', producto: 'Elite Long Life 5W-30', linea: 'Elite', viscosidad: '5W-30', tipoBase: 'Sintético' },
  { marca: 'Petronas', logo: undefined, producto: 'Syntium 7000 0W-30', linea: 'Syntium', viscosidad: '0W-30', tipoBase: 'Sintético' },
  { marca: 'Petronas', logo: undefined, producto: 'Urania 5000 E 10W-40', linea: 'Urania', viscosidad: '10W-40', tipoBase: 'Sintético/Blend' },
  { marca: 'Fuchs', logo: undefined, producto: 'TITAN GT1 FLEX 5 5W-30', linea: 'Titan', viscosidad: '5W-30', tipoBase: 'Sintético' },
  { marca: 'Ravenol', logo: undefined, producto: 'VMP 5W-30', linea: 'VMP', viscosidad: '5W-30', tipoBase: 'PAO/Sintético' },
  { marca: 'Gulf', logo: 'gulf.png', producto: 'Gulf Formula GVX 5W-30', linea: 'Formula', viscosidad: '5W-30', tipoBase: 'Sintético' },
  { marca: 'Chevron', logo: undefined, producto: 'Havoline ProDS Full Synthetic 5W-30', linea: 'Havoline', viscosidad: '5W-30', tipoBase: 'Sintético' },
  { marca: 'Terpel', logo: 'terpel.png', producto: 'Terpel Oiltec 5W-30', linea: 'Oiltec', viscosidad: '5W-30', tipoBase: 'Sintético' },
  { marca: 'Kixx', logo: 'kixx.png', producto: 'Kixx G1 SP 5W-30', linea: 'G1', viscosidad: '5W-30', tipoBase: 'Sintético' },
  { marca: 'Kixx', logo: 'kixx.png', producto: 'Kixx HDX 15W-40', linea: 'HDX', viscosidad: '15W-40', tipoBase: 'Mineral/Blend' },
  { marca: 'Idemitsu', logo: undefined, producto: 'Idemitsu Zepro Eco Medalist 0W-20', linea: 'Zepro', viscosidad: '0W-20', tipoBase: 'Sintético' },
  { marca: 'ENEOS', logo: undefined, producto: 'ENEOS X Prime 5W-30', linea: 'X Prime', viscosidad: '5W-30', tipoBase: 'Sintético' },
  { marca: 'Mannol', logo: undefined, producto: 'MANNOL Energy 5W-30', linea: 'Energy', viscosidad: '5W-30', tipoBase: 'Sintético/HC' },
  { marca: 'ROWE', logo: undefined, producto: 'Hightec Synth RS 5W-40', linea: 'Hightec', viscosidad: '5W-40', tipoBase: 'Sintético' },
  { marca: 'ACDelco', logo: undefined, producto: 'ACDelco dexos1 Gen 3 5W-30', linea: 'DEXOS', viscosidad: '5W-30', tipoBase: 'Sintético' },
  { marca: 'Motorcraft', logo: undefined, producto: 'Motorcraft Full Synthetic 5W-30', linea: 'Full Synthetic', viscosidad: '5W-30', tipoBase: 'Sintético' },
  { marca: 'Toyota', logo: undefined, producto: 'Toyota Genuine Motor Oil 0W-20', linea: 'Motor Oil', viscosidad: '0W-20', tipoBase: 'Sintético' },
  { marca: 'Honda', logo: 'honda.png', producto: 'Honda Genuine 0W-20', linea: 'Genuine Oil', viscosidad: '0W-20', tipoBase: 'Sintético' },
  { marca: 'Hyundai', logo: undefined, producto: 'XTeer Ultra 5W-30', linea: 'XTeer', viscosidad: '5W-30', tipoBase: 'Sintético' },
]

export interface OilBrand {
  marca: string
  logo?: string
}

/** Marcas únicas del catálogo, en el orden en que aparecen. */
export function getOilBrands(): OilBrand[] {
  const seen = new Map<string, OilBrand>()
  for (const item of OIL_CATALOG) {
    if (!seen.has(item.marca)) seen.set(item.marca, { marca: item.marca, logo: item.logo })
  }
  return Array.from(seen.values())
}

/** Productos de una marca (case-insensitive, match exacto de marca). */
export function getOilProductsByBrand(marca: string): OilCatalogItem[] {
  const q = marca.trim().toLowerCase()
  if (!q) return []
  return OIL_CATALOG.filter(item => item.marca.toLowerCase() === q)
}

