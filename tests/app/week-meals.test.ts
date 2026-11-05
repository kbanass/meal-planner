import { beforeEach, describe, expect, it } from 'vitest';
import { addMealFromDish, removeMeal } from '../../src/app/week';
import { createWeekRepository, type WeekRepository } from '../../src/data/week-repository';
import { FixedIdGenerator } from '../fakes/fixed-id-generator';
import { createTestDb } from '../fakes/test-db';

let week: WeekRepository;

beforeEach(() => {
  week = createWeekRepository(createTestDb(), new FixedIdGenerator());
});

describe('addMealFromDish', () => {
  it('stores a Linked Meal with 1 Serving in the chosen day and Slot (US1-4)', async () => {
    const meal = await addMealFromDish({ week }, { date: '2026-11-05', slot: 2, dishId: 'd-1' });

    expect(await week.getMeal(meal.id)).toMatchObject({
      date: '2026-11-05',
      slot: 2,
      dishId: 'd-1',
      servings: 1,
      detached: null,
    });
  });

  it('puts a second Meal after the first in the same Slot (US1-5)', async () => {
    const first = await addMealFromDish({ week }, { date: '2026-11-05', slot: 2, dishId: 'd-1' });
    const second = await addMealFromDish({ week }, { date: '2026-11-05', slot: 2, dishId: 'd-2' });

    expect([first.position, second.position]).toEqual([0, 1]);
  });
});

describe('removeMeal', () => {
  it('deletes the Meal (US1-6)', async () => {
    const meal = await addMealFromDish({ week }, { date: '2026-11-05', slot: 2, dishId: 'd-1' });

    await removeMeal({ week }, meal.id);

    expect(await week.getMeal(meal.id)).toBeUndefined();
  });
});
