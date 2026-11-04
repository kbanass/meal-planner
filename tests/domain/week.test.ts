import { describe, expect, it } from 'vitest';
import {
  planWeekCopy,
  plannedKcal,
  plannedMacros,
  selectDay,
  selectWeekDays,
  weekHasPlan,
} from '../../src/domain/week';
import { FixedIdGenerator } from '../fakes/fixed-id-generator';
import { byId, dish, meal, owsianka } from '../fakes/dishes';

const third = dish({
  id: 'd-third',
  name: 'Jogurt',
  macros: { kcal: 33.333, protein: 0, fat: 0, carbs: 0 },
});
const photo = { id: 'photo-1', mimeType: 'image/webp' } as const;
const banan = dish({ id: 'd-banan', name: 'Banan', photo, macros: { kcal: 100, protein: 1, fat: 0, carbs: 25 } });
const dishes = byId([owsianka, third, banan]);

describe('plannedKcal', () => {
  it('adds unrounded values (3 × 33.333 is 99.999, not 99)', () => {
    const meals = [1, 2, 3].map((n) => meal({ id: `m-${n}`, dishId: third.id }));
    expect(plannedKcal(meals, dishes)).toBeCloseTo(99.999, 10);
  });

  it('skips a Meal whose Dish is missing', () => {
    expect(plannedKcal([meal({ id: 'm-1', dishId: 'gone' }), meal({ id: 'm-2' })], dishes)).toBe(350);
  });
});

describe('plannedMacros', () => {
  it('adds all four Macros unrounded, skipping a missing Dish', () => {
    const meals = [
      meal({ id: 'm-1', servings: 1.5 }),
      meal({ id: 'm-2', dishId: banan.id }),
      meal({ id: 'm-3', dishId: 'gone' }),
    ];
    expect(plannedMacros(meals, dishes)).toEqual({ kcal: 625, protein: 19.75, fat: 11.25, carbs: 107.5 });
    expect(plannedMacros([], dishes)).toEqual({ kcal: 0, protein: 0, fat: 0, carbs: 0 });
  });
});

describe('selectWeekDays', () => {
  const meals = [
    meal({ id: 'm-mon', date: '2026-11-02' }),
    meal({ id: 'm-wed-1', date: '2026-11-04', servings: 1.5 }),
    meal({ id: 'm-wed-2', date: '2026-11-04', slot: 2, dishId: banan.id }),
    meal({ id: 'm-next-week', date: '2026-11-09' }),
  ];

  it('always lists 7 days, Monday to Sunday, with today marked', () => {
    const days = selectWeekDays('2026-11-02', '2026-11-04', meals, dishes);

    expect(days.map((d) => d.date)).toEqual([
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
    ]);
    expect(days.filter((d) => d.isToday).map((d) => d.date)).toEqual(['2026-11-04']);
  });

  it('counts Meals and Planned kcal per day, ignoring other Weeks', () => {
    const days = selectWeekDays('2026-11-02', '2026-11-04', meals, dishes);

    expect(days[0]).toEqual({
      date: '2026-11-02',
      isToday: false,
      mealCount: 1,
      plannedKcal: 350,
      macros: { kcal: 350, protein: 12.5, fat: 7.5, carbs: 55 },
    });
    expect(days[2]).toMatchObject({ date: '2026-11-04', isToday: true, mealCount: 2, plannedKcal: 625 });
    expect(days[2]?.macros).toEqual({ kcal: 625, protein: 19.75, fat: 11.25, carbs: 107.5 });
    expect(days[6]).toMatchObject({ date: '2026-11-08', mealCount: 0, plannedKcal: 0 });
  });

  it('marks no day when today is in another Week', () => {
    const days = selectWeekDays('2026-11-09', '2026-11-04', meals, dishes);
    expect(days.some((d) => d.isToday)).toBe(false);
  });
});

