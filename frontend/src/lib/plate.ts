export const PLATE_LETTERS = 3;
export const PLATE_NUMBERS = 3;
export const PLATE_TOTAL = PLATE_LETTERS + 1 + PLATE_NUMBERS;

export function formatPlate(letters: string, numbers: string): string {
  return `${letters.toUpperCase()}-${numbers}`;
}

export function parsePlate(plate: string): { letters: string; numbers: string } | null {
  const match = plate.match(/^([A-Z]{3})-?(\d{3})$/i);
  return match ? { letters: match[1], numbers: match[2] } : null;
}

export function validatePlate(plate: string): boolean {
  return /^[A-Z]{3}-\d{3}$/i.test(plate);
}

export function getPlateDisplay(plate: string): string {
  if (!plate) return '';
  const parsed = parsePlate(plate);
  if (parsed) return `${parsed.letters}-${parsed.numbers}`;
  return plate;
}