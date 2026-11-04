import { compareIds, compareNames, nameKey, normalizeName } from './names';
import { roundTo2 } from './numbers';
import type { Dish, Ingredient, Product } from './types';

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

/**
 * productId → number of Dishes (archived included) and Detached Meal Ingredient lists that
 * use the Product (FR-017). Unused Products are absent, meaning 0.
 */
export function countProductUsage(
  dishes: readonly Dish[],
  detachedMealIngredientLists: readonly (readonly Ingredient[])[],
): ReadonlyMap<string, number> {
  const usage = new Map<string, number>();
  const lists = [...dishes.map((dish) => dish.ingredients), ...detachedMealIngredientLists];
  for (const list of lists) {
    for (const productId of new Set(list.map((ingredient) => ingredient.productId))) {
      usage.set(productId, (usage.get(productId) ?? 0) + 1);
    }
  }
  return usage;
}

export function productActions(usage: number): { canDelete: boolean; canChangeUnit: boolean } {
  return { canDelete: usage === 0, canChangeUnit: usage === 0 };
}

export function canMerge(from: Product, into: Product): boolean {
  return from.id !== into.id && from.unit === into.unit;
}

/** Products that `from` can be merged into, in Polish alphabetical order. */
export function mergeCandidates(products: readonly Product[], from: Product): Product[] {
  return products.filter((product) => canMerge(from, product)).sort(byName);
}

/**
 * Replaces `fromId` with `intoId`. If both are present, keeps one Ingredient at the position
 * of the first, with the amounts summed (FR-021, FR-022).
 */
export function mergeIngredients(
  list: readonly Ingredient[],
  fromId: string,
  intoId: string,
): Ingredient[] {
  const total = roundTo2(
    list
      .filter((ingredient) => ingredient.productId === fromId || ingredient.productId === intoId)
      .reduce((sum, ingredient) => sum + ingredient.amount, 0),
  );
  const merged: Ingredient[] = [];
  let placed = false;
  for (const ingredient of list) {
    if (ingredient.productId !== fromId && ingredient.productId !== intoId) {
      merged.push({ ...ingredient });
    } else if (!placed) {
      merged.push({ productId: intoId, amount: total });
      placed = true;
    }
  }
  return merged;
}

export function selectProductRows(
  products: readonly Product[],
  usage: ReadonlyMap<string, number>,
): { product: Product; usage: number }[] {
  return [...products]
    .sort(byName)
    .map((product) => ({ product, usage: usage.get(product.id) ?? 0 }));
}
