export const PLATE_LETTERS = 3;
export const PLATE_NUMBERS = 3;
export const PLATE_TOTAL = PLATE_LETTERS + 1 + PLATE_NUMBERS;

export type PlateType = 'particular' | 'moto' | 'publico' | 'diplomatica' | 'carga' | 'remolque' | 'clasico';

export interface ParsedPlate {
  letters: string;
  numbers: string;
  type: PlateType;
  formatted: string;
}

/* Nombre visible por tipo de placa — usado para mostrarle al usuario qué tipo
   reconocimos a partir de lo que escribió (AddVehicleModal.tsx), y reusable
   por cualquier otro lugar que hoy arma su propio mapa inline (CartModal.tsx). */
export const PLATE_TYPE_LABELS: Record<PlateType, string> = {
  particular: 'Particular',
  moto: 'Moto',
  publico: 'Público',
  diplomatica: 'Diplomática',
  carga: 'Carga',
  remolque: 'Remolque',
  clasico: 'Clásico',
};

const PATTERNS: Record<PlateType, RegExp> = {
  particular:  /^[A-Z]{3}-\d{3}$/i,
  moto:        /^[A-Z]{3}-\d{2}[A-Z]$/i,
  publico:     /^[A-Z]{3}-\d{3}$/i,
  diplomatica: /^[A-Z]{2}-\d{4}$/i,
  carga:       /^[A-Z]-\d{4}$/i,
  remolque:    /^[RS]-\d{5}$/i,
  clasico:     /^[A-Z]{3}-\d{3}$/i,
};

const PLATE_CONFIGS: Record<PlateType, { letterLen: number; numLen: number; placeholder: string; moto?: boolean }> = {
  particular:  { letterLen: 3, numLen: 3, placeholder: 'ABC-123' },
  moto:        { letterLen: 3, numLen: 3, placeholder: 'ABC-12D', moto: true },
  publico:     { letterLen: 3, numLen: 3, placeholder: 'ABC-123' },
  diplomatica: { letterLen: 2, numLen: 4, placeholder: 'AB-1234' },
  carga:       { letterLen: 1, numLen: 4, placeholder: 'T-1234' },
  remolque:    { letterLen: 1, numLen: 5, placeholder: 'R-12345' },
  clasico:     { letterLen: 3, numLen: 3, placeholder: 'ABC-123' },
};

export function formatPlate(letters: string, numbers: string, type: PlateType = 'particular'): string {
  const config = PLATE_CONFIGS[type];
  const cleanLetters = letters.toUpperCase().replace(/[^A-Z]/g, '').slice(0, config.letterLen);
  const cleanNumbers = numbers.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (type === 'moto') {
    const nums = cleanNumbers.slice(0, 2);
    const letter = cleanNumbers.slice(2, 3) || '';
    return `${cleanLetters}-${nums}${letter}`;
  }
  return `${cleanLetters}-${cleanNumbers.slice(0, config.numLen)}`;
}

export function parsePlate(plate: string): ParsedPlate | null {
  const upper = plate.toUpperCase().replace(/\s/g, '');

  const typeOrder: PlateType[] = ['diplomatica', 'carga', 'remolque', 'moto', 'particular', 'publico', 'clasico'];
  for (const t of typeOrder) {
    if (PATTERNS[t].test(upper)) {
      const sep = upper.indexOf('-');
      const letters = sep >= 0 ? upper.slice(0, sep) : upper.slice(0, PLATE_CONFIGS[t].letterLen);
      const numbers = sep >= 0 ? upper.slice(sep + 1) : upper.slice(PLATE_CONFIGS[t].letterLen);
      return { letters, numbers, type: t, formatted: upper };
    }
  }

  const normalized = normalizePlate(upper);
  if (normalized !== upper) {
    return parsePlate(normalized);
  }
  return null;
}

export function validatePlate(plate: string, type: PlateType = 'particular'): boolean {
  const upper = plate.toUpperCase().replace(/\s/g, '');
  return PATTERNS[type].test(upper);
}

export function normalizePlate(raw: string): string {
  const upper = (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (upper.length === 0) return '';

  const first = upper[0];

  if (first === 'R' || first === 'S') {
    const nums = upper.slice(1).replace(/[^0-9]/g, '').slice(0, 5);
    return `${first}-${nums}`;
  }

  if (first === 'T') {
    const nums = upper.slice(1).replace(/[^0-9]/g, '').slice(0, 4);
    return `T-${nums}`;
  }

  if (/^[A-Z]{2}\d{4}$/.test(upper)) {
    return `${upper.slice(0, 2)}-${upper.slice(2)}`;
  }

  if (/^[A-Z]{3}\d{2}[A-Z]$/.test(upper)) {
    return `${upper.slice(0, 3)}-${upper.slice(3)}`;
  }

  if (/^[A-Z]{3}\d{3}$/.test(upper)) {
    return `${upper.slice(0, 3)}-${upper.slice(3)}`;
  }

  if (upper.length <= 3) return upper;
  return `${upper.slice(0, 3)}-${upper.slice(3)}`;
}

export function getPlateDisplay(plate: string): string {
  const parsed = parsePlate(plate);
  return parsed?.formatted || normalizePlate(plate);
}

export function getPlateConfig(type: PlateType) {
  return PLATE_CONFIGS[type];
}

export function splitPlateInput(value: string, type: PlateType) {
  const upper = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const config = PLATE_CONFIGS[type];

  if (type === 'moto') {
    const letters = upper.slice(0, config.letterLen);
    const rest = upper.slice(config.letterLen);
    const numbers = rest.slice(0, 2);
    const lastLetter = rest.slice(2, 3);
    return { letters, numbers: numbers + lastLetter };
  }

  const letters = upper.slice(0, config.letterLen);
  const numbers = upper.slice(config.letterLen, config.letterLen + config.numLen);
  return { letters, numbers };
}
