import { normalizeName } from '../domain/names';
import type { IdGenerator } from '../domain/ports';
import { applyStatePatch, type StatePatch } from '../domain/shopping';
import type { Extra, IsoDate, ProductListState } from '../domain/types';
import type { PlannerDb } from './db';

export interface ShoppingRepository {
  listProductStates(weekStart: IsoDate): Promise<ProductListState[]>;
  listExtras(weekStart: IsoDate): Promise<Extra[]>;
  /** Tick, At Home or Adjustment for one Product in one Week (FR-013, FR-016, FR-018). */
  updateProductState(weekStart: IsoDate, productId: string, patch: StatePatch): Promise<void>;
  /** null when the text normalises to '' (FR-022). */
  addExtra(weekStart: IsoDate, text: string): Promise<Extra | null>;
  /** No-op when the Extra is missing (deleted in another tab). */
  setExtraTicked(id: string, ticked: boolean): Promise<void>;
  /** No-op when the Extra is missing. */
  deleteExtra(id: string): Promise<void>;
}

export function createShoppingRepository(db: PlannerDb, ids: IdGenerator): ShoppingRepository {
  return {
    listProductStates: (weekStart) => db.productListStates.where('weekStart').equals(weekStart).toArray(),
    listExtras: (weekStart) => db.extras.where('weekStart').equals(weekStart).toArray(),

    updateProductState(weekStart, productId, patch) {
      return db.transaction('rw', db.productListStates, async () => {
        const key: [IsoDate, string] = [weekStart, productId];
        const next = applyStatePatch(await db.productListStates.get(key), { weekStart, productId }, patch);
        if (next) await db.productListStates.put(next);
        else await db.productListStates.delete(key);
      });
    },

    async addExtra(weekStart, text) {
      const normalized = normalizeName(text);
      if (normalized === '') return null;
      const extra: Extra = { id: ids.next(), weekStart, text: normalized, ticked: false };
      await db.extras.add(extra);
      return extra;
    },

    async setExtraTicked(id, ticked) {
      await db.extras.update(id, { ticked });
    },

    async deleteExtra(id) {
      await db.extras.delete(id);
    },
  };
}
