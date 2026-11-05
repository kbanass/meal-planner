import {
  addDays,
  dayLabel,
  dayOfMonth,
  sameWeekday,
  SHORT_DAY_NAMES,
  weekMonthLabel,
  weekRange,
} from '../../domain/dates';
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
import {
  mealsInRange,
  selectDay,
  selectWeekDays,
  weekHasPlan,
  type MealView,
} from '../../domain/week';
import { FACE_OFFSETS, type FaceOffset } from './week-track';

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
  /** A Framework7 icon name, or a Lucide food shape in MacroIcon ("drumstick", "wheat"). */
  icon: string;
}

/** kcal, protein, fat and carbs with their icons (FR-004, FR-044, FR-045). */
export function macroTotals(macros: Macros): MacroTotal[] {
  return [
    { key: 'kcal', label: 'Kalorie', value: formatKcal(macros.kcal), unit: 'kcal', icon: 'flame_fill' },
    { key: 'protein', label: 'Białko', value: formatMacro(macros.protein), unit: 'g', icon: 'drumstick' },
    { key: 'fat', label: 'Tłuszcz', value: formatMacro(macros.fat), unit: 'g', icon: 'drop_fill' },
    { key: 'carbs', label: 'Węglowodany', value: formatMacro(macros.carbs), unit: 'g', icon: 'wheat' },
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

/**
 * How far a mouse-wheel event scrolls the Dish picker strip sideways (FR-045). A mostly
 * vertical wheel turn moves the strip; horizontal trackpad swipes already scroll it natively.
 */
export function wheelScrollDelta(deltaX: number, deltaY: number): number {
  return Math.abs(deltaY) > Math.abs(deltaX) ? deltaY : 0;
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

/** The five faces' 35 days: the Meals the Week track needs (feature 003, research R9). */
export function trackMealsRange(weekStart: IsoDate): { start: IsoDate; end: IsoDate } {
  return { start: addDays(weekStart, -14), end: addDays(weekStart, 20) };
}

/** One Week on the Week card's track: its month label and day strip (feature 003). */
export interface WeekFace {
  weekStart: IsoDate;
  offset: FaceOffset;
  /** Only the viewed face is focusable and read by screen readers (FR-015). */
  isViewed: boolean;
  monthLabel: string;
  strip: StripCell[];
}

/**
 * The face of the Week starting `weekStart`, at `offset` from the viewed Week. It marks the
 * weekday of `selected`, so a neighbour already shows the day a move would select. `meals` may
 * span more than this Week.
 */
export function weekFace(
  weekStart: IsoDate,
  offset: FaceOffset,
  today: IsoDate,
  selected: IsoDate,
  meals: readonly Meal[],
  dishesById: ReadonlyMap<string, Dish>,
): WeekFace {
  const selectedHere = sameWeekday(selected, weekStart);
  const days = selectWeekDays(weekStart, today, meals, dishesById);
  return {
    weekStart,
    offset,
    isViewed: offset === 0,
    monthLabel: weekMonthLabel(weekStart),
    strip: days.map((day, index) => ({
      date: day.date,
      shortName: SHORT_DAY_NAMES[index] as string,
      dayNumber: dayOfMonth(day.date),
      kcal: day.mealCount === 0 ? '' : formatKcal(day.plannedKcal),
      isToday: day.isToday,
      isSelected: day.date === selectedHere,
      ariaLabel: dayTitle(day.date),
    })),
  };
}

/** The track's five faces around the viewed Week, offsets −2…2 in order. */
export function weekTrackFaces(
  weekStart: IsoDate,
  today: IsoDate,
  selected: IsoDate,
  data: { meals: readonly Meal[] | undefined; dishes: readonly Dish[] | undefined },
): WeekFace[] {
  const meals = data.meals ?? [];
  const dishesById = indexDishes(data.dishes ?? []);
  return FACE_OFFSETS.map((offset) =>
    weekFace(addDays(weekStart, 7 * offset), offset, today, selected, meals, dishesById),
  );
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
  // The viewed face, so the page and the track can't disagree.
  const face = weekFace(weekStart, 0, today, selected, meals, dishesById);
  return {
    monthLabel: face.monthLabel,
    strip: face.strip,
    heading: dayTitle(selected),
    summary: mealCount === 0 ? 'brak posiłków' : `${mealCount} ${mealsWord(mealCount)}`,
    dayTotals: macroTotals(selectedDay?.macros ?? noMacros),
    slots: slots.map((slot) => ({
      number: slot.number,
      rows: slot.meals.map(mealRow),
      totals: macroTotals(slot.macros),
    })),
    // Meals arrive for all five faces; only the viewed Week's count (research R9).
    canCopy: weekHasPlan(mealsInRange(meals, weekRange(weekStart)), daySlots),
  };
}
