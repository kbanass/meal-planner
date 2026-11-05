import { describe, expect, it } from 'vitest';
import { formatDecimal, parseDecimal, roundTo, roundTo2 } from '../../src/domain/numbers';

describe('parseDecimal', () => {
  it.each([
    ['1,5', 1.5],
    ['1.5', 1.5],
    [' 2 ', 2],
    ['-1,5', -1.5],
    ['0', 0],
  ])('parses %j as %d', (text, expected) => {
    expect(parseDecimal(text)).toBe(expected);
  });

  it.each(['1,5,3', '+1', '--1', '', '   ', '1e3', '1 000', 'abc', '1,', ',5'])(
    'rejects %j',
    (text) => {
      expect(parseDecimal(text)).toBeNull();
    },
  );
});

describe('roundTo2', () => {
  it('removes floating-point drift', () => {
    expect(roundTo2(0.1 + 0.2)).toBe(0.3);
  });

  it('rounds half away from zero', () => {
    expect(roundTo2(1.005)).toBe(1.01);
    expect(roundTo2(2.675)).toBe(2.68);
    expect(roundTo2(-1.005)).toBe(-1.01);
  });

  it('keeps values that already have two decimals or fewer', () => {
    expect(roundTo2(0)).toBe(0);
    expect(roundTo2(12.34)).toBe(12.34);
  });
});

describe('formatDecimal', () => {
  it.each([
    [1.5, '1,5'],
    [2, '2'],
    [0.25, '0,25'],
    [1.10, '1,1'],
    [0.1 + 0.2, '0,3'],
    [-1.5, '-1,5'],
  ])('formats %d as %j', (value, expected) => {
    expect(formatDecimal(value)).toBe(expected);
  });
});

describe('roundTo', () => {
  it.each([
    [18.75, 1, 18.8],
    [11.25, 1, 11.3],
    [-1.25, 1, -1.3],
    [349.5, 0, 350],
    [349.4, 0, 349],
    [0.125, 2, 0.13],
  ])('roundTo(%d, %d) = %d', (value, places, expected) => {
    expect(roundTo(value, places)).toBe(expected);
  });

  it.each([0.1 + 0.2, 1.005, 2.675, -1.005, 0, 12.34])('matches roundTo2 for %d', (value) => {
    expect(roundTo(value, 2)).toBe(roundTo2(value));
  });
});

describe('formatDecimal with places', () => {
  it.each([
    [18.75, 1, '18,8'],
    [55, 1, '55'],
    [12.5, 1, '12,5'],
    [349.5, 0, '350'],
    [1.5, 2, '1,5'],
  ])('formats %d with %d places as %j', (value, places, expected) => {
    expect(formatDecimal(value, places)).toBe(expected);
  });
});
