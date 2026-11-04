import { describe, expect, it } from 'vitest';
import { newMeal } from '../../src/domain/meals';

describe('newMeal', () => {
  it('is a Linked Meal with 1 Serving', () => {
    expect(
      newMeal({ id: 'm-1', date: '2026-11-05', slot: 2, position: 0, dishId: 'd-1' }),
    ).toEqual({
      id: 'm-1',
      date: '2026-11-05',
      slot: 2,
      position: 0,
      dishId: 'd-1',
      servings: 1,
      detached: null,
    });
  });
});
