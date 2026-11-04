import { describe, expect, it } from 'vitest';
import {
  findNameConflict,
  shouldOfferCreate,
  suggestProducts,
  validateProductName,
} from '../../src/domain/products';
import type { Product } from '../../src/domain/types';

const mleko: Product = { id: 'p-mleko', name: 'mleko', unit: 'ml' };
const losos: Product = { id: 'p-losos', name: 'łosoś', unit: 'g' };
const maka: Product = { id: 'p-maka', name: 'mąka', unit: 'g' };
const maslo: Product = { id: 'p-maslo', name: 'masło', unit: 'g' };
const kasza: Product = { id: 'p-kasza', name: 'Kasza jaglana', unit: 'g' };
const products: readonly Product[] = Object.freeze([mleko, losos, maka, maslo, kasza]);

describe('validateProductName', () => {
  it('requires a name after normalisation', () => {
    expect(validateProductName('   ')).toBe('required');
  });

  it('accepts a non-empty name', () => {
    expect(validateProductName('mleko')).toBeNull();
  });
});

describe('findNameConflict', () => {
  it('finds a Product with the same name key', () => {
    expect(findNameConflict(products, ' Mleko ')).toBe(mleko);
  });

  it('ignores the Product being renamed', () => {
    expect(findNameConflict(products, ' Mleko ', mleko.id)).toBeNull();
  });

  it('returns null when nothing matches', () => {
    expect(findNameConflict(products, 'jogurt')).toBeNull();
  });
});

describe('suggestProducts', () => {
  it('matches ignoring case', () => {
    expect(suggestProducts(products, 'MLE')).toEqual([mleko]);
    expect(suggestProducts(products, 'ml')).toEqual([mleko]);
  });

  it('does not fold diacritics', () => {
    expect(suggestProducts(products, 'losos')).not.toContain(losos);
  });

  it('returns nothing for an empty query', () => {
    expect(suggestProducts(products, '')).toEqual([]);
    expect(suggestProducts(products, '  ')).toEqual([]);
  });

  it('sorts matches in Polish alphabetical order', () => {
    expect(suggestProducts(products, 'a')).toEqual([kasza, maslo, maka]);
  });

  it('breaks ties between names that collate equal by id', () => {
    const accented: Product = { id: 'p-2', name: 'crème', unit: 'g' };
    const plain: Product = { id: 'p-1', name: 'creme', unit: 'g' };

    expect(suggestProducts([accented, plain], 'cr')).toEqual([plain, accented]);
  });
});

describe('shouldOfferCreate', () => {
  it('is false for an existing name in another form', () => {
    expect(shouldOfferCreate(products, ' Mleko ')).toBe(false);
  });

  it('is true for a new name', () => {
    expect(shouldOfferCreate(products, 'jogurt grecki')).toBe(true);
  });

  it('is false for a blank query', () => {
    expect(shouldOfferCreate(products, '  ')).toBe(false);
  });
});
