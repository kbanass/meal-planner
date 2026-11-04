import {
  mergeCandidates,
  productActions,
  productUsageBreakdown,
  selectProductRows,
  type UsageBreakdown,
} from '../../domain/products';
import type { Dish, Ingredient, Product } from '../../domain/types';

/** "{N} daniach" in the Polish locative: "1 daniu", otherwise "N daniach". */
export function dishCountPhrase(n: number): string {
  return n === 1 ? '1 daniu' : `${n} daniach`;
}

/** "{N} posiłkach" in the Polish locative: "1 posiłku", otherwise "N posiłkach". */
export function mealCountPhrase(n: number): string {
  return n === 1 ? '1 posiłku' : `${n} posiłkach`;
}

/** "2 daniach i 3 posiłkach", leaving out a part that is zero. */
function usagePhrase({ dishes, meals }: UsageBreakdown): string {
  const parts = [dishes > 0 ? dishCountPhrase(dishes) : null, meals > 0 ? mealCountPhrase(meals) : null];
  return parts.filter((part) => part !== null).join(' i ');
}

export function usageLabel(n: number): string {
  return `używany: ${n}`;
}

export function deleteHint(usage: UsageBreakdown): string {
  return `Produkt jest używany w ${usagePhrase(usage)} – nie można go usunąć.`;
}

export function unitHint(usage: UsageBreakdown): string {
  return `Produkt jest używany w ${usagePhrase(usage)} – jednostki nie można zmienić.`;
}

export interface ProductRow {
  product: Product;
  usage: number;
  breakdown: UsageBreakdown;
}

/** The Produkty list: Products by name, each with its usage by Dishes and Detached Meals. */
export function productRows(
  products: readonly Product[],
  dishes: readonly Dish[],
  detachedMealIngredientLists: readonly (readonly Ingredient[])[],
): ProductRow[] {
  const breakdown = productUsageBreakdown(dishes, detachedMealIngredientLists);
  const totals = new Map([...breakdown].map(([id, { dishes, meals }]) => [id, dishes + meals]));
  return selectProductRows(products, totals).map((row) => ({
    ...row,
    breakdown: breakdown.get(row.product.id) ?? { dishes: 0, meals: 0 },
  }));
}

export function mergeHint(hasCandidates: boolean): string | null {
  return hasCandidates ? null : 'Brak innych produktów z tą samą jednostką.';
}

export function renameConflictMessage(name: string): string {
  return `Produkt „${name}” już istnieje.`;
}

export function renameMergeQuestion(from: string, into: string): string {
  return `Scalić „${from}” z „${into}”?`;
}

export function mergeConfirmMessage(from: string, into: string): string {
  return `${renameMergeQuestion(from, into)} Wszystkie dania będą używać „${into}”.`;
}

export function deleteConfirmMessage(name: string): string {
  return `Usunąć produkt „${name}”?`;
}

export interface ProductMenu {
  canChangeUnit: boolean;
  unitHint: string | null;
  canMerge: boolean;
  mergeHint: string | null;
  canDelete: boolean;
  deleteHint: string | null;
}

/** Which actions the Produkty action sheet enables for a row, and why the others are disabled. */
export function productMenu(products: readonly Product[], row: ProductRow): ProductMenu {
  const { canChangeUnit, canDelete } = productActions(row.usage);
  const canMerge = mergeCandidates(products, row.product).length > 0;
  return {
    canChangeUnit,
    unitHint: canChangeUnit ? null : unitHint(row.breakdown),
    canMerge,
    mergeHint: mergeHint(canMerge),
    canDelete,
    deleteHint: canDelete ? null : deleteHint(row.breakdown),
  };
}
