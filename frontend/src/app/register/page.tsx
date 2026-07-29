'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/store/auth'
import { useTheme } from '@/store/theme'
import { CITIES } from '@/lib/constants'
import { supabase, apiUrl } from '@/lib/supabase'
import { formatPlate, PLATE_LETTERS, PLATE_NUMBERS } from '@/lib/plate'
import { scanVehicleCard } from '@/lib/upload'

const BRANDS = [
  'Chevrolet', 'Renault', 'Mazda', 'Toyota', 'Nissan', 'Kia', 'Hyundai',
  'Volkswagen', 'Ford', 'Suzuki', 'BMW', 'Mercedes-Benz', 'Audi', 'Mitsubishi',
]

/* En Colombia "sedán" se reconoce como carrocería, no como tipo de vehículo del
   día a día, así que la opción se llama "Auto". El resto son las carrocerías
   comunes del mercado local. */
const VEHICLE_TYPES = ['Auto', 'SUV', 'Camioneta', 'Moto', 'Deportivo', 'Hatchback', 'Pickup', 'Furgoneta']

/* Modelos/líneas por marca para el mercado colombiano. Cada línea guarda su
   carrocería y el rango aproximado de años en que se vendió [desde, hasta]
   (sin "hasta" = sigue vigente). Con eso el datalist se reduce según el TIPO y
   el AÑO elegidos: un R4 no aparece para un 2020, ni un SUV si el tipo es Auto.
   Los años son aproximados y el campo es texto libre, así que si una línea rara
   no sale, el usuario igual la escribe. */
type ModelDef = [name: string, type: string, from: number, to?: number]

