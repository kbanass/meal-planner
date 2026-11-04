import { weekDates } from './dates';
import { mealSource, scaleMeal, isDetached } from './meals';
import { compareIds } from './names';
import { slotCountForDay } from './slots';
import type { DaySlots, Dish, DishPhotoRef, IsoDate, Meal, Settings } from './types';

export interface DayView {
  date: IsoDate;
  isToday: boolean;
  mealCount: number;
  plannedKcal: number; // unrounded
}

export interface MealView {
  meal: Meal;
  name: string; // the source's name; '' when the Dish is missing
  missingDish: boolean;
  photo: DishPhotoRef | null; // from the Dish, also for Detached Meals
  servings: number;
  kcal: number; // unrounded
  detached: boolean;
}

export interface SlotView {
  number: number;
  meals: MealView[]; // ordered by position, then id
}

function mealKcal(meal: Meal, dishesById: ReadonlyMap<string, Dish>): number {
  const source = mealSource(meal, dishesById);
  return source ? scaleMeal(source, meal.servings).macros.kcal : 0;
}

/** Planned kcal of some Meals: the sum of unrounded values (FR-023). */
export function plannedKcal(meals: readonly Meal[], dishesById: ReadonlyMap<string, Dish>): number {
  return meals.reduce((sum, meal) => sum + mealKcal(meal, dishesById), 0);
}

/** The seven day rows of a Week, Monday to Sunday. Meals outside the Week are ignored. */
export function selectWeekDays(
  weekStart: IsoDate,
  today: IsoDate,
  meals: readonly Meal[],
  dishesById: ReadonlyMap<string, Dish>,
): DayView[] {
  return weekDates(weekStart).map((date) => {
    const mealsOfDay = meals.filter((meal) => meal.date === date);
    return {
      date,
      isToday: date === today,
      mealCount: mealsOfDay.length,
      plannedKcal: plannedKcal(mealsOfDay, dishesById),
    };
  });
}

function mealView(meal: Meal, dishesById: ReadonlyMap<string, Dish>): MealView {
  const source = mealSource(meal, dishesById);
  return {
    meal,
    name: source?.name ?? '',
    missingDish: source === null,
    photo: dishesById.get(meal.dishId)?.photo ?? null,
    servings: meal.servings,
    kcal: mealKcal(meal, dishesById),
    detached: isDetached(meal),
  };
}

/** The Slots of one day with their Meals (FR-008, FR-009). */
export function selectDay(
  date: IsoDate,
  meals: readonly Meal[],
  daySlots: DaySlots | undefined,
  dishesById: ReadonlyMap<string, Dish>,
  settings: Settings,
): SlotView[] {
  const mealsOfDay = meals
    .filter((meal) => meal.date === date)
    .sort((a, b) => a.position - b.position || compareIds(a.id, b.id));
  const count = slotCountForDay(settings.slotsPerDay, mealsOfDay, daySlots);
  return Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    meals: mealsOfDay.filter((meal) => meal.slot === i + 1).map((meal) => mealView(meal, dishesById)),
  }));
}
