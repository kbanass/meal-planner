import { describe, expect, it } from 'vitest';
import { fnv1a32, PLACEHOLDER_PALETTE, placeholderFor } from '../../src/domain/placeholder';

/** WCAG 2 contrast ratio between two #rrggbb colours. */
function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

describe('fnv1a32', () => {
  it('matches the FNV-1a 32-bit reference vectors', () => {
    expect(fnv1a32('')).toBe(2166136261);
    expect(fnv1a32('a')).toBe(0xe40c292c);
    expect(fnv1a32('foobar')).toBe(0xbf9cf968);
  });

  it('hashes code points beyond the BMP as one unit', () => {
    expect(fnv1a32('🍲')).not.toBe(fnv1a32('\ud83c'));
    expect(fnv1a32('🍲')).toBeGreaterThanOrEqual(0);
  });
});

describe('placeholderFor', () => {
  it.each([
    ['Owsianka', 'O'],
    ['Leczo z kiełbasą', 'LZ'],
    ['  2 jajka', '2J'],
    ['!!!', '•'],
    ['', '•'],
    ['łosoś wędzony', 'ŁW'],
    ['zupa - krem z dyni', 'ZK'],
  ])('gives %j the initials %j', (name, initials) => {
    expect(placeholderFor(name).initials).toBe(initials);
  });

  it('gives the same colour for the same name', () => {
    expect(placeholderFor('Owsianka').color).toBe(placeholderFor('Owsianka').color);
    expect(placeholderFor('  Owsianka ').color).toBe(placeholderFor('Owsianka').color);
  });

  it('picks the colour from the palette', () => {
    expect(PLACEHOLDER_PALETTE).toContain(placeholderFor('Leczo z kiełbasą').color);
  });
});

describe('PLACEHOLDER_PALETTE', () => {
  it('has 12 colours, each legible with white text', () => {
    expect(PLACEHOLDER_PALETTE).toHaveLength(12);
    for (const color of PLACEHOLDER_PALETTE) {
      expect(contrastRatio(color, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    }
  });
});
