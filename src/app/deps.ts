import { cryptoIdGenerator } from '../adapters/crypto-id-generator';
import { createDb, type PlannerDb } from '../data/db';
import { createDishRepository, type DishRepository } from '../data/dish-repository';
import { createProductRepository, type ProductRepository } from '../data/product-repository';
import type { IdGenerator } from '../domain/ports';

export interface Deps {
  db: PlannerDb;
  ids: IdGenerator;
  products: ProductRepository;
  dishes: DishRepository;
}

export function createDeps(): Deps {
  const db = createDb();
  const ids = cryptoIdGenerator;
  return {
    db,
    ids,
    products: createProductRepository(db, ids),
    dishes: createDishRepository(db),
  };
}
