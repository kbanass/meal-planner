import { mealSource, scaleMeal } from './meals';
import { compareIds, compareNames } from './names';
import { parseDecimal, roundTo2 } from './numbers';
import type {
  Adjustment,
  Dish,
  Extra,
  IsoDate,
  Meal,
  Product,
  ProductListState,
  Unit,
} from './types';
import { displayQuantity } from './units';

/** One Product on the Week's Shopping List. */
export interface ProductLine {
  kind: 'product';
  product: Product;
  planned: number; // unrounded Planned amount, > 0
  adjustment: Adjustment | null; // only when it applies (FR-020)
  amount: number; // Amount to buy: adjustment.amount ?? planned
  ticked: boolean;
  atHome: boolean;
}

export interface ExtraLine {
  kind: 'extra';
  extra: Extra;
}

export type ShoppingLine = ProductLine | ExtraLine;

export interface ShoppingList {
  /** Every Extra and every Product not At Home, ticked or not, sorted (FR-009). Ticks don't move items. */
  toBuy: ShoppingLine[];
  /** Products marked At Home, sorted (FR-015). */
  atHome: ProductLine[];
}

export type StatePatch = Partial<Pick<ProductListState, 'ticked' | 'atHome' | 'adjustment'>>;

/**
 * productId → Planned amount: the sum of the Week's scaled Ingredients, unrounded. Meals are
 * summed in id order, so float sums don't depend on storage order (research R3). Meals with no
 * source are skipped. Only amounts above zero are present.
 */
export function plannedAmounts(
  meals: readonly Meal[],
  dishesById: ReadonlyMap<string, Dish>,
): ReadonlyMap<string, number> {
  const sums = new Map<string, number>();
  const ordered = [...meals].sort((a, b) => compareIds(a.id, b.id));
  for (const meal of ordered) {
    const source = mealSource(meal, dishesById);
    if (source === null) continue;
    for (const ingredient of scaleMeal(source, meal.servings).ingredients) {
      sums.set(ingredient.productId, (sums.get(ingredient.productId) ?? 0) + ingredient.amount);
    }
  }
  for (const [productId, amount] of sums) {
    if (!(amount > 0)) sums.delete(productId);
  }
  return sums;
}

/** FR-020: an Adjustment applies while the Planned amount is still the one it was typed against. */
export function adjustmentApplies(adjustment: Adjustment | null, planned: number): boolean {
  return adjustment !== null && roundTo2(planned) === adjustment.plannedAmount;
}

export function adjustmentDirection(adjustment: Adjustment): 'more' | 'less' {
  return adjustment.amount > adjustment.plannedAmount ? 'more' : 'less';
}

function lineText(line: ShoppingLine): string {
  return line.kind === 'product' ? line.product.name : line.extra.text;
}

function lineId(line: ShoppingLine): string {
  return line.kind === 'product' ? line.product.id : line.extra.id;
}

function compareLines(a: ShoppingLine, b: ShoppingLine): number {
  return compareNames(lineText(a), lineText(b)) || compareIds(lineId(a), lineId(b));
}

function isAtHome(line: ShoppingLine): line is ProductLine {
  return line.kind === 'product' && line.atHome;
}

function isTicked(line: ShoppingLine): boolean {
  return line.kind === 'product' ? line.ticked : line.extra.ticked;
}

/** FR-026: what is still left to buy, the lines that are shared. */
export function leftToBuy(list: ShoppingList): ShoppingLine[] {
  return list.toBuy.filter((line) => !isTicked(line));
}

/**
 * The Week's list (FR-004, FR-009): one line per planned Product with a Product record, plus the
 * Extras, split into the list itself and the Products At Home, each sorted by the text shown.
 */