const MODELS_BY_BRAND: Record<string, ModelDef[]> = {
  Chevrolet: [
    ['Spark', 'Hatchback', 2006, 2017], ['Spark GT', 'Hatchback', 2011, 2017], ['Spark Life', 'Hatchback', 2018, 2021],
    ['Beat', 'Auto', 2018, 2023], ['Sail', 'Auto', 2013, 2019], ['Onix', 'Auto', 2017], ['Onix Turbo', 'Auto', 2020],
    ['Aveo', 'Auto', 2006, 2018], ['Aveo Emotion', 'Auto', 2007, 2011], ['Cobalt', 'Auto', 2012, 2018],
    ['Optra', 'Auto', 2004, 2013], ['Cruze', 'Auto', 2010, 2018], ['Sonic', 'Hatchback', 2012, 2017], ['Astra', 'Hatchback', 2003, 2009],
    ['Corsa', 'Hatchback', 1996, 2008], ['Swift', 'Hatchback', 1992, 2000], ['Sprint', 'Hatchback', 1986, 1994], ['Wagon R', 'Hatchback', 2000, 2007],
    ['Esteem', 'Auto', 1995, 2002], ['Vectra', 'Auto', 1994, 2006], ['Epica', 'Auto', 2007, 2011], ['Chevette', 'Auto', 1979, 1993], ['Monza', 'Auto', 1985, 1996],
    ['Groove', 'SUV', 2022], ['Tracker', 'SUV', 2013], ['Captiva', 'SUV', 2008, 2018], ['Captiva Sport', 'SUV', 2012, 2015],
    ['Equinox', 'SUV', 2018], ['Blazer', 'SUV', 1995, 2006], ['Traverse', 'SUV', 2018], ['Trailblazer', 'SUV', 2002], ['Tahoe', 'SUV', 2000], ['Suburban', 'SUV', 1998],
    ['Grand Vitara', 'SUV', 1999, 2015], ['Vitara', 'SUV', 1995, 2005], ['Jimny', 'SUV', 1998, 2018], ['Rodeo', 'SUV', 1991, 2004], ['Trooper', 'SUV', 1992, 2002], ['Samurai', 'SUV', 1988, 1998],
    ['Colorado', 'Pickup', 2005], ['S10', 'Pickup', 1995], ['D-Max', 'Pickup', 2008], ['Luv', 'Pickup', 1988, 2005], ['Luv D-Max', 'Pickup', 2005, 2013], ['Silverado', 'Pickup', 2000], ['Montana', 'Pickup', 2004, 2010],
    ['N300', 'Furgoneta', 2012], ['N400', 'Furgoneta', 2019], ['NPR', 'Furgoneta', 1990],
  ],
  Renault: [
    ['Kwid', 'Hatchback', 2018], ['Twingo', 'Hatchback', 1994, 2013], ['Sandero', 'Hatchback', 2008], ['Sandero Stepway', 'Hatchback', 2009], ['Stepway', 'Hatchback', 2009], ['Clio', 'Hatchback', 1995, 2016],
    ['Logan', 'Auto', 2005], ['Symbol', 'Auto', 2000, 2012], ['Megane', 'Auto', 1997, 2012], ['Megane II', 'Auto', 2004, 2010], ['Fluence', 'Auto', 2011, 2017], ['Laguna', 'Auto', 1995, 2008], ['Scénic', 'Auto', 2001, 2009],
    ['Renault 4', 'Hatchback', 1970, 1994], ['Renault 6', 'Auto', 1970, 1986], ['Renault 9', 'Auto', 1984, 2000], ['Renault 12', 'Auto', 1971, 1994], ['Renault 18', 'Auto', 1981, 1994], ['Renault 19', 'Auto', 1992, 2000], ['Renault 21', 'Auto', 1989, 1996], ['Renault 25', 'Auto', 1988, 1993],
    ['Duster', 'SUV', 2011], ['Captur', 'SUV', 2013], ['Kardian', 'SUV', 2024], ['Kiger', 'SUV', 2022], ['Koleos', 'SUV', 2009],
    ['Duster Oroch', 'Pickup', 2016], ['Alaskan', 'Pickup', 2017],
    ['Kangoo', 'Furgoneta', 2005], ['Master', 'Furgoneta', 2011], ['Trafic', 'Furgoneta', 2004],
  ],
  Mazda: [
    ['Mazda 2', 'Auto', 2008], ['Mazda 3', 'Auto', 2004], ['Mazda 6', 'Auto', 2003], ['Mazda 323', 'Auto', 1985, 2004], ['Allegro', 'Auto', 1995, 2004], ['Artis', 'Auto', 1996, 2000], ['Mazda 626', 'Auto', 1988, 2002], ['Millenia', 'Auto', 1995, 2002], ['Demio', 'Hatchback', 1997, 2002],
    ['CX-3', 'SUV', 2016], ['CX-30', 'SUV', 2020], ['CX-5', 'SUV', 2013], ['CX-50', 'SUV', 2023], ['CX-60', 'SUV', 2023], ['CX-9', 'SUV', 2008, 2023], ['CX-90', 'SUV', 2024],
    ['BT-50', 'Pickup', 2007], ['B2000', 'Pickup', 1985, 1998], ['B2200', 'Pickup', 1985, 1998], ['B2600', 'Pickup', 1987, 2006],
    ['MX-5', 'Deportivo', 1990], ['MX-3', 'Deportivo', 1992, 1998], ['RX-8', 'Deportivo', 2004, 2011],
  ],
  Toyota: [
    ['Yaris', 'Auto', 2006], ['Corolla', 'Auto', 1990], ['Camry', 'Auto', 1992], ['Prius', 'Auto', 2009], ['Corona', 'Auto', 1970, 1998], ['Tercel', 'Auto', 1980, 1999], ['Starlet', 'Hatchback', 1985, 1999],
    ['Yaris Cross', 'SUV', 2021], ['Corolla Cross', 'SUV', 2021], ['C-HR', 'SUV', 2017], ['RAV4', 'SUV', 1996], ['Rush', 'SUV', 2018], ['Fortuner', 'SUV', 2006],
    ['Land Cruiser', 'SUV', 1980], ['Prado', 'SUV', 1996], ['Machito', 'SUV', 1985], ['Burbuja', 'SUV', 1990, 2007], ['Autana', 'SUV', 1993, 2007], ['4Runner', 'SUV', 1990], ['FJ Cruiser', 'SUV', 2007, 2014], ['Sequoia', 'SUV', 2008],
    ['Hilux', 'Pickup', 1990], ['Tacoma', 'Pickup', 2005],
    ['Hiace', 'Furgoneta', 2005], ['Previa', 'Furgoneta', 1991, 2005],
  ],
  Nissan: [
    ['March', 'Hatchback', 2011], ['Versa', 'Auto', 2007], ['Sentra', 'Auto', 1991], ['Altima', 'Auto', 1998], ['Maxima', 'Auto', 1995],
    ['Sentra B13', 'Auto', 1991, 2001], ['Sentra B14', 'Auto', 1995, 2000], ['Almera', 'Auto', 2000, 2013], ['Sunny', 'Auto', 1990, 1999], ['Tsuru', 'Auto', 1992, 2004], ['Primera', 'Auto', 1995, 2007], ['Platina', 'Auto', 2002, 2010], ['Tiida', 'Hatchback', 2006, 2013], ['Note', 'Hatchback', 2014, 2019],
    ['Kicks', 'SUV', 2016], ['Kicks e-Power', 'SUV', 2022], ['Magnite', 'SUV', 2022], ['Qashqai', 'SUV', 2014], ['X-Trail', 'SUV', 2003], ['Murano', 'SUV', 2005], ['Pathfinder', 'SUV', 1990], ['Xterra', 'SUV', 2000, 2015], ['Terrano', 'SUV', 1993, 2006], ['Patrol', 'SUV', 1990],
    ['Frontier', 'Pickup', 1998], ['Navara', 'Pickup', 2005], ['NP300', 'Pickup', 2008], ['D21', 'Pickup', 1986, 1997], ['D22', 'Pickup', 1997, 2015],
    ['Urvan', 'Furgoneta', 2001],
  ],
  Kia: [
    ['Picanto', 'Hatchback', 2004], ['Rio', 'Auto', 2005], ['Soluto', 'Auto', 2020], ['K3', 'Auto', 2013, 2018], ['Cerato', 'Auto', 2004], ['Soul', 'Hatchback', 2009], ['Optima', 'Auto', 2001], ['Sephia', 'Auto', 1994, 2001], ['Shuma', 'Hatchback', 1998, 2004], ['Spectra', 'Auto', 2000, 2009], ['Magentis', 'Auto', 2001, 2010],
    ['Stinger', 'Deportivo', 2018, 2023],
    ['Sonet', 'SUV', 2020], ['Seltos', 'SUV', 2019], ['Sportage', 'SUV', 1995], ['Sorento', 'SUV', 2002], ['Mohave', 'SUV', 2008], ['Carens', 'SUV', 2007], ['Niro', 'SUV', 2017], ['EV6', 'SUV', 2022],
    ['Carnival', 'Furgoneta', 2006], ['K2500', 'Furgoneta', 2005], ['K2700', 'Furgoneta', 1998, 2015], ['Pregio', 'Furgoneta', 1999, 2007], ['Bongo', 'Furgoneta', 1997],
  ],
  Hyundai: [
    ['Grand i10', 'Hatchback', 2014], ['i10', 'Hatchback', 2008, 2014], ['i20', 'Hatchback', 2009], ['i30', 'Hatchback', 2008], ['Atos', 'Hatchback', 1998, 2008], ['Atos Prime', 'Hatchback', 2000, 2008], ['Getz', 'Hatchback', 2002, 2011],
    ['Accent', 'Auto', 1995], ['Elantra', 'Auto', 1992], ['Sonata', 'Auto', 1990], ['i25', 'Auto', 2011, 2015], ['Excel', 'Auto', 1990, 1999], ['Ioniq', 'Auto', 2017],
    ['Venue', 'SUV', 2020], ['Bayon', 'SUV', 2022], ['Creta', 'SUV', 2015], ['Kona', 'SUV', 2018], ['Tucson', 'SUV', 2005], ['i35', 'SUV', 2010, 2015], ['Santa Fe', 'SUV', 2001], ['Palisade', 'SUV', 2020], ['Veracruz', 'SUV', 2007, 2015], ['Terracan', 'SUV', 2001, 2007], ['Galloper', 'SUV', 1991, 2003], ['Matrix', 'SUV', 2001, 2010], ['Ioniq 5', 'SUV', 2022],
    ['Porter', 'Pickup', 1997],
    ['Staria', 'Furgoneta', 2021], ['Starex', 'Furgoneta', 1997, 2007], ['H1', 'Furgoneta', 2008], ['H100', 'Furgoneta', 1993, 2007],
  ],
  Volkswagen: [
    ['Gol', 'Hatchback', 1994], ['Polo', 'Hatchback', 2003], ['Golf', 'Hatchback', 1985], ['Fox', 'Hatchback', 2005, 2012], ['CrossFox', 'Hatchback', 2006, 2012], ['Caribe', 'Hatchback', 1977, 1987],
    ['Voyage', 'Auto', 2009], ['Virtus', 'Auto', 2018], ['Jetta', 'Auto', 1985], ['Bora', 'Auto', 1999, 2010], ['Vento', 'Auto', 1992, 1998], ['Passat', 'Auto', 1990], ['Escarabajo', 'Auto', 1961, 1998], ['New Beetle', 'Auto', 1999, 2011], ['Brasilia', 'Auto', 1974, 1982], ['Santana', 'Auto', 1984, 1995], ['SpaceFox', 'Auto', 2007, 2012], ['Parati', 'Auto', 1996, 2009],
    ['Golf GTI', 'Deportivo', 2008], ['Scirocco', 'Deportivo', 2009, 2017],
    ['T-Cross', 'SUV', 2019], ['Nivus', 'SUV', 2021], ['Taos', 'SUV', 2021], ['Tiguan', 'SUV', 2009], ['Teramont', 'SUV', 2018], ['Touareg', 'SUV', 2004], ['ID.4', 'SUV', 2022],
    ['Amarok', 'Pickup', 2011], ['Saveiro', 'Pickup', 1997],
    ['Kombi', 'Furgoneta', 1970, 2013],
  ],
  Ford: [
    ['Fiesta', 'Hatchback', 1996], ['Ka', 'Hatchback', 1997, 2021], ['Figo', 'Hatchback', 2016, 2021], ['Festiva', 'Hatchback', 1988, 2000],
    ['Focus', 'Auto', 2000, 2019], ['Fusion', 'Auto', 2006, 2020], ['Mondeo', 'Auto', 1994, 2007], ['Escort', 'Auto', 1985, 2003], ['Sierra', 'Auto', 1982, 1993], ['Taurus', 'Auto', 1990, 2009], ['Laser', 'Auto', 1990, 2000],
    ['Mustang', 'Deportivo', 1965],
    ['Mustang Mach-E', 'SUV', 2021], ['EcoSport', 'SUV', 2004], ['Territory', 'SUV', 2020], ['Escape', 'SUV', 2001], ['Edge', 'SUV', 2007], ['Explorer', 'SUV', 1991], ['Expedition', 'SUV', 1997], ['Bronco', 'SUV', 1980], ['Bronco Sport', 'SUV', 2021],
    ['Ranger', 'Pickup', 1998], ['Maverick', 'Pickup', 2022], ['Courier', 'Pickup', 1998, 2013], ['F-100', 'Pickup', 1970, 1996], ['F-150', 'Pickup', 1990], ['F-250', 'Pickup', 1995], ['F-350', 'Pickup', 1995],
    ['Transit', 'Furgoneta', 2014],
  ],
  Suzuki: [
    ['Alto', 'Hatchback', 2009], ['Celerio', 'Hatchback', 2014], ['Swift', 'Hatchback', 2005], ['S-Presso', 'Hatchback', 2020], ['Forsa', 'Hatchback', 1985, 1998], ['Fun', 'Hatchback', 2003, 2012],
    ['Baleno', 'Auto', 1996], ['Ciaz', 'Auto', 2015], ['Dzire', 'Auto', 2017], ['SX4', 'Auto', 2007, 2014], ['Aerio', 'Auto', 2002, 2007],
    ['Ignis', 'SUV', 2017], ['Fronx', 'SUV', 2023], ['Vitara', 'SUV', 1989], ['Grand Vitara', 'SUV', 1998], ['S-Cross', 'SUV', 2014], ['Jimny', 'SUV', 1998], ['XL7', 'SUV', 2020], ['Ertiga', 'SUV', 2012], ['Sidekick', 'SUV', 1989, 1998], ['Samurai', 'SUV', 1985, 1998], ['SJ410', 'SUV', 1982, 1990], ['SJ413', 'SUV', 1984, 1990],
    ['APV', 'Furgoneta', 2005],
  ],
  BMW: [
    ['Serie 1', 'Hatchback', 2004], ['Serie 2', 'Auto', 2014], ['Serie 3', 'Auto', 1985], ['Serie 4', 'Auto', 2014], ['Serie 5', 'Auto', 1988], ['Serie 6', 'Auto', 2004, 2019], ['Serie 7', 'Auto', 1990], ['Serie 8', 'Auto', 2019], ['i4', 'Auto', 2022], ['i5', 'Auto', 2024], ['i7', 'Auto', 2023],
    ['X1', 'SUV', 2010], ['X2', 'SUV', 2018], ['X3', 'SUV', 2004], ['X4', 'SUV', 2015], ['X5', 'SUV', 2000], ['X6', 'SUV', 2008], ['X7', 'SUV', 2019], ['iX', 'SUV', 2022], ['iX3', 'SUV', 2021],
    ['Z3', 'Deportivo', 1996, 2002], ['Z4', 'Deportivo', 2003], ['M2', 'Deportivo', 2016], ['M3', 'Deportivo', 1994], ['M4', 'Deportivo', 2014], ['M5', 'Deportivo', 1998],
  ],
  'Mercedes-Benz': [
    ['Clase A', 'Hatchback', 2000], ['Clase B', 'Auto', 2006], ['Clase C', 'Auto', 1994], ['Clase E', 'Auto', 1985], ['Clase S', 'Auto', 1980], ['CLA', 'Auto', 2014], ['CLS', 'Auto', 2005], ['CLK', 'Auto', 1998, 2010], ['190', 'Auto', 1984, 1993], ['EQE', 'Auto', 2022], ['EQS', 'Auto', 2022],
    ['SLK', 'Deportivo', 1998, 2016],
    ['GLA', 'SUV', 2014], ['GLB', 'SUV', 2020], ['GLC', 'SUV', 2016], ['GLE', 'SUV', 2016], ['GLK', 'SUV', 2009, 2015], ['ML', 'SUV', 1998, 2015], ['GLS', 'SUV', 2016], ['Clase G', 'SUV', 1990], ['EQA', 'SUV', 2021], ['EQB', 'SUV', 2022],
    ['Vito', 'Furgoneta', 2004], ['Viano', 'Furgoneta', 2004, 2014], ['Sprinter', 'Furgoneta', 1998], ['MB100', 'Furgoneta', 1990, 2000],
  ],
  Audi: [
    ['A1', 'Hatchback', 2011], ['A2', 'Hatchback', 2001, 2005], ['A3', 'Auto', 1997], ['A4', 'Auto', 1995], ['A5', 'Auto', 2008], ['A6', 'Auto', 1995], ['A7', 'Auto', 2011], ['A8', 'Auto', 1995], ['80', 'Auto', 1972, 1996], ['100', 'Auto', 1982, 1994],
    ['S3', 'Deportivo', 2007], ['S4', 'Deportivo', 1998], ['S5', 'Deportivo', 2008], ['RS3', 'Deportivo', 2015], ['TT', 'Deportivo', 1999], ['R8', 'Deportivo', 2007],
    ['Q2', 'SUV', 2017], ['Q3', 'SUV', 2012], ['Q4 e-tron', 'SUV', 2022], ['Q5', 'SUV', 2009], ['Q7', 'SUV', 2006], ['Q8', 'SUV', 2019], ['RS Q8', 'SUV', 2020], ['e-tron', 'SUV', 2019],
  ],
  Mitsubishi: [
    ['Mirage', 'Hatchback', 2012], ['Colt', 'Hatchback', 1992, 2013], ['Mirage G4', 'Auto', 2014], ['Attrage', 'Auto', 2013], ['Lancer', 'Auto', 1992], ['Galant', 'Auto', 1988, 2012], ['Signo', 'Auto', 2001, 2007],
    ['Lancer Evolution', 'Deportivo', 2003, 2016], ['Eclipse', 'Deportivo', 1995, 2012],
    ['Xpander', 'SUV', 2018], ['Xforce', 'SUV', 2024], ['ASX', 'SUV', 2010], ['Eclipse Cross', 'SUV', 2018], ['Outlander', 'SUV', 2003], ['Outlander PHEV', 'SUV', 2014], ['Montero', 'SUV', 1983], ['Montero Sport', 'SUV', 1997], ['Nativa', 'SUV', 2000, 2008], ['Endeavor', 'SUV', 2004, 2011],
    ['L200', 'Pickup', 1990], ['L200 Sportero', 'Pickup', 2007], ['Triton', 'Pickup', 2006],
    ['L300', 'Furgoneta', 1985, 2013], ['Space Wagon', 'Furgoneta', 1992, 2005],
  ],
}

