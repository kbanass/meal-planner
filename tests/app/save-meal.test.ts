import { beforeEach, describe, expect, it } from 'vitest';
import { deleteDish } from '../../src/app/dishes';
import { restoreMealFromDish, saveMeal } from '../../src/app/week';
import { createDishRepository, type DishRepository } from '../../src/data/dish-repository';
import { createWeekRepository, type WeekRepository } from '../../src/data/week-repository';
import { draftFromMeal, mealSource, rescaleMealDraft, scaleMeal } from '../../src/domain/meals';
import type { Meal, Product } from '../../src/domain/types';
import { byId, owsianka } from '../fakes/dishes';
import { InMemoryPhotoStore } from '../fakes/in-memory-photo-store';
import { FixedIdGenerator } from '../fakes/fixed-id-generator';
import { createTestDb } from '../fakes/test-db';

const productsById: ReadonlyMap<string, Product> = new Map([
  ['p-platki', { id: 'p-platki', name: 'płatki owsiane', unit: 'g' }],
  ['p-mleko', { id: 'p-mleko', name: 'mleko', unit: 'ml' }],
]);
const dishesById = byId([owsianka]);

let week: WeekRepository;
let dishes: DishRepository;
let stored: Meal;

beforeEach(async () => {
  const db = createTestDb();
  week = createWeekRepository(db, new FixedIdGenerator());
  dishes = createDishRepository(db);
  await dishes.put(owsianka);
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

describe('saveMeal (detaching) and restoreMealFromDish', () => {
  it('detaches a Meal whose amount changed (US3-1)', async () => {
    const draft = draftFromMeal(stored, owsianka);
    const changed = {
      ...draft,
      ingredients: [{ productId: 'p-platki', amount: '80' }, ...draft.ingredients.slice(1)],
    };

    const result = await saveMeal({ week }, { mealId: stored.id, draft: changed, dishesById, productsById });

    expect(result).toEqual({ kind: 'saved', detachedNow: true });
    expect((await week.getMeal(stored.id))?.detached?.ingredients[0]?.amount).toBe(160);
  });

  it('restores a Detached Meal to the Dish as it is now (US3-5)', async () => {
    await week.putMeal({ ...stored, servings: 1.5, detached: { ...owsianka, name: 'Inna' } });
    const changedDish = { ...owsianka, macros: { ...owsianka.macros, kcal: 800 } };
    await dishes.put(changedDish);

    expect(await restoreMealFromDish({ week }, stored.id)).toEqual({ kind: 'restored' });

    const restored = await week.getMeal(stored.id);
    expect(restored).toMatchObject({ servings: 1.5, detached: null });
    const source = mealSource(restored!, byId([changedDish]));
    expect(scaleMeal(source!, restored!.servings).macros.kcal).toBe(600);
  });

  it('keeps a Linked Meal resolving after its Dish is archived (US3-7)', async () => {
    expect(await deleteDish({ dishes, photos: new InMemoryPhotoStore() }, owsianka.id)).toEqual({
      kind: 'archived',
    });

    const meal = await week.getMeal(stored.id);
    const source = mealSource(meal!, byId(await dishes.list()));
    expect(source).toMatchObject({ name: 'Owsianka', macros: owsianka.macros });
  });

  it('restores from an Archived Dish too', async () => {
    await week.putMeal({ ...stored, detached: { ...owsianka, name: 'Inna' } });
    await deleteDish({ dishes, photos: new InMemoryPhotoStore() }, owsianka.id);

    expect(await restoreMealFromDish({ week }, stored.id)).toEqual({ kind: 'restored' });
    const meal = await week.getMeal(stored.id);
    expect(mealSource(meal!, byId(await dishes.list()))).toMatchObject({ name: 'Owsianka', archived: true });
  });

  it('reports a missing Meal', async () => {
    await week.removeMeal(stored.id);

    expect(await restoreMealFromDish({ week }, stored.id)).toEqual({ kind: 'gone' });
  });
});