export function buildShoppingList(input: {
  products: readonly Product[];
  meals: readonly Meal[];
  dishesById: ReadonlyMap<string, Dish>;
  states: readonly ProductListState[];
  extras: readonly Extra[];
}): ShoppingList {
  const planned = plannedAmounts(input.meals, input.dishesById);
  const statesById = new Map(input.states.map((s) => [s.productId, s]));
  const lines: ShoppingLine[] = [];
  for (const product of input.products) {
    const amount = planned.get(product.id);
    if (amount === undefined) continue;
    const state = statesById.get(product.id);
    const stored = state?.adjustment ?? null;
    const adjustment = adjustmentApplies(stored, amount) ? stored : null;
    lines.push({
      kind: 'product',
      product,
      planned: amount,
      adjustment,
      amount: adjustment?.amount ?? amount,
      ticked: state?.ticked ?? false,
      atHome: state?.atHome ?? false,
    });
  }
  for (const extra of input.extras) lines.push({ kind: 'extra', extra });
  lines.sort(compareLines);
  return { toBuy: lines.filter((line) => !isAtHome(line)), atHome: lines.filter(isAtHome) };
}

/** FR-010: nothing planned and no Extras. */
export function isListEmpty(list: ShoppingList): boolean {
  return list.toBuy.length === 0 && list.atHome.length === 0;
}

/**
 * Applies a tap or a save to a Product's record. Returns null when nothing is left set, which
 * means "delete the record" (research R1).
 */
export function applyStatePatch(
  state: ProductListState | undefined,
  key: { weekStart: IsoDate; productId: string },
  patch: StatePatch,
): ProductListState | null {
  const next: ProductListState = {
    weekStart: key.weekStart,
    productId: key.productId,
    ticked: patch.ticked ?? state?.ticked ?? false,
    atHome: patch.atHome ?? state?.atHome ?? false,
    adjustment: patch.adjustment !== undefined ? patch.adjustment : (state?.adjustment ?? null),
  };
  return next.ticked || next.atHome || next.adjustment !== null ? next : null;
}

/**
 * FR-028, research R4: the kept Product's record for one Week after merging `from` into it.
 * Both Adjustments are dropped. A mark is kept only if every participant has it. Participants
 * are the Products planned that Week, or both when neither is. A missing record has no marks.
 */
export function mergeProductListStates(input: {
  weekStart: IsoDate;
  intoId: string;
  from: ProductListState | undefined;
  into: ProductListState | undefined;
  fromPlanned: number;
  intoPlanned: number;
}): ProductListState | null {
  const both = [
    { state: input.from, planned: input.fromPlanned },
    { state: input.into, planned: input.intoPlanned },
  ];
  const planned = both.filter((p) => p.planned > 0);
  const participants = planned.length > 0 ? planned : both;
  const all = (mark: 'ticked' | 'atHome') => participants.every((p) => p.state?.[mark] ?? false);
  return applyStatePatch(
    undefined,
    { weekStart: input.weekStart, productId: input.intoId },
    { ticked: all('ticked'), atHome: all('atHome') },
  );
}

/** The amount field's starting text: the shown quantity as plain digits, e.g. "1235", "3" (FR-017). */
export function adjustmentFieldText(amount: number, unit: Unit): string {
  return String(displayQuantity(amount, unit));
}

export type AdjustmentSave =
  | { kind: 'unchanged' }
  | { kind: 'clear' }
  | { kind: 'set'; adjustment: Adjustment }
  | { kind: 'invalid' };

/**
 * What saving the amount sheet does (FR-018, FR-019). The field's untouched text changes
 * nothing; blank text or the planned value clears the Adjustment; anything else above zero is
 * stored with the Planned amount it was typed against.
 */
export function decideAdjustmentSave(input: {
  text: string;
  filledText: string;
  planned: number;
}): AdjustmentSave {
  const value = parseDecimal(input.text);
  if (value !== null && value === parseDecimal(input.filledText)) return { kind: 'unchanged' };
  if (input.text.trim() === '') return { kind: 'clear' };
  if (value === null || value <= 0) return { kind: 'invalid' };
  const amount = roundTo2(value);
  const plannedAmount = roundTo2(input.planned);
  if (amount === plannedAmount) return { kind: 'clear' };
  return { kind: 'set', adjustment: { amount, plannedAmount } };
}
