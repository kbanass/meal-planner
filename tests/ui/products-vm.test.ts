import { describe, expect, it } from 'vitest';
import type { Product } from '../../src/domain/types';
import {
  deleteConfirmMessage,
  deleteHint,
  dishCountPhrase,
  mergeConfirmMessage,
  mergeHint,
  productMenu,
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

describe('Produkty texts', () => {
  it('explains why a used Product cannot be deleted or change its unit', () => {
    expect(deleteHint(3)).toBe('Produkt jest używany w 3 daniach – nie można go usunąć.');
    expect(unitHint(1)).toBe('Produkt jest używany w 1 daniu – jednostki nie można zmienić.');
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
    expect(productMenu([pomidor, pomidory, mleko], { product: pomidory, usage: 0 })).toEqual({
      canChangeUnit: true,
      unitHint: null,
      canMerge: true,
      mergeHint: null,
      canDelete: true,
      deleteHint: null,
    });
  });

  it('blocks unit change and delete on a used Product, with the reason', () => {
    expect(productMenu([pomidor, pomidory], { product: pomidory, usage: 2 })).toEqual({
      canChangeUnit: false,
      unitHint: 'Produkt jest używany w 2 daniach – jednostki nie można zmienić.',
      canMerge: true,
      mergeHint: null,
      canDelete: false,
      deleteHint: 'Produkt jest używany w 2 daniach – nie można go usunąć.',
    });
  });

  it('blocks merge when no other Product has the same unit', () => {
    expect(productMenu([pomidor, mleko], { product: mleko, usage: 0 })).toMatchObject({
      canMerge: false,
      mergeHint: 'Brak innych produktów z tą samą jednostką.',
    });
  });
});
