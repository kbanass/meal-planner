import type { Dish, Meal } from '../../src/domain/types';

/** The spec's example Dish: yields 2 Servings, 700 kcal for the whole recipe. */
export const owsianka: Dish = {
  id: 'd-owsianka',
  name: 'Owsianka',
  servingsYield: 2,
  ingredients: [
    { productId: 'p-platki', amount: 100 },
    { productId: 'p-mleko', amount: 300 },
  ],
  macros: { kcal: 700, protein: 25, fat: 15, carbs: 110 },
  notes: '',
  photo: null,
  archived: false,
};

export function dish(overrides: Partial<Dish> & Pick<Dish, 'id' | 'name'>): Dish {
  return {
    servingsYield: 1,
    ingredients: [],
    macros: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
    notes: '',
    photo: null,
    archived: false,
    ...overrides,
  };
}

export function meal(overrides: Partial<Meal> & Pick<Meal, 'id'>): Meal {
  return {
    date: '2026-11-05',
    slot: 1,
    position: 0,
    dishId: owsianka.id,
    servings: 1,
    detached: null,
    ...overrides,
  };
}

export function byId(dishes: readonly Dish[]): ReadonlyMap<string, Dish> {
  return new Map(dishes.map((d) => [d.id, d]));
}
