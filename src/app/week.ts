import type { WeekRepository } from '../data/week-repository';
import type { IsoDate, Meal } from '../domain/types';

/** Places a Dish in a Slot as a Linked Meal with 1 Serving, after the Slot's other Meals. */
export function addMealFromDish(
  deps: { week: WeekRepository },
  input: { date: IsoDate; slot: number; dishId: string },
): Promise<Meal> {
  return deps.week.addMeal(input);
}

export function removeMeal(deps: { week: WeekRepository }, mealId: string): Promise<void> {
  return deps.week.removeMeal(mealId);
}
