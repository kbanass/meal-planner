import { describe, expect, it } from 'vitest';
import { nextPosition, nextSlotCount, slotCountForDay } from '../../src/domain/slots';
import type { Meal } from '../../src/domain/types';

function meal(slot: number, position = 0): Meal {
  return {
    id: `m-${slot}-${position}`,
    date: '2026-11-07',
    slot,
    position,
    dishId: 'd-1',
    servings: 1,
    detached: null,
  };
}

describe('slotCountForDay', () => {
  it('shows the default when the day has no Meals and no Added Slots', () => {
    expect(slotCountForDay(4, [], undefined)).toBe(4);
  });

  it('shows every Slot up to the highest one holding a Meal', () => {
    expect(slotCountForDay(4, [meal(6)], undefined)).toBe(6);
  });

  it('keeps the count the day was raised to, unless the default is higher', () => {
    const daySlots = { date: '2026-11-07', slotCount: 5 };
    expect(slotCountForDay(3, [], daySlots)).toBe(5);
    expect(slotCountForDay(6, [], daySlots)).toBe(6);
  });

  it('takes the largest of the three', () => {
    expect(slotCountForDay(4, [meal(2), meal(7)], { date: '2026-11-07', slotCount: 5 })).toBe(7);
  });
});

describe('nextSlotCount', () => {
  it('adds one Slot after the last one shown', () => {
    expect(nextSlotCount(4)).toBe(5);
  });
});

describe('nextPosition', () => {
  it('starts an empty Slot at 0', () => {
    expect(nextPosition([])).toBe(0);
  });

  it('goes after the highest position, even with gaps', () => {
    expect(nextPosition([meal(2, 0), meal(2, 3)])).toBe(4);
  });
});
