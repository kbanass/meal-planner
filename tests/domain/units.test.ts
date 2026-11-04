import { describe, expect, it } from 'vitest';
import { isUnit, UNITS } from '../../src/domain/units';

describe('isUnit', () => {
  it.each(['g', 'ml', 'pcs'])('accepts %j', (value) => {
    expect(isUnit(value)).toBe(true);
  });

  it.each(['kg', '', undefined, null, 1])('rejects %j', (value) => {
    expect(isUnit(value)).toBe(false);
  });

  it('lists the units in form order', () => {
    expect(UNITS).toEqual(['g', 'ml', 'pcs']);
  });
});
