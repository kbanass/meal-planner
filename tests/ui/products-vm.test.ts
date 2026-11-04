import { describe, expect, it } from 'vitest';
import type { Dish, Product } from '../../src/domain/types';
import {
  deleteConfirmMessage,
  deleteHint,
  dishCountPhrase,
  mealCountPhrase,
  mergeConfirmMessage,
  mergeHint,
  productMenu,
  productRows,
  renameConflictMessage,
  renameMergeQuestion,
  unitHint,
  usageLabel,
} from '../../src/ui/view-models/products';

describe('dishCountPhrase', () => {
  it.each([
    [1, '1 daniu'],
    [2, '2 daniach'],
    [5, '5 daniach'],
    [22, '22 daniach'],
  ])('uses the Polish locative for %d', (n, phrase) => {
    expect(dishCountPhrase(n)).toBe(phrase);
  });
});

describe('mealCountPhrase', () => {
  it.each([
    [1, '1 posiłku'],
    [3, '3 posiłkach'],
    [5, '5 posiłkach'],
  ])('uses the Polish locative for %d', (n, phrase) => {
    expect(mealCountPhrase(n)).toBe(phrase);
  });
});

describe('Produkty texts', () => {
  it('explains why a used Product cannot be deleted or change its unit', () => {
    expect(deleteHint({ dishes: 3, meals: 0 })).toBe(
      'Produkt jest używany w 3 daniach – nie można go usunąć.',
    );
    expect(unitHint({ dishes: 1, meals: 0 })).toBe(
      'Produkt jest używany w 1 daniu – jednostki nie można zmienić.',
    );
  });

  it('names Detached Meals too', () => {
    expect(deleteHint({ dishes: 0, meals: 1 })).toBe(
      'Produkt jest używany w 1 posiłku – nie można go usunąć.',
    );
    expect(deleteHint({ dishes: 2, meals: 3 })).toBe(
      'Produkt jest używany w 2 daniach i 3 posiłkach – nie można go usunąć.',
    );
    expect(unitHint({ dishes: 2, meals: 3 })).toBe(
      'Produkt jest używany w 2 daniach i 3 posiłkach – jednostki nie można zmienić.',
    );
  });

  it('explains when there is nothing to merge with', () => {
    expect(mergeHint(false)).toBe('Brak innych produktów z tą samą jednostką.');
    expect(mergeHint(true)).toBeNull();
  });

  it('labels the usage count', () => {
    expect(usageLabel(4)).toBe('używany: 4');
  });

  it('words the conflict and confirmation dialogs', () => {
    expect(renameConflictMessage('pomidor')).toBe('Produkt „pomidor” już istnieje.');
    expect(renameMergeQuestion('pomidory', 'pomidor')).toBe('Scalić „pomidory” z „pomidor”?');
    expect(mergeConfirmMessage('pomidory', 'pomidor')).toBe(
      'Scalić „pomidory” z „pomidor”? Wszystkie dania będą używać „pomidor”.',
    );
    expect(deleteConfirmMessage('pomidor')).toBe('Usunąć produkt „pomidor”?');
  });
});

describe('productMenu', () => {
  const pomidor: Product = { id: 'p-1', name: 'pomidor', unit: 'g' };
  const pomidory: Product = { id: 'p-2', name: 'pomidory', unit: 'g' };
  const mleko: Product = { id: 'p-3', name: 'mleko', unit: 'ml' };

  it('allows every action on an unused Product with a merge candidate', () => {
    expect(productMenu([pomidor, pomidory, mleko], { product: pomidory, usage: 0, breakdown: { dishes: 0, meals: 0 } })).toEqual({
      canChangeUnit: true,
      unitHint: null,
      canMerge: true,
      mergeHint: null,
      canDelete: true,
      deleteHint: null,
    });
  });

  it('blocks unit change and delete on a used Product, with the reason', () => {
    expect(productMenu([pomidor, pomidory], { product: pomidory, usage: 2, breakdown: { dishes: 2, meals: 0 } })).toEqual({
      canChangeUnit: false,
      unitHint: 'Produkt jest używany w 2 daniach – jednostki nie można zmienić.',
      canMerge: true,
      mergeHint: null,
      canDelete: false,
      deleteHint: 'Produkt jest używany w 2 daniach – nie można go usunąć.',
    });
  });

  it('blocks merge when no other Product has the same unit', () => {
    expect(productMenu([pomidor, mleko], { product: mleko, usage: 0, breakdown: { dishes: 0, meals: 0 } })).toMatchObject({
      canMerge: false,
      mergeHint: 'Brak innych produktów z tą samą jednostką.',
    });
  });
});

describe('productRows', () => {
  const pomidor: Product = { id: 'p-1', name: 'pomidor', unit: 'g' };
  const mleko: Product = { id: 'p-2', name: 'mleko', unit: 'ml' };
  const dish: Dish = {
    id: 'd-1',
    name: 'Zupa',
    servingsYield: 1,
    ingredients: [{ productId: pomidor.id, amount: 100 }],
    macros: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
    notes: '',
    photo: null,
    archived: false,
  };

  it('sorts the Products and gives each its usage, split into Dishes and Detached Meals', () => {
    expect(productRows([pomidor, mleko], [dish], [[{ productId: pomidor.id, amount: 30 }]])).toEqual([
      { product: mleko, usage: 0, breakdown: { dishes: 0, meals: 0 } },
      { product: pomidor, usage: 2, breakdown: { dishes: 1, meals: 1 } },
    ]);
  });
});
