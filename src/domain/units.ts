import { formatDecimal, roundTo, roundTo2 } from './numbers';
import type { Unit } from './types';

export const UNITS: readonly Unit[] = ['g', 'ml', 'pcs'];

export function isUnit(value: unknown): value is Unit {
  return (UNITS as readonly unknown[]).includes(value);
}

/** g and ml as whole numbers, pcs with up to 2 decimals (spec Edge Cases, research R9). */
export function formatAmount(amount: number, unit: Unit): string {
  return formatDecimal(amount, unit === 'pcs' ? 2 : 0);
}

/**
 * The quantity shown for an amount on the Shopping List, in the Product's base unit
 * (research R3): g and ml whole and at least 1 when above zero, pcs rounded up to whole pieces.
 */
export function displayQuantity(amount: number, unit: Unit): number {
  if (unit === 'pcs') return Math.ceil(roundTo2(amount));
  const whole = roundTo(amount, 0);
  return amount > 0 ? Math.max(whole, 1) : whole;
}

/** The Shopping List's amount text with its unit: "750 g", "1,25 kg", "1,1 l", "3 szt." (FR-008). */
export function formatListAmount(amount: number, unit: Unit): string {
  const quantity = displayQuantity(amount, unit);
  if (unit === 'pcs') return `${quantity} szt.`;
  if (quantity < 1000) return `${quantity} ${unit}`;
  return `${formatDecimal(quantity / 1000)} ${unit === 'g' ? 'kg' : 'l'}`;
}
