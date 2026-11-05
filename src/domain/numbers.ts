const DECIMAL = /^-?\d+([.,]\d+)?$/;

/**
 * Parses user input with either `,` or `.` as the decimal separator (research R4).
 * A leading `-` is accepted so negative entries can get their own message.
 */
export function parseDecimal(text: string): number | null {
  const trimmed = text.trim();
  if (!DECIMAL.test(trimmed)) return null;
  return Number(trimmed.replace(',', '.'));
}

/** Rounds to `places` decimals, half away from zero. */
export function roundTo(value: number, places: number): number {
  const factor = 10 ** places;
  return (Math.sign(value) * Math.round((Math.abs(value) + Number.EPSILON) * factor)) / factor;
}

/** Rounds to 2 decimals, half away from zero. */
export function roundTo2(value: number): number {
  return roundTo(value, 2);
}

/** Up to `places` decimals (default 2), comma separator, no trailing zeros. */
export function formatDecimal(value: number, places = 2): string {
  return String(roundTo(value, places)).replace('.', ',');
}
