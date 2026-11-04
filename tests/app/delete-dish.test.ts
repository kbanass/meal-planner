import { beforeEach, describe, expect, it } from 'vitest';
import { deleteDish } from '../../src/app/dishes';
import { createDishRepository, type DishRepository } from '../../src/data/dish-repository';
import { createProductRepository, type ProductRepository } from '../../src/data/product-repository';
import { selectLibrary } from '../../src/domain/dishes';
import type { Dish } from '../../src/domain/types';
import { FixedIdGenerator } from '../fakes/fixed-id-generator';
import { InMemoryPhotoStore } from '../fakes/in-memory-photo-store';
import { createTestDb } from '../fakes/test-db';

const photo = { id: 'photo-1', mimeType: 'image/webp' } as const;

let dishes: DishRepository;
let products: ProductRepository;
let photos: InMemoryPhotoStore;

beforeEach(async () => {
  const db = createTestDb();
  dishes = createDishRepository(db);
  products = createProductRepository(db, new FixedIdGenerator());
  photos = new InMemoryPhotoStore();

  const created = await products.createFromName('mleko', 'ml');
  if (created.kind !== 'created') throw new Error('setup failed');
  const dish: Dish = {
    id: 'd-1',
    name: 'Kakao',
    servingsYield: 1,
    ingredients: [{ productId: created.product.id, amount: 250 }],
    macros: { kcal: 150, protein: 8, fat: 4, carbs: 20 },
    notes: '',
    photo,
    archived: false,
  };
  await dishes.put(dish);
  await photos.write(photo, new Blob(['photo']));
});

describe('deleteDish', () => {
  it('deletes a Dish that no Meal uses, with its photo, and keeps its Products', async () => {
    const result = await deleteDish({ dishes, photos, countMealsUsingDish: async () => 0 }, 'd-1');

    expect(result).toEqual({ kind: 'deleted' });
    expect(await dishes.get('d-1')).toBeUndefined();
    expect(photos.ids()).toEqual([]);
    expect(await products.list()).toHaveLength(1);
  });

  it('archives a Dish that a Meal uses and keeps its photo (SC-008)', async () => {
    const result = await deleteDish({ dishes, photos, countMealsUsingDish: async () => 1 }, 'd-1');

    expect(result).toEqual({ kind: 'archived' });
    expect(await dishes.get('d-1')).toMatchObject({ archived: true, photo });
    expect(photos.ids()).toEqual([photo.id]);
    expect(selectLibrary(await dishes.list())).toEqual([]);
  });
});
