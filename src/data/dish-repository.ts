import { decideDishRemoval } from '../domain/dishes';
import type { Dish, DishPhotoRef } from '../domain/types';
import type { PlannerDb } from './db';

export interface DishRepository {
  /** All Dishes, including archived ones. */
  list(): Promise<Dish[]>;
  get(id: string): Promise<Dish | undefined>;
  /** Creates or replaces. */
  put(dish: Dish): Promise<void>;
  archive(id: string): Promise<void>;
  deletePermanently(id: string): Promise<void>;
  /**
   * Deletes the Dish if no Meal uses it, otherwise archives it, in one transaction so a Meal
   * added meanwhile cannot end up pointing at a deleted Dish (research R10).
   */
  removeOrArchive(
    id: string,
  ): Promise<{ kind: 'deleted'; photo: DishPhotoRef | null } | { kind: 'archived' }>;
}

export function createDishRepository(db: PlannerDb): DishRepository {
  return {
    list: () => db.dishes.toArray(),
    get: (id) => db.dishes.get(id),
    async put(dish) {
      await db.dishes.put(dish);
    },
    async archive(id) {
      await db.dishes.update(id, { archived: true });
    },
    deletePermanently: (id) => db.dishes.delete(id),
    removeOrArchive(id) {
      return db.transaction('rw', db.dishes, db.meals, async () => {
        const mealCount = await db.meals.where('dishId').equals(id).count();
        if (decideDishRemoval(mealCount) === 'archive') {
          await db.dishes.update(id, { archived: true });
          return { kind: 'archived' } as const;
        }
        const photo = (await db.dishes.get(id))?.photo ?? null;
        await db.dishes.delete(id);
        return { kind: 'deleted', photo } as const;
      });
    },
  };
}
