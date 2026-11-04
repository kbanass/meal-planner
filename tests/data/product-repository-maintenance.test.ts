import { beforeEach, describe, expect, it } from 'vitest';
import type { PlannerDb } from '../../src/data/db';
import { createDishRepository, type DishRepository } from '../../src/data/dish-repository';
import { createProductRepository, type ProductRepository } from '../../src/data/product-repository';
import { countProductUsage } from '../../src/domain/products';
import type { Dish, Ingredient, Product, Unit } from '../../src/domain/types';
import { FixedIdGenerator } from '../fakes/fixed-id-generator';
import { createTestDb } from '../fakes/test-db';

let db: PlannerDb;
let products: ProductRepository;
let dishes: DishRepository;

beforeEach(() => {
  db = createTestDb();
  products = createProductRepository(db, new FixedIdGenerator());
  dishes = createDishRepository(db);
});

async function product(name: string, unit: Unit = 'g'): Promise<Product> {
  const result = await products.createFromName(name, unit);
  if (result.kind !== 'created') throw new Error(`could not create ${name}`);
  return result.product;
}

async function dish(id: string, ingredients: Ingredient[], archived = false): Promise<void> {
  const value: Dish = {
    id,
    name: id,
    servingsYield: 1,
    ingredients,
    macros: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
    notes: '',
    photo: null,
    archived,
  };
  await dishes.put(value);
}

async function usageOf(productId: string): Promise<number> {
  return countProductUsage(await dishes.list(), []).get(productId) ?? 0;
}

describe('merge', () => {
  it('moves every Dish to the kept Product and deletes the merged one (US3-1)', async () => {
    const pomidor = await product('pomidor');
    const pomidory = await product('pomidory');
    await dish('d-1', [{ productId: pomidor.id, amount: 100 }]);
    await dish('d-2', [{ productId: pomidor.id, amount: 150 }]);
    await dish('d-3', [{ productId: pomidory.id, amount: 80 }]);

    const result = await products.merge(pomidory.id, pomidor.id);

    expect(result).toEqual({ kind: 'merged', dishesUpdated: 1 });
    expect((await products.list()).map((p) => p.name)).toEqual(['pomidor']);
    expect(await usageOf(pomidor.id)).toBe(3);
    expect((await dishes.get('d-3'))?.ingredients).toEqual([{ productId: pomidor.id, amount: 80 }]);
  });

  it('sums a Dish that had both Products (US3-2)', async () => {
    const pomidor = await product('pomidor');
    const pomidory = await product('pomidory');
    await dish('d-1', [
      { productId: pomidor.id, amount: 200 },
      { productId: pomidory.id, amount: 100 },
    ]);

    await products.merge(pomidory.id, pomidor.id);

    expect((await dishes.get('d-1'))?.ingredients).toEqual([{ productId: pomidor.id, amount: 300 }]);
  });

  it('refuses Products with different units (US3-3)', async () => {
    const jajka = await product('jajka', 'pcs');
    const jajko = await product('jajko', 'g');

    expect(await products.merge(jajka.id, jajko.id)).toEqual({ kind: 'unitMismatch' });
    expect(await products.list()).toHaveLength(2);
  });

  it('refuses to merge a Product into itself', async () => {
    const pomidor = await product('pomidor');

    expect(await products.merge(pomidor.id, pomidor.id)).toEqual({ kind: 'sameProduct' });
  });
});

describe('rename', () => {
  it('renames a Product, and Dishes show the new name through productId (US3-4)', async () => {
    const pomidr = await product('pomidr');
    await dish('d-1', [{ productId: pomidr.id, amount: 100 }]);
    await dish('d-2', [{ productId: pomidr.id, amount: 50 }]);

    expect(await products.rename(pomidr.id, ' pomidor ')).toEqual({ kind: 'renamed' });

    expect(await products.list()).toEqual([{ id: pomidr.id, name: 'pomidor', unit: 'g' }]);
    expect(await db.products.get(pomidr.id)).toMatchObject({ nameKey: 'pomidor' });
    expect(await usageOf(pomidr.id)).toBe(2);
  });

  it('rejects a name another Product has and offers a merge (US3-5)', async () => {
    const pomidor = await product('pomidor');
    const pomidory = await product('pomidory');

    expect(await products.rename(pomidory.id, 'Pomidor')).toEqual({
      kind: 'conflict',
      existing: pomidor,
      mergeAllowed: true,
    });
    expect((await products.list()).map((p) => p.name).sort()).toEqual(['pomidor', 'pomidory']);
  });

  it('does not offer a merge when the conflicting Product has another unit', async () => {
    const jajka = await product('jajka', 'pcs');
    const jajko = await product('jajko', 'g');

    expect(await products.rename(jajko.id, 'JAJKA')).toEqual({
      kind: 'conflict',
      existing: jajka,
      mergeAllowed: false,
    });
  });

  it('allows a case-only rename of the same Product', async () => {
    const mleko = await product('mleko', 'ml');

    expect(await products.rename(mleko.id, 'Mleko')).toEqual({ kind: 'renamed' });
    expect((await products.list())[0]?.name).toBe('Mleko');
  });

  it('rejects a blank name', async () => {
    const mleko = await product('mleko', 'ml');

    expect(await products.rename(mleko.id, '  ')).toEqual({ kind: 'invalid' });
  });
});

describe('delete and changeUnit', () => {
  it('refuses both for a Product used only by an Archived Dish', async () => {
    const pomidor = await product('pomidor');
    await dish('d-archived', [{ productId: pomidor.id, amount: 100 }], true);

    expect(await products.delete(pomidor.id)).toEqual({ kind: 'inUse', usage: 1 });
    expect(await products.changeUnit(pomidor.id, 'ml')).toEqual({ kind: 'inUse', usage: 1 });
    expect(await products.list()).toEqual([pomidor]);
  });

  it('deletes an unused Product (US3-7)', async () => {
    const pomidor = await product('pomidor');

    expect(await products.delete(pomidor.id)).toEqual({ kind: 'deleted' });
    expect(await products.list()).toEqual([]);
  });

  it('changes the unit of an unused Product (US3-8)', async () => {
    const pomidor = await product('pomidor');

    expect(await products.changeUnit(pomidor.id, 'ml')).toEqual({ kind: 'changed' });
    expect(await products.list()).toEqual([{ ...pomidor, unit: 'ml' }]);
  });

  it('rejects a value that is not a Unit', async () => {
    const pomidor = await product('pomidor');

    expect(await products.changeUnit(pomidor.id, 'kg' as Unit)).toEqual({ kind: 'invalid' });
    expect(await products.list()).toEqual([pomidor]);
  });
});
