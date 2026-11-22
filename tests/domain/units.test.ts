import { describe, expect, it } from 'vitest';
import { displayQuantity, formatAmount, formatListAmount, isUnit, UNITS } from '../../src/domain/units';

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

describe('formatListAmount', () => {
  it.each([
    [750, 'g', '750 g'],
    [74.6, 'g', '75 g'],
    [0.3, 'g', '1 g'],
    [999.6, 'g', '1 kg'],
    [1000, 'g', '1 kg'],
    [1250, 'g', '1,25 kg'],
    [1234, 'g', '1,23 kg'],
    [2000, 'g', '2 kg'],
    [600, 'ml', '600 ml'],
    [1100, 'ml', '1,1 l'],
    [2.5, 'pcs', '3 szt.'],
    [2.01, 'pcs', '3 szt.'],
    [2.0000000004, 'pcs', '2 szt.'],
    [0.2, 'pcs', '1 szt.'],
  ] as const)('formats %d %s as %j', (amount, unit, expected) => {
    expect(formatListAmount(amount, unit)).toBe(expected);
  });
});

describe('displayQuantity', () => {
  it.each([
    [0, 'g', 0],
    [0, 'pcs', 0],
    [0.3, 'ml', 1],
    [74.4, 'g', 74],
    [2.5, 'pcs', 3],
  ] as const)('shows %d %s as %d', (amount, unit, expected) => {
    expect(displayQuantity(amount, unit)).toBe(expected);
  });
});
