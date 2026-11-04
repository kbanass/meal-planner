import { dayLabel, isIsoDate, weekDates, weekRangeLabel } from '../../domain/dates';
import { servingsWord } from '../../domain/meals';
import { formatKcal, formatServings } from '../../domain/nutrition';
import { DEFAULT_SETTINGS } from '../../domain/settings';
import type { DaySlots, Dish, DishPhotoRef, IsoDate, Meal, Settings } from '../../domain/types';
import { selectDay, selectWeekDays, type DayView, type MealView } from '../../domain/week';

export interface DayRow {
  date: IsoDate;
  title: string;
  subtitle: string;
  after: string;
  isToday: boolean;
}

/** One day on the Week page: "Czwartek", "5 lis", "1850 kcal" (FR-001, FR-003, FR-004). */
export function dayRow(day: DayView): DayRow {
  const { dayName, dateText } = dayLabel(day.date);
  return {
    date: day.date,
    title: dayName,
    subtitle: day.isToday ? `${dateText} · dziś` : dateText,
    after: day.mealCount === 0 ? 'brak posiłków' : `${formatKcal(day.plannedKcal)} kcal`,
    isToday: day.isToday,
  };
}

export interface MealRow {
  id: string;
  title: string;
  subtitle: string;
  badge: string | null;
  /** The name the placeholder is drawn from: the name the Meal shows. */
  avatarName: string;
  photo: DishPhotoRef | null;
}

/** One Meal in a Slot: "Owsianka", "1,5 porcji · 525 kcal", and "zmieniony" if detached. */
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

export const pickerEmptyMessage = 'Nie masz jeszcze żadnych dań. Dodaj je w zakładce Dania.';

export const invalidDayMessage = 'Nie ma takiego dnia.';

export function removeMealConfirmMessage(name: string): string {
  return `Usunąć posiłek „${name}”?`;
}

function indexDishes(dishes: readonly Dish[]): ReadonlyMap<string, Dish> {
  return new Map(dishes.map((dish) => [dish.id, dish]));
}

/** The date range the Week page reads. */
export function weekRange(weekStart: IsoDate): { start: IsoDate; end: IsoDate } {
  const dates = weekDates(weekStart);
  return { start: dates[0] as IsoDate, end: dates[6] as IsoDate };
}

export interface WeekPageModel {
  title: string;
  days: DayRow[];
}

/** Everything the Week page shows. Live data is `undefined` while it loads. */
export function weekPage(
  weekStart: IsoDate,
  today: IsoDate,
  meals: readonly Meal[] | undefined,
  dishes: readonly Dish[] | undefined,
): WeekPageModel {
  const days = selectWeekDays(weekStart, today, meals ?? [], indexDishes(dishes ?? []));
  return { title: weekRangeLabel(weekStart), days: days.map(dayRow) };
}

export interface DayPageModel {
  valid: boolean;
  title: string;
  slots: { number: number; rows: MealRow[] }[];
}

/** Everything the Day page shows. An invalid route date gives `valid: false`. */
export function dayPage(
  date: string,
  data: {
    meals: readonly Meal[] | undefined;
    daySlots: readonly DaySlots[] | undefined;
    dishes: readonly Dish[] | undefined;
    settings: Settings | undefined;
  },
): DayPageModel {
  if (!isIsoDate(date)) return { valid: false, title: '', slots: [] };
  const slots = selectDay(
    date,
    data.meals ?? [],
    data.daySlots?.find((record) => record.date === date),
    indexDishes(data.dishes ?? []),
    data.settings ?? DEFAULT_SETTINGS,
  );
  return {
    valid: true,
    title: dayTitle(date),
    slots: slots.map((slot) => ({ number: slot.number, rows: slot.meals.map(mealRow) })),
  };
}
