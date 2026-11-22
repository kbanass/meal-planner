import { describe, expect, it } from 'vitest';
import { buildShoppingList } from '../../src/domain/shopping';
import type { Extra, Product, ProductListState } from '../../src/domain/types';
import {
  amountErrorMessage,
  amountFooter,
  copiedToast,
  emptyMessage,
  extraPlaceholder,
  headerSwipeDelta,
  shareFailedMessage,
  shareText,
  shoppingPage,
  type ProductRow,
} from '../../src/ui/view-models/shopping';
import { byId, dish, meal, owsianka } from '../fakes/dishes';

const WEEK = '2026-11-02';

const platki: Product = { id: 'p-platki', name: 'płatki owsiane', unit: 'g' };
const mleko: Product = { id: 'p-mleko', name: 'mleko', unit: 'ml' };
const jajka: Product = { id: 'p-jajka', name: 'jajka', unit: 'pcs' };
const ryz: Product = { id: 'p-ryz', name: 'ryż', unit: 'g' };

const kakao = dish({ id: 'd-kakao', name: 'Kakao', ingredients: [{ productId: 'p-mleko', amount: 500 }] });
const jajecznica = dish({ id: 'd-j', name: 'Jajecznica', ingredients: [{ productId: 'p-jajka', amount: 2.5 }] });
const risotto = dish({ id: 'd-r', name: 'Risotto', ingredients: [{ productId: 'p-ryz', amount: 400 }] });

function state(productId: string, fields: Partial<ProductListState>): ProductListState {
  return { weekStart: WEEK, productId, ticked: false, atHome: false, adjustment: null, ...fields };
}

function data(overrides: { states?: ProductListState[]; extras?: Extra[] } = {}) {
  return {
    products: [platki, mleko, jajka, ryz],
    meals: [
      meal({ id: 'm1', servings: 1 }),
      meal({ id: 'm2', servings: 3 }),
      meal({ id: 'm3', dishId: kakao.id }),
      meal({ id: 'm4', dishId: jajecznica.id }),
      meal({ id: 'm5', dishId: risotto.id }),
      // Next Week: not on this list.
      meal({ id: 'm6', dishId: risotto.id, date: '2026-11-09' }),
    ],
    dishes: [owsianka, kakao, jajecznica, risotto],
    states: overrides.states ?? [],
    extras: overrides.extras ?? [],
  };
}

function productRow(rows: readonly unknown[], name: string): ProductRow {
  const found = (rows as ProductRow[]).find((r) => r.kind === 'product' && r.name === name);
  if (!found) throw new Error(`No row ${name}`);
  return found;
}

