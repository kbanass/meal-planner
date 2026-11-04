import type { IsoDate, Meal } from './types';

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
