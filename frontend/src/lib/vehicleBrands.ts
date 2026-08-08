import type { PlateType } from './plate'

/* Compartido entre app/register/page.tsx y AddVehicleModal.tsx — ambos son
   el mismo formulario de "datos del vehículo" en dos momentos distintos
   (registro inicial vs. agregar uno nuevo desde una cuenta ya logueada), no
   tenía sentido mantener dos copias de las mismas marcas/tipos. */

export const CAR_BRANDS = [
  'Chevrolet', 'Renault', 'Mazda', 'Toyota', 'Nissan', 'Kia', 'Hyundai',
  'Volkswagen', 'Ford', 'Suzuki', 'BMW', 'Mercedes-Benz', 'Audi', 'Mitsubishi',
]

/* Marcas de moto más vendidas en Colombia (Fenalco/RUNT) — separado de
   CAR_BRANDS porque "Suzuki" vende ambos y las líneas no se cruzan. */
export const MOTO_BRANDS = [
  'Yamaha', 'Honda', 'AKT', 'Bajaj', 'Suzuki', 'TVS', 'Kawasaki', 'KTM',
  'Hero', 'Royal Enfield', 'Victory',
]

/* En Colombia "sedán" se reconoce como carrocería, no como tipo de vehículo
   del día a día, así que la opción se llama "Auto". El resto son las
   carrocerías comunes del mercado local. */
export const VEHICLE_TYPES = ['Auto', 'SUV', 'Camioneta', 'Moto', 'Deportivo', 'Hatchback', 'Pickup', 'Furgoneta']

export const brandsForType = (type: string) => type === 'Moto' ? MOTO_BRANDS : CAR_BRANDS

/* La placa colombiana de moto es 3 letras + 2 números + 1 letra (ABC-12D),
   distinta de la de carro (3 letras + 3 números) — @/lib/plate ya soporta
   ambos formatos, solo hace falta avisarle cuál según el tipo elegido. */
export const plateTypeFor = (type: string): PlateType => type === 'Moto' ? 'moto' : 'particular'

/* ── Sugerencias de modelo (marca + tipo + año → líneas conocidas) ──
   Vivía duplicado dentro de app/register/page.tsx (nunca se movió acá cuando
   se compartieron marcas/tipo arriba) — AddVehicleModal.tsx no tenía sugerencias
   de modelo en absoluto. Se centraliza acá para que ambos formularios usen
   exactamente la misma data, no dos copias que puedan desalinearse. */

/* Modelos/líneas por marca para el mercado colombiano. Cada línea guarda su
   carrocería y el rango aproximado de años en que se vendió [desde, hasta]
   (sin "hasta" = sigue vigente). Con eso la sugerencia se reduce según el TIPO y
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

/* Líneas de moto por marca — mismo criterio que MODELS_BY_BRAND (tipo +
   rango de años aproximado), todas con tipo 'Moto' para que typeMatches
   las filtre igual que a las demás carrocerías. */
