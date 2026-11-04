import { describe, expect, it } from 'vitest';
import { sweepOrphanPhotos } from '../../src/app/photos';
import { createDishRepository } from '../../src/data/dish-repository';
import type { Dish } from '../../src/domain/types';
import { InMemoryPhotoStore } from '../fakes/in-memory-photo-store';
import { createTestDb } from '../fakes/test-db';

function dish(id: string, photoId: string, archived: boolean): Dish {
  return {
    id,
    name: id,
    servingsYield: 1,
    ingredients: [],
    macros: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
    notes: '',
    photo: { id: photoId, mimeType: 'image/webp' },
    archived,
  };
}

describe('sweepOrphanPhotos', () => {
  it('deletes only files that no Dish references, archived Dishes included', async () => {
    const dishes = createDishRepository(createTestDb());
    const photos = new InMemoryPhotoStore();
    for (const id of ['a', 'b', 'c']) await photos.write({ id, mimeType: 'image/webp' }, new Blob([id]));
    await dishes.put(dish('d-active', 'a', false));
    await dishes.put(dish('d-archived', 'b', true));

    const deleted = await sweepOrphanPhotos({ dishes, photos });

    expect(deleted).toBe(1);
    expect(photos.ids().sort()).toEqual(['a', 'b']);
  });
});
