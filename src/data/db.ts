import Dexie, { type DexieOptions, type Table } from 'dexie';
import type { DaySlots, Dish, Meal, Product, Settings } from '../domain/types';

/** `nameKey` is derived by the repository from `name`, never accepted from callers. */
export type StoredProduct = Product & { nameKey: string };

/** The single settings record. Read through `readSettings`, which fills in defaults. */
export type StoredSettings = Settings & { id: 'app' };

export class PlannerDb extends Dexie {
  // `declare` keeps class-field semantics from overwriting the tables Dexie creates.
  declare products: Table<StoredProduct, string>;
  declare dishes: Table<Dish, string>;
  declare meals: Table<Meal, string>;
  declare daySlots: Table<DaySlots, string>;
  declare settings: Table<StoredSettings, string>;

  constructor(name: string, dexieOptions?: DexieOptions) {
    super(name, dexieOptions);
    this.version(1).stores({
      products: 'id, &nameKey',
      dishes: 'id',
    });
    // Version 2 only adds tables (feature 002), so no upgrade function is needed.
    this.version(2).stores({
      meals: 'id, date, dishId',
      daySlots: 'date',
      settings: 'id',
    });
  }
}

export function createDb(name = 'planner', dexieOptions?: DexieOptions): PlannerDb {
  return new PlannerDb(name, dexieOptions);
}