const NOW_YEAR = new Date().getFullYear()

/* En Colombia "camioneta" cubre SUV e incluso pickups, y la gente usa "Auto"
   para sedán o hatchback indistintamente. Estos grupos hacen el filtro por tipo
   tolerante para no esconder líneas válidas por un matiz de nombre. */
const TYPE_GROUPS: Record<string, string[]> = {
  Auto: ['Auto', 'Hatchback', 'Deportivo'],
  Hatchback: ['Hatchback', 'Auto', 'Deportivo'],
  Deportivo: ['Deportivo', 'Auto', 'Hatchback'],
  SUV: ['SUV', 'Camioneta'],
  Camioneta: ['Camioneta', 'SUV', 'Pickup'],
  Pickup: ['Pickup'],
  Furgoneta: ['Furgoneta'],
  Moto: ['Moto'],
}

const typeMatches = (selected: string, modelType: string) =>
  !selected || (TYPE_GROUPS[selected] ?? [selected]).includes(modelType)

const inYearRange = (year: number, from: number, to?: number) =>
  !year || (year >= from && year <= (to ?? NOW_YEAR))

/* Sugerencias de modelo filtradas por marca + tipo + año. Si el cruce queda
   vacío se relaja el año (los rangos son aproximados) antes que dejar la lista
   en blanco; si aun así no hay nada (p. ej. Moto), devuelve vacío y el usuario
   escribe libremente. Deduplica por nombre para el caso "sin marca". */
