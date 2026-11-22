import { weekRange, weekRangeLabel } from '../../domain/dates';
import {
  adjustmentDirection,
  adjustmentFieldText,
  buildShoppingList,
  isListEmpty,
  type ShoppingLine,
} from '../../domain/shopping';
import type { Dish, Extra, IsoDate, Meal, Product, ProductListState } from '../../domain/types';
import { formatListAmount } from '../../domain/units';
import { mealsInRange } from '../../domain/week';
import { unitLabel } from './dish-form';
import { indexDishes } from './week';

export const emptyMessage = 'Na ten tydzień nie ma nic do kupienia.';
export const extraPlaceholder = 'Dodaj coś spoza planu…';
export const amountErrorMessage = 'Wpisz liczbę większą od zera.';
export const amountFooter = 'Zostaw puste, aby wrócić do ilości z planu.';
export const copiedToast = 'Skopiowano listę do schowka.';
export const shareFailedMessage = 'Nie udało się udostępnić listy.';

export interface ProductRow {
  kind: 'product';
  key: string;
  productId: string;
  name: string;
  ticked: boolean;
  atHome: boolean;
  /** The Amount to buy: "500 g". */
  amountText: string;
  /** "plan: 400 g", only while an Adjustment applies. */
  plannedText: string | null;
  direction: 'more' | 'less' | null;
  amountLabel: string;
  atHomeLabel: string;
  /** For the amount sheet: the unrounded Planned amount, the field's text and its unit. */
  planned: number;
  plannedAmountText: string;
  fieldText: string;
  unitLabel: string;
}

export interface ExtraRow {
  kind: 'extra';
  key: string;
  id: string;
  name: string;
  ticked: boolean;
}

export type ShoppingRow = ProductRow | ExtraRow;

export interface ShoppingPageModel {
  weekLabel: string;
  empty: boolean;
  toBuy: ShoppingRow[];
  done: ShoppingRow[];
  /** null when nothing is left to buy (FR-025). */
  shareText: string | null;
}

function productRow(line: Extract<ShoppingLine, { kind: 'product' }>): ProductRow {
  const { product, adjustment } = line;
  const amountText = formatListAmount(line.amount, product.unit);
  const plannedAmountText = formatListAmount(line.planned, product.unit);
  const direction = adjustment ? adjustmentDirection(adjustment) : null;
  const compared =
    direction === null
      ? ''
      : `${direction === 'more' ? 'więcej' : 'mniej'} niż w planie (${plannedAmountText}), `;
  return {
    kind: 'product',
    key: `p:${product.id}`,
    productId: product.id,
    name: product.name,
    ticked: line.ticked,
    atHome: line.atHome,
    amountText,
    plannedText: direction === null ? null : `plan: ${plannedAmountText}`,
    direction,
    amountLabel: `${product.name}: ${amountText}, ${compared}zmień ilość`,
    atHomeLabel: `Mam w domu: ${product.name}`,
    planned: line.planned,
    plannedAmountText,
    fieldText: adjustmentFieldText(line.amount, product.unit),
    unitLabel: unitLabel(product.unit),
  };
}

function row(line: ShoppingLine): ShoppingRow {
  if (line.kind === 'product') return productRow(line);
  const { extra } = line;
  return { kind: 'extra', key: `e:${extra.id}`, id: extra.id, name: extra.text, ticked: extra.ticked };
}

/** "Lista zakupów 16–22 lis 2026", then one line per item left to buy, in screen order (FR-026). */
export function shareText(weekStart: IsoDate, toBuy: readonly ShoppingLine[]): string {
  const lines = toBuy.map((line) =>
    line.kind === 'product'
      ? `${line.product.name} ${formatListAmount(line.amount, line.product.unit)}`
      : line.extra.text,
  );
  return [`Lista zakupów ${weekRangeLabel(weekStart)}`, ...lines].join('\n');
}

/** The Shopping List page, or null until every query has resolved (research R8). */
export function shoppingPage(
  weekStart: IsoDate,
  data: {
    products?: Product[];
    meals?: Meal[];
    dishes?: Dish[];
    states?: ProductListState[];
    extras?: Extra[];
  },
): ShoppingPageModel | null {
  const { products, meals, dishes, states, extras } = data;
  if (!products || !meals || !dishes || !states || !extras) return null;
  const list = buildShoppingList({
    products,
    meals: mealsInRange(meals, weekRange(weekStart)),
    dishesById: indexDishes(dishes),
    states,
    extras,
  });
  return {
    weekLabel: weekRangeLabel(weekStart),
    empty: isListEmpty(list),
    toBuy: list.toBuy.map(row),
    done: list.done.map(row),
    shareText: list.toBuy.length > 0 ? shareText(weekStart, list.toBuy) : null,
  };
}

/** A release on the Week header: at least 50 px, and clearly sideways (feature 002's rule, R6). */
export function headerSwipeDelta(dx: number, dy: number): -7 | 0 | 7 {
  if (Math.abs(dx) < 50 || Math.abs(dx) <= 1.5 * Math.abs(dy)) return 0;
  return dx < 0 ? 7 : -7;
}
