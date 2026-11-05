import { parseDecimal, roundTo2 } from './numbers';
import type { Ingredient, Macros, Product } from './types';

// Shared parsing for the Dish and Meal forms, whose numbers stay the text the user typed until
// validation (feature 001 research R4).

export type FieldError =
  | 'required'
  | 'notANumber'
  | 'notPositive'
  | 'negative'
  | 'duplicateProduct'
  | 'unknownProduct';

/** Field path (`name`, `macros.kcal`, `ingredients[2].amount`, …) → error code. */
export type FieldErrors = Record<string, FieldError>;

export interface IngredientDraft {
  productId: string;
  amount: string;
}

export interface MacrosDraft {
  kcal: string;
  protein: string;
  fat: string;
  carbs: string;
}

export type NumberRule = 'positive' | 'nonNegative';

export function parseField(text: string, rule: NumberRule): number | FieldError {
  if (text.trim() === '') return 'required';
  const parsed = parseDecimal(text);
  if (parsed === null) return 'notANumber';
  const value = roundTo2(parsed);
  if (rule === 'positive') return value > 0 ? value : 'notPositive';
  // Math.abs turns a typed "-0" into 0.
  return parsed < 0 ? 'negative' : Math.abs(value);
}

/**
 * Reads one numeric field, recording its error in `errors`. An invalid field reads as NaN,
 * which never escapes, because `errors` is then non-empty.
 */
export type FieldReader = (path: string, text: string, rule: NumberRule) => number;

export function fieldReader(errors: FieldErrors): FieldReader {
  return (path, text, rule) => {
    const result = parseField(text, rule);
    if (typeof result === 'number') return result;
    errors[path] = result;
    return Number.NaN;
  };
}

/** Amounts > 0, each Product known and used once. */
export function readIngredients(
  drafts: readonly IngredientDraft[],
  productsById: ReadonlyMap<string, Product>,
  read: FieldReader,
  errors: FieldErrors,
): Ingredient[] {
  const seen = new Set<string>();
  return drafts.map((ingredient, index) => {
    const path = `ingredients[${index}]`;
    if (!productsById.has(ingredient.productId)) {
      errors[`${path}.productId`] = 'unknownProduct';
    } else if (seen.has(ingredient.productId)) {
      errors[`${path}.productId`] = 'duplicateProduct';
    }
    seen.add(ingredient.productId);
    return {
      productId: ingredient.productId,
      amount: read(`${path}.amount`, ingredient.amount, 'positive'),
    };
  });
}

/** All four Macros required and ≥ 0. */
export function readMacros(draft: MacrosDraft, read: FieldReader): Macros {
  return {
    kcal: read('macros.kcal', draft.kcal, 'nonNegative'),
    protein: read('macros.protein', draft.protein, 'nonNegative'),
    fat: read('macros.fat', draft.fat, 'nonNegative'),
    carbs: read('macros.carbs', draft.carbs, 'nonNegative'),
  };
}
