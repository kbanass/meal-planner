import { formatDecimal } from './numbers';

// Display rounding for Macros and Servings (spec Edge Cases, research R9). Values are kept
// unrounded everywhere else, and sums are taken before these are applied.

/** Whole kcal: 349.5 → "350". */
export function formatKcal(kcal: number): string {
  return formatDecimal(kcal, 0);
}

/** Protein, fat or carbs in grams, at most 1 decimal: 18.75 → "18,8", 55 → "55". */
export function formatMacro(grams: number): string {
  return formatDecimal(grams, 1);
}

/** At most 2 decimals: 1.5 → "1,5". */
export function formatServings(servings: number): string {
  return formatDecimal(servings, 2);
}
