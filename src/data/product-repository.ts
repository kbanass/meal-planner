import { nameKey, normalizeName } from '../domain/names';
import type { IdGenerator } from '../domain/ports';
import {
  canMerge,
  countProductUsage,
  findNameConflict,
  mergeIngredients,
  productActions,
  validateProductName,
} from '../domain/products';
import type { Product, Unit } from '../domain/types';
import { isUnit } from '../domain/units';
import type { PlannerDb, StoredProduct } from './db';

export type CreateProductResult =
  | { kind: 'created'; product: Product }
  | { kind: 'exists'; product: Product }
  | { kind: 'invalid' };

export type ChangeUnitResult =
  | { kind: 'changed' }
  | { kind: 'inUse'; usage: number }
  | { kind: 'invalid' };

export type RenameProductResult =
  | { kind: 'renamed' }
  | { kind: 'invalid' }
  | { kind: 'conflict'; existing: Product; mergeAllowed: boolean };

export type MergeProductsResult =
  | { kind: 'merged'; dishesUpdated: number }
  | { kind: 'unitMismatch' }
  | { kind: 'sameProduct' };

export interface ProductRepository {
  list(): Promise<Product[]>;
  createFromName(name: string, unit: Unit): Promise<CreateProductResult>;
  rename(id: string, newName: string): Promise<RenameProductResult>;
  changeUnit(id: string, unit: Unit): Promise<ChangeUnitResult>;
  delete(id: string): Promise<{ kind: 'deleted' } | { kind: 'inUse'; usage: number }>;
  merge(fromId: string, intoId: string): Promise<MergeProductsResult>;
}

function toProduct({ id, name, unit }: StoredProduct): Product {
  return { id, name, unit };
}

function isConstraintError(error: unknown): boolean {
  return error instanceof Error && error.name === 'ConstraintError';
}

export function createProductRepository(db: PlannerDb, ids: IdGenerator): ProductRepository {
  const findByKey = (key: string) => db.products.where('nameKey').equals(key).first();

  async function getProduct(id: string): Promise<Product> {
    const stored = await db.products.get(id);
    if (!stored) throw new Error(`Product ${id} does not exist.`);
    return toProduct(stored);
  }

  /** Usage read inside the caller's transaction, so the check and the write cannot race. */
  async function usageOf(id: string): Promise<number> {
    // TODO(week-planning): pass Detached Meal Ingredient lists instead of [] once Meals
    // exist (specs/001-shell-products-dishes/research.md R13).
    return countProductUsage(await db.dishes.toArray(), []).get(id) ?? 0;
  }

  function conflictWith(self: Product, existing: Product): RenameProductResult {
    return { kind: 'conflict', existing, mergeAllowed: canMerge(self, existing) };
  }

  return {
    async list() {
      return (await db.products.toArray()).map(toProduct);
    },

    async createFromName(name, unit) {
      // The type alone does not stop an unknown unit arriving from untyped data.
      if (validateProductName(name) !== null || !isUnit(unit)) return { kind: 'invalid' };
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

    async rename(id, newName) {
      if (validateProductName(newName) !== null) return { kind: 'invalid' };
      try {
        return await db.transaction('rw', db.products, async (): Promise<RenameProductResult> => {
          const products = (await db.products.toArray()).map(toProduct);
          const self = await getProduct(id);
          const existing = findNameConflict(products, newName, id);
          if (existing) return conflictWith(self, existing);
          await db.products.update(id, { name: normalizeName(newName), nameKey: nameKey(newName) });
          return { kind: 'renamed' };
        });
      } catch (error) {
        const existing = isConstraintError(error) ? await findByKey(nameKey(newName)) : undefined;
        if (existing) return conflictWith(await getProduct(id), toProduct(existing));
        throw error;
      }
    },

    async changeUnit(id, unit) {
      if (!isUnit(unit)) return { kind: 'invalid' };
      return db.transaction('rw', db.products, db.dishes, async () => {
        const usage = await usageOf(id);
        if (!productActions(usage).canChangeUnit) return { kind: 'inUse', usage } as const;
        await db.products.update(id, { unit });
        return { kind: 'changed' } as const;
      });
    },

    delete(id) {
      return db.transaction('rw', db.products, db.dishes, async () => {
        const usage = await usageOf(id);
        if (!productActions(usage).canDelete) return { kind: 'inUse', usage } as const;
        await db.products.delete(id);
        return { kind: 'deleted' } as const;
      });
    },

    async merge(fromId, intoId) {
      if (fromId === intoId) return { kind: 'sameProduct' };
      return db.transaction('rw', db.products, db.dishes, async (): Promise<MergeProductsResult> => {
        const [from, into] = [await getProduct(fromId), await getProduct(intoId)];
        // Rechecked here: the units may have changed since the UI offered the merge.
        if (!canMerge(from, into)) return { kind: 'unitMismatch' };
        const affected = (await db.dishes.toArray()).filter((dish) =>
          dish.ingredients.some((ingredient) => ingredient.productId === fromId),
        );
        for (const dish of affected) {
          await db.dishes.put({ ...dish, ingredients: mergeIngredients(dish.ingredients, fromId, intoId) });
        }
        await db.products.delete(fromId);
        return { kind: 'merged', dishesUpdated: affected.length };
      });
    },
  };
}
