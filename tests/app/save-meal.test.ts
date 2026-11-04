import { beforeEach, describe, expect, it } from 'vitest';
import { saveMeal } from '../../src/app/week';
import { createWeekRepository, type WeekRepository } from '../../src/data/week-repository';
import { draftFromMeal, rescaleMealDraft } from '../../src/domain/meals';
import type { Meal, Product } from '../../src/domain/types';
import { byId, owsianka } from '../fakes/dishes';
import { FixedIdGenerator } from '../fakes/fixed-id-generator';
import { createTestDb } from '../fakes/test-db';

const productsById: ReadonlyMap<string, Product> = new Map([
  ['p-platki', { id: 'p-platki', name: 'płatki owsiane', unit: 'g' }],
  ['p-mleko', { id: 'p-mleko', name: 'mleko', unit: 'ml' }],
]);
const dishesById = byId([owsianka]);

let week: WeekRepository;
let stored: Meal;

beforeEach(async () => {
  week = createWeekRepository(createTestDb(), new FixedIdGenerator());
  stored = await week.addMeal({ date: '2026-11-05', slot: 1, dishId: owsianka.id });
});

describe('saveMeal (Servings)', () => {
  it('stores new Servings and keeps the Meal linked (US2-2, US2-3)', async () => {
    const draft = rescaleMealDraft(draftFromMeal(stored, owsianka), owsianka, '1,5');

    const result = await saveMeal({ week }, { mealId: stored.id, draft, dishesById, productsById });

    expect(result).toEqual({ kind: 'saved', detachedNow: false });
    expect(await week.getMeal(stored.id)).toEqual({ ...stored, servings: 1.5, detached: null });
  });

  it('writes nothing for an unchanged draft', async () => {
    const draft = draftFromMeal(stored, owsianka);

    const result = await saveMeal({ week }, { mealId: stored.id, draft, dishesById, productsById });

    expect(result).toEqual({ kind: 'unchanged' });
    expect(await week.getMeal(stored.id)).toEqual(stored);
  });

  it('refuses invalid Servings and writes nothing (US2-4)', async () => {
    const draft = { ...draftFromMeal(stored, owsianka), servings: '0' };

    const result = await saveMeal({ week }, { mealId: stored.id, draft, dishesById, productsById });

    expect(result).toEqual({ kind: 'invalid', errors: { servings: 'notPositive' } });
    expect(await week.getMeal(stored.id)).toEqual(stored);
  });

  it('reports a Meal removed meanwhile, or one whose Dish is missing', async () => {
    const draft = draftFromMeal(stored, owsianka);

    expect(
      await saveMeal({ week }, { mealId: stored.id, draft, dishesById: new Map(), productsById }),
    ).toEqual({ kind: 'gone' });
    await week.removeMeal(stored.id);
    expect(await saveMeal({ week }, { mealId: stored.id, draft, dishesById, productsById })).toEqual({
      kind: 'gone',
    });
  });
});
