import { describe, expect, it } from 'vitest';
import {
  decideMealSave,
  draftFromMeal,
  isDetached,
  mealSource,
  newMeal,
  rescaleMealDraft,
  scaleMeal,
  servingsWord,
  validateMealDraft,
  type MealDraft,
  type ValidMealValue,
} from '../../src/domain/meals';
import { formatDecimal } from '../../src/domain/numbers';
import type { Product } from '../../src/domain/types';
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

const products: ReadonlyMap<string, Product> = new Map([
  ['p-platki', { id: 'p-platki', name: 'płatki owsiane', unit: 'g' }],
  ['p-mleko', { id: 'p-mleko', name: 'mleko', unit: 'ml' }],
  ['p-banan', { id: 'p-banan', name: 'banan', unit: 'pcs' }],
]);

describe('draftFromMeal', () => {
  it('shows the values for this Meal at its Servings (US2-2)', () => {
    expect(draftFromMeal(meal({ id: 'm-1', servings: 1.5 }), owsianka)).toEqual({
      basisServings: 1.5,
      servings: '1,5',
      name: 'Owsianka',
      ingredients: [
        { productId: 'p-platki', amount: '75' },
        { productId: 'p-mleko', amount: '225' },
      ],
      macros: { kcal: '525', protein: '18,75', fat: '11,25', carbs: '82,5' },
    });
  });
});

describe('rescaleMealDraft', () => {
  const draft = draftFromMeal(meal({ id: 'm-1' }), owsianka);

  it('recomputes untouched fields from the source at the new Servings', () => {
    expect(rescaleMealDraft(draft, owsianka, '2')).toEqual({
      basisServings: 2,
      servings: '2',
      name: 'Owsianka',
      ingredients: [
        { productId: 'p-platki', amount: '100' },
        { productId: 'p-mleko', amount: '300' },
      ],
      macros: { kcal: '700', protein: '25', fat: '15', carbs: '110' },
    });
  });

  it('scales a field the user changed by new / old Servings', () => {
    const edited: MealDraft = {
      ...draft,
      ingredients: [{ productId: 'p-platki', amount: '80' }, ...draft.ingredients.slice(1)],
    };
    expect(rescaleMealDraft(edited, owsianka, '2').ingredients[0]).toEqual({
      productId: 'p-platki',
      amount: '160',
    });
  });

  it('scales an added Ingredient and leaves unreadable text alone', () => {
    const edited: MealDraft = {
      ...draft,
      ingredients: [...draft.ingredients, { productId: 'p-banan', amount: '1' }],
      macros: { ...draft.macros, fat: '' },
    };
    const rescaled = rescaleMealDraft(edited, owsianka, '1,5');
    expect(rescaled.ingredients[2]).toEqual({ productId: 'p-banan', amount: '1,5' });
    expect(rescaled.macros.fat).toBe('');
  });

  it.each(['0', 'abc', '', '-1'])('only updates the text for Servings %j', (text) => {
    expect(rescaleMealDraft(draft, owsianka, text)).toEqual({ ...draft, servings: text });
  });

  it('only updates the text when the value is the same, e.g. "1,0"', () => {
    expect(rescaleMealDraft(draft, owsianka, '1,0')).toEqual({ ...draft, servings: '1,0' });
  });

  it('does not drift when Servings go back and forth', () => {
    const thirds = { ...owsianka, servingsYield: 3 };
    let current = draftFromMeal(meal({ id: 'm-1' }), thirds);
    for (const servings of ['2', '1', '2']) current = rescaleMealDraft(current, thirds, servings);

    expect(current.ingredients[0]?.amount).toBe(formatDecimal((100 / 3) * 2));
    const value = validateMealDraft(current, products);
    if (!value.ok) throw new Error('invalid');
    expect(decideMealSave(meal({ id: 'm-1', servings: 2 }), thirds, value.value)).toEqual({
      kind: 'unchanged',
    });
  });
});

describe('validateMealDraft', () => {
  const draft = draftFromMeal(meal({ id: 'm-1' }), owsianka);

  it('returns parsed, rounded per-Meal values', () => {
    expect(validateMealDraft({ ...draft, name: '  Owsianka  z  bananem ' }, products)).toEqual({
      ok: true,
      value: {
        servings: 1,
        name: 'Owsianka z bananem',
        ingredients: [
          { productId: 'p-platki', amount: 50 },
          { productId: 'p-mleko', amount: 150 },
        ],
        macros: { kcal: 350, protein: 12.5, fat: 7.5, carbs: 55 },
      },
    });
  });

  it.each([
    ['0', 'notPositive'],
    ['-1', 'notPositive'],
    ['abc', 'notANumber'],
    ['', 'required'],
  ])('rejects Servings %j as %s (US2-4)', (servings, code) => {
    expect(validateMealDraft({ ...draft, servings }, products)).toEqual({
      ok: false,
      errors: { servings: code },
    });
  });

  it('uses the Dish draft rules and paths for the other fields', () => {
    const result = validateMealDraft(
      {
        ...draft,
        name: ' ',
        ingredients: [
          { productId: 'p-platki', amount: '0' },
          { productId: 'p-platki', amount: '5' },
          { productId: 'p-gone', amount: '5' },
        ],
        macros: { kcal: '-1', protein: 'x', fat: '', carbs: '1' },
      },
      products,
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        name: 'required',
        'ingredients[0].amount': 'notPositive',
        'ingredients[1].productId': 'duplicateProduct',
        'ingredients[2].productId': 'unknownProduct',
        'macros.kcal': 'negative',
        'macros.protein': 'notANumber',
        'macros.fat': 'required',
      },
    });
  });

  it('expresses the numbers at the typed Servings if the draft was not rescaled', () => {
    const result = validateMealDraft({ ...draft, servings: '2' }, products);
    if (!result.ok) throw new Error('invalid');
    expect(result.value.servings).toBe(2);
    expect(result.value.ingredients[0]?.amount).toBe(100);
    expect(result.value.macros.kcal).toBe(700);
  });
});

