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

/** Rounds to 2 decimals, half away from zero. */
export function roundTo2(value: number): number {
  return (Math.sign(value) * Math.round((Math.abs(value) + Number.EPSILON) * 100)) / 100;
}

/** Up to 2 decimals, comma separator, no trailing zeros. */
export function formatDecimal(value: number): string {
  return String(roundTo2(value)).replace('.', ',');
}