describe('selectDay', () => {
  const settings = { slotsPerDay: 4 };

  it('shows the default Slots, empty ones included', () => {
    const slots = selectDay('2026-11-05', [], undefined, dishes, settings);
    expect(slots.map((s) => s.number)).toEqual([1, 2, 3, 4]);
    expect(slots.every((s) => s.meals.length === 0)).toBe(true);
  });

  it('orders Meals in a Slot by position, then id', () => {
    const meals = [
      meal({ id: 'm-b', slot: 2, position: 1 }),
      meal({ id: 'm-c', slot: 2, position: 0 }),
      meal({ id: 'm-a', slot: 2, position: 1 }),
    ];
    const slot2 = selectDay('2026-11-05', meals, undefined, dishes, settings)[1];
    expect(slot2?.meals.map((m) => m.meal.id)).toEqual(['m-c', 'm-a', 'm-b']);
    expect(slot2?.macros).toEqual({ kcal: 1050, protein: 37.5, fat: 22.5, carbs: 165 });
  });

  it('shows a Meal in Slot 6, the Added Slots, and only that day', () => {
    const meals = [meal({ id: 'm-6', slot: 6 }), meal({ id: 'm-other-day', date: '2026-11-06', slot: 9 })];
    expect(selectDay('2026-11-05', meals, undefined, dishes, settings)).toHaveLength(6);
    expect(
      selectDay('2026-11-05', [], { date: '2026-11-05', slotCount: 7 }, dishes, settings),
    ).toHaveLength(7);
  });

  it('describes each Meal for display', () => {
    const copy = { ...owsianka, name: 'Owsianka na wodzie' };
    const meals = [
      meal({ id: 'm-linked', servings: 1.5 }),
      meal({ id: 'm-detached', position: 1, detached: copy }),
      meal({ id: 'm-photo', position: 2, dishId: banan.id }),
      meal({ id: 'm-missing', position: 3, dishId: 'gone' }),
    ];
    const [linked, detached, withPhoto, missing] =
      selectDay('2026-11-05', meals, undefined, dishes, settings)[0]?.meals ?? [];

    expect(linked).toEqual({
      meal: meals[0],
      name: 'Owsianka',
      missingDish: false,
      photo: null,
      servings: 1.5,
      kcal: 525,
      detached: false,
    });
    expect(detached).toMatchObject({ name: 'Owsianka na wodzie', detached: true, kcal: 350 });
    expect(withPhoto).toMatchObject({ name: 'Banan', photo });
    expect(missing).toMatchObject({ name: '', missingDish: true, photo: null, kcal: 0 });
  });

  it('takes a Detached Meal photo from its Dish', () => {
    const copy = { ...banan, name: 'Banan z masłem orzechowym' };
    const [view] =
      selectDay('2026-11-05', [meal({ id: 'm-1', dishId: banan.id, detached: copy })], undefined, dishes, settings)[0]
        ?.meals ?? [];
    expect(view).toMatchObject({ name: 'Banan z masłem orzechowym', photo });
  });
});

describe('weekHasPlan', () => {
  it('is false for an empty Week, true with a Meal or only Added Slots', () => {
    expect(weekHasPlan([], [])).toBe(false);
    expect(weekHasPlan([meal({ id: 'm-1' })], [])).toBe(true);
    expect(weekHasPlan([], [{ date: '2026-11-07', slotCount: 5 }])).toBe(true);
  });
});

describe('planWeekCopy', () => {
  const copy = { ...owsianka, name: 'Leczo po mojemu' };

  it('moves every record 7 days on, across month and year ends, with new Meal ids', () => {
    const meals = [
      meal({ id: 'm-sun', date: '2026-12-06', slot: 3, position: 1, servings: 1.5 }),
      meal({ id: 'm-mon', date: '2026-11-30', detached: copy }),
    ];
    const plan = planWeekCopy('2026-11-30', meals, [{ date: '2026-12-05', slotCount: 6 }], new FixedIdGenerator());

    expect(plan.meals).toEqual([
      { ...meals[1], id: '00000000-0000-4000-8000-000000000001', date: '2026-12-07' },
      { ...meals[0], id: '00000000-0000-4000-8000-000000000002', date: '2026-12-13' },
    ]);
    expect(plan.daySlots).toEqual([{ date: '2026-12-12', slotCount: 6 }]);

    const yearEnd = planWeekCopy('2026-12-28', [meal({ id: 'm-1', date: '2027-01-03' })], [], new FixedIdGenerator());
    expect(yearEnd.meals[0]?.date).toBe('2027-01-10');
  });

  it('deep-copies a Detached Meal copy', () => {
    const original = meal({ id: 'm-1', date: '2026-11-30', detached: structuredClone(copy) });
    const [copied] = planWeekCopy('2026-11-30', [original], [], new FixedIdGenerator()).meals;

    copied!.detached!.ingredients[0]!.amount = 999;
    copied!.detached!.macros.kcal = 1;
    expect(original.detached?.ingredients[0]?.amount).toBe(100);
    expect(original.detached?.macros.kcal).toBe(700);
  });

  it('hands out new ids by date, Slot, position, then id', () => {
    const meals = [
      meal({ id: 'm-d', date: '2026-12-01', slot: 2, position: 0 }),
      meal({ id: 'm-c', date: '2026-12-01', slot: 1, position: 1 }),
      meal({ id: 'm-b', date: '2026-12-01', slot: 1, position: 0 }),
      meal({ id: 'm-a2', date: '2026-12-01', slot: 1, position: 0 }),
    ];
    const plan = planWeekCopy('2026-11-30', meals, [], new FixedIdGenerator());

    // m-a2 and m-b tie on Slot and position, so the id decides.
    expect(plan.meals.map((m) => [m.slot, m.position, m.id.slice(-1)])).toEqual([
      [1, 0, '1'],
      [1, 0, '2'],
      [1, 1, '3'],
      [2, 0, '4'],
    ]);
    expect(plan.meals.map((m) => m.servings)).toEqual([1, 1, 1, 1]);
  });

  it('ignores records outside the source Week', () => {
    const plan = planWeekCopy(
      '2026-11-30',
      [meal({ id: 'm-before', date: '2026-11-29' }), meal({ id: 'm-after', date: '2026-12-07' })],
      [{ date: '2026-12-07', slotCount: 5 }],
      new FixedIdGenerator(),
    );
    expect(plan).toEqual({ meals: [], daySlots: [] });
  });
});
