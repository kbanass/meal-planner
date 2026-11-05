import { beforeEach, describe, expect, it } from 'vitest';
import { copyWeekToNext, weekHasPlanAt } from '../../src/app/week';
import { createWeekRepository, type WeekRepository } from '../../src/data/week-repository';
import type { Meal } from '../../src/domain/types';
import { owsianka } from '../fakes/dishes';
import { FixedIdGenerator } from '../fakes/fixed-id-generator';
import { createTestDb } from '../fakes/test-db';

const thisWeek = { start: '2026-11-02', end: '2026-11-08' };
const nextWeek = { start: '2026-11-09', end: '2026-11-15' };
const leczo = { ...owsianka, name: 'Leczo po mojemu' };

let week: WeekRepository;
let ids: FixedIdGenerator;

beforeEach(async () => {
  ids = new FixedIdGenerator();
  week = createWeekRepository(createTestDb(), ids);
});

async function planThisWeek(): Promise<{ owsiankaMeal: Meal; leczoMeal: Meal }> {
  const added = await week.addMeal({ date: '2026-11-02', slot: 1, dishId: owsianka.id });
  const owsiankaMeal = { ...added, servings: 1.5 };
  await week.putMeal(owsiankaMeal);
  const leczoAdded = await week.addMeal({ date: '2026-11-06', slot: 3, dishId: 'd-leczo' });
  const leczoMeal = { ...leczoAdded, detached: leczo };
  await week.putMeal(leczoMeal);
  await week.setDaySlotCount('2026-11-07', 5);
  return { owsiankaMeal, leczoMeal };
}

function contents(meals: Meal[]) {
  return meals
    // Copies get new ids, so compare everything else.
    .map((meal) => ({ ...meal, id: '' }))
    .sort((a, b) => a.date.localeCompare(b.date, 'pl'));
}

describe('copyWeekToNext', () => {
  it('copies Meals with Servings and their linked or detached state, and Added Slots (US6-1, US6-2)', async () => {
    await planThisWeek();

    expect(await copyWeekToNext({ week, ids }, '2026-11-02')).toEqual({ kind: 'copied', meals: 2 });

    const copied = await week.listMeals(nextWeek);
    expect(contents(copied)).toEqual([
      { id: '', date: '2026-11-09', slot: 1, position: 0, dishId: owsianka.id, servings: 1.5, detached: null },
      { id: '', date: '2026-11-13', slot: 3, position: 0, dishId: 'd-leczo', servings: 1, detached: leczo },
    ]);
    expect(await week.listDaySlots(nextWeek)).toEqual([{ date: '2026-11-14', slotCount: 5 }]);
    expect(await weekHasPlanAt({ week }, '2026-11-09')).toBe(true);
  });

  it('gives the same next Week when copied twice (US6-4)', async () => {
    await planThisWeek();

    await copyWeekToNext({ week, ids }, '2026-11-02');
    const once = contents(await week.listMeals(nextWeek));
    await copyWeekToNext({ week, ids }, '2026-11-02');

    expect(contents(await week.listMeals(nextWeek))).toEqual(once);
    expect(await week.listMeals(nextWeek)).toHaveLength(2);
  });

  it('keeps copies independent of their originals (FR-035)', async () => {
    const { leczoMeal } = await planThisWeek();
    await copyWeekToNext({ week, ids }, '2026-11-02');
    const copy = (await week.listMeals(nextWeek)).find((m) => m.detached !== null)!;

    await week.putMeal({ ...copy, detached: { ...leczo, name: 'Inne leczo' } });
    await week.removeMeal(copy.id);

    expect(await week.getMeal(leczoMeal.id)).toEqual(leczoMeal);
  });

  it('writes nothing when the viewed Week has no plan (FR-036)', async () => {
    await week.addMeal({ date: '2026-11-10', slot: 1, dishId: owsianka.id });

    expect(await copyWeekToNext({ week, ids }, '2026-11-02')).toEqual({ kind: 'empty' });
    expect(await week.listMeals(nextWeek)).toHaveLength(1);
    expect(await weekHasPlanAt({ week }, '2026-11-02')).toBe(false);
  });

  it('counts a Week with only Added Slots as planned', async () => {
    await week.setDaySlotCount('2026-11-14', 6);

    expect(await weekHasPlanAt({ week }, '2026-11-09')).toBe(true);
    expect(await week.listMeals(thisWeek)).toEqual([]);
  });
});
