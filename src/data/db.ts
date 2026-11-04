import Dexie, { type DexieOptions, type Table } from 'dexie';
import type { Dish, Product } from '../domain/types';

/** `nameKey` is derived by the repository from `name`, never accepted from callers. */
export type StoredProduct = Product & { nameKey: string };

export class PlannerDb extends Dexie {
  // `declare` keeps class-field semantics from overwriting the tables Dexie creates.
  declare products: Table<StoredProduct, string>;
  declare dishes: Table<Dish, string>;

  constructor(name: string, dexieOptions?: DexieOptions) {
    super(name, dexieOptions);
    this.version(1).stores({
      products: 'id, &nameKey',
      dishes: 'id',
    });
  }
}

export function createDb(name = 'planner', dexieOptions?: DexieOptions): PlannerDb {
  return new PlannerDb(name, dexieOptions);
}
