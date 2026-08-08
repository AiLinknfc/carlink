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
export const plateTypeFor = (type: string): PlateType => type === 'Moto' ? 'moto' : 'car'
