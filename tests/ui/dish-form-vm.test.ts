import { describe, expect, it } from 'vitest';
import type { DishFieldError } from '../../src/domain/dishes';
import { errorMessage, firstInvalidField, unitLabel } from '../../src/ui/view-models/dish-form';

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
