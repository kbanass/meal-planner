import { describe, expect, it } from 'vitest';
import { formatDecimal, parseDecimal, roundTo2 } from '../../src/domain/numbers';

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
