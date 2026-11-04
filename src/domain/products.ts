import { compareIds, compareNames, nameKey, normalizeName } from './names';
import type { Product } from './types';

function byName(a: Product, b: Product): number {
  return compareNames(a.name, b.name) || compareIds(a.id, b.id);
}

export function validateProductName(input: string): 'required' | null {
  return normalizeName(input) === '' ? 'required' : null;
}

/** The other Product whose name key equals `name`'s, if any. */
export function findNameConflict(
  products: readonly Product[],
  name: string,
  selfId?: string,
): Product | null {
  const key = nameKey(name);
  return products.find((product) => product.id !== selfId && nameKey(product.name) === key) ?? null;
}

/** Products whose name key contains the query's, in Polish alphabetical order. No diacritic folding. */
export function suggestProducts(products: readonly Product[], query: string): Product[] {
  const key = nameKey(query);
  if (key === '') return [];
  return products.filter((product) => nameKey(product.name).includes(key)).sort(byName);
}

export function shouldOfferCreate(products: readonly Product[], query: string): boolean {
  return nameKey(query) !== '' && findNameConflict(products, query) === null;
}
