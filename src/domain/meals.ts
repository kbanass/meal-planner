import {
  fieldReader,
  parseField,
  readIngredients,
  readMacros,
  type FieldErrors,
  type IngredientDraft,
  type MacrosDraft,
} from './drafts';
import { normalizeName } from './names';
import { formatDecimal, parseDecimal, roundTo2 } from './numbers';
import type { Dish, Ingredient, IsoDate, Macros, Meal, MealSource, Product } from './types';

export type { FieldError } from './drafts';

/** A Meal's Macros and Ingredients at its Servings. Unrounded: only display rounds. */
export interface ScaledMeal {
  macros: Macros;
  ingredients: Ingredient[];
}

/** A Meal just picked from a Dish: linked, with 1 Serving (FR-015). */
export function newMeal(input: {
  id: string;
  date: IsoDate;
  slot: number;
  position: number;
  dishId: string;
}): Meal {
  return { ...input, servings: 1, detached: null };
}

export function isDetached(meal: Meal): boolean {
  return meal.detached !== null;
}

/**
 * What a Meal's numbers come from: a Detached Meal's own copy, otherwise its Dish (archived
 * ones included). `null` only when the Dish record is missing (research R6).
 */
export function mealSource(
  meal: Meal,
  dishesById: ReadonlyMap<string, Dish>,
): MealSource | null {
  return meal.detached ?? dishesById.get(meal.dishId) ?? null;
}

/** Macros and amounts ÷ Servings yield × Servings (FR-020). */
export function scaleMeal(source: MealSource, servings: number): ScaledMeal {
  const factor = servings / source.servingsYield;
  const { kcal, protein, fat, carbs } = source.macros;
  return {
    macros: { kcal: kcal * factor, protein: protein * factor, fat: fat * factor, carbs: carbs * factor },
    ingredients: source.ingredients.map((ingredient) => ({
      productId: ingredient.productId,
      amount: ingredient.amount * factor,
    })),
  };
}

/** Which Polish plural form follows `n`: 1 → one; 2–4 (not 12–14) → few; else, fractions too → many. */
function pluralForm(n: number): 'one' | 'few' | 'many' {
  if (n === 1) return 'one';
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  const few = lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14);
  return Number.isInteger(n) && few ? 'few' : 'many';
}

/** Macros of one Serving, e.g. for the Dish picker. Unrounded. */
export function perServing(source: MealSource): Macros {
  return scaleMeal(source, 1).macros;
}

/** The Polish word after a number of Servings: 1 porcja, 2 porcje, 5 porcji, 1,5 porcji. */
export function servingsWord(servings: number): 'porcja' | 'porcje' | 'porcji' {
  return ({ one: 'porcja', few: 'porcje', many: 'porcji' } as const)[pluralForm(servings)];
}

/** The Polish word after a number of Meals: 1 posiłek, 2 posiłki, 5 posiłków. */
export function mealsWord(count: number): 'posiłek' | 'posiłki' | 'posiłków' {
  return ({ one: 'posiłek', few: 'posiłki', many: 'posiłków' } as const)[pluralForm(count)];
}

const MACRO_KEYS = ['kcal', 'protein', 'fat', 'carbs'] as const;

type MacroKey = (typeof MACRO_KEYS)[number];

/**
 * The Meal sheet's state. Every number is text expressed per Meal, at `basisServings`
 * (FR-021, research R7). `servings` is the text in the Servings field.
 */
export interface MealDraft {
  basisServings: number;
  servings: string;
  name: string;
  ingredients: IngredientDraft[];
  macros: MacrosDraft;
}

/** A valid draft: per-Meal values, parsed and rounded to 2 decimals. */
export interface ValidMealValue {
  servings: number;
  name: string;
  ingredients: Ingredient[];
  macros: Macros;
}

export function draftFromMeal(meal: Meal, source: MealSource): MealDraft {
  const scaled = scaleMeal(source, meal.servings);
  return {
    basisServings: meal.servings,
    servings: formatDecimal(meal.servings),
    name: source.name,
    ingredients: scaled.ingredients.map((ingredient) => ({
      productId: ingredient.productId,
      amount: formatDecimal(ingredient.amount),
    })),
    macros: {
      kcal: formatDecimal(scaled.macros.kcal),
      protein: formatDecimal(scaled.macros.protein),
      fat: formatDecimal(scaled.macros.fat),
      carbs: formatDecimal(scaled.macros.carbs),
    },
  };
}

/** A valid Servings value from typed text, or null. */
function readServings(text: string): number | null {
  const parsed = parseField(text, 'positive');
  return typeof parsed === 'number' ? parsed : null;
}

/** Whether typed text still shows the source's value: equal at 2 decimals. */
function isSourceValue(text: string, sourceValue: number): boolean {
  const parsed = parseDecimal(text);
  return parsed !== null && roundTo2(parsed) === roundTo2(sourceValue);
}

/**
 * Text for one field after Servings change from `from` to `to`. A field still showing the
 * source's value is recomputed from the source, so rounding never builds up; a changed field
 * is scaled; unreadable text is left alone.
 */
function rescaleText(text: string, sourceAt: (servings: number) => number | undefined, from: number, to: number): string {
  const before = sourceAt(from);
  if (before !== undefined && isSourceValue(text, before)) {
    return formatDecimal(sourceAt(to) as number);
  }
  const parsed = parseDecimal(text);
  return parsed === null ? text : formatDecimal((parsed * to) / from);
}

