import { beforeEach, describe, expect, it } from 'vitest';
import type { PlannerDb } from '../../src/data/db';
import { createWeekRepository, type WeekRepository } from '../../src/data/week-repository';
import type { Meal } from '../../src/domain/types';
import { FixedIdGenerator } from '../fakes/fixed-id-generator';
import { createTestDb } from '../fakes/test-db';

let db: PlannerDb;
let week: WeekRepository;

beforeEach(() => {
  db = createTestDb();
  week = createWeekRepository(db, new FixedIdGenerator());
});

const range = { start: '2026-11-02', end: '2026-11-08' };

function meal(id: string, date: string, overrides: Partial<Meal> = {}): Meal {
  return { id, date, slot: 1, position: 0, dishId: 'd-1', servings: 1, detached: null, ...overrides };
}

describe('WeekRepository', () => {
  it('lists the Meals and DaySlots of a date range, both ends included', async () => {
    await db.meals.bulkAdd([
      meal('m-before', '2026-11-01'),
      meal('m-mon', '2026-11-02'),
      meal('m-sun', '2026-11-08'),
      meal('m-after', '2026-11-09'),
    ]);
    await db.daySlots.bulkAdd([
      { date: '2026-11-01', slotCount: 5 },
      { date: '2026-11-08', slotCount: 6 },
    ]);

    const meals = await week.listMeals(range);
    expect(meals.map((m) => m.id).sort()).toEqual(['m-mon', 'm-sun']);
    expect(await week.listDaySlots(range)).toEqual([{ date: '2026-11-08', slotCount: 6 }]);
  });

  it('adds Linked Meals with 1 Serving, in order within their Slot', async () => {
    const first = await week.addMeal({ date: '2026-11-05', slot: 2, dishId: 'd-1' });
    const second = await week.addMeal({ date: '2026-11-05', slot: 2, dishId: 'd-2' });
    const third = await week.addMeal({ date: '2026-11-05', slot: 2, dishId: 'd-1' });
    const other = await week.addMeal({ date: '2026-11-05', slot: 3, dishId: 'd-1' });
    const otherDay = await week.addMeal({ date: '2026-11-06', slot: 2, dishId: 'd-1' });

    expect([first, second, third].map((m) => m.position)).toEqual([0, 1, 2]);
    expect(other.position).toBe(0);
    expect(otherDay.position).toBe(0);
    expect(first).toEqual({
      id: '00000000-0000-4000-8000-000000000001',
      date: '2026-11-05',
      slot: 2,
      position: 0,
      dishId: 'd-1',
      servings: 1,
      detached: null,
    });
    expect(await week.getMeal(first.id)).toEqual(first);
  });

  it('replaces and removes a Meal', async () => {
    const added = await week.addMeal({ date: '2026-11-05', slot: 1, dishId: 'd-1' });

    await week.putMeal({ ...added, servings: 1.5 });
    expect((await week.getMeal(added.id))?.servings).toBe(1.5);

    await week.removeMeal(added.id);
    expect(await week.getMeal(added.id)).toBeUndefined();
  });
});

describe('listAllDetachedIngredientLists', () => {
  const copy = (amount: number) => ({
    name: 'Owsianka',
    servingsYield: 2,
    ingredients: [{ productId: 'p-1', amount }],
    macros: { kcal: 700, protein: 25, fat: 15, carbs: 110 },
  });

  it('returns the own Ingredients of every Detached Meal, in all Weeks', async () => {
    await db.meals.bulkAdd([
      meal('m-linked', '2026-11-02'),
      meal('m-detached-1', '2026-11-03', { detached: copy(80) }),
      meal('m-detached-2', '2027-05-10', { detached: copy(120) }),
    ]);

    const lists = await week.listAllDetachedIngredientLists();

    expect(lists).toHaveLength(2);
    expect(lists).toEqual(
      expect.arrayContaining([[{ productId: 'p-1', amount: 80 }], [{ productId: 'p-1', amount: 120 }]]),
    );
  });

  it('returns [] when no Meal is detached', async () => {
    await db.meals.add(meal('m-linked', '2026-11-02'));

    expect(await week.listAllDetachedIngredientLists()).toEqual([]);
  });
});

describe('setDaySlotCount', () => {
  it('stores and then replaces the Slot count a day was raised to', async () => {
    await week.setDaySlotCount('2026-11-07', 5);
    await week.setDaySlotCount('2026-11-07', 6);

    expect(await week.listDaySlots(range)).toEqual([{ date: '2026-11-07', slotCount: 6 }]);
  });
});

describe('replaceWeek', () => {
  const nextWeek = { start: '2026-11-09', end: '2026-11-15' };

  beforeEach(async () => {
    await db.meals.bulkAdd([
      meal('m-sunday-before', '2026-11-08'),
      meal('m-old-1', '2026-11-09'),
      meal('m-old-2', '2026-11-15'),
      meal('m-after', '2026-11-16'),
    ]);
    await db.daySlots.bulkAdd([
      { date: '2026-11-10', slotCount: 7 },
      { date: '2026-11-16', slotCount: 5 },
    ]);
  });

  it('replaces the Meals and Added Slots of that Week only', async () => {
    await week.replaceWeek('2026-11-09', {
      meals: [meal('m-new', '2026-11-11')],
      daySlots: [{ date: '2026-11-14', slotCount: 5 }],
    });

    expect((await week.listMeals(nextWeek)).map((m) => m.id)).toEqual(['m-new']);
    expect(await week.listDaySlots(nextWeek)).toEqual([{ date: '2026-11-14', slotCount: 5 }]);
    expect(await db.meals.get('m-sunday-before')).toBeDefined();
    expect(await db.meals.get('m-after')).toBeDefined();
    expect(await db.daySlots.get('2026-11-16')).toBeDefined();
  });

  it('changes nothing when a write fails (FR-038)', async () => {
    const before = { meals: await week.listMeals(nextWeek), daySlots: await week.listDaySlots(nextWeek) };

    await expect(
      week.replaceWeek('2026-11-09', {
        meals: [meal('m-dup', '2026-11-11'), meal('m-dup', '2026-11-12')],
        daySlots: [],
      }),
    ).rejects.toThrow();

    expect(await week.listMeals(nextWeek)).toEqual(before.meals);
    expect(await week.listDaySlots(nextWeek)).toEqual(before.daySlots);
  });
});
