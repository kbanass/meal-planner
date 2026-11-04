import { describe, expect, it } from 'vitest';
import {
  addIngredient,
  decideDishRemoval,
  draftFromDish,
  emptyDishDraft,
  removeIngredient,
  selectLibrary,
  validateDishDraft,
  type DishDraft,
} from '../../src/domain/dishes';
import type { Dish, Product } from '../../src/domain/types';

const platki: Product = { id: 'p-platki', name: 'płatki owsiane', unit: 'g' };
const mleko: Product = { id: 'p-mleko', name: 'mleko', unit: 'ml' };
const productsById: ReadonlyMap<string, Product> = new Map([
  [platki.id, platki],
  [mleko.id, mleko],
]);

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function validDraft(overrides: Partial<DishDraft> = {}): DishDraft {
  return deepFreeze({
    name: '  Owsianka   z mlekiem ',
    servingsYield: '1,5',
    ingredients: [
      { productId: platki.id, amount: '60' },
      { productId: mleko.id, amount: '200,005' },
    ],
    macros: { kcal: '350', protein: '12,5', fat: '0.1', carbs: '55' },
    notes: '  Gotować 5 minut.  ',
    ...overrides,
  });
}

function dish(overrides: Partial<Dish>): Dish {
  return {
    id: 'd-1',
    name: 'Owsianka',
    servingsYield: 1,
    ingredients: [],
    macros: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
    notes: '',
    photo: null,
    archived: false,
    ...overrides,
  };
}

describe('emptyDishDraft', () => {
  it('starts with one serving, empty macros and no ingredients', () => {
    expect(emptyDishDraft()).toEqual({
      name: '',
      servingsYield: '1',
      ingredients: [],
      macros: { kcal: '', protein: '', fat: '', carbs: '' },
      notes: '',
    });
  });
});

describe('draftFromDish', () => {
  it('formats numbers with a comma decimal separator', () => {
    const stored = deepFreeze(
      dish({
        name: 'Owsianka',
        servingsYield: 1.5,
        ingredients: [{ productId: mleko.id, amount: 0.25 }],
        macros: { kcal: 350, protein: 12.5, fat: 0, carbs: 55.1 },
        notes: 'Na ciepło',
      }),
    );

    expect(draftFromDish(stored)).toEqual({
      name: 'Owsianka',
      servingsYield: '1,5',
      ingredients: [{ productId: mleko.id, amount: '0,25' }],
      macros: { kcal: '350', protein: '12,5', fat: '0', carbs: '55,1' },
      notes: 'Na ciepło',
    });
  });
});

describe('addIngredient', () => {
  it('appends a new Ingredient with an empty amount', () => {
    const draft = deepFreeze(emptyDishDraft());

    const result = addIngredient(draft, platki.id);

    expect(result).toEqual({
      draft: { ...draft, ingredients: [{ productId: platki.id, amount: '' }] },
      index: 0,
      existed: false,
    });
  });

  it('returns the existing index and leaves the draft unchanged for a duplicate', () => {
    const draft = validDraft();

    const result = addIngredient(draft, mleko.id);

    expect(result).toEqual({ draft, index: 1, existed: true });
    expect(result.draft).toBe(draft);
  });
});

describe('removeIngredient', () => {
  it('removes the Ingredient at the index', () => {
    const draft = validDraft();

    expect(removeIngredient(draft, 0).ingredients).toEqual([{ productId: mleko.id, amount: '200,005' }]);
    expect(draft.ingredients).toHaveLength(2);
  });
});

