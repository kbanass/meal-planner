import { describe, expect, it } from 'vitest';
import { draftFromMeal } from '../../src/domain/meals';
import type { Product } from '../../src/domain/types';
import {
  currentMealDraft,
  detachedNote,
  detachToast,
  goneMessage,
  mealErrorMessage,
  mealFieldDomId,
  mealSheet,
  restoreConfirmMessage,
  sheetValues,
} from '../../src/ui/view-models/meal-sheet';
import { meal, owsianka } from '../fakes/dishes';

const products: Product[] = [
  { id: 'p-platki', name: 'płatki owsiane', unit: 'g' },
  { id: 'p-mleko', name: 'mleko', unit: 'ml' },
];

describe('Meal sheet texts', () => {
  it('builds field ids from field paths', () => {
    expect(mealFieldDomId('ingredients[1].amount')).toBe('meal-ingredients-1-amount');
    expect(mealFieldDomId('servings')).toBe('meal-servings');
  });

  it('says "w posiłku" for a duplicate Product and reuses the other messages', () => {
    expect(mealErrorMessage('duplicateProduct')).toBe('Ten produkt jest już w posiłku.');
    expect(mealErrorMessage('notPositive')).toBe('Wartość musi być większa od zera.');
    expect(mealErrorMessage('required')).toBe('To pole jest wymagane.');
  });

  it('words the restore confirmation and the Detached Meal note', () => {
    expect(restoreConfirmMessage('Owsianka')).toBe(
      'Przywrócić „Owsianka” z dania? Zmiany w tym posiłku zostaną utracone.',
    );
    expect(detachedNote).toBe('Posiłek zmieniony – zmiany w daniu go nie dotyczą.');
  });

  it('words the gone alert and the detach toast', () => {
    expect(goneMessage).toBe('Ten posiłek już nie istnieje.');
    expect(detachToast).toBe('Posiłek zmieniony – nie będzie już śledził zmian w daniu.');
  });
});

describe('sheetValues', () => {
  it('lists the Ingredients and Macros with display rounding (US2-2)', () => {
    const draft = draftFromMeal(meal({ id: 'm-1', servings: 1.5 }), owsianka);

    expect(sheetValues(draft, products)).toEqual({
      ingredients: [
        { productId: 'p-platki', name: 'płatki owsiane', unitLabel: 'g', amount: '75', display: '75' },
        { productId: 'p-mleko', name: 'mleko', unitLabel: 'ml', amount: '225', display: '225' },
      ],
      macros: [
        { key: 'kcal', label: 'kcal', text: '525', display: '525' },
        { key: 'protein', label: 'Białko (g)', text: '18,75', display: '18,8' },
        { key: 'fat', label: 'Tłuszcz (g)', text: '11,25', display: '11,3' },
        { key: 'carbs', label: 'Węglowodany (g)', text: '82,5', display: '82,5' },
      ],
    });
  });

  it('shows typed text as it is when it is not a number, and an unknown Product by id', () => {
    const draft = {
      ...draftFromMeal(meal({ id: 'm-1' }), owsianka),
      ingredients: [{ productId: 'p-gone', amount: 'abc' }],
    };
    expect(sheetValues(draft, products).ingredients).toEqual([
      { productId: 'p-gone', name: '', unitLabel: '', amount: 'abc', display: 'abc' },
    ]);
  });
});

describe('currentMealDraft', () => {
  it('prefers the edited draft, then the stored Meal, and waits while loading', () => {
    const stored = meal({ id: 'm-1' });
    const edited = { ...draftFromMeal(stored, owsianka), name: 'Inna' };

    expect(currentMealDraft(edited, stored, owsianka)).toBe(edited);
    expect(currentMealDraft(null, stored, owsianka)).toEqual(draftFromMeal(stored, owsianka));
    expect(currentMealDraft(null, undefined, owsianka)).toBeNull();
    expect(currentMealDraft(null, stored, null)).toBeNull();
  });
});

describe('mealSheet', () => {
  it('resolves the Meal and builds its draft and rows', () => {
    const stored = meal({ id: 'm-1', servings: 1.5 });
    const model = mealSheet(null, stored, [owsianka], products);

    expect(model.source).toBe(owsianka);
    expect(model.draft).toEqual(draftFromMeal(stored, owsianka));
    expect(model.values?.macros[0]).toMatchObject({ key: 'kcal', display: '525' });
    expect(model.detached).toBe(false);
    expect(model.dishName).toBe('Owsianka');
    expect(model.productsById.get('p-mleko')?.name).toBe('mleko');
  });

  it('marks a Detached Meal and waits while loading', () => {
    const detached = meal({ id: 'm-1', detached: { ...owsianka, name: 'Inna' } });
    expect(mealSheet(null, detached, [owsianka], products)).toMatchObject({
      detached: true,
      dishName: 'Owsianka',
    });
    expect(mealSheet(null, undefined, undefined, undefined)).toMatchObject({
      source: null,
      draft: null,
      values: null,
      detached: false,
      dishName: '',
    });
  });
});
