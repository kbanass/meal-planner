import { SLOTS_PER_DAY } from '../../domain/settings';
import type { Settings } from '../../domain/types';

/** The rows of the "Liczba slotów" sheet: every allowed Slot count, 1 to 10 (FR-011). */
export const slotChoices: readonly number[] = Array.from(
  { length: SLOTS_PER_DAY.max - SLOTS_PER_DAY.min + 1 },
  (_, i) => SLOTS_PER_DAY.min + i,
);

/** The value shown on the "Liczba slotów" row, or nothing while the settings load. */
export function slotsPerDayLabel(settings: Settings | undefined): string {
  return settings ? String(settings.slotsPerDay) : '';
}
