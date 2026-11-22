import { beforeEach, describe, expect, it } from 'vitest';
import type { PlannerDb } from '../../src/data/db';
import { createShoppingRepository, type ShoppingRepository } from '../../src/data/shopping-repository';
import { FixedIdGenerator } from '../fakes/fixed-id-generator';
import { createTestDb } from '../fakes/test-db';

const WEEK = '2026-11-02';
const NEXT_WEEK = '2026-11-09';

let db: PlannerDb;
let shopping: ShoppingRepository;

beforeEach(() => {
  db = createTestDb();
  shopping = createShoppingRepository(db, new FixedIdGenerator());
});

describe('ShoppingRepository product states', () => {
  it('keeps no record after a tick and an untick', async () => {
    await shopping.updateProductState(WEEK, 'p1', { ticked: true });
    expect(await shopping.listProductStates(WEEK)).toEqual([
      { weekStart: WEEK, productId: 'p1', ticked: true, atHome: false, adjustment: null },
    ]);
    await shopping.updateProductState(WEEK, 'p1', { ticked: false });
    expect(await db.productListStates.count()).toBe(0);
  });

  it('holds a tick and At Home in one record, and keeps the tick when At Home is cleared', async () => {
    await shopping.updateProductState(WEEK, 'p1', { ticked: true });
    await shopping.updateProductState(WEEK, 'p1', { atHome: true });
    expect(await shopping.listProductStates(WEEK)).toEqual([
      { weekStart: WEEK, productId: 'p1', ticked: true, atHome: true, adjustment: null },
    ]);
    await shopping.updateProductState(WEEK, 'p1', { atHome: false });
    expect(await shopping.listProductStates(WEEK)).toEqual([
      { weekStart: WEEK, productId: 'p1', ticked: true, atHome: false, adjustment: null },
    ]);
  });

  it('stores an Adjustment and deletes an Adjustment-only record when it is cleared', async () => {
    await shopping.updateProductState(WEEK, 'p1', { adjustment: { amount: 500, plannedAmount: 400 } });
    expect(await shopping.listProductStates(WEEK)).toEqual([
      { weekStart: WEEK, productId: 'p1', ticked: false, atHome: false, adjustment: { amount: 500, plannedAmount: 400 } },
    ]);
    await shopping.updateProductState(WEEK, 'p1', { adjustment: null });
    expect(await db.productListStates.count()).toBe(0);
  });

  it('lists only the asked Week', async () => {
    await shopping.updateProductState(WEEK, 'p1', { ticked: true });
    await shopping.addExtra(WEEK, 'kawa');
    expect(await shopping.listProductStates(NEXT_WEEK)).toEqual([]);
    expect(await shopping.listExtras(NEXT_WEEK)).toEqual([]);
  });
});

describe('ShoppingRepository Extras', () => {
  it('stores the normalised text, unticked', async () => {
    const extra = await shopping.addExtra(WEEK, '  kawa ');
    expect(extra).toEqual({ id: '00000000-0000-4000-8000-000000000001', weekStart: WEEK, text: 'kawa', ticked: false });
    expect(await shopping.listExtras(WEEK)).toEqual([extra]);
  });

  it('stores two Extras with the same text as two records', async () => {
    const first = await shopping.addExtra(WEEK, 'kawa');
    const second = await shopping.addExtra(WEEK, 'kawa');
    expect(first?.id).not.toBe(second?.id);
    expect(await db.extras.count()).toBe(2);
  });

  it('stores nothing for blank text', async () => {
    expect(await shopping.addExtra(WEEK, '  ')).toBeNull();
    expect(await db.extras.count()).toBe(0);
  });

  it('ticks and deletes, and ignores a missing id', async () => {
    const extra = await shopping.addExtra(WEEK, 'kawa');
    await shopping.setExtraTicked(extra!.id, true);
    expect((await db.extras.get(extra!.id))?.ticked).toBe(true);
    await shopping.deleteExtra(extra!.id);
    expect(await db.extras.count()).toBe(0);
    await expect(shopping.setExtraTicked('missing', true)).resolves.toBeUndefined();
    await expect(shopping.deleteExtra('missing')).resolves.toBeUndefined();
    expect(await db.extras.count()).toBe(0);
  });
});
