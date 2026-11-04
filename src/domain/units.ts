import type { Unit } from './types';

export const UNITS: readonly Unit[] = ['g', 'ml', 'pcs'];

export function isUnit(value: unknown): value is Unit {
  return (UNITS as readonly unknown[]).includes(value);
}
