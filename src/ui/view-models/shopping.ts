import { addDays, weekRange, weekRangeLabel } from '../../domain/dates';
import {
  adjustmentDirection,
  adjustmentFieldText,
  buildShoppingList,
  isListEmpty,
  leftToBuy,
  type ProductLine,
  type ShoppingLine,
} from '../../domain/shopping';
import type { Dish, Extra, IsoDate, Meal, Product, ProductListState } from '../../domain/types';
import { formatListAmount } from '../../domain/units';
import { mealsInRange } from '../../domain/week';
import { unitLabel } from './dish-form';
import { indexDishes } from './week';
import { FACE_OFFSETS, type FaceOffset } from './week-track';

export const emptyMessage = 'Na ten tydzień nie ma nic do kupienia.';
export const atHomeShareSuffix = '(mam w domu)';
export const extraPlaceholder = 'Coś spoza planu…';
export const extraAmountPlaceholder = 'Ilość (opcjonalnie)';
export const extraNameLabel = 'Nazwa';
export const extraAmountLabel = 'Ilość (opcjonalnie)';
export const extraNameError = 'Wpisz nazwę.';
export const atHomeTitle = 'Mam w domu';
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
  /** The typed amount as written ("2 opak."), or null. */
  amountText: string | null;
  ticked: boolean;
  /** "kawa: 2 opak., edytuj", the name of the button that opens the edit sheet. */
  openLabel: string;
}

export type ShoppingRow = ProductRow | ExtraRow;

export interface ShoppingPageModel {
  weekLabel: string;
  empty: boolean;
  /** The list itself: ticked rows stay in place, dimmed (FR-009, FR-012). */
  toBuy: ShoppingRow[];
  /** The "Mam w domu" card at the bottom (FR-015). */
  atHome: ProductRow[];
  /** null when nothing is left to buy and nothing is At Home: the share button is dimmed (FR-025). */
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
    amountLabel: `${product.name}: ${amountText}, ${compared}edytuj`,
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
  return {
    kind: 'extra',
    key: `e:${extra.id}`,
    id: extra.id,
    name: extra.text,
    amountText: extra.amount ?? null,
    ticked: extra.ticked,
    openLabel: `${extra.text}${extra.amount ? `: ${extra.amount}` : ''}, edytuj`,
  };
}

function shareLine(line: ShoppingLine): string {
  return line.kind === 'product'
    ? `${line.product.name} ${formatListAmount(line.amount, line.product.unit)}`
    : [line.extra.text, line.extra.amount].filter(Boolean).join(' ');
}

/**
 * "Lista zakupów 16–22 lis 2026", then one line per item left to buy, then the At Home Products
 * marked "(mam w domu)", each in screen order (FR-026).
 */
export function shareText(
  weekStart: IsoDate,
  toBuy: readonly ShoppingLine[],
  atHome: readonly ProductLine[] = [],
): string {
  const lines = [...toBuy.map(shareLine), ...atHome.map((line) => `${shareLine(line)} ${atHomeShareSuffix}`)];
  return [`Lista zakupów ${weekRangeLabel(weekStart)}`, ...lines].join('\n');
}

/** One face of the Shopping List's Week header: the Week's dates. */
export interface ListWeekFace {
  weekStart: IsoDate;
  offset: FaceOffset;
  isViewed: boolean;
  label: string;
}

/** The header carousel's five faces around the Shown Week, offsets −2…2 (FR-002). */
export function listWeekFaces(weekStart: IsoDate): ListWeekFace[] {
  return FACE_OFFSETS.map((offset) => {
    const start = addDays(weekStart, 7 * offset);
    return { weekStart: start, offset, isViewed: offset === 0, label: weekRangeLabel(start) };
  });
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
    atHome: list.atHome.map(productRow),
    // Something to buy, or something At Home, makes a list worth sharing (FR-025).
    shareText:
      leftToBuy(list).length > 0 || list.atHome.length > 0
        ? shareText(weekStart, leftToBuy(list), list.atHome)
        : null,
  };
}

