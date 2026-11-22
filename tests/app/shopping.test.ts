import { beforeEach, describe, expect, it } from 'vitest';
import { addExtra, saveAdjustment } from '../../src/app/shopping';
import type { PlannerDb } from '../../src/data/db';
import { createShoppingRepository, type ShoppingRepository } from '../../src/data/shopping-repository';
import { FixedIdGenerator } from '../fakes/fixed-id-generator';
import { createTestDb } from '../fakes/test-db';

const WEEK = '2026-11-02';

let db: PlannerDb;
let shopping: ShoppingRepository;

beforeEach(() => {
  db = createTestDb();
  shopping = createShoppingRepository(db, new FixedIdGenerator());
});

function save(text: string, filledText = '400') {
  return saveAdjustment({ shopping }, { weekStart: WEEK, productId: 'p-ryz', text, filledText, planned: 400 });
}

describe('saveAdjustment', () => {
  it('stores a typed amount with the Planned amount (US4-2)', async () => {
    expect(await save('500')).toEqual({ kind: 'saved' });
    expect(await shopping.listProductStates(WEEK)).toEqual([
      { weekStart: WEEK, productId: 'p-ryz', ticked: false, atHome: false, adjustment: { amount: 500, plannedAmount: 400 } },
    ]);
  });

  it('writes nothing when the filled value is saved', async () => {
    await shopping.updateProductState(WEEK, 'p-ryz', { ticked: true });
    const before = await shopping.listProductStates(WEEK);

    expect(await save('400')).toEqual({ kind: 'unchanged' });
    expect(await shopping.listProductStates(WEEK)).toEqual(before);
  });

  it('clears the Adjustment on empty text and keeps At Home', async () => {
    await shopping.updateProductState(WEEK, 'p-ryz', { atHome: true, adjustment: { amount: 500, plannedAmount: 400 } });

    expect(await save('', '500')).toEqual({ kind: 'cleared' });
    expect(await shopping.listProductStates(WEEK)).toEqual([
      { weekStart: WEEK, productId: 'p-ryz', ticked: false, atHome: true, adjustment: null },
    ]);
  });

  it('writes nothing for text that is not a number', async () => {
    expect(await save('abc')).toEqual({ kind: 'invalid' });
    expect(await db.productListStates.count()).toBe(0);
  });
});

describe('addExtra', () => {
  it('stores the normalised text', async () => {
    expect(await addExtra({ shopping }, WEEK, ' papier  toaletowy ')).toBe('added');
    expect((await shopping.listExtras(WEEK)).map((e) => e.text)).toEqual(['papier toaletowy']);
  });

  it('adds nothing for blank text', async () => {
    expect(await addExtra({ shopping }, WEEK, '  ')).toBe('empty');
    expect(await db.extras.count()).toBe(0);
  });
});
