import type { DishRepository } from '../data/dish-repository';
import type { PhotoStore } from '../data/ports';

/** Deletes photo files that no Dish (archived ones included) references. Returns the count. */
export async function sweepOrphanPhotos(deps: {
  dishes: DishRepository;
  photos: PhotoStore;
}): Promise<number> {
  const referenced = new Set(
    (await deps.dishes.list()).flatMap((dish) => (dish.photo ? [dish.photo.id] : [])),
  );
  const orphans = (await deps.photos.listIds()).filter((id) => !referenced.has(id));
  for (const id of orphans) {
    // listIds drops the file type, so delete under both possible types.
    await deps.photos.delete({ id, mimeType: 'image/webp' });
    await deps.photos.delete({ id, mimeType: 'image/jpeg' });
  }
  return orphans.length;
}
