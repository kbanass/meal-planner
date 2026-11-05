import { formatDecimal } from './numbers';
import type { Unit } from './types';

export const UNITS: readonly Unit[] = ['g', 'ml', 'pcs'];

export function isUnit(value: unknown): value is Unit {
  return (UNITS as readonly unknown[]).includes(value);
}

/** g and ml as whole numbers, pcs with up to 2 decimals (spec Edge Cases, research R9). */
export function formatAmount(amount: number, unit: Unit): string {
  return formatDecimal(amount, unit === 'pcs' ? 2 : 0);
}
