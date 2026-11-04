import { normalizeName } from './names';

/** Twelve hues, each with at least 4.5:1 contrast against white initials (FR-033). */
export const PLACEHOLDER_PALETTE: readonly string[] = [
  '#B3261E',
  '#AD1457',
  '#8E24AA',
  '#5E35B1',
  '#3949AB',
  '#1565C0',
  '#0E7490',
  '#00796B',
  '#2E7D32',
  '#4D7C0F',
  '#A16207',
  '#C2410C',
];

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 16777619;

/** 32-bit FNV-1a over the code points of `input`, unsigned (research R5). */
export function fnv1a32(input: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (const char of input) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash;
}

const STARTS_WITH_LETTER_OR_DIGIT = /^[\p{L}\p{N}]/u;

/** Deterministic colour and up to two initials for a Dish without a photo. */
export function placeholderFor(name: string): { color: string; initials: string } {
  const normalized = normalizeName(name);
  const initials = normalized
    .split(' ')
    .filter((word) => STARTS_WITH_LETTER_OR_DIGIT.test(word))
    .slice(0, 2)
    .map((word) => String.fromCodePoint(word.codePointAt(0)!).toUpperCase())
    .join('');
  return {
    color: PLACEHOLDER_PALETTE[fnv1a32(normalized) % PLACEHOLDER_PALETTE.length]!,
    initials: initials || '•',
  };
}
