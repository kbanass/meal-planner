import type { IngredientDraft, MacrosDraft } from '../../domain/drafts';
import {
  draftFromMeal,
  isDetached,
  mealSource,
  type FieldError,
  type MealDraft,
} from '../../domain/meals';
import { formatKcal, formatMacro } from '../../domain/nutrition';
import { parseDecimal } from '../../domain/numbers';
import type { Dish, Meal, MealSource, Product } from '../../domain/types';
import { formatAmount } from '../../domain/units';
import { errorMessage, indexProducts, unitLabel } from './dish-form';
import { indexDishes } from './week';

/** DOM id for a field path, e.g. `ingredients[1].amount` → `meal-ingredients-1-amount`. */
export function mealFieldDomId(path: string): string {
  return `meal-${path.replace(/[^a-zA-Z0-9]+/g, '-').replace(/-$/, '')}`;
}

export function mealErrorMessage(code: FieldError): string {
  return code === 'duplicateProduct' ? 'Ten produkt jest już w posiłku.' : errorMessage(code);
}

export const goneMessage = 'Ten posiłek już nie istnieje.';

export const detachToast = 'Posiłek zmieniony – nie będzie już śledził zmian w daniu.';

export const detachedNote = 'Posiłek zmieniony – zmiany w daniu go nie dotyczą.';

export function restoreConfirmMessage(dishName: string): string {
  return `Przywrócić „${dishName}” z dania? Zmiany w tym posiłku zostaną utracone.`;
}

/**
 * The draft the sheet shows: the user's edits once there are any, otherwise the stored Meal.
 * `null` while the Meal or its source is still loading (or gone).
 */
export function currentMealDraft(
  edited: MealDraft | null,
  meal: Meal | undefined,
  source: MealSource | null,
): MealDraft | null {
  if (edited) return edited;
  return meal && source ? draftFromMeal(meal, source) : null;
}

type MacroKey = keyof MealDraft['macros'];

const MACRO_FIELDS: { key: MacroKey; label: string; format(value: number): string }[] = [
  { key: 'kcal', label: 'kcal', format: formatKcal },
  { key: 'protein', label: 'Białko (g)', format: formatMacro },
  { key: 'fat', label: 'Tłuszcz (g)', format: formatMacro },
  { key: 'carbs', label: 'Węglowodany (g)', format: formatMacro },
];

/** Typed text shown with display rounding, or as it is when it is not a number. */
function display(text: string, format: (value: number) => string): string {
  const parsed = parseDecimal(text);
  return parsed === null ? text : format(parsed);
}

export interface SheetIngredient {
  productId: string;
  name: string;
  unitLabel: string;
  amount: string; // the draft text, for the input
  display: string; // display-rounded, for read-only rows
}

export interface SheetMacro {
  key: MacroKey;
  label: string;
  text: string;
  display: string;
}

/**
 * The Ingredient and Macro rows of a form: the Meal sheet or the Dish form (FR-017, FR-047,
 * spec Edge Cases rounding).
 */
export function sheetValues(
  draft: { ingredients: IngredientDraft[]; macros: MacrosDraft },
  products: readonly Product[],
): { ingredients: SheetIngredient[]; macros: SheetMacro[] } {
  const byId = new Map(products.map((product) => [product.id, product]));
  return {
    ingredients: draft.ingredients.map((ingredient) => {
      const product = byId.get(ingredient.productId);
      return {
        productId: ingredient.productId,
        name: product?.name ?? '',
        unitLabel: product ? unitLabel(product.unit) : '',
        amount: ingredient.amount,
        display: product
          ? display(ingredient.amount, (value) => formatAmount(value, product.unit))
          : ingredient.amount,
      };
    }),
    macros: MACRO_FIELDS.map(({ key, label, format }) => ({
      key,
      label,
      text: draft.macros[key],
      display: display(draft.macros[key], format),
    })),
  };
}

export interface MealSheetModel {
  dishesById: ReadonlyMap<string, Dish>;
  productsById: ReadonlyMap<string, Product>;
  source: MealSource | null;
  draft: MealDraft | null;
  values: { ingredients: SheetIngredient[]; macros: SheetMacro[] } | null;
  detached: boolean;
  /** The source Dish's name, for "przywróć z Dania". */
  dishName: string;
}

/** Everything the Meal sheet shows. Live data is `undefined` while it loads. */
export function mealSheet(
  edited: MealDraft | null,
  meal: Meal | undefined,
  dishes: readonly Dish[] | undefined,
  products: readonly Product[] | undefined,
): MealSheetModel {
  const dishesById = indexDishes(dishes ?? []);
  const productsById = indexProducts(products ?? []);
  const source = meal ? mealSource(meal, dishesById) : null;
  const draft = currentMealDraft(edited, meal, source);
  return {
    dishesById,
    productsById,
    source,
    draft,
    values: draft ? sheetValues(draft, products ?? []) : null,
    detached: meal ? isDetached(meal) : false,
    dishName: (meal && dishesById.get(meal.dishId)?.name) ?? '',
  };
}
