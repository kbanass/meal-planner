import type { DishRepository } from '../data/dish-repository';
import {
  PhotoDecodeError,
  PhotoQuotaError,
  type ImageCompressor,
  type PhotoStore,
} from '../data/ports';
import {
  validateDishDraft,
  type DishDraft,
  type DishFieldErrors,
} from '../domain/dishes';
import type { IdGenerator } from '../domain/ports';
import type { Dish, DishPhotoRef, Product } from '../domain/types';

/** Longest edge of a stored Dish photo, in pixels (SC-007). */
const PHOTO_MAX_EDGE = 800;

export type PhotoChange = { kind: 'keep' } | { kind: 'remove' } | { kind: 'set'; file: Blob };

export type PhotoError = 'decode' | 'quota';

export type SaveDishResult =
  | { kind: 'saved'; id: string; photoError?: PhotoError }
  | { kind: 'invalid'; errors: DishFieldErrors };

async function storePhoto(
  deps: { photos: PhotoStore; compressor: ImageCompressor; ids: IdGenerator },
  file: Blob,
): Promise<{ ref: DishPhotoRef } | { error: PhotoError }> {
  try {
    const { blob, mimeType } = await deps.compressor.compress(file, PHOTO_MAX_EDGE);
    const ref: DishPhotoRef = { id: deps.ids.next(), mimeType };
    await deps.photos.write(ref, blob);
    return { ref };
  } catch (error) {
    if (error instanceof PhotoDecodeError) return { error: 'decode' };
    if (error instanceof PhotoQuotaError) return { error: 'quota' };
    throw error;
  }
}

/**
 * Order of operations (contracts/persistence-and-ports.md): validate, write the new photo,
 * put the Dish, then delete the old photo. IndexedDB and OPFS share no transaction, so a
 * crash in between leaves at most an orphan file, which the startup sweep removes.
 */
export async function saveDish(
  deps: {
    dishes: DishRepository;
    photos: PhotoStore;
    compressor: ImageCompressor;
    ids: IdGenerator;
  },
  input: {
    id?: string;
    draft: DishDraft;
    productsById: ReadonlyMap<string, Product>;
    photoChange: PhotoChange;
  },
): Promise<SaveDishResult> {
  const validation = validateDishDraft(input.draft, input.productsById);
  if (!validation.ok) return { kind: 'invalid', errors: validation.errors };

  const stored = input.id === undefined ? undefined : await deps.dishes.get(input.id);
  const oldPhoto = stored?.photo ?? null;
  let photo = oldPhoto;
  let photoError: PhotoError | undefined;
  if (input.photoChange.kind === 'remove') {
    photo = null;
  } else if (input.photoChange.kind === 'set') {
    const result = await storePhoto(deps, input.photoChange.file);
    if ('ref' in result) photo = result.ref;
    else photoError = result.error;
  }

  const dish: Dish = {
    id: input.id ?? deps.ids.next(),
    ...validation.value,
    photo,
    archived: stored?.archived ?? false,
  };
  await deps.dishes.put(dish);

  if (oldPhoto && oldPhoto.id !== photo?.id) {
    await deps.photos.delete(oldPhoto).catch(() => {});
  }
  return photoError ? { kind: 'saved', id: dish.id, photoError } : { kind: 'saved', id: dish.id };
}

/**
 * Deletes a Dish that no Meal uses, together with its photo. A Dish that Meals use is archived
 * instead, keeping its record and photo (FR-034, FR-035 of feature 001).
 */
export async function deleteDish(
  deps: { dishes: DishRepository; photos: PhotoStore },
  dishId: string,
): Promise<{ kind: 'deleted' } | { kind: 'archived' }> {
  const result = await deps.dishes.removeOrArchive(dishId);
  if (result.kind === 'archived') return result;
  // After the record is gone; a failure only leaves an orphan for the startup sweep.
  if (result.photo) await deps.photos.delete(result.photo).catch(() => {});
  return { kind: 'deleted' };
}
