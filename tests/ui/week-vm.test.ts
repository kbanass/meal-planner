import { describe, expect, it } from 'vitest';
import type { MealView } from '../../src/domain/week';
import {
  dayPage,
  dayRow,
  dayTitle,
  invalidDayMessage,
  mealRow,
  pickerEmptyMessage,
  removeMealConfirmMessage,
  weekPage,
  weekRange,
} from '../../src/ui/view-models/week';
import { meal, owsianka } from '../fakes/dishes';

function view(overrides: Partial<MealView> = {}): MealView {
  return {
    meal: meal({ id: 'm-1' }),
    name: 'Owsianka',
    missingDish: false,
    photo: null,
    servings: 1,
    kcal: 350,
    detached: false,
    ...overrides,
  };
}

describe('dayRow', () => {
  it('shows the day name, date and Planned kcal', () => {
    expect(dayRow({ date: '2026-11-05', isToday: false, mealCount: 2, plannedKcal: 1849.6 })).toEqual({
      date: '2026-11-05',
      title: 'Czwartek',
      subtitle: '5 lis',
      after: '1850 kcal',
      isToday: false,
    });
  });

  it('marks today and an empty day', () => {
    expect(dayRow({ date: '2026-11-04', isToday: true, mealCount: 0, plannedKcal: 0 })).toEqual({
      date: '2026-11-04',
      title: 'Środa',
      subtitle: '4 lis · dziś',
      after: 'brak posiłków',
      isToday: true,
    });
  });
});

describe('mealRow', () => {
  it('shows Servings and kcal, with the Polish word for the Servings', () => {
    expect(mealRow(view())).toEqual({
      id: 'm-1',
      title: 'Owsianka',
      subtitle: '1 porcja · 350 kcal',
      badge: null,
      avatarName: 'Owsianka',
      photo: null,
    });
    expect(mealRow(view({ servings: 1.5, kcal: 525 })).subtitle).toBe('1,5 porcji · 525 kcal');
    expect(mealRow(view({ servings: 2, kcal: 700 })).subtitle).toBe('2 porcje · 700 kcal');
  });

  it('marks a Detached Meal and names a missing Dish', () => {
    expect(mealRow(view({ detached: true })).badge).toBe('zmieniony');
    expect(mealRow(view({ name: '', missingDish: true }))).toMatchObject({
      title: 'Nieznane danie',
      avatarName: 'Nieznane danie',
    });
  });
});

describe('Day page texts', () => {
  it('titles the day', () => {
    expect(dayTitle('2026-11-05')).toBe('Czwartek, 5 lis');
  });

  it('words the picker, removal and invalid-day messages', () => {
    expect(pickerEmptyMessage).toBe('Nie masz jeszcze żadnych dań. Dodaj je w zakładce Dania.');
    expect(removeMealConfirmMessage('Owsianka')).toBe('Usunąć posiłek „Owsianka”?');
    expect(invalidDayMessage).toBe('Nie ma takiego dnia.');
  });
});

describe('weekPage', () => {
  it('titles the Week and lists its seven days, today marked', () => {
    const model = weekPage('2026-11-02', '2026-11-04', [meal({ id: 'm-1', date: '2026-11-02' })], [owsianka]);

    expect(model.title).toBe('2–8 lis 2026');
    expect(model.days.map((d) => d.title)).toEqual([
      'Poniedziałek',
      'Wtorek',
      'Środa',
      'Czwartek',
      'Piątek',
      'Sobota',
      'Niedziela',
    ]);
    expect(model.days[0]?.after).toBe('350 kcal');
    expect(model.days[2]?.isToday).toBe(true);
  });

  it('shows empty days while the data loads', () => {
    expect(weekPage('2026-11-02', '2026-11-04', undefined, undefined).days.every((d) => d.after === 'brak posiłków')).toBe(true);
  });

  it('reads Monday to Sunday', () => {
    expect(weekRange('2026-11-02')).toEqual({ start: '2026-11-02', end: '2026-11-08' });
  });
});

describe('dayPage', () => {
  const loaded = {
    meals: [meal({ id: 'm-1', slot: 2 })],
    daySlots: [{ date: '2026-11-05', slotCount: 5 }],
    dishes: [owsianka],
    settings: { slotsPerDay: 4 },
  };

  it('titles the day and lists its Slots with Meal rows', () => {
    const model = dayPage('2026-11-05', loaded);

    expect(model.valid).toBe(true);
    expect(model.title).toBe('Czwartek, 5 lis');
    expect(model.slots.map((s) => s.number)).toEqual([1, 2, 3, 4, 5]);
    expect(model.slots[1]?.rows.map((r) => r.title)).toEqual(['Owsianka']);
  });

  it('uses the default Slots while the data loads', () => {
    const model = dayPage('2026-11-05', {
      meals: undefined,
      daySlots: undefined,
      dishes: undefined,
      settings: undefined,
    });
    expect(model.slots).toHaveLength(4);
  });

  it('rejects an invalid date', () => {
    expect(dayPage('2026-02-30', loaded)).toEqual({ valid: false, title: '', slots: [] });
  });
});
