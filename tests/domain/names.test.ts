import { describe, expect, it } from 'vitest';
import { compareNames, nameKey, normalizeName } from '../../src/domain/names';

describe('normalizeName', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeName('  Mleko  ')).toBe('Mleko');
  });

  it('collapses internal whitespace runs to one space', () => {
    expect(normalizeName('Leczo \t z\n   kiełbasą')).toBe('Leczo z kiełbasą');
  });

  it('composes decomposed characters (NFC)', () => {
    expect(normalizeName('ś')).toBe('ś');
  });
});

describe('nameKey', () => {
  it('lowercases Polish letters without a locale', () => {
    expect(nameKey('ŁOSOŚ')).toBe('łosoś');
  });

  it('gives equal keys for composed and decomposed "ś"', () => {
    expect(nameKey('śliwka')).toBe(nameKey('śliwka'));
  });

  it('normalises whitespace before lowercasing', () => {
    expect(nameKey('  Jogurt   GRECKI ')).toBe('jogurt grecki');
  });
});

describe('compareNames', () => {
  it('sorts "ć" before "d"', () => {
    expect(compareNames('ćma', 'dynia')).toBeLessThan(0);
  });

  it('sorts "ł" before "m"', () => {
    expect(compareNames('łosoś', 'mąka')).toBeLessThan(0);
  });

  it('compares numbers numerically', () => {
    expect(compareNames('jajko 2', 'jajko 10')).toBeLessThan(0);
  });

  it('ignores case', () => {
    expect(compareNames('Mleko', 'mleko')).toBe(0);
  });
});