describe('shoppingPage', () => {
  it.each(['products', 'meals', 'dishes', 'states', 'extras'] as const)(
    'is null while %s is loading',
    (key) => {
      expect(shoppingPage(WEEK, { ...data(), [key]: undefined })).toBeNull();
    },
  );

  it("shows the Week's rows with their amounts", () => {
    const model = shoppingPage(WEEK, data({ extras: [{ id: 'e1', weekStart: WEEK, text: 'kawa', ticked: false }] }))!;

    expect(model.weekLabel).toBe('2–8 lis 2026');
    expect(model.empty).toBe(false);
    expect(model.toBuy.map((r) => [r.kind, r.key, r.name])).toEqual([
      ['product', 'p:p-jajka', 'jajka'],
      ['extra', 'e:e1', 'kawa'],
      ['product', 'p:p-mleko', 'mleko'],
      ['product', 'p:p-platki', 'płatki owsiane'],
      ['product', 'p:p-ryz', 'ryż'],
    ]);
    expect(productRow(model.toBuy, 'mleko')).toMatchObject({ productId: 'p-mleko', amountText: '1,1 l', ticked: false, atHome: false });
    expect(productRow(model.toBuy, 'jajka').amountText).toBe('3 szt.');
    expect(model.toBuy[1]).toEqual({ kind: 'extra', key: 'e:e1', id: 'e1', name: 'kawa', ticked: false });
    expect(model.done).toEqual([]);
  });

  it('is empty with no Meals and no Extras', () => {
    const model = shoppingPage(WEEK, { ...data(), meals: [] })!;
    expect(model.empty).toBe(true);
    expect(model.shareText).toBeNull();
  });

  it('names the At Home button and moves an At Home row to done (US3)', () => {
    const model = shoppingPage(WEEK, data({ states: [state('p-ryz', { atHome: true })] }))!;
    expect(productRow(model.done, 'ryż')).toMatchObject({ atHome: true, atHomeLabel: 'Mam w domu: ryż' });
  });

  it('shows an applying Adjustment as more or less than the plan (US4)', () => {
    const more = shoppingPage(WEEK, data({ states: [state('p-ryz', { adjustment: { amount: 500, plannedAmount: 400 } })] }))!;
    expect(productRow(more.toBuy, 'ryż')).toMatchObject({
      amountText: '500 g',
      direction: 'more',
      plannedText: 'plan: 400 g',
      amountLabel: 'ryż: 500 g, więcej niż w planie (400 g), zmień ilość',
      planned: 400,
      plannedAmountText: '400 g',
      fieldText: '500',
      unitLabel: 'g',
    });

    const less = shoppingPage(WEEK, data({ states: [state('p-ryz', { adjustment: { amount: 250, plannedAmount: 400 } })] }))!;
    expect(productRow(less.toBuy, 'ryż')).toMatchObject({
      direction: 'less',
      amountLabel: 'ryż: 250 g, mniej niż w planie (400 g), zmień ilość',
    });
  });

  it('shows the Planned amount with no or a dormant Adjustment', () => {
    const plain = productRow(shoppingPage(WEEK, data())!.toBuy, 'ryż');
    const dormant = productRow(
      shoppingPage(WEEK, data({ states: [state('p-ryz', { adjustment: { amount: 500, plannedAmount: 300 } })] }))!.toBuy,
      'ryż',
    );
    for (const row of [plain, dormant]) {
      expect(row).toMatchObject({ amountText: '400 g', direction: null, plannedText: null, amountLabel: 'ryż: 400 g, zmień ilość' });
    }
  });

  it('fills the amount field with the shown quantity and the unit label', () => {
    const model = shoppingPage(WEEK, data())!;
    expect(productRow(model.toBuy, 'jajka')).toMatchObject({ planned: 2.5, fieldText: '3', unitLabel: 'szt.' });
    expect(productRow(model.toBuy, 'mleko')).toMatchObject({ fieldText: '1100', unitLabel: 'ml' });
  });

  it('has no share text when every item is ticked or At Home (FR-025)', () => {
    const model = shoppingPage(WEEK, {
      ...data(),
      meals: [meal({ id: 'm5', dishId: risotto.id })],
      states: [state('p-ryz', { ticked: true })],
    })!;
    expect(model.shareText).toBeNull();
  });
});

describe('shareText', () => {
  it('lists what is left to buy under the Week heading (US6)', () => {
    const week = '2026-11-16';
    const list = buildShoppingList({
      products: [mleko, ryz, platki, jajka],
      meals: [
        meal({ id: 'm1', dishId: kakao.id, date: '2026-11-17' }),
        meal({ id: 'm2', dishId: owsianka.id, date: '2026-11-17', servings: 4 }),
        meal({ id: 'm3', dishId: risotto.id, date: '2026-11-18' }),
        meal({ id: 'm4', dishId: jajecznica.id, date: '2026-11-18' }),
      ],
      dishesById: byId([owsianka, kakao, risotto, jajecznica]),
      states: [
        { weekStart: week, productId: 'p-ryz', ticked: false, atHome: false, adjustment: { amount: 500, plannedAmount: 400 } },
        { weekStart: week, productId: 'p-platki', ticked: true, atHome: false, adjustment: null },
        { weekStart: week, productId: 'p-jajka', ticked: false, atHome: true, adjustment: null },
      ],
      extras: [{ id: 'e1', weekStart: week, text: 'papier toaletowy', ticked: false }],
    });
    // mleko: 500 (Kakao) + 600 (Owsianka at 4 Servings) = 1100 ml.
    expect(shareText(week, list.toBuy)).toBe('Lista zakupów 16–22 lis 2026\nmleko 1,1 l\npapier toaletowy\nryż 500 g');
  });
});

describe('headerSwipeDelta', () => {
  it.each([
    [-49, 0, 0],
    [-50, 0, 7],
    [50, 0, -7],
    [-60, 50, 0],
    [0, 0, 0],
  ] as const)('(%d, %d) → %d', (dx, dy, expected) => {
    expect(headerSwipeDelta(dx, dy)).toBe(expected);
  });
});

describe('strings', () => {
  it('are the contract texts', () => {
    expect(emptyMessage).toBe('Na ten tydzień nie ma nic do kupienia.');
    expect(extraPlaceholder).toBe('Dodaj coś spoza planu…');
    expect(amountErrorMessage).toBe('Wpisz liczbę większą od zera.');
    expect(amountFooter).toBe('Zostaw puste, aby wrócić do ilości z planu.');
    expect(copiedToast).toBe('Skopiowano listę do schowka.');
    expect(shareFailedMessage).toBe('Nie udało się udostępnić listy.');
  });
});
