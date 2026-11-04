// Polish alphabetical order with numeric runs compared as numbers (research R3).
const collator = new Intl.Collator('pl', { sensitivity: 'base', numeric: true });

/** NFC, trimmed, with internal whitespace runs collapsed to one space. */
export function normalizeName(input: string): string {
  return input.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

/** Uniqueness and matching key. `toLowerCase` uses locale-independent Unicode case mapping. */
export function nameKey(input: string): string {
  return normalizeName(input).toLowerCase();
}

export function compareNames(a: string, b: string): number {
  return collator.compare(a, b);
}
