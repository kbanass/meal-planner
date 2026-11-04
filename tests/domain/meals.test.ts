import { describe, expect, it } from 'vitest';
import { isDetached, mealSource, newMeal, scaleMeal, servingsWord } from '../../src/domain/meals';
import { byId, meal, owsianka } from '../fakes/dishes';

describe('newMeal', () => {
  it('is a Linked Meal with 1 Serving', () => {
    expect(
      newMeal({ id: 'm-1', date: '2026-11-05', slot: 2, position: 0, dishId: 'd-1' }),
    ).toEqual({
      id: 'm-1',
      date: '2026-11-05',
      slot: 2,
      position: 0,
      dishId: 'd-1',
      servings: 1,
      detached: null,
    });
  });
});

describe('mealSource', () => {
  const dishes = byId([owsianka]);

  it('reads a Linked Meal from its Dish', () => {
    expect(mealSource(meal({ id: 'm-1' }), dishes)).toBe(owsianka);
  });

  it('still reads from an Archived Dish', () => {
    const archived = { ...owsianka, archived: true };
    expect(mealSource(meal({ id: 'm-1' }), byId([archived]))).toBe(archived);
  });

  it('reads a Detached Meal from its own copy, whatever the Dish says now', () => {
    const copy = { ...owsianka, name: 'Owsianka na wodzie', macros: { ...owsianka.macros, kcal: 500 } };
    const source = mealSource(meal({ id: 'm-1', detached: copy }), dishes);
    expect(source).toBe(copy);
  });

  it('is null when the Dish is missing', () => {
    expect(mealSource(meal({ id: 'm-1', dishId: 'gone' }), dishes)).toBeNull();
  });
});

describe('scaleMeal', () => {
  it('scales the spec example to 1 Serving (US2-1)', () => {
    expect(scaleMeal(owsianka, 1)).toEqual({
      ingredients: [
        { productId: 'p-platki', amount: 50 },
        { productId: 'p-mleko', amount: 150 },
      ],
      macros: { kcal: 350, protein: 12.5, fat: 7.5, carbs: 55 },
    });
  });

  it('scales to 1.5 Servings without rounding (US2-2)', () => {
    expect(scaleMeal(owsianka, 1.5)).toEqual({
      ingredients: [
        { productId: 'p-platki', amount: 75 },
        { productId: 'p-mleko', amount: 225 },
      ],
      macros: { kcal: 525, protein: 18.75, fat: 11.25, carbs: 82.5 },
    });
  });
});

describe('isDetached', () => {
  it('tells Linked and Detached Meals apart', () => {
    expect(isDetached(meal({ id: 'm-1' }))).toBe(false);
    expect(isDetached(meal({ id: 'm-2', detached: owsianka }))).toBe(true);
  });
});

describe('servingsWord', () => {
  it.each([
    [1, 'porcja'],
    [2, 'porcje'],
    [4, 'porcje'],
    [5, 'porcji'],
    [12, 'porcji'],
    [14, 'porcji'],
    [22, 'porcje'],
    [1.5, 'porcji'],
    [0.5, 'porcji'],
  ])('%d → %s', (servings, word) => {
    expect(servingsWord(servings)).toBe(word);
  });
});
