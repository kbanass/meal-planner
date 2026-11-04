import { dayLabel, dayOfMonth, SHORT_DAY_NAMES, weekMonthLabel } from '../../domain/dates';
import { mealsWord, perServing, servingsWord } from '../../domain/meals';
import { formatKcal, formatMacro, formatServings } from '../../domain/nutrition';
import { DEFAULT_SETTINGS } from '../../domain/settings';
import type {
  DaySlots,
  Dish,
  DishPhotoRef,
  IsoDate,
  Macros,
  Meal,
  Settings,
} from '../../domain/types';
import { selectDay, selectWeekDays, weekHasPlan, type MealView } from '../../domain/week';

export interface MealRow {
  id: string;
  title: string;
  subtitle: string;
  badge: string | null;
  /** The name the placeholder is drawn from: the name the Meal shows. */
  avatarName: string;
  photo: DishPhotoRef | null;
}

/** One Meal card: "Owsianka", "1,5 porcji · 525 kcal", and "zmieniony" if detached (FR-042). */
export function mealRow(view: MealView): MealRow {
  const title = view.missingDish ? 'Nieznane danie' : view.name;
  return {
    id: view.meal.id,
    title,
    subtitle: `${formatServings(view.servings)} ${servingsWord(view.servings)} · ${formatKcal(view.kcal)} kcal`,
    badge: view.detached ? 'zmieniony' : null,
    avatarName: title,
    photo: view.photo,
  };
}

/** "Czwartek, 5 lis". */
export function dayTitle(date: IsoDate): string {
  const { dayName, dateText } = dayLabel(date);
  return `${dayName}, ${dateText}`;
}

/** One Macro for display: a Framework7 icon and a rounded number (spec Edge Cases). */
export interface MacroTotal {
  key: keyof Macros;
  /** Accessible name, e.g. "Białko". */
  label: string;
  value: string;
  unit: 'kcal' | 'g';
  icon: string;
}

/** kcal, protein, fat and carbs with their icons (FR-004, FR-044, FR-045). */
export function macroTotals(macros: Macros): MacroTotal[] {
  return [
    { key: 'kcal', label: 'Kalorie', value: formatKcal(macros.kcal), unit: 'kcal', icon: 'flame_fill' },
    { key: 'protein', label: 'Białko', value: formatMacro(macros.protein), unit: 'g', icon: 'cube_fill' },
    { key: 'fat', label: 'Tłuszcz', value: formatMacro(macros.fat), unit: 'g', icon: 'drop_fill' },
    { key: 'carbs', label: 'Węglowodany', value: formatMacro(macros.carbs), unit: 'g', icon: 'hexagon_fill' },
  ];
}

export interface PickerTile {
  id: string;
  name: string;
  photo: DishPhotoRef | null;
  /** One Serving: what tapping the tile adds. */
  totals: MacroTotal[];
}

export function pickerTile(dish: Dish): PickerTile {
  return { id: dish.id, name: dish.name, photo: dish.photo, totals: macroTotals(perServing(dish)) };
}

/** Pixels a swipe must travel to change the Week. */
const SWIPE_DISTANCE = 50;

/**
 * Days to move after a swipe on the Week card: left shows the next Week, right the previous.
 * Mostly vertical movement is a scroll, not a swipe.
 */
export function swipeWeekDelta(dx: number, dy: number): number {
  if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) <= 1.5 * Math.abs(dy)) return 0;
  return dx < 0 ? 7 : -7;
}

export const pickerEmptyMessage = 'Nie masz jeszcze żadnych dań. Dodaj je w zakładce Dania.';

export function removeMealConfirmMessage(name: string): string {
  return `Usunąć posiłek „${name}”?`;
}

export const copyConfirmMessage =
  'Następny tydzień ma już plan. Zastąpić go planem z tego tygodnia?';

export const copyDoneToast = 'Skopiowano do następnego tygodnia.';

export const copyFailedMessage =
  'Nie udało się skopiować tygodnia. Następny tydzień nie został zmieniony.';

export function indexDishes(dishes: readonly Dish[]): ReadonlyMap<string, Dish> {
  return new Map(dishes.map((dish) => [dish.id, dish]));
}

/** One day in the Week card's strip (FR-001, FR-003, FR-004). */
export interface StripCell {
  date: IsoDate;
  shortName: string;
  dayNumber: number;
  /** Planned kcal, or '' for a day with no Meals. */
  kcal: string;
  isToday: boolean;
  isSelected: boolean;
  ariaLabel: string;
}

export interface WeekPageModel {
  monthLabel: string;
  strip: StripCell[];
  /** The selected day: "Czwartek, 5 lis". */
  heading: string;
  /** "2 posiłki", or "brak posiłków". */
  summary: string;
  /** The selected day's Planned kcal and macros, under the strip (FR-004). */
  dayTotals: MacroTotal[];
  slots: { number: number; rows: MealRow[]; totals: MacroTotal[] }[];
  /** "Skopiuj do następnego tygodnia" is offered only for a Week with a plan (FR-036). */
  canCopy: boolean;
}

/**
 * Everything the one-screen Week page shows: the Week card with its day strip, and the selected
 * day's Slots (spec Revisions 2026-11-04). Live data is `undefined` while it loads.
 */
export function weekPage(
  weekStart: IsoDate,
  today: IsoDate,
  selected: IsoDate,
  data: {
    meals: readonly Meal[] | undefined;
    daySlots: readonly DaySlots[] | undefined;
    dishes: readonly Dish[] | undefined;
    settings: Settings | undefined;
  },
): WeekPageModel {
  const meals = data.meals ?? [];
  const daySlots = data.daySlots ?? [];
  const dishesById = indexDishes(data.dishes ?? []);
  const days = selectWeekDays(weekStart, today, meals, dishesById);
  const selectedDay = days.find((day) => day.date === selected);
  const mealCount = selectedDay?.mealCount ?? 0;
  const noMacros = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
  const slots = selectDay(
    selected,
    meals,
    daySlots.find((record) => record.date === selected),
    dishesById,
    data.settings ?? DEFAULT_SETTINGS,
  );
  return {
    monthLabel: weekMonthLabel(weekStart),
    strip: days.map((day, index) => ({
      date: day.date,
      shortName: SHORT_DAY_NAMES[index] as string,
      dayNumber: dayOfMonth(day.date),
      kcal: day.mealCount === 0 ? '' : formatKcal(day.plannedKcal),
      isToday: day.isToday,
      isSelected: day.date === selected,
      ariaLabel: dayTitle(day.date),
    })),
    heading: dayTitle(selected),
    summary: mealCount === 0 ? 'brak posiłków' : `${mealCount} ${mealsWord(mealCount)}`,
    dayTotals: macroTotals(selectedDay?.macros ?? noMacros),
    slots: slots.map((slot) => ({
      number: slot.number,
      rows: slot.meals.map(mealRow),
      totals: macroTotals(slot.macros),
    })),
    canCopy: weekHasPlan(meals, daySlots),
  };
}
