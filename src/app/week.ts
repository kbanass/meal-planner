import type { SettingsRepository } from '../data/settings-repository';
import type { WeekRepository } from '../data/week-repository';
import {
  decideMealSave,
  mealSource,
  restoreMeal,
  validateMealDraft,
  type FieldError,
  type MealDraft,
} from '../domain/meals';
import { addDays, weekRange } from '../domain/dates';
import type { IdGenerator } from '../domain/ports';
import { nextSlotCount, slotCountForDay } from '../domain/slots';
import type { Dish, IsoDate, Meal, Product } from '../domain/types';
import { planWeekCopy, weekHasPlan } from '../domain/week';

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

/** "dodaj kolejny": raises the day to one Slot more than it shows now (FR-010). */
export async function addSlotToDay(
  deps: { week: WeekRepository; settings: SettingsRepository },
  date: IsoDate,
): Promise<number> {
  const day = { start: date, end: date };
  const [meals, [daySlots], settings] = await Promise.all([
    deps.week.listMeals(day),
    deps.week.listDaySlots(day),
    deps.settings.get(),
  ]);
  const slotCount = nextSlotCount(slotCountForDay(settings.slotsPerDay, meals, daySlots));
  await deps.week.setDaySlotCount(date, slotCount);
  return slotCount;
}

async function readWeek(deps: { week: WeekRepository }, weekStart: IsoDate) {
  const range = weekRange(weekStart);
  const [meals, daySlots] = await Promise.all([
    deps.week.listMeals(range),
    deps.week.listDaySlots(range),
  ]);
  return { meals, daySlots };
}

/** Whether a Week holds any Meal or Added Slots: copying onto it replaces them (FR-034). */
export async function weekHasPlanAt(
  deps: { week: WeekRepository },
  weekStart: IsoDate,
): Promise<boolean> {
  const { meals, daySlots } = await readWeek(deps, weekStart);
  return weekHasPlan(meals, daySlots);
}

/**
 * "Skopiuj do następnego tygodnia": replaces the next Week's Meals and Added Slots with copies
 * of the viewed Week's, all or nothing (FR-031–FR-038). An empty Week copies nothing.
 */
export async function copyWeekToNext(
  deps: { week: WeekRepository; ids: IdGenerator },
  weekStart: IsoDate,
): Promise<{ kind: 'copied'; meals: number } | { kind: 'empty' }> {
  const { meals, daySlots } = await readWeek(deps, weekStart);
  if (!weekHasPlan(meals, daySlots)) return { kind: 'empty' };
  const plan = planWeekCopy(weekStart, meals, daySlots, deps.ids);
  await deps.week.replaceWeek(addDays(weekStart, 7), plan);
  return { kind: 'copied', meals: plan.meals.length };
}
