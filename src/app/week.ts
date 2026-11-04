import type { WeekRepository } from '../data/week-repository';
import {
  decideMealSave,
  mealSource,
  restoreMeal,
  validateMealDraft,
  type FieldError,
  type MealDraft,
} from '../domain/meals';
import type { Dish, IsoDate, Meal, Product } from '../domain/types';

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

export type SaveMealResult =
  | { kind: 'saved'; detachedNow: boolean }
  | { kind: 'unchanged' }
  | { kind: 'invalid'; errors: Record<string, FieldError> }
  | { kind: 'gone' };

/**
 * Saves the Meal sheet: load, resolve the source, validate, then decide (research R7).
 * `gone` means the Meal, or the Dish it reads from, no longer exists.
 */
export async function saveMeal(
  deps: { week: WeekRepository },
  input: {
    mealId: string;
    draft: MealDraft;
    dishesById: ReadonlyMap<string, Dish>;
    productsById: ReadonlyMap<string, Product>;
  },
): Promise<SaveMealResult> {
  const meal = await deps.week.getMeal(input.mealId);
  if (!meal) return { kind: 'gone' };
  const source = mealSource(meal, input.dishesById);
  if (!source) return { kind: 'gone' };
  const validation = validateMealDraft(input.draft, input.productsById);
  if (!validation.ok) return { kind: 'invalid', errors: validation.errors };

  const decision = decideMealSave(meal, source, validation.value);
  if (decision.kind === 'unchanged') return decision;
  await deps.week.putMeal(decision.meal);
  return { kind: 'saved', detachedNow: decision.detachedNow };
}

/** Links a Detached Meal to its Dish again, even an Archived one (FR-029). */
export async function restoreMealFromDish(
  deps: { week: WeekRepository },
  mealId: string,
): Promise<{ kind: 'restored' } | { kind: 'gone' }> {
  const meal = await deps.week.getMeal(mealId);
  if (!meal) return { kind: 'gone' };
  await deps.week.putMeal(restoreMeal(meal));
  return { kind: 'restored' };
}