function modelSuggestions(brand: string, selType: string, selYear: number): string[] {
  const pool: ModelDef[] = brand && MODELS_BY_BRAND[brand]
    ? MODELS_BY_BRAND[brand]
    : Object.values(MODELS_BY_BRAND).flat()
  let list = pool.filter(([, t, from, to]) => typeMatches(selType, t) && inYearRange(selYear, from, to))
  if (!list.length) list = pool.filter(([, t]) => typeMatches(selType, t))
  const seen = new Set<string>()
  const out: string[] = []
  for (const [n] of list) if (!seen.has(n)) { seen.add(n); out.push(n) }
  return out
}

const COLORS = [
  { name: 'Blanco', hex: '#ffffff' }, { name: 'Negro', hex: '#111111' },
  { name: 'Plateado', hex: '#c0c0c0' }, { name: 'Gris', hex: '#6b7280' },
  { name: 'Rojo', hex: '#dc2626' }, { name: 'Azul', hex: '#2563eb' },
  { name: 'Verde', hex: '#16a34a' }, { name: 'Dorado', hex: '#ca8a04' },
  { name: 'Naranja', hex: '#ea580c' }, { name: 'Marrón', hex: '#78350f' },
]

export default function RegisterPage() {
  const router = useRouter()
  const { user, profile } = useAuth()

  /* mode: persona (vehicle owner) or empresa (workshop) */
  const [mode, setMode] = useState<'persona' | 'empresa'>('persona')

/* Persona fields */
  const [brand, setBrand] = useState('')
  const [regName, setRegName] = useState('')
  const [regDocument, setRegDocument] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanHint, setScanHint] = useState<string | null>(null)
  const [regPlateLetters, setRegPlateLetters] = useState('')
  const [regPlateNumbers, setRegPlateNumbers] = useState('')
  const [regCity, setRegCity] = useState('Bogotá')
  const [regModel, setRegModel] = useState('')
  const [regYear, setRegYear] = useState(new Date().getFullYear())
  const [regType, setRegType] = useState(VEHICLE_TYPES[0])
  const [regColor, setRegColor] = useState(COLORS[0].name)

  /* Empresa fields */
  const [wsLegalId, setWsLegalId] = useState('')
  const [wsName, setWsName] = useState('')
  const [wsAddress, setWsAddress] = useState('')
  const [wsCity, setWsCity] = useState('')
  const [wsPhone, setWsPhone] = useState('')
  const [wsDescription, setWsDescription] = useState('')
  const [wsHasVehicle, setWsHasVehicle] = useState(false)
  const [wsPlateLetters, setWsPlateLetters] = useState('')
  const [wsPlateNumbers, setWsPlateNumbers] = useState('')
  const [wsBrand, setWsBrand] = useState('')
  const [wsModel, setWsModel] = useState('')
  const [wsYear, setWsYear] = useState(new Date().getFullYear())
  const [wsType, setWsType] = useState(VEHICLE_TYPES[0])
  const [wsColor, setWsColor] = useState(COLORS[0].name)

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const { isDark } = useTheme()
  const tk = {
    pageBg: isDark ? '#060606' : '#f7f6f2',
    cardBg: isDark ? 'rgba(14,14,14,0.74)' : 'rgba(255,255,255,0.88)',
    cardBorder: isDark ? 'rgba(245,197,24,0.2)' : 'rgba(17,17,17,0.1)',
    cardShadow: isDark ? '0 24px 60px rgba(0,0,0,.5)' : '0 24px 60px rgba(17,17,17,0.1)',
    labelColor: isDark ? '#7c786e' : '#8a8578',
    inputBg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(17,17,17,0.04)',
    inputBorder: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(17,17,17,0.12)',
    inputText: isDark ? '#f5f3ec' : '#17171a',
    accent: '#F5C518',
    accentText: '#111',
    muted: isDark ? '#b6b2a6' : '#6f6a5f',
    sectionTitle: isDark ? '#7c786e' : '#8a8578',
    divider: isDark ? 'rgba(245,197,24,0.2)' : 'rgba(17,17,17,0.08)',
    chipBg: isDark ? 'rgba(245,197,24,0.06)' : 'rgba(245,197,24,0.08)',
    chipBorder: isDark ? 'rgba(245,197,24,0.35)' : 'rgba(245,197,24,0.4)',
    chipText: isDark ? '#d8c98a' : '#8a6d00',
    hintBg: isDark ? 'rgba(46,204,113,0.06)' : 'rgba(46,204,113,0.08)',
    hintText: isDark ? '#5be89a' : '#1a7a3e',
    errorBg: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
    errorBorder: isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)',
    errorText: '#ef4444',
    titleColor: isDark ? '#f5f3ec' : '#17171a',
    subtitleColor: isDark ? '#b6b2a6' : '#6f6a5f',
    btnDisabled: '#7c786e',
    btnShadow: '0 0 24px rgba(245,197,24,0.4)',
    plateAccent: '#F5C518',
    scanHintBorder: isDark ? 'rgba(245,197,24,0.2)' : 'rgba(245,197,24,0.3)',
  }

  const regPlate = formatPlate(regPlateLetters, regPlateNumbers)
  const wsPlate = formatPlate(wsPlateLetters, wsPlateNumbers)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPlate = sessionStorage.getItem('carlink_plate')
      const savedCity = sessionStorage.getItem('carlink_city')
      if (savedPlate) {
        const parsed = savedPlate.match(/^([A-Z]{3})-?(\d{3})$/i)
        if (parsed) {
          setRegPlateLetters(parsed[1])
          setRegPlateNumbers(parsed[2])
        }
        sessionStorage.removeItem('carlink_plate')
      }
      if (savedCity) {
        /* Sólo prellenamos si la ciudad existe en el listado; así el <select>
           siempre muestra una opción válida y no queda en blanco. */
        if (CITIES.includes(savedCity)) setRegCity(savedCity)
        sessionStorage.removeItem('carlink_city')
      }
    }
  }, [])

  useEffect(() => {
    if (!user) { router.push('/'); return }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) return
      fetch(apiUrl('/vehicles'), { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => { if (r.ok) return r.json() })
        .then(d => { if (d?.length) router.push('/app') })
        .catch(() => {})
    })
  }, [user, router])

  const years = useMemo(() => {
    const y = new Date().getFullYear()
    return Array.from({ length: y - 1980 + 1 }, (_, i) => y - i)
  }, [])

  /* Sugerencias de modelo que se recalculan al cambiar marca, tipo o año. */
  const regModels = useMemo(() => modelSuggestions(brand, regType, regYear), [brand, regType, regYear])
  const wsModels = useMemo(() => modelSuggestions(wsBrand, wsType, wsYear), [wsBrand, wsType, wsYear])

  const brandTiles = useMemo(() => BRANDS.map(b => ({
    name: b, initial: b[0],
    onClick: () => { setBrand(b); setWsBrand(b) },
    bg: brand === b || wsBrand === b ? 'rgba(245,197,24,0.15)' : 'transparent',
    border: brand === b || wsBrand === b ? 'rgba(245,197,24,0.4)' : tk.inputBorder,
    fg: brand === b || wsBrand === b ? tk.accent : tk.muted,
    badge: brand === b || wsBrand === b ? tk.accent : tk.inputBg,
    mark: brand === b || wsBrand === b ? '#111' : tk.muted,
  })), [brand, wsBrand, isDark])

  const colorTiles = useMemo(() => COLORS.map(c => ({
    name: c.name, dot: c.hex,
    onClick: () => { setRegColor(c.name); setWsColor(c.name) },
    bg: regColor === c.name || wsColor === c.name ? 'rgba(245,197,24,0.15)' : 'transparent',
    border: regColor === c.name || wsColor === c.name ? 'rgba(245,197,24,0.4)' : tk.inputBorder,
    fg: regColor === c.name || wsColor === c.name ? tk.accent : tk.muted,
  })), [regColor, wsColor, isDark])

  if (!user) return null

  /* Prellenado desde la tarjeta de propiedad. Sólo rellena campos vacíos o los
     que el OCR sí pudo leer; el usuario revisa y corrige antes de guardar. */
  const handleScanCard = async (file: File) => {
    setScanning(true)
    setScanHint(null)
    try {
      const data = await scanVehicleCard(file)
      if (!data) { setScanHint('No pudimos leer la tarjeta. Completa los datos a mano.'); return }
      const filled: string[] = []
      if (data.plate) {
        const m = data.plate.toUpperCase().match(/([A-Z]{3})-?(\d{3})/)
        if (m) { setRegPlateLetters(m[1]); setRegPlateNumbers(m[2]); filled.push('placa') }
      }
      if (data.city && CITIES.includes(data.city)) { setRegCity(data.city); filled.push('ciudad') }
      if (data.brand) { setBrand(data.brand); filled.push('marca') }
      if (data.model) { setRegModel(data.model); filled.push('modelo') }
      if (data.year && data.year > 1900) { setRegYear(data.year); filled.push('año') }
      if (data.color) {
        const match = COLORS.find(c => c.name.toLowerCase() === data.color!.toLowerCase())
        setRegColor(match ? match.name : data.color)
        filled.push('color')
      }
      if (data.owner_name) { setRegName(data.owner_name); filled.push('propietario') }
      if (data.document_number) { setRegDocument(data.document_number.replace(/[^0-9A-Za-z.-]/g, '')); filled.push('documento') }
      setScanHint(filled.length
        ? `Leímos: ${filled.join(', ')}. Revisa que esté correcto antes de continuar.`
        : 'No pudimos leer datos claros. Completa el formulario a mano.')
    } finally { setScanning(false) }
  }

  /* ── Persona registration ── */
  const doRegisterPersona = async () => {
    setErrorMsg('')
    const plate = formatPlate(regPlateLetters, regPlateNumbers)
    if (!plate || !brand || !regModel || !regName || !regDocument.trim()) {
      setErrorMsg('Completa todos los campos obligatorios')
      return
    }
    setSaving(true)
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) { setErrorMsg('Sesión expirada'); setSaving(false); return }
    try {
      /* El documento de identidad queda en el perfil: es el dato que luego se
         contrasta con la tarjeta de propiedad al pedir la verificación. */
      await fetch(apiUrl('/auth/me'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: regName, document_number: regDocument.trim() }),
      }).catch(() => {})
      const res = await fetch(apiUrl('/vehicles'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plate, city: regCity, brand, model: regModel, year: regYear, type: regType, color: regColor }),
      })
      if (res.ok) { window.location.href = '/app'; return }
      const body = await res.text()
      try { setErrorMsg(JSON.parse(body).detail || body) } catch { setErrorMsg(body || `Error ${res.status}`) }
    } catch (e: any) { setErrorMsg('Error de conexión') }
    finally { setSaving(false) }
  }

  /* ── Empresa registration ── */
  const doRegisterEmpresa = async () => {
    setErrorMsg('')
    if (!wsLegalId || !wsName) {
      setErrorMsg('Completa NIT/RUT y nombre del taller')
      return
    }
    if (wsHasVehicle && !wsPlate) {
      setErrorMsg('Ingresa la placa del vehículo de prueba')
      return
    }
    setSaving(true)
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) { setErrorMsg('Sesión expirada'); setSaving(false); return }
    try {
      const body: Record<string, any> = {
        legal_id: wsLegalId,
        name: wsName,
        address: wsAddress,
        city: wsCity,
        phone: wsPhone,
        description: wsDescription,
      }
      if (wsHasVehicle) {
        body.plate = wsPlate.toUpperCase()
        body.brand = wsBrand
        body.model = wsModel
        body.year = wsYear
        body.vehicle_type = wsType
        body.color = wsColor
        body.vehicle_city = wsCity
      }
      const res = await fetch(apiUrl('/workshops'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (res.ok) { window.location.href = '/app'; return }
      const rb = await res.text()
      try { setErrorMsg(JSON.parse(rb).detail || rb) } catch { setErrorMsg(rb || `Error ${res.status}`) }
    } catch { setErrorMsg('Error de conexión') }
    finally { setSaving(false) }
  }

  const doRegister = mode === 'persona' ? doRegisterPersona : doRegisterEmpresa

  return (
    <div style={{ minHeight: '100vh', background: tk.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 760, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24, animation: 'fadeUp .5s both' }}>
          <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: tk.accent }}>
            Un último paso, {profile?.full_name?.split(' ')[0] || 'usuario'}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px,4vw,46px)', letterSpacing: '.01em', margin: '8px 0 6px', textTransform: 'uppercase', color: tk.titleColor }}>
            {mode === 'persona' ? 'Registra tu vehículo' : 'Registra tu taller'}
          </h1>
          <p style={{ color: tk.subtitleColor, margin: 0, fontSize: 15 }}>
            {mode === 'persona' ? 'Estos datos alimentan tu ficha técnica y las predicciones de mantenimiento.' : 'Tu taller aparecerá en las búsquedas de tus clientes.'}
          </p>
        </div>

        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, justifyContent: 'center' }}>
          {(['persona', 'empresa'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setErrorMsg('') }}
              style={{
                padding: '10px 24px', borderRadius: 999, cursor: 'pointer',
                border: mode === m ? `2px solid ${tk.accent}` : `1px solid ${tk.inputBorder}`,
                background: mode === m ? 'rgba(245,197,24,0.12)' : tk.inputBg,
                color: mode === m ? tk.accent : tk.muted,
                fontWeight: 700, fontSize: 14, transition: 'all .15s',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
              {m === 'persona'
                ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>Persona</>
                : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2.3-.6-.6-2.3z"/></svg>Empresa (Taller)</>}
            </button>
          ))}
        </div>

        <div style={{ background: tk.cardBg, backdropFilter: 'blur(22px)', border: `1px solid ${tk.cardBorder}`, borderRadius: 20, padding: 22, boxShadow: tk.cardShadow, animation: 'fadeUp .55s .06s both' }}>

          {mode === 'persona' ? (
            <>
              {/* ── PERSONA MODE: vehicle registration ── */}
              <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, marginBottom: 10 }}>Marca del vehículo</div>
              <div className="regBrandGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(90px,1fr))', gap: 9, marginBottom: 20 }}>
                {brandTiles.map(b => (
                  <button key={b.name} onClick={b.onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '12px 6px', borderRadius: 13, cursor: 'pointer', background: b.bg, border: `1.5px solid ${b.border}` }}>
                    <span style={{ width: 40, height: 40, borderRadius: 10, background: b.badge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 18, color: b.mark }}>{b.initial}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: b.fg }}>{b.name}</span>
                  </button>
                ))}
              </div>

              {/* Atajo: leer la tarjeta de propiedad y prellenar. No verifica nada. */}
              <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 13, background: tk.chipBg, border: `1px dashed ${tk.chipBorder}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: tk.inputText }}>¿Tienes la tarjeta de propiedad a mano?</div>
                    <div style={{ fontSize: 11.5, color: tk.sectionTitle, marginTop: 3, lineHeight: 1.5 }}>Escanéala y llenamos el formulario por ti. Luego revisas los datos.</div>
                  </div>
                  <label style={{
                    flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '10px 16px', borderRadius: 11, border: 'none', background: tk.accent, color: tk.accentText,
                    fontWeight: 800, fontSize: 12.5, cursor: scanning ? 'default' : 'pointer', opacity: scanning ? 0.6 : 1,
                  }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    {scanning ? 'Leyendo…' : 'Escanear tarjeta'}
                    <input type="file" accept="image/*,application/pdf" disabled={scanning} style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleScanCard(f) }} />
                  </label>
                </div>
                {scanHint && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${tk.scanHintBorder}`, fontSize: 12, color: tk.chipText, lineHeight: 1.5 }}>{scanHint}</div>
                )}
              </div>

              <div className="regGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 6 }}>Nombre del propietario</label>
                  <input value={regName} onChange={e => setRegName(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.inputText, fontSize: 15, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 6 }}>Documento de identidad</label>
                  <input value={regDocument} onChange={e => setRegDocument(e.target.value.replace(/[^0-9A-Za-z.-]/g, ''))} placeholder="Ej. 1020304050" style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.inputText, fontSize: 15, outline: 'none' }} />
                </div>
                {/* Tipo → Año → Modelo: primero se acota el vehículo (carrocería y
                    año) y al final se elige la línea, para guiar mejor la búsqueda. */}
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 6 }}>Tipo</label>
                  <select value={regType} onChange={e => setRegType(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.inputText, fontSize: 15, outline: 'none', cursor: 'pointer' }}>
                    {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 6 }}>Año</label>
                  <select value={regYear} onChange={e => setRegYear(Number(e.target.value))} style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.inputText, fontSize: 15, outline: 'none', cursor: 'pointer' }}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 6 }}>Modelo / línea</label>
                  <input value={regModel} onChange={e => setRegModel(e.target.value)} list="regModelList" placeholder={regModels.length ? `Elige o escribe (ej. ${regModels[0]})` : (brand ? 'Escribe el modelo' : 'Selecciona la marca y elige el modelo')} style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.inputText, fontSize: 15, outline: 'none' }} />
                  <datalist id="regModelList">
                    {regModels.map(m => <option key={m} value={m} />)}
                  </datalist>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 8 }}>Color</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {colorTiles.map(c => (
                    <button key={c.name} onClick={c.onClick} title={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', borderRadius: 999, cursor: 'pointer', background: c.bg, border: `1.5px solid ${c.border}`, color: c.fg, fontSize: 12, fontWeight: 600 }}>
                      <span style={{ width: 15, height: 15, borderRadius: '50%', background: c.dot, border: '1px solid rgba(255,255,255,.3)' }} />
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="regGrid" style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 6 }}>Placa *</label>
                  {/* Caja compacta al ancho de los 3 caracteres; misma altura (46px,
                      border-box) que el selector de ciudad. autoFocus deja el cursor
                      titilando para señalar dónde escribir. */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <input value={regPlateLetters} onChange={e => setRegPlateLetters(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))} maxLength={3} placeholder="ABC" autoFocus
                      style={{ width: 74, height: 46, boxSizing: 'border-box', textAlign: 'center', padding: '0 8px', borderRadius: 11, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.accent, caretColor: '#F5C518', fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '.06em', outline: 'none' }} />
                    <span style={{ color: tk.accent, fontFamily: 'var(--font-display)', fontSize: 20 }}>-</span>
                    <input value={regPlateNumbers} onChange={e => setRegPlateNumbers(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))} maxLength={3} placeholder="123"
                      style={{ width: 74, height: 46, boxSizing: 'border-box', textAlign: 'center', padding: '0 8px', borderRadius: 11, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.accent, caretColor: '#F5C518', fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '.06em', outline: 'none' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 6 }}>Ciudad de expedición</label>
                  <select value={regCity} onChange={e => setRegCity(e.target.value)}
                    style={{ width: '100%', height: 46, boxSizing: 'border-box', padding: '0 14px', borderRadius: 11, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.inputText, fontSize: 15, outline: 'none', cursor: 'pointer' }}>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ── EMPRESA MODE: workshop registration ── */}
              <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, marginBottom: 12 }}>Datos del taller</div>

              <div className="regGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 6 }}>NIT / RUT *</label>
                  <input value={wsLegalId} onChange={e => setWsLegalId(e.target.value)} placeholder="Ej. 12345678-9"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.inputText, fontSize: 15, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 6 }}>Nombre del taller *</label>
                  <input value={wsName} onChange={e => setWsName(e.target.value)} placeholder="Ej. Taller Pérez"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.inputText, fontSize: 15, outline: 'none' }} />
                </div>
              </div>

              <div className="regGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 6 }}>Dirección</label>
                  <input value={wsAddress} onChange={e => setWsAddress(e.target.value)} placeholder="Cra 7 #45-12"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.inputText, fontSize: 15, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 6 }}>Ciudad</label>
                  <input value={wsCity} onChange={e => setWsCity(e.target.value)} placeholder="Bogotá"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.inputText, fontSize: 15, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 6 }}>Teléfono</label>
                  <input value={wsPhone} onChange={e => setWsPhone(e.target.value)} placeholder="300 123 4567"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.inputText, fontSize: 15, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 6 }}>Descripción</label>
                  <input value={wsDescription} onChange={e => setWsDescription(e.target.value)} placeholder="Especialistas en frenos"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.inputText, fontSize: 15, outline: 'none' }} />
                </div>
              </div>

              {/* Optional test vehicle */}
              <div style={{ marginBottom: 14, padding: 14, borderRadius: 12, background: tk.chipBg, border: `1px solid ${tk.scanHintBorder}` }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: tk.chipText, fontWeight: 600 }}>
                  <input type="checkbox" checked={wsHasVehicle} onChange={e => setWsHasVehicle(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: '#F5C518', cursor: 'pointer' }} />
                  Registrar vehículo de prueba (opcional — para talleres certificados que necesitan ficha técnica)
                </label>

                {wsHasVehicle && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, marginBottom: 8 }}>Vehículo de prueba</div>
                    <div className="regGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 10, color: tk.sectionTitle, fontWeight: 600, display: 'block', marginBottom: 4 }}>Placa</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                          <input value={wsPlateLetters} onChange={e => setWsPlateLetters(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))} maxLength={3} placeholder="ABC"
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.accent, fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '.03em', outline: 'none' }} />
                          <span style={{ padding: '0 8px', color: tk.accent, fontFamily: 'var(--font-display)', fontSize: 18 }}> - </span>
                          <input value={wsPlateNumbers} onChange={e => setWsPlateNumbers(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))} maxLength={3} placeholder="123"
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.accent, fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '.03em', outline: 'none' }} />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: tk.sectionTitle, fontWeight: 600, display: 'block', marginBottom: 4 }}>Modelo</label>
                        <input value={wsModel} onChange={e => setWsModel(e.target.value)} list="wsModelList" placeholder={wsModels.length ? `Elige o escribe (ej. ${wsModels[0]})` : (wsBrand ? 'Escribe el modelo' : 'Selecciona la marca')}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.inputText, fontSize: 14, outline: 'none' }} />
                        <datalist id="wsModelList">
                          {wsModels.map(m => <option key={m} value={m} />)}
                        </datalist>
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: tk.sectionTitle, fontWeight: 600, display: 'block', marginBottom: 4 }}>Año</label>
                        <select value={wsYear} onChange={e => setWsYear(Number(e.target.value))} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.inputText, fontSize: 14, outline: 'none', cursor: 'pointer' }}>
                          {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: tk.sectionTitle, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo</label>
                        <select value={wsType} onChange={e => setWsType(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.inputText, fontSize: 14, outline: 'none', cursor: 'pointer' }}>
                          {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <label style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 6 }}>Marca</label>
                      <div className="regBrandGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(80px,1fr))', gap: 7 }}>
                        {brandTiles.map(b => (
                          <button key={b.name} onClick={() => setWsBrand(b.name)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '8px 4px', borderRadius: 10, cursor: 'pointer', background: b.bg, border: `1.5px solid ${b.border}` }}>
                            <span style={{ width: 30, height: 30, borderRadius: 8, background: b.badge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 14, color: b.mark }}>{b.initial}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: b.fg }}>{b.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <label style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 6 }}>Color</label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {colorTiles.map(c => (
                          <button key={c.name} onClick={() => setWsColor(c.name)} title={c.name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 999, cursor: 'pointer', background: c.bg, border: `1.5px solid ${c.border}`, color: c.fg, fontSize: 11, fontWeight: 600 }}>
                            <span style={{ width: 12, height: 12, borderRadius: '50%', background: c.dot, border: `1px solid ${tk.inputBorder}` }} />
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: 12, borderRadius: 12, background: tk.hintBg, border: `1px solid ${tk.hintBg.replace('0.06', '0.2').replace('0.08', '0.2')}`, marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: tk.hintText, lineHeight: 1.5 }}>
                  <b>ℹ️ Código único de taller</b> — Al registrarte, se generará automáticamente un código <b>TLR-XXXXX</b> único. Comparte este código con tus clientes para que te encuentren al instante.
                </div>
              </div>
            </>
          )}

          {errorMsg && (
            <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: tk.errorBg, border: `1px solid ${tk.errorBorder}`, color: tk.errorText, fontSize: 13, fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}
          <button onClick={doRegister} disabled={saving} style={{ marginTop: 14, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 15, borderRadius: 13, border: 'none', background: saving ? tk.btnDisabled : '#F5C518', color: '#111', fontWeight: 800, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: tk.btnShadow }}>
            {saving ? (mode === 'persona' ? 'Registrando...' : 'Registrando taller...') : (mode === 'persona' ? 'Registrar y entrar' : 'Crear taller')}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