const MOTO_MODELS_BY_BRAND: Record<string, ModelDef[]> = {
  Yamaha: [
    ['YBR 125', 'Moto', 2005], ['Crypton', 'Moto', 2000, 2015], ['Libero', 'Moto', 1998, 2014], ['Ray ZR', 'Moto', 2016],
    ['FZ', 'Moto', 2009], ['FZ25', 'Moto', 2019], ['FZS', 'Moto', 2010], ['MT-03', 'Moto', 2020], ['MT-07', 'Moto', 2015], ['MT-09', 'Moto', 2014],
    ['XTZ 125', 'Moto', 2005], ['XTZ 150', 'Moto', 2017], ['XTZ 250', 'Moto', 2010], ['Tenere 250', 'Moto', 2011],
    ['R15', 'Moto', 2011], ['R3', 'Moto', 2015], ['NMax', 'Moto', 2016], ['Bws', 'Moto', 2007, 2018],
  ],
  Honda: [
    ['CB1', 'Moto', 2018], ['CB110', 'Moto', 2012, 2019], ['CB125F', 'Moto', 2019], ['CB160F', 'Moto', 2020], ['CB190R', 'Moto', 2015],
    ['CB500F', 'Moto', 2013], ['CB500X', 'Moto', 2013], ['CBR250R', 'Moto', 2011, 2017], ['CBR500R', 'Moto', 2013], ['CBR600RR', 'Moto', 2003],
    ['XR150L', 'Moto', 2015], ['XR190L', 'Moto', 2015], ['XR250 Tornado', 'Moto', 1999, 2012], ['XR650L', 'Moto', 1993], ['Africa Twin', 'Moto', 2016],
    ['Biz 105', 'Moto', 2005], ['Wave 110', 'Moto', 2003], ['Navi', 'Moto', 2021], ['Elite 125', 'Moto', 2010], ['Falcon 400', 'Moto', 2005, 2015], ['CG 125', 'Moto', 1980, 2005],
  ],
  AKT: [
    ['AKT 125', 'Moto', 2010], ['NKD 125', 'Moto', 2013], ['CR4', 'Moto', 2016], ['TT', 'Moto', 2010], ['TTR', 'Moto', 2018], ['Flex', 'Moto', 2015], ['Dynamic', 'Moto', 2012, 2020], ['Evo', 'Moto', 2019], ['CRZ', 'Moto', 2021],
  ],
  Bajaj: [
    ['Pulsar 135', 'Moto', 2009, 2018], ['Pulsar 150', 'Moto', 2004], ['Pulsar 180', 'Moto', 2004, 2019], ['Pulsar 200NS', 'Moto', 2012],
    ['Pulsar RS200', 'Moto', 2015], ['Pulsar NS200', 'Moto', 2012], ['Pulsar N160', 'Moto', 2023], ['Discover 125', 'Moto', 2008], ['Discover 150', 'Moto', 2011],
    ['Boxer', 'Moto', 1998], ['Platina', 'Moto', 2006, 2018], ['CT100', 'Moto', 2005, 2020], ['Avenger 220', 'Moto', 2007], ['Dominar 400', 'Moto', 2017],
  ],
  Suzuki: [
    ['AX100', 'Moto', 1996], ['GN125', 'Moto', 1994, 2016], ['Best 125', 'Moto', 2010], ['Gixxer', 'Moto', 2015], ['Gixxer SF', 'Moto', 2017],
    ['GS500', 'Moto', 1989, 2010], ['Boulevard', 'Moto', 2005], ['DR650', 'Moto', 1990], ['V-Strom 250', 'Moto', 2017], ['V-Strom 650', 'Moto', 2004],
  ],
  TVS: [
    ['Apache RTR 160', 'Moto', 2007], ['Apache RTR 200', 'Moto', 2016], ['Apache RTR 310', 'Moto', 2023], ['Sport 100', 'Moto', 2010], ['Stryker', 'Moto', 2011, 2018], ['XL100', 'Moto', 2000], ['Ntorq 125', 'Moto', 2018],
  ],
  Kawasaki: [
    ['Ninja 300', 'Moto', 2013], ['Ninja 400', 'Moto', 2018], ['Ninja 650', 'Moto', 2006], ['Z400', 'Moto', 2019], ['Z650', 'Moto', 2017], ['Versys 650', 'Moto', 2007], ['KLX150', 'Moto', 2010],
  ],
  KTM: [
    ['Duke 200', 'Moto', 2012], ['Duke 250', 'Moto', 2017], ['Duke 390', 'Moto', 2013], ['RC 200', 'Moto', 2014], ['RC 390', 'Moto', 2014], ['Adventure 390', 'Moto', 2020],
  ],
  Hero: [
    ['Hunk', 'Moto', 2007, 2019], ['Splendor', 'Moto', 1994], ['Ignitor 125', 'Moto', 2012, 2018], ['CBZ', 'Moto', 1999, 2010], ['Xpulse 200', 'Moto', 2019],
  ],
  'Royal Enfield': [
    ['Classic 350', 'Moto', 2008], ['Bullet 350', 'Moto', 1990], ['Himalayan', 'Moto', 2016], ['Meteor 350', 'Moto', 2021], ['Interceptor 650', 'Moto', 2018],
  ],
  Victory: [
    ['XT250', 'Moto', 2015], ['XR250', 'Moto', 2012], ['XR190', 'Moto', 2014], ['Sprint 125', 'Moto', 2016], ['Nake 250', 'Moto', 2018],
  ],
}

/* Todas las líneas conocidas, autos + motos — modelSuggestions() filtra por
   tipo, así que da igual mezclarlas acá; separarlas solo importaba para no
   duplicar la clave de marca (Suzuki vende ambos). */
const ALL_MODELS_BY_BRAND: Record<string, ModelDef[]> = { ...MODELS_BY_BRAND }
for (const [brand, models] of Object.entries(MOTO_MODELS_BY_BRAND)) {
  ALL_MODELS_BY_BRAND[brand] = [...(ALL_MODELS_BY_BRAND[brand] || []), ...models]
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
export function modelSuggestions(brand: string, selType: string, selYear: number): string[] {
  const pool: ModelDef[] = brand && ALL_MODELS_BY_BRAND[brand]
    ? ALL_MODELS_BY_BRAND[brand]
    : Object.values(ALL_MODELS_BY_BRAND).flat()
  let list = pool.filter(([, t, from, to]) => typeMatches(selType, t) && inYearRange(selYear, from, to))
  if (!list.length) list = pool.filter(([, t]) => typeMatches(selType, t))
  const seen = new Set<string>()
  const out: string[] = []
  for (const [n] of list) if (!seen.has(n)) { seen.add(n); out.push(n) }
  return out
}