describe('validateDishDraft', () => {
  it('returns the parsed, rounded and normalised value for a valid draft', () => {
    expect(validateDishDraft(validDraft(), productsById)).toEqual({
      ok: true,
      value: {
        name: 'Owsianka z mlekiem',
        servingsYield: 1.5,
        ingredients: [
          { productId: platki.id, amount: 60 },
          { productId: mleko.id, amount: 200.01 },
        ],
        macros: { kcal: 350, protein: 12.5, fat: 0.1, carbs: 55 },
        notes: 'Gotować 5 minut.',
      },
    });
  });

  it('accepts a Dish without Ingredients and zero Macros', () => {
    const result = validateDishDraft(
      validDraft({ ingredients: [], macros: { kcal: '0', protein: '0', fat: '0', carbs: '0' } }),
      productsById,
    );

    expect(result.ok).toBe(true);
  });

  it('requires a name', () => {
    expect(validateDishDraft(validDraft({ name: '  ' }), productsById)).toEqual({
      ok: false,
      errors: { name: 'required' },
    });
  });

  it.each([
    ['', 'required'],
    ['abc', 'notANumber'],
    ['0', 'notPositive'],
    ['-1', 'notPositive'],
    ['0,001', 'notPositive'],
  ])('reports servingsYield %j as %s', (servingsYield, code) => {
    expect(validateDishDraft(validDraft({ servingsYield }), productsById)).toEqual({
      ok: false,
      errors: { servingsYield: code },
    });
  });

  it.each([
    ['', 'required'],
    ['abc', 'notANumber'],
    ['-5', 'negative'],
  ])('reports macro kcal %j as %s', (kcal, code) => {
    const macros = { ...validDraft().macros, kcal };

    expect(validateDishDraft(validDraft({ macros }), productsById)).toEqual({
      ok: false,
      errors: { 'macros.kcal': code },
    });
  });

  it('reports every missing macro', () => {
    const macros = { kcal: '', protein: '', fat: '', carbs: '' };

    expect(validateDishDraft(validDraft({ macros }), productsById)).toEqual({
      ok: false,
      errors: {
        'macros.kcal': 'required',
        'macros.protein': 'required',
        'macros.fat': 'required',
        'macros.carbs': 'required',
      },
    });
  });

  it.each([
    ['', 'required'],
    ['abc', 'notANumber'],
    ['0', 'notPositive'],
  ])('reports Ingredient amount %j as %s', (amount, code) => {
    const ingredients = [
      { productId: platki.id, amount: '60' },
      { productId: mleko.id, amount },
    ];

    expect(validateDishDraft(validDraft({ ingredients }), productsById)).toEqual({
      ok: false,
      errors: { 'ingredients[1].amount': code },
    });
  });

  it('reports a duplicate Product on the later Ingredient', () => {
    const ingredients = [
      { productId: mleko.id, amount: '100' },
      { productId: mleko.id, amount: '50' },
    ];

    expect(validateDishDraft(validDraft({ ingredients }), productsById)).toEqual({
      ok: false,
      errors: { 'ingredients[1].productId': 'duplicateProduct' },
    });
  });

  it('reports an unknown Product', () => {
    const ingredients = [
      { productId: platki.id, amount: '60' },
      { productId: 'p-missing', amount: '50' },
    ];

    expect(validateDishDraft(validDraft({ ingredients }), productsById)).toEqual({
      ok: false,
      errors: { 'ingredients[1].productId': 'unknownProduct' },
    });
  });

  it('reports all errors at once', () => {
    const result = validateDishDraft(
      validDraft({ name: '', servingsYield: '0', macros: { ...validDraft().macros, carbs: 'x' } }),
      productsById,
    );

    expect(result).toEqual({
      ok: false,
      errors: { name: 'required', servingsYield: 'notPositive', 'macros.carbs': 'notANumber' },
    });
  });
});

describe('selectLibrary', () => {
  it('hides Archived Dishes and sorts by name, then id', () => {
    const dishes = deepFreeze([
      dish({ id: 'd-3', name: 'Zupa' }),
      dish({ id: 'd-2', name: 'Ćwikła' }),
      dish({ id: 'd-9', name: 'Archiwalne', archived: true }),
      dish({ id: 'd-5', name: 'ćwikła' }),
      dish({ id: 'd-1', name: 'Dorsz' }),
    ]);

    expect(selectLibrary(dishes).map((d) => d.id)).toEqual(['d-2', 'd-5', 'd-1', 'd-3']);
  });
});

describe('decideDishRemoval', () => {
  it('deletes a Dish no Meal uses and archives one that Meals use', () => {
    expect(decideDishRemoval(0)).toBe('delete');
    expect(decideDishRemoval(1)).toBe('archive');
    expect(decideDishRemoval(7)).toBe('archive');
  });
});
