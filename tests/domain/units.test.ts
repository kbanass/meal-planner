import { describe, expect, it } from 'vitest';
import { formatAmount, isUnit, UNITS } from '../../src/domain/units';

describe('isUnit', () => {
  it.each(['g', 'ml', 'pcs'])('accepts %j', (value) => {
    expect(isUnit(value)).toBe(true);
  });

  it.each(['kg', '', undefined, null, 1])('rejects %j', (value) => {
    expect(isUnit(value)).toBe(false);
  });

  it('lists the units in form order', () => {
    expect(UNITS).toEqual(['g', 'ml', 'pcs']);
  });
});

describe('formatAmount', () => {
  it.each([
    [0.5, 'pcs', '0,5'],
    [1 / 3, 'pcs', '0,33'],
    [2, 'pcs', '2'],
    [74.6, 'g', '75'],
    [74.4, 'g', '74'],
    [150, 'ml', '150'],
    [1500, 'g', '1500'],
  ] as const)('formats %d %s as %j', (amount, unit, expected) => {
    expect(formatAmount(amount, unit)).toBe(expected);
  });
});