describe('decideMealSave', () => {
  const linked = meal({ id: 'm-1' });

  function value(overrides: Partial<ValidMealValue> = {}): ValidMealValue {
    return {
      servings: 1,
      name: 'Owsianka',
      ingredients: [
        { productId: 'p-platki', amount: 50 },
        { productId: 'p-mleko', amount: 150 },
      ],
      macros: { kcal: 350, protein: 12.5, fat: 7.5, carbs: 55 },
      ...overrides,
    };
  }

  it('reports no change when nothing changed, even retyped as "50,00"', () => {
    const draft = draftFromMeal(linked, owsianka);
    const retyped = validateMealDraft(
      { ...draft, ingredients: [{ productId: 'p-platki', amount: '50,00' }, ...draft.ingredients.slice(1)] },
      products,
    );
    if (!retyped.ok) throw new Error('invalid');
    expect(decideMealSave(linked, owsianka, retyped.value)).toEqual({ kind: 'unchanged' });
  });

  it('keeps a Meal linked when only Servings change (FR-026)', () => {
    const at15 = value({
      servings: 1.5,
      ingredients: [
        { productId: 'p-platki', amount: 75 },
        { productId: 'p-mleko', amount: 225 },
      ],
      macros: { kcal: 525, protein: 18.75, fat: 11.25, carbs: 82.5 },
    });
    expect(decideMealSave(linked, owsianka, at15)).toEqual({
      kind: 'save',
      meal: { ...linked, servings: 1.5, detached: null },
      detachedNow: false,
    });
  });

  it('detaches on an amount change, copying everything else exactly (US3-1)', () => {
    const changed = value({
      ingredients: [
        { productId: 'p-platki', amount: 80 },
        { productId: 'p-mleko', amount: 150 },
      ],
    });
    const result = decideMealSave(linked, owsianka, changed);

    expect(result).toEqual({
      kind: 'save',
      meal: {
        ...linked,
        servings: 1,
        detached: {
          name: 'Owsianka',
          servingsYield: 2,
          ingredients: [
            { productId: 'p-platki', amount: 160 },
            { productId: 'p-mleko', amount: 300 },
          ],
          macros: { kcal: 700, protein: 25, fat: 15, carbs: 110 },
        },
      },
      detachedNow: true,
    });
    if (result.kind !== 'save' || !result.meal.detached) throw new Error('not detached');
    // US3-2: the same Detached Meal at 2 Servings.
    expect(scaleMeal(result.meal.detached, 2)).toEqual({
      ingredients: [
        { productId: 'p-platki', amount: 160 },
        { productId: 'p-mleko', amount: 300 },
      ],
      macros: { kcal: 700, protein: 25, fat: 15, carbs: 110 },
    });
  });

  it.each([
    ['a name change', value({ name: 'Owsianka na wodzie' })],
    [
      'an added Ingredient',
      value({ ingredients: [...value().ingredients, { productId: 'p-banan', amount: 1 }] }),
    ],
    ['a removed Ingredient', value({ ingredients: value().ingredients.slice(0, 1) })],
    ['a kcal change', value({ macros: { ...value().macros, kcal: 400 } })],
    ['a protein change', value({ macros: { ...value().macros, protein: 20 } })],
    ['a fat change', value({ macros: { ...value().macros, fat: 1 } })],
    ['a carbs change', value({ macros: { ...value().macros, carbs: 60 } })],
  ])('detaches on %s (US3-4)', (_label, changed) => {
    expect(decideMealSave(linked, owsianka, changed)).toMatchObject({ kind: 'save', detachedNow: true });
  });

  it('converts an added Ingredient and drops a removed one in the copy', () => {
    const changed = value({
      ingredients: [
        { productId: 'p-mleko', amount: 150 },
        { productId: 'p-banan', amount: 1 },
      ],
    });
    const result = decideMealSave(linked, owsianka, changed);
    expect(result.kind === 'save' && result.meal.detached?.ingredients).toEqual([
      { productId: 'p-mleko', amount: 300 },
      { productId: 'p-banan', amount: 2 },
    ]);
  });

  it('updates the copy of an already Detached Meal', () => {
    const copy = { ...owsianka, name: 'Owsianka na wodzie' };
    const detached = meal({ id: 'm-2', detached: copy });
    const result = decideMealSave(detached, copy, value({ name: 'Owsianka z jabłkiem' }));

    expect(result).toMatchObject({ kind: 'save', detachedNow: false });
    expect(result.kind === 'save' && result.meal.detached?.name).toBe('Owsianka z jabłkiem');
  });

  it('converts changed values back at the new Servings when both change', () => {
    const at2 = value({
      servings: 2,
      ingredients: [
        { productId: 'p-platki', amount: 200 },
        { productId: 'p-mleko', amount: 300 },
      ],
      macros: { kcal: 700, protein: 25, fat: 15, carbs: 110 },
    });
    const result = decideMealSave(linked, owsianka, at2);
    expect(result.kind === 'save' && result.meal).toMatchObject({
      servings: 2,
      detached: { ingredients: [{ productId: 'p-platki', amount: 200 }, { productId: 'p-mleko', amount: 300 }] },
    });
  });
});
