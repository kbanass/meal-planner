import { beforeEach, describe, expect, it } from 'vitest';
import { saveDish } from '../../src/app/dishes';
import type { PlannerDb } from '../../src/data/db';
import { createDishRepository, type DishRepository } from '../../src/data/dish-repository';
import type { DishDraft } from '../../src/domain/dishes';
import type { Dish, Product } from '../../src/domain/types';
import { FixedIdGenerator } from '../fakes/fixed-id-generator';
import { createTestDb } from '../fakes/test-db';

const mleko: Product = { id: 'p-mleko', name: 'mleko', unit: 'ml' };
const productsById = new Map([[mleko.id, mleko]]);

const draft: DishDraft = {
  name: 'Kakao',
  servingsYield: '2',
  ingredients: [{ productId: mleko.id, amount: '500' }],
  macros: { kcal: '300', protein: '16', fat: '8', carbs: '40' },
  notes: '',
};

let db: PlannerDb;
let dishes: DishRepository;
let deps: { dishes: DishRepository; ids: FixedIdGenerator };

beforeEach(() => {
  db = createTestDb();
  dishes = createDishRepository(db);
  deps = { dishes, ids: new FixedIdGenerator() };
});

describe('saveDish', () => {
  it('creates a Dish with a new id, no photo and not archived', async () => {
    const result = await saveDish(deps, { draft, productsById, photoChange: { kind: 'keep' } });

    const id = '00000000-0000-4000-8000-000000000001';
    expect(result).toEqual({ kind: 'saved', id });
    expect(await dishes.get(id)).toEqual({
      id,
      name: 'Kakao',
      servingsYield: 2,
      ingredients: [{ productId: mleko.id, amount: 500 }],
      macros: { kcal: 300, protein: 16, fat: 8, carbs: 40 },
      notes: '',
      photo: null,
      archived: false,
    });
  });

  it('keeps the id and the existing photo when editing', async () => {
    const stored: Dish = {
      id: 'd-1',
      name: 'Stare kakao',
      servingsYield: 1,
      ingredients: [],
      macros: { kcal: 1, protein: 1, fat: 1, carbs: 1 },
      notes: 'stare',
      photo: { id: 'photo-1', mimeType: 'image/jpeg' },
      archived: false,
    };
    await dishes.put(stored);

    const result = await saveDish(deps, {
      id: 'd-1',
      draft,
      productsById,
      photoChange: { kind: 'keep' },
    });

    expect(result).toEqual({ kind: 'saved', id: 'd-1' });
    expect(await dishes.get('d-1')).toMatchObject({
      id: 'd-1',
      name: 'Kakao',
      photo: { id: 'photo-1', mimeType: 'image/jpeg' },
    });
    expect(await db.dishes.count()).toBe(1);
  });

  it('writes nothing for an invalid draft', async () => {
    const result = await saveDish(deps, {
      draft: { ...draft, name: ' ' },
      productsById,
      photoChange: { kind: 'keep' },
    });

    expect(result).toEqual({ kind: 'invalid', errors: { name: 'required' } });
    expect(await db.dishes.count()).toBe(0);
  });
});
