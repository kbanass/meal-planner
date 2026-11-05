import { beforeEach, describe, expect, it } from 'vitest';
import { addSlotToDay } from '../../src/app/week';
import { createSettingsRepository, type SettingsRepository } from '../../src/data/settings-repository';
import { createWeekRepository, type WeekRepository } from '../../src/data/week-repository';
import { FixedIdGenerator } from '../fakes/fixed-id-generator';
import { createTestDb } from '../fakes/test-db';

let week: WeekRepository;
let settings: SettingsRepository;
const saturday = { start: '2026-11-07', end: '2026-11-07' };

beforeEach(() => {
  const db = createTestDb();
  week = createWeekRepository(db, new FixedIdGenerator());
  settings = createSettingsRepository(db);
});

describe('addSlotToDay', () => {
  it('adds one Slot after the default 4, then another (US5-1)', async () => {
    expect(await addSlotToDay({ week, settings }, '2026-11-07')).toBe(5);
    expect(await week.listDaySlots(saturday)).toEqual([{ date: '2026-11-07', slotCount: 5 }]);

    expect(await addSlotToDay({ week, settings }, '2026-11-07')).toBe(6);
  });

  it('adds after the highest Slot holding a Meal', async () => {
    await week.addMeal({ date: '2026-11-07', slot: 7, dishId: 'd-1' });

    expect(await addSlotToDay({ week, settings }, '2026-11-07')).toBe(8);
  });

  it('adds after the default when it is higher than the stored count', async () => {
    await settings.setSlotsPerDay(6);
    await week.setDaySlotCount('2026-11-07', 5);

    expect(await addSlotToDay({ week, settings }, '2026-11-07')).toBe(7);
  });
});
