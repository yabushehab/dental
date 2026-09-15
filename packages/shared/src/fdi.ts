/**
 * FDI (ISO 3950) tooth notation.
 * Permanent teeth: quadrants 1-4, positions 1-8 (11..18, 21..28, 31..38, 41..48)
 * Deciduous teeth: quadrants 5-8, positions 1-5 (51..55, 61..65, 71..75, 81..85)
 */

export type ToothSurface = "M" | "O" | "D" | "B" | "L" | "I";
export const TOOTH_SURFACES: readonly ToothSurface[] = ["M", "O", "D", "B", "L", "I"];

const PERMANENT_QUADRANTS = [1, 2, 3, 4] as const;
const DECIDUOUS_QUADRANTS = [5, 6, 7, 8] as const;

export const PERMANENT_TEETH: readonly number[] = PERMANENT_QUADRANTS.flatMap((q) =>
  Array.from({ length: 8 }, (_, i) => q * 10 + i + 1),
);

export const DECIDUOUS_TEETH: readonly number[] = DECIDUOUS_QUADRANTS.flatMap((q) =>
  Array.from({ length: 5 }, (_, i) => q * 10 + i + 1),
);

export function isValidFdi(tooth: number): boolean {
  const quadrant = Math.floor(tooth / 10);
  const position = tooth % 10;
  if (position < 1) return false;
  if (quadrant >= 1 && quadrant <= 4) return position <= 8;
  if (quadrant >= 5 && quadrant <= 8) return position <= 5;
  return false;
}

export function isDeciduous(tooth: number): boolean {
  const quadrant = Math.floor(tooth / 10);
  return quadrant >= 5 && quadrant <= 8;
}

export function isUpper(tooth: number): boolean {
  const quadrant = Math.floor(tooth / 10);
  return quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6;
}

const POSITION_NAMES_PERMANENT = [
  "central incisor",
  "lateral incisor",
  "canine",
  "first premolar",
  "second premolar",
  "first molar",
  "second molar",
  "third molar",
] as const;

const POSITION_NAMES_DECIDUOUS = [
  "central incisor",
  "lateral incisor",
  "canine",
  "first molar",
  "second molar",
] as const;

/** e.g. 36 -> "lower left first molar" */
export function toothName(tooth: number): string {
  if (!isValidFdi(tooth)) throw new Error(`Invalid FDI tooth number: ${tooth}`);
  const quadrant = Math.floor(tooth / 10);
  const position = tooth % 10;
  const vertical = isUpper(tooth) ? "upper" : "lower";
  // Quadrants 1/4 (and 5/8) are the patient's right side
  const side =
    quadrant === 1 || quadrant === 4 || quadrant === 5 || quadrant === 8 ? "right" : "left";
  const name = isDeciduous(tooth)
    ? POSITION_NAMES_DECIDUOUS[position - 1]
    : POSITION_NAMES_PERMANENT[position - 1];
  const prefix = isDeciduous(tooth) ? "deciduous " : "";
  return `${prefix}${vertical} ${side} ${name}`;
}