/** Applies typed Servings text. Numbers follow only when the text is a new valid value. */
export function rescaleMealDraft(
  draft: MealDraft,
  source: MealSource,
  newServingsText: string,
): MealDraft {
  const to = readServings(newServingsText);
  if (to === null || to === draft.basisServings) return { ...draft, servings: newServingsText };
  const from = draft.basisServings;
  const sourceAmounts = new Map(source.ingredients.map((i) => [i.productId, i.amount]));
  const factor = (servings: number) => servings / source.servingsYield;
  const macro = (key: MacroKey) => (servings: number) => source.macros[key] * factor(servings);
  return {
    basisServings: to,
    servings: newServingsText,
    name: draft.name,
    ingredients: draft.ingredients.map((ingredient) => {
      const whole = sourceAmounts.get(ingredient.productId);
      const at = (servings: number) => (whole === undefined ? undefined : whole * factor(servings));
      return { productId: ingredient.productId, amount: rescaleText(ingredient.amount, at, from, to) };
    }),
    macros: {
      kcal: rescaleText(draft.macros.kcal, macro('kcal'), from, to),
      protein: rescaleText(draft.macros.protein, macro('protein'), from, to),
      fat: rescaleText(draft.macros.fat, macro('fat'), from, to),
      carbs: rescaleText(draft.macros.carbs, macro('carbs'), from, to),
    },
  };
}

/**
 * Validates the Meal sheet with the Dish form's rules, plus Servings > 0. The numbers are
 * returned at the typed Servings, even if the draft was not rescaled to them.
 */
export function validateMealDraft(
  draft: MealDraft,
  productsById: ReadonlyMap<string, Product>,
): { ok: true; value: ValidMealValue } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const read = fieldReader(errors);
  const servings = read('servings', draft.servings, 'positive');
  const name = normalizeName(draft.name);
  if (name === '') errors.name = 'required';
  const ingredients = readIngredients(draft.ingredients, productsById, read, errors);
  const macros = readMacros(draft.macros, read);

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const toServings = (value: number) => roundTo2((value * servings) / draft.basisServings);
  return {
    ok: true,
    value: {
      servings,
      name,
      ingredients: ingredients.map((i) => ({ productId: i.productId, amount: toServings(i.amount) })),
      macros: {
        kcal: toServings(macros.kcal),
        protein: toServings(macros.protein),
        fat: toServings(macros.fat),
        carbs: toServings(macros.carbs),
      },
    },
  };
}

/**
 * What saving the Meal sheet stores (FR-026, research R7). A real change (name, the Product
 * list, or any amount or Macro at 2 decimals) detaches the Meal: its copy starts from the
 * source's whole-recipe values, with each changed per-Meal value converted back. Without a
 * real change only Servings are stored, so a Linked Meal stays linked.
 */
export function decideMealSave(
  meal: Meal,
  source: MealSource,
  value: ValidMealValue,
):
  | { kind: 'unchanged' }
  | { kind: 'save'; meal: Meal; detachedNow: boolean } {
  const scaled = scaleMeal(source, value.servings);
  const scaledAmounts = new Map(scaled.ingredients.map((i) => [i.productId, i.amount]));
  const wholeAmounts = new Map(source.ingredients.map((i) => [i.productId, i.amount]));
  const sameProducts =
    value.ingredients.length === source.ingredients.length &&
    value.ingredients.every((i, index) => i.productId === source.ingredients[index]?.productId);
  const amountKept = (i: Ingredient) => {
    const scaledAmount = scaledAmounts.get(i.productId);
    return scaledAmount !== undefined && i.amount === roundTo2(scaledAmount);
  };
  const macroKept = (key: MacroKey) => value.macros[key] === roundTo2(scaled.macros[key]);
  const realChange =
    value.name !== source.name ||
    !sameProducts ||
    !value.ingredients.every(amountKept) ||
    !MACRO_KEYS.every(macroKept);

  if (!realChange) {
    if (value.servings === meal.servings) return { kind: 'unchanged' };
    return { kind: 'save', meal: { ...meal, servings: value.servings }, detachedNow: false };
  }

  const toWhole = (perMeal: number) => roundTo2((perMeal * source.servingsYield) / value.servings);
  const macros = { ...source.macros };
  for (const key of MACRO_KEYS) {
    if (!macroKept(key)) macros[key] = toWhole(value.macros[key]);
  }
  const detached: MealSource = {
    name: value.name,
    servingsYield: source.servingsYield,
    ingredients: value.ingredients.map((i) => ({
      productId: i.productId,
      amount: amountKept(i) ? (wholeAmounts.get(i.productId) as number) : toWhole(i.amount),
    })),
    macros,
  };
  return {
    kind: 'save',
    meal: { ...meal, servings: value.servings, detached },
    detachedNow: meal.detached === null,
  };
}

/** Appends the Product with an empty amount, or points at the Ingredient that already uses it. */
export function addMealIngredient(
  draft: MealDraft,
  productId: string,
): { draft: MealDraft; index: number; existed: boolean } {
  const existing = draft.ingredients.findIndex((ingredient) => ingredient.productId === productId);
  if (existing !== -1) return { draft, index: existing, existed: true };
  return {
    draft: { ...draft, ingredients: [...draft.ingredients, { productId, amount: '' }] },
    index: draft.ingredients.length,
    existed: false,
  };
}

export function removeMealIngredient(draft: MealDraft, index: number): MealDraft {
  return { ...draft, ingredients: draft.ingredients.filter((_, i) => i !== index) };
}

/** "przywróć z Dania": drops the copy, keeps the Servings, links the Meal again (FR-029). */
export function restoreMeal(meal: Meal): Meal {
  return { ...meal, detached: null };
}
