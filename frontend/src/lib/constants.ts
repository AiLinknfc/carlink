export const DEPARTMENTS = [
  { dept: 'Amazonas', cities: ['Leticia'] },
  { dept: 'Antioquia', cities: ['Medellín', 'Bello', 'Itagüí', 'Envigado', 'Apartadó', 'Turbo', 'Rionegro', 'Santafé de Antioquia'] },
  { dept: 'Arauca', cities: ['Arauca', 'Saravena'] },
  { dept: 'Atlántico', cities: ['Barranquilla', 'Soledad', 'Malambo', 'Puerto Colombia'] },
  { dept: 'Bolívar', cities: ['Cartagena', 'Magangué', 'El Carmen de Bolívar', 'Turbaco'] },
  { dept: 'Boyacá', cities: ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Paipa'] },
  { dept: 'Caldas', cities: ['Manizales', 'La Dorada', 'Chinchiná'] },
  { dept: 'Caquetá', cities: ['Florencia'] },
  { dept: 'Casanare', cities: ['Yopal', 'Aguazul'] },
  { dept: 'Cauca', cities: ['Popayán', 'Santander de Quilichao'] },
  { dept: 'Cesar', cities: ['Valledupar', 'Aguachica', 'Codazzi'] },
  { dept: 'Chocó', cities: ['Quibdó'] },
  { dept: 'Córdoba', cities: ['Montería', 'Cereté', 'Lorica', 'Sahagún'] },
  { dept: 'Cundinamarca', cities: ['Bogotá', 'Soacha', 'Facatativá', 'Zipaquirá', 'Chía', 'Cajicá', 'Mosquera', 'Madrid', 'Funza'] },
  { dept: 'Guainía', cities: ['Inírida'] },
  { dept: 'Guaviare', cities: ['San José del Guaviare'] },
  { dept: 'Huila', cities: ['Neiva', 'Pitalito', 'La Plata', 'Garzón'] },
  { dept: 'La Guajira', cities: ['Riohacha', 'Maicao', 'Uribia'] },
  { dept: 'Magdalena', cities: ['Santa Marta', 'Ciénaga', 'Fundación', 'El Banco'] },
  { dept: 'Meta', cities: ['Villavicencio', 'Acacías', 'Granada', 'Puerto López'] },
  { dept: 'Nariño', cities: ['Pasto', 'Tumaco', 'Ipiales', 'Túquerres'] },
  { dept: 'Norte de Santander', cities: ['Cúcuta', 'Ocaña', 'Pamplona', 'Los Patios', 'Villa del Rosario'] },
  { dept: 'Putumayo', cities: ['Mocoa', 'Puerto Asís'] },
  { dept: 'Quindío', cities: ['Armenia', 'Calarcá', 'Montenegro'] },
  { dept: 'Risaralda', cities: ['Pereira', 'Dosquebradas', 'La Virginia', 'Santa Rosa de Cabal'] },
  { dept: 'San Andrés', cities: ['San Andrés'] },
  { dept: 'Santander', cities: ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja', 'San Gil', 'Socorro'] },
  { dept: 'Sucre', cities: ['Sincelejo', 'Corozal', 'Tolú'] },
  { dept: 'Tolima', cities: ['Ibagué', 'Espinal', 'Líbano', 'Honda', 'Mariquita'] },
  { dept: 'Valle del Cauca', cities: ['Cali', 'Buenaventura', 'Palmira', 'Tuluá', 'Cartago', 'Buga', 'Yumbo', 'Jamundí', 'Roldanillo', 'Sevilla', 'Zarzal'] },
  { dept: 'Vaupés', cities: ['Mitú'] },
  { dept: 'Vichada', cities: ['Puerto Carreño'] },
]

export const CITIES = DEPARTMENTS.flatMap(d => d.cities).sort((a, b) => a.localeCompare(b))

/* Cuenta de taller/empresa. El backend sólo asigna 'persona' o 'taller'
   (workshops.py:75); 'empresa' y 'business' viven en la UI de registro y login
   pero nunca llegan a la base, así que se aceptan los tres para no depender de
   por dónde se creó la cuenta. */
export function isBusinessAccount(accountType?: string | null): boolean {
  return accountType === 'taller' || accountType === 'empresa' || accountType === 'business'
}
