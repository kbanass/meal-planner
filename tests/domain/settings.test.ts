import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  isValidSlotsPerDay,
  readSettings,
  SLOTS_PER_DAY,
} from '../../src/domain/settings';

describe('settings defaults', () => {
  it('starts with 4 Slots per day, within 1–10', () => {
    expect(DEFAULT_SETTINGS).toEqual({ slotsPerDay: 4 });
    expect(SLOTS_PER_DAY).toEqual({ min: 1, max: 10 });
  });
});

describe('readSettings', () => {
  it.each([undefined, null, {}, 'app', 4])('falls back to the defaults for %j', (stored) => {
    expect(readSettings(stored)).toEqual({ slotsPerDay: 4 });
  });

  it.each([1, 6, 10])('keeps slotsPerDay %d', (slotsPerDay) => {
    expect(readSettings({ id: 'app', slotsPerDay })).toEqual({ slotsPerDay });
  });

  it.each([0, 11, 2.5, '4', Number.NaN, null])('replaces slotsPerDay %j with 4', (slotsPerDay) => {
    expect(readSettings({ slotsPerDay })).toEqual({ slotsPerDay: 4 });
  });

  it('returns only known fields', () => {
    expect(readSettings({ id: 'app', slotsPerDay: 5, other: true })).toEqual({ slotsPerDay: 5 });
  });
});

describe('isValidSlotsPerDay', () => {
  it.each([1, 4, 10])('accepts %j', (value) => {
    expect(isValidSlotsPerDay(value)).toBe(true);
  });

  it.each([0, 11, 2.5, '4', Number.NaN, null, undefined])('rejects %j', (value) => {
    expect(isValidSlotsPerDay(value)).toBe(false);
  });
});
