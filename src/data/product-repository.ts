import { nameKey, normalizeName } from '../domain/names';
import type { IdGenerator } from '../domain/ports';
import { validateProductName } from '../domain/products';
import type { Product, Unit } from '../domain/types';
import type { PlannerDb, StoredProduct } from './db';

export type CreateProductResult =
  | { kind: 'created'; product: Product }
  | { kind: 'exists'; product: Product }
  | { kind: 'invalid' };

export interface ProductRepository {
  list(): Promise<Product[]>;
  createFromName(name: string, unit: Unit): Promise<CreateProductResult>;
}

function toProduct({ id, name, unit }: StoredProduct): Product {
  return { id, name, unit };
}

function isConstraintError(error: unknown): boolean {
  return error instanceof Error && error.name === 'ConstraintError';
}

export function createProductRepository(db: PlannerDb, ids: IdGenerator): ProductRepository {
  const findByKey = (key: string) => db.products.where('nameKey').equals(key).first();

  return {
    async list() {
      return (await db.products.toArray()).map(toProduct);
    },

    async createFromName(name, unit) {
      if (validateProductName(name) !== null) return { kind: 'invalid' };
      const key = nameKey(name);
      try {
        return await db.transaction('rw', db.products, async (): Promise<CreateProductResult> => {
          const existing = await findByKey(key);
          if (existing) return { kind: 'exists', product: toProduct(existing) };
          const product: Product = { id: ids.next(), name: normalizeName(name), unit };
          await db.products.add({ ...product, nameKey: key });
          return { kind: 'created', product };
        });
      } catch (error) {
        // The unique index is the storage-level backstop for FR-013.
        const existing = isConstraintError(error) ? await findByKey(key) : undefined;
        if (existing) return { kind: 'exists', product: toProduct(existing) };
        throw error;
      }
    },
  };
}
