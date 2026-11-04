import type { Dish, Ingredient, IsoDate, Macros, Meal, MealSource } from './types';

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

/** The Polish word after a number of Servings: 1 porcja, 2 porcje, 5 porcji, 1,5 porcji. */
export function servingsWord(servings: number): 'porcja' | 'porcje' | 'porcji' {
  if (servings === 1) return 'porcja';
  const lastDigit = servings % 10;
  const lastTwo = servings % 100;
  const few = lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14);
  return Number.isInteger(servings) && few ? 'porcje' : 'porcji';
}
