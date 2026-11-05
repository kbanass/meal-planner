import { describe, expect, it } from 'vitest';
import { formatKcal, formatMacro, formatServings } from '../../src/domain/nutrition';

describe('formatKcal', () => {
  it.each([
    [350, '350'],
    [349.5, '350'],
    [99.999, '100'],
    [0, '0'],
  ])('formats %d as %j', (kcal, expected) => {
    expect(formatKcal(kcal)).toBe(expected);
  });
});

describe('formatMacro', () => {
  it.each([
    [12.5, '12,5'],
    [18.75, '18,8'],
    [11.25, '11,3'],
    [55, '55'],
    [0, '0'],
  ])('formats %d as %j', (grams, expected) => {
    expect(formatMacro(grams)).toBe(expected);
  });
});

describe('formatServings', () => {
  it.each([
    [1, '1'],
    [1.5, '1,5'],
    [0.25, '0,25'],
  ])('formats %d as %j', (servings, expected) => {
    expect(formatServings(servings)).toBe(expected);
  });
});
