import { describe, expect, it } from 'vitest';
import {
  deleteConfirmMessage,
  deleteHint,
  dishCountPhrase,
  mergeConfirmMessage,
  mergeHint,
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
