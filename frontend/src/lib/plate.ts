export const PLATE_LETTERS = 3;
export const PLATE_NUMBERS = 3;
export const PLATE_TOTAL = PLATE_LETTERS + 1 + PLATE_NUMBERS;

export type PlateType = 'car' | 'moto';

export interface ParsedPlate {
  letters: string;
  numbers: string;
  type: PlateType;
  formatted: string;
}

const CAR_PATTERN = /^[A-Z]{3}-\d{3}$/i;
const MOTO_PATTERN = /^[A-Z]{3}-\d{2}[A-Z]$/i;

export function formatPlate(letters: string, numbers: string, type: PlateType = 'car'): string {
  const cleanLetters = letters.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  const cleanNumbers = numbers.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (type === 'moto') {
    const nums = cleanNumbers.slice(0, 2);
    const letter = cleanNumbers.slice(2, 3) || '';
    return `${cleanLetters}-${nums}${letter}`;
  }
  return `${cleanLetters}-${cleanNumbers.slice(0, 3)}`;
}

export function parsePlate(plate: string): ParsedPlate | null {
  const upper = plate.toUpperCase().replace(/\s/g, '');
  if (CAR_PATTERN.test(upper)) {
    const [letters, numbers] = upper.split('-');
    return { letters, numbers, type: 'car', formatted: upper };
  }
  if (MOTO_PATTERN.test(upper)) {
    const [letters, rest] = upper.split('-');
    return {
      letters,
      numbers: rest,
      type: 'moto',
      formatted: upper,
    };
  }
  return null;
}

export function validatePlate(plate: string, type: PlateType = 'car'): boolean {
  const upper = plate.toUpperCase().replace(/\s/g, '');
  return type === 'car' ? CAR_PATTERN.test(upper) : MOTO_PATTERN.test(upper);
}

/* Colapsa cualquier placa a su forma canónica: 3 letras, un guion, el resto.
   Repara valores viejos con doble guion o sin guion. */
export function normalizePlate(raw: string): string {
  const alnum = (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (alnum.length <= 3) return alnum;
  return `${alnum.slice(0, 3)}-${alnum.slice(3)}`;
}

export function getPlateDisplay(plate: string): string {
  const parsed = parsePlate(plate);
  return parsed?.formatted || normalizePlate(plate);
}

export function getPlateConfig(type: PlateType) {
  return {
    car: { letterLen: 3, numLen: 3, placeholder: 'ABC-123' },
    moto: { letterLen: 3, numLen: 3, placeholder: 'ABC-12D' },
  }[type];
}

export function splitPlateInput(value: string, type: PlateType) {
  const upper = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const config = getPlateConfig(type);

  if (type === 'car') {
    const letters = upper.slice(0, config.letterLen);
    const numbers = upper.slice(config.letterLen, config.letterLen + config.numLen);
    return { letters, numbers };
  }

  const letters = upper.slice(0, config.letterLen);
  const rest = upper.slice(config.letterLen);
  const numbers = rest.slice(0, 2);
  const lastLetter = rest.slice(2, 3);
  return { letters, numbers: numbers + lastLetter };
}