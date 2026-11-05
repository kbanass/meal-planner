import { createCanvasImageCompressor } from '../adapters/canvas-image-compressor';
import { cryptoIdGenerator } from '../adapters/crypto-id-generator';
import { createOpfsPhotoStore } from '../adapters/opfs-photo-store';
import { systemClock } from '../adapters/system-clock';
import { createDb, type PlannerDb } from '../data/db';
import { createDishRepository, type DishRepository } from '../data/dish-repository';
import type { ImageCompressor, PhotoStore } from '../data/ports';
import { createProductRepository, type ProductRepository } from '../data/product-repository';
import { createSettingsRepository, type SettingsRepository } from '../data/settings-repository';
import { createWeekRepository, type WeekRepository } from '../data/week-repository';
import type { Clock, IdGenerator } from '../domain/ports';

export interface Deps {
  db: PlannerDb;
  ids: IdGenerator;
  clock: Clock;
  products: ProductRepository;
  dishes: DishRepository;
  photos: PhotoStore;
  compressor: ImageCompressor;
  week: WeekRepository;
  settings: SettingsRepository;
}

export function createDeps(): Deps {
  const db = createDb();
  const ids = cryptoIdGenerator;
  return {
    db,
    ids,
    clock: systemClock,
    products: createProductRepository(db, ids),
    dishes: createDishRepository(db),
    photos: createOpfsPhotoStore(),
    compressor: createCanvasImageCompressor(),
    week: createWeekRepository(db, ids),
    settings: createSettingsRepository(db),
  };
}
