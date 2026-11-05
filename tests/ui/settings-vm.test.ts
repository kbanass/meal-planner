import { describe, expect, it } from 'vitest';
import { slotChoices, slotsPerDayLabel } from '../../src/ui/view-models/settings';

describe('slotChoices', () => {
  it('lists every allowed Slot count, 1 to 10 (FR-011)', () => {
    expect(slotChoices).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe('slotsPerDayLabel', () => {
  it('shows the stored value', () => {
    expect(slotsPerDayLabel({ slotsPerDay: 4 })).toBe('4');
    expect(slotsPerDayLabel({ slotsPerDay: 10 })).toBe('10');
  });

  it('is empty while the settings load', () => {
    expect(slotsPerDayLabel(undefined)).toBe('');
  });
});
