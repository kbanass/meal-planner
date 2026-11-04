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
  };
}
