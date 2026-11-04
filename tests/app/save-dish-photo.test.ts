import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveDish } from '../../src/app/dishes';
import { createDishRepository, type DishRepository } from '../../src/data/dish-repository';
import { PhotoDecodeError, PhotoQuotaError } from '../../src/data/ports';
import type { DishDraft } from '../../src/domain/dishes';
import type { Dish } from '../../src/domain/types';
import { FakeImageCompressor } from '../fakes/fake-image-compressor';
import { FixedIdGenerator } from '../fakes/fixed-id-generator';
import { InMemoryPhotoStore } from '../fakes/in-memory-photo-store';
import { createTestDb } from '../fakes/test-db';

const draft: DishDraft = {
  name: 'Sałatka',
  servingsYield: '1',
  ingredients: [],
  macros: { kcal: '100', protein: '1', fat: '1', carbs: '1' },
  notes: '',
};
const file = new Blob(['original'], { type: 'image/jpeg' });
const oldPhoto = { id: 'photo-old', mimeType: 'image/jpeg' } as const;
const stored: Dish = {
  id: 'd-1',
  name: 'Stara sałatka',
  servingsYield: 1,
  ingredients: [],
  macros: { kcal: 1, protein: 1, fat: 1, carbs: 1 },
  notes: '',
  photo: oldPhoto,
  archived: false,
};

let dishes: DishRepository;
let photos: InMemoryPhotoStore;
let compressor: FakeImageCompressor;
let ids: FixedIdGenerator;

beforeEach(() => {
  dishes = createDishRepository(createTestDb());
  photos = new InMemoryPhotoStore();
  compressor = new FakeImageCompressor();
  ids = new FixedIdGenerator();
});

async function storeWithPhoto() {
  await dishes.put(stored);
  await photos.write(oldPhoto, new Blob(['old']));
}

const productsById = new Map();

describe('saveDish with a photo change', () => {
  it('writes the compressed photo for a new Dish', async () => {
    const compress = vi.spyOn(compressor, 'compress');

    const result = await saveDish(
      { dishes, photos, compressor, ids },
      { draft, productsById, photoChange: { kind: 'set', file } },
    );

    expect(result.kind).toBe('saved');
    const saved = await dishes.get(result.kind === 'saved' ? result.id : '');
    expect(compress).toHaveBeenCalledWith(file, 800);
    expect(saved?.photo).toEqual({ id: expect.any(String), mimeType: 'image/webp' });
    expect(photos.ids()).toEqual([saved?.photo?.id]);
  });

  it('replaces a photo and then deletes the old file', async () => {
    await storeWithPhoto();

    await saveDish(
      { dishes, photos, compressor, ids },
      { id: 'd-1', draft, productsById, photoChange: { kind: 'set', file } },
    );

    const saved = await dishes.get('d-1');
    expect(saved?.photo?.id).not.toBe(oldPhoto.id);
    expect(photos.ids()).toEqual([saved?.photo?.id]);
  });

  it('removes the photo reference and the file', async () => {
    await storeWithPhoto();

    await saveDish(
      { dishes, photos, compressor, ids },
      { id: 'd-1', draft, productsById, photoChange: { kind: 'remove' } },
    );

    expect((await dishes.get('d-1'))?.photo).toBeNull();
    expect(photos.ids()).toEqual([]);
  });

  it('saves the other edits and keeps the old photo when decoding fails', async () => {
    await storeWithPhoto();
    compressor = new FakeImageCompressor(new PhotoDecodeError());

    const result = await saveDish(
      { dishes, photos, compressor, ids },
      { id: 'd-1', draft, productsById, photoChange: { kind: 'set', file } },
    );

    expect(result).toEqual({ kind: 'saved', id: 'd-1', photoError: 'decode' });
    expect(await dishes.get('d-1')).toMatchObject({ name: 'Sałatka', photo: oldPhoto });
    expect(photos.ids()).toEqual([oldPhoto.id]);
  });

  it('saves the other edits and keeps the old photo when storage is full', async () => {
    await storeWithPhoto();
    photos.failNextWriteWith = new PhotoQuotaError();

    const result = await saveDish(
      { dishes, photos, compressor, ids },
      { id: 'd-1', draft, productsById, photoChange: { kind: 'set', file } },
    );

    expect(result).toEqual({ kind: 'saved', id: 'd-1', photoError: 'quota' });
    expect(await dishes.get('d-1')).toMatchObject({ name: 'Sałatka', photo: oldPhoto });
    expect(photos.ids()).toEqual([oldPhoto.id]);
  });

  it('touches neither the compressor nor the store for an invalid draft', async () => {
    const compress = vi.spyOn(compressor, 'compress');
    const write = vi.spyOn(photos, 'write');

    const result = await saveDish(
      { dishes, photos, compressor, ids },
      { draft: { ...draft, name: '' }, productsById, photoChange: { kind: 'set', file } },
    );

    expect(result.kind).toBe('invalid');
    expect(compress).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });
});
