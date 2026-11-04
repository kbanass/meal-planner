import { createCanvasImageCompressor } from '../adapters/canvas-image-compressor';
import { cryptoIdGenerator } from '../adapters/crypto-id-generator';
import { createOpfsPhotoStore } from '../adapters/opfs-photo-store';
import { createDb, type PlannerDb } from '../data/db';
import { createDishRepository, type DishRepository } from '../data/dish-repository';
import type { ImageCompressor, PhotoStore } from '../data/ports';
import { createProductRepository, type ProductRepository } from '../data/product-repository';
import type { IdGenerator } from '../domain/ports';

export interface Deps {
  db: PlannerDb;
  ids: IdGenerator;
  products: ProductRepository;
  dishes: DishRepository;
  photos: PhotoStore;
  compressor: ImageCompressor;
  countMealsUsingDish: (dishId: string) => Promise<number>;
}

export function createDeps(): Deps {
  const db = createDb();
  const ids = cryptoIdGenerator;
  return {
    db,
    ids,
    products: createProductRepository(db, ids),
    dishes: createDishRepository(db),
    photos: createOpfsPhotoStore(),
    compressor: createCanvasImageCompressor(),
    // No Meals exist until the Week planning feature; see
    // specs/001-shell-products-dishes/research.md R13
    countMealsUsingDish: async () => 0,
  };
}
