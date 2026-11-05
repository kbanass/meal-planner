import type { Settings } from './types';

export const DEFAULT_SETTINGS: Settings = { slotsPerDay: 4 };

export const SLOTS_PER_DAY = { min: 1, max: 10 } as const;

export function isValidSlotsPerDay(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= SLOTS_PER_DAY.min &&
    (value as number) <= SLOTS_PER_DAY.max
  );
}

/** The stored settings record, with missing or invalid fields replaced by the defaults. */
export function readSettings(stored: unknown): Settings {
  const slotsPerDay =
    typeof stored === 'object' && stored !== null
      ? (stored as { slotsPerDay?: unknown }).slotsPerDay
      : undefined;
  return {
    slotsPerDay: isValidSlotsPerDay(slotsPerDay) ? slotsPerDay : DEFAULT_SETTINGS.slotsPerDay,
  };
}
