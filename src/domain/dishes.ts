import { compareIds, compareNames, normalizeName } from './names';
import { formatDecimal, parseDecimal, roundTo2 } from './numbers';
import type { Dish, Ingredient, Product } from './types';

/** The Dish form's state. Numbers stay as the text the user typed until validation. */
export interface DishDraft {
  name: string;
  servingsYield: string;
  ingredients: { productId: string; amount: string }[];
  macros: { kcal: string; protein: string; fat: string; carbs: string };
  notes: string;
}

export type DishFieldError =
  | 'required'
  | 'notANumber'
  | 'notPositive'
  | 'negative'
  | 'duplicateProduct'
  | 'unknownProduct';

/** Field path (`name`, `macros.kcal`, `ingredients[2].amount`, …) → error code. */
export type DishFieldErrors = Record<string, DishFieldError>;

export type DishValue = Omit<Dish, 'id' | 'photo' | 'archived'>;

export function emptyDishDraft(): DishDraft {
  return {
    name: '',
    servingsYield: '1',
    ingredients: [],
    macros: { kcal: '', protein: '', fat: '', carbs: '' },
    notes: '',
  };
}

export function draftFromDish(dish: Dish): DishDraft {
  return {
    name: dish.name,
    servingsYield: formatDecimal(dish.servingsYield),
    ingredients: dish.ingredients.map((ingredient) => ({
      productId: ingredient.productId,
      amount: formatDecimal(ingredient.amount),
    })),
    macros: {
      kcal: formatDecimal(dish.macros.kcal),
      protein: formatDecimal(dish.macros.protein),
      fat: formatDecimal(dish.macros.fat),
      carbs: formatDecimal(dish.macros.carbs),
    },
    notes: dish.notes,
  };
}

/** Appends the Product with an empty amount, or points at the Ingredient that already uses it. */
export function addIngredient(
  draft: DishDraft,
  productId: string,
): { draft: DishDraft; index: number; existed: boolean } {
  const existing = draft.ingredients.findIndex((ingredient) => ingredient.productId === productId);
  if (existing !== -1) return { draft, index: existing, existed: true };
  return {
    draft: { ...draft, ingredients: [...draft.ingredients, { productId, amount: '' }] },
    index: draft.ingredients.length,
    existed: false,
  };
}

export function removeIngredient(draft: DishDraft, index: number): DishDraft {
  return { ...draft, ingredients: draft.ingredients.filter((_, i) => i !== index) };
}

type NumberRule = 'positive' | 'nonNegative';

function parseField(text: string, rule: NumberRule): number | DishFieldError {
  if (text.trim() === '') return 'required';
  const parsed = parseDecimal(text);
  if (parsed === null) return 'notANumber';
  const value = roundTo2(parsed);
  if (rule === 'positive') return value > 0 ? value : 'notPositive';
  // Math.abs turns a typed "-0" into 0.
  return parsed < 0 ? 'negative' : Math.abs(value);
}

export function validateDishDraft(
  draft: DishDraft,
  productsById: ReadonlyMap<string, Product>,
): { ok: true; value: DishValue } | { ok: false; errors: DishFieldErrors } {
  const errors: DishFieldErrors = {};
  // Returns NaN for an invalid field. It never escapes, because errors is then non-empty.
  const read = (path: string, text: string, rule: NumberRule): number => {
    const result = parseField(text, rule);
    if (typeof result === 'number') return result;
    errors[path] = result;
    return Number.NaN;
  };

  const name = normalizeName(draft.name);
  if (name === '') errors.name = 'required';
  const servingsYield = read('servingsYield', draft.servingsYield, 'positive');

  const seen = new Set<string>();
  const ingredients: Ingredient[] = draft.ingredients.map((ingredient, index) => {
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

  const macros = {
    kcal: read('macros.kcal', draft.macros.kcal, 'nonNegative'),
    protein: read('macros.protein', draft.macros.protein, 'nonNegative'),
    fat: read('macros.fat', draft.macros.fat, 'nonNegative'),
    carbs: read('macros.carbs', draft.macros.carbs, 'nonNegative'),
  };

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { name, servingsYield, ingredients, macros, notes: draft.notes.trim() },
  };
}

/** The Dish library: active Dishes in Polish alphabetical order, ties broken by id. */
export function selectLibrary(dishes: readonly Dish[]): Dish[] {
  return dishes
    .filter((dish) => !dish.archived)
    .sort((a, b) => compareNames(a.name, b.name) || compareIds(a.id, b.id));
}
