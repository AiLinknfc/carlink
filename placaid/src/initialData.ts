/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VehiclePlate, MaintenanceCard, ShopDetails, DocumentItem } from './types';

export const INITIAL_PLATE: VehiclePlate = {
  plateNumber: '911-LUX',
  city: 'BOGOTÁ, D.C.',
  plateStyle: 'carbon',
  customColor: '#CCFF00',
  customFrame: true
};

export const INITIAL_MAINTENANCE: MaintenanceCard = {
  currentMileage: 42500,
  nextServiceMileage: 47500,
  lubricantType: 'Sintético 5W-30',
  lubricantBrand: 'Motul',
  serviceDate: '2026-06-15',
  filtersReplaced: {
    oil: true,
    air: true,
    fuel: false,
    cabin: true,
    sparkPlugs: false,
    brakeFluid: true
  }
};

export const INITIAL_SHOP: ShopDetails = {
  name: 'Veloce Performance Lab',
  rating: 4.9,
  address: 'Av. Paseo de la Reforma 412, Ciudad de México',
  phone: '+52 55 4123 9876',
  instagram: 'veloce_performance',
  facebook: 'veloce.lab',
  whatsapp: '+525541239876',
  website: 'https://veloce-performance.com'
};

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-1',
    title: 'Certificado de Compra - Filtro K&N High-Flow',
    type: 'certificate',
    url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=600&auto=format&fit=crop',
    date: '2026-06-12',
    fileSize: '1.8 MB'
  },
  {
    id: 'doc-2',
    title: 'Cambio de Neumáticos - Michelin Pilot Sport 4S',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=600&auto=format&fit=crop',
    date: '2026-05-20',
    fileSize: '4.2 MB'
  },
  {
    id: 'doc-3',
    title: 'Alineación y Balanceo - Reporte Técnico Laser',
    type: 'certificate',
    url: 'https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?q=80&w=600&auto=format&fit=crop',
    date: '2026-05-20',
    fileSize: '2.5 MB'
  }
];

export const AVAILABLE_CITIES = [
  'Bogotá, D.C.',
  'Medellín',
  'Cali',
  'Barranquilla',
  'Cartagena',
  'Ciudad de México',
  'Monterrey',
  'Guadalajara',
  'Madrid',
  'Barcelona',
  'Buenos Aires',
  'Santiago de Chile',
  'Lima'
];

export const LUBRICANT_BRANDS = [
  'Motul',
  'Mobil 1',
  'Castrol',
  'Liqui Moly',
  'Shell',
  'Valvoline',
  'Elf',
  'Chevron'
];

export const LUBRICANT_TYPES = [
  'Sintético 5W-30',
  'Sintético 5W-40',
  'Sintético 0W-20',
  'Semi-Sintético 10W-40',
  'Semi-Sintético 15W-40',
  'Mineral 20W-50',
  'Especial de Competición (Racing)'
];
