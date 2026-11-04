import { beforeEach, describe, expect, it } from 'vitest';
import type { PlannerDb } from '../../src/data/db';
import { createDishRepository, type DishRepository } from '../../src/data/dish-repository';
import type { Dish } from '../../src/domain/types';
import { createTestDb } from '../fakes/test-db';

let db: PlannerDb;
let repo: DishRepository;

beforeEach(() => {
  db = createTestDb();
  repo = createDishRepository(db);
});

const owsianka: Dish = {
  id: 'd-1',
  name: 'Owsianka',
  servingsYield: 1.5,
  ingredients: [
    { productId: 'p-platki', amount: 60 },
    { productId: 'p-mleko', amount: 200 },
    { productId: 'p-banan', amount: 0.5 },
  ],
  macros: { kcal: 350, protein: 12.5, fat: 6, carbs: 55 },
  notes: '',
  photo: null,
  archived: false,
};

describe('DishRepository', () => {
  it('round-trips a Dish through put, get and list', async () => {
    await repo.put(owsianka);

    expect(await repo.get('d-1')).toEqual(owsianka);
    expect(await repo.list()).toEqual([owsianka]);
  });

  it('replaces a Dish on put with the same id', async () => {
    await repo.put(owsianka);
    await repo.put({ ...owsianka, name: 'Owsianka z bananem' });

    expect(await repo.list()).toEqual([{ ...owsianka, name: 'Owsianka z bananem' }]);
  });

  it('returns undefined for a missing Dish', async () => {
    expect(await repo.get('missing')).toBeUndefined();
  });
});

describe('archive and deletePermanently', () => {
  it('archives a Dish and keeps every other field', async () => {
    await repo.put({ ...owsianka, photo: { id: 'photo-1', mimeType: 'image/webp' } });

    await repo.archive('d-1');

    expect(await repo.get('d-1')).toEqual({
      ...owsianka,
      photo: { id: 'photo-1', mimeType: 'image/webp' },
      archived: true,
    });
  });

  it('deletes a Dish for good', async () => {
    await repo.put(owsianka);

    await repo.deletePermanently('d-1');

    expect(await repo.get('d-1')).toBeUndefined();
    expect(await db.dishes.count()).toBe(0);
  });
});
