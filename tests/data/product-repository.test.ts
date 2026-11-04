import { beforeEach, describe, expect, it } from 'vitest';
import type { PlannerDb } from '../../src/data/db';
import { createProductRepository, type ProductRepository } from '../../src/data/product-repository';
import type { Unit } from '../../src/domain/types';
import { FixedIdGenerator } from '../fakes/fixed-id-generator';
import { createTestDb } from '../fakes/test-db';

let db: PlannerDb;
let repo: ProductRepository;

beforeEach(() => {
  db = createTestDb();
  repo = createProductRepository(db, new FixedIdGenerator());
});

describe('createFromName', () => {
  it('creates a Product with a normalised name and a derived nameKey', async () => {
    const result = await repo.createFromName(' Mleko ', 'ml');

    const product = { id: '00000000-0000-4000-8000-000000000001', name: 'Mleko', unit: 'ml' };
    expect(result).toEqual({ kind: 'created', product });
    expect(await db.products.get(product.id)).toEqual({ ...product, nameKey: 'mleko' });
  });

  it('returns the existing Product for the same name in another case', async () => {
    const first = await repo.createFromName(' Mleko ', 'ml');

    const second = await repo.createFromName('MLEKO', 'g');

    expect(first.kind).toBe('created');
    expect(second).toEqual({ kind: 'exists', product: first.kind === 'created' && first.product });
    expect(await db.products.count()).toBe(1);
  });

  it('rejects a blank name', async () => {
    expect(await repo.createFromName('  ', 'g')).toEqual({ kind: 'invalid' });
    expect(await db.products.count()).toBe(0);
  });

  it('rejects a value that is not a Unit', async () => {
    expect(await repo.createFromName('mleko', 'kg' as Unit)).toEqual({ kind: 'invalid' });
    expect(await db.products.count()).toBe(0);
  });
});

describe('list', () => {
  it('returns all Products without the nameKey field', async () => {
    await repo.createFromName('mleko', 'ml');
    await repo.createFromName('mąka', 'g');

    const products = await repo.list();

    expect(products).toHaveLength(2);
    expect(products).toEqual(
      expect.arrayContaining([
        { id: '00000000-0000-4000-8000-000000000001', name: 'mleko', unit: 'ml' },
        { id: '00000000-0000-4000-8000-000000000002', name: 'mąka', unit: 'g' },
      ]),
    );
    products.forEach((product) => expect(product).not.toHaveProperty('nameKey'));
  });
});
