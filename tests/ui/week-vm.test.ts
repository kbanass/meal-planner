import { describe, expect, it } from 'vitest';
import type { MealView } from '../../src/domain/week';
import {
  copyConfirmMessage,
  copyDoneToast,
  copyFailedMessage,
  dayTitle,
  macroTotals,
  mealRow,
  pickerEmptyMessage,
  pickerTile,
  removeMealConfirmMessage,
  swipeWeekDelta,
  weekPage,
  wheelScrollDelta,
} from '../../src/ui/view-models/week';
import { dish, meal, owsianka } from '../fakes/dishes';

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

  it('draws a renamed Detached Meal placeholder from its new name', () => {
    expect(mealRow(view({ name: 'Owsianka na wodzie', detached: true }))).toMatchObject({
      title: 'Owsianka na wodzie',
      avatarName: 'Owsianka na wodzie',
      badge: 'zmieniony',
    });
  });

  it('marks a Detached Meal and names a missing Dish', () => {
    expect(mealRow(view({ detached: true })).badge).toBe('zmieniony');
    expect(mealRow(view({ name: '', missingDish: true }))).toMatchObject({
      title: 'Nieznane danie',
      avatarName: 'Nieznane danie',
    });
  });
});

describe('Week page texts', () => {
  it('titles a day', () => {
    expect(dayTitle('2026-11-05')).toBe('Czwartek, 5 lis');
  });

  it('words the picker, removal and copy messages', () => {
    expect(pickerEmptyMessage).toBe('Nie masz jeszcze żadnych dań. Dodaj je w zakładce Dania.');
    expect(removeMealConfirmMessage('Owsianka')).toBe('Usunąć posiłek „Owsianka”?');
    expect(copyConfirmMessage).toBe('Następny tydzień ma już plan. Zastąpić go planem z tego tygodnia?');
    expect(copyDoneToast).toBe('Skopiowano do następnego tygodnia.');
    expect(copyFailedMessage).toBe(
      'Nie udało się skopiować tygodnia. Następny tydzień nie został zmieniony.',
    );
  });
});

describe('weekPage', () => {
  const banan = dish({ id: 'd-banan', name: 'Banan', macros: { kcal: 525, protein: 1, fat: 0, carbs: 25 } });
  const loaded = {
    meals: [
      meal({ id: 'm-mon', date: '2026-11-02' }),
      meal({ id: 'm-thu-1', date: '2026-11-05', slot: 2 }),
      meal({ id: 'm-thu-2', date: '2026-11-05', slot: 2, position: 1, dishId: banan.id }),
    ],
    daySlots: [{ date: '2026-11-05', slotCount: 5 }],
    dishes: [owsianka, banan],
    settings: { slotsPerDay: 4 },
  };

  it('labels the Week by month and lists its seven days in the strip', () => {
    const model = weekPage('2026-11-02', '2026-11-04', '2026-11-05', loaded);

    expect(model.monthLabel).toBe('Listopad 2026');
    expect(model.strip.map((cell) => `${cell.shortName} ${cell.dayNumber}`)).toEqual([
      'Pn 2',
      'Wt 3',
      'Śr 4',
      'Cz 5',
      'Pt 6',
      'So 7',
      'Nd 8',
    ]);
    expect(model.strip[0]).toEqual({
      date: '2026-11-02',
      shortName: 'Pn',
      dayNumber: 2,
      kcal: '350',
      isToday: false,
      isSelected: false,
      ariaLabel: 'Poniedziałek, 2 lis',
    });
    expect(model.strip[1]?.kcal).toBe('');
    expect(model.strip[2]).toMatchObject({ isToday: true, isSelected: false });
    expect(model.strip[3]).toMatchObject({ isToday: false, isSelected: true, kcal: '875' });
  });

  it("shows the selected day's heading, summary and Slots", () => {
    const model = weekPage('2026-11-02', '2026-11-04', '2026-11-05', loaded);

    expect(model.heading).toBe('Czwartek, 5 lis');
    expect(model.summary).toBe('2 posiłki');
    expect(model.dayTotals.map((t) => t.value)).toEqual(['875', '13,5', '7,5', '80']);
    expect(model.slots.map((slot) => slot.number)).toEqual([1, 2, 3, 4, 5]);
    expect(model.slots[1]?.rows.map((row) => row.title)).toEqual(['Owsianka', 'Banan']);
    expect(model.slots[1]?.totals.map((t) => t.value)).toEqual(['875', '13,5', '7,5', '80']);
    expect(model.slots[0]?.totals.map((t) => t.value)).toEqual(['0', '0', '0', '0']);
    expect(model.canCopy).toBe(true);
  });

  it('words a day with one Meal and an empty day', () => {
    expect(weekPage('2026-11-02', '2026-11-04', '2026-11-02', loaded).summary).toBe('1 posiłek');
    expect(weekPage('2026-11-02', '2026-11-04', '2026-11-03', loaded).summary).toBe('brak posiłków');
  });

  it('shows empty days with the default Slots, and offers no copy, while the data loads', () => {
    const model = weekPage('2026-11-02', '2026-11-04', '2026-11-04', {
      meals: undefined,
      daySlots: undefined,
      dishes: undefined,
      settings: undefined,
    });

    expect(model.strip.every((cell) => cell.kcal === '')).toBe(true);
    expect(model.slots).toHaveLength(4);
    expect(model.summary).toBe('brak posiłków');
    expect(model.canCopy).toBe(false);
  });

  it('offers the copy for a Week with only Added Slots', () => {
    const model = weekPage('2026-11-02', '2026-11-04', '2026-11-04', {
      meals: [],
      daySlots: [{ date: '2026-11-07', slotCount: 5 }],
      dishes: [],
      settings: undefined,
    });
    expect(model.canCopy).toBe(true);
  });
});

describe('macroTotals', () => {
  it('gives kcal, protein, fat and carbs with icons, labels and display rounding', () => {
    expect(macroTotals({ kcal: 349.6, protein: 18.75, fat: 11.25, carbs: 82.5 })).toEqual([
      { key: 'kcal', label: 'Kalorie', value: '350', unit: 'kcal', icon: 'flame_fill' },
      { key: 'protein', label: 'Białko', value: '18,8', unit: 'g', icon: 'cube_fill' },
      { key: 'fat', label: 'Tłuszcz', value: '11,3', unit: 'g', icon: 'drop_fill' },
      { key: 'carbs', label: 'Węglowodany', value: '82,5', unit: 'g', icon: 'hexagon_fill' },
    ]);
  });
});

describe('pickerTile', () => {
  it('shows one Serving of the Dish', () => {
    expect(pickerTile(owsianka)).toEqual({
      id: owsianka.id,
      name: 'Owsianka',
      photo: null,
      totals: macroTotals({ kcal: 350, protein: 12.5, fat: 7.5, carbs: 55 }),
    });
  });
});

describe('swipeWeekDelta', () => {
  it.each([
    [-80, 10, 7],
    [80, -10, -7],
    [-40, 0, 0],
    [-80, 70, 0],
    [0, 0, 0],
  ])('dx %d, dy %d → %d days', (dx, dy, delta) => {
    expect(swipeWeekDelta(dx, dy)).toBe(delta);
  });
});

describe('wheelScrollDelta', () => {
  it.each([
    [0, 120, 120],
    [0, -40, -40],
    [5, 30, 30],
    [80, 10, 0],
    [0, 0, 0],
  ])('dx %d, dy %d → %d px sideways', (dx, dy, delta) => {
    expect(wheelScrollDelta(dx, dy)).toBe(delta);
  });
});
