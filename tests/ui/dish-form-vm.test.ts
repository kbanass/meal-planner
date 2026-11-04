import { describe, expect, it } from 'vitest';
import type { DishFieldError } from '../../src/domain/dishes';
import {
  errorMessage,
  firstInvalidField,
  photoErrorMessage,
  photoSection,
  unitLabel,
} from '../../src/ui/view-models/dish-form';

describe('errorMessage', () => {
  it.each<[DishFieldError, string]>([
    ['required', 'To pole jest wymagane.'],
    ['notANumber', 'Wpisz liczbę, np. 1,5.'],
    ['notPositive', 'Wartość musi być większa od zera.'],
    ['negative', 'Wartość nie może być ujemna.'],
    ['duplicateProduct', 'Ten produkt jest już w daniu.'],
    ['unknownProduct', 'Nieznany produkt.'],
  ])('maps %s to its Polish message', (code, message) => {
    expect(errorMessage(code)).toBe(message);
  });
});

describe('unitLabel', () => {
  it('labels units in Polish', () => {
    expect(unitLabel('g')).toBe('g');
    expect(unitLabel('ml')).toBe('ml');
    expect(unitLabel('pcs')).toBe('szt.');
  });
});

describe('firstInvalidField', () => {
  it('follows the form order', () => {
    expect(
      firstInvalidField({
        'macros.carbs': 'required',
        'macros.kcal': 'required',
        'ingredients[2].amount': 'required',
        'ingredients[10].amount': 'required',
        servingsYield: 'notPositive',
        name: 'required',
      }),
    ).toBe('name');

    expect(
      firstInvalidField({
        'macros.protein': 'required',
        'ingredients[10].amount': 'required',
        'ingredients[2].productId': 'duplicateProduct',
      }),
    ).toBe('ingredients[2].productId');

    expect(firstInvalidField({ 'macros.fat': 'negative', 'macros.carbs': 'required' })).toBe('macros.fat');
  });

  it('returns null when there are no errors', () => {
    expect(firstInvalidField({})).toBeNull();
  });
});

describe('photoErrorMessage', () => {
  it('explains decode and quota failures in Polish', () => {
    expect(photoErrorMessage('decode')).toBe('Nie udało się wczytać zdjęcia. Spróbuj innego pliku.');
    expect(photoErrorMessage('quota')).toBe(
      'Brak miejsca na urządzeniu. Danie zapisano bez nowego zdjęcia.',
    );
  });
});

describe('photoSection', () => {
  const stored = { id: 'photo-1', mimeType: 'image/webp' } as const;
  const file = new Blob(['x']);

  it('offers to add a photo when there is none', () => {
    expect(photoSection(null, { kind: 'keep' })).toEqual({
      shows: 'none',
      pickLabel: 'Dodaj zdjęcie',
      canRemove: false,
    });
  });

  it('shows the stored photo until it changes', () => {
    expect(photoSection(stored, { kind: 'keep' })).toEqual({
      shows: 'stored',
      pickLabel: 'Zmień zdjęcie',
      canRemove: true,
    });
  });

  it('shows a picked file before saving', () => {
    expect(photoSection(null, { kind: 'set', file })).toEqual({
      shows: 'pending',
      pickLabel: 'Zmień zdjęcie',
      canRemove: true,
    });
  });

  it('shows the placeholder after removing', () => {
    expect(photoSection(stored, { kind: 'remove' })).toEqual({
      shows: 'none',
      pickLabel: 'Dodaj zdjęcie',
      canRemove: false,
    });
  });
});
