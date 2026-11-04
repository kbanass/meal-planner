import type { Dish } from '../domain/types';
import type { PlannerDb } from './db';

export interface DishRepository {
  /** All Dishes, including archived ones. */
  list(): Promise<Dish[]>;
  get(id: string): Promise<Dish | undefined>;
  /** Creates or replaces. */
  put(dish: Dish): Promise<void>;
  archive(id: string): Promise<void>;
  deletePermanently(id: string): Promise<void>;
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
  };
}
