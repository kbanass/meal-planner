import type { DaySlots, Meal } from './types';

/**
 * Slots shown on a day: the largest of the default, the highest Slot holding a Meal and the
 * Slot count the day was raised to with "dodaj kolejny" (FR-009, research R4).
 */
export function slotCountForDay(
  slotsPerDay: number,
  mealsOfDay: readonly Meal[],
  daySlots: DaySlots | undefined,
): number {
  return Math.max(slotsPerDay, ...mealsOfDay.map((meal) => meal.slot), daySlots?.slotCount ?? 0);
}

/** "dodaj kolejny" adds one Slot after the last one shown (FR-010). */
export function nextSlotCount(shown: number): number {
  return shown + 1;
}

/** Position for a Meal added to a Slot: after every Meal already there. */
export function nextPosition(mealsInSlot: readonly Meal[]): number {
  return mealsInSlot.reduce((next, meal) => Math.max(next, meal.position + 1), 0);
}
