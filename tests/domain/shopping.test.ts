import { describe, expect, it } from 'vitest';
import {
  adjustmentApplies,
  adjustmentDirection,
  adjustmentFieldText,
  applyStatePatch,
  buildShoppingList,
  decideAdjustmentSave,
  isListEmpty,
  leftToBuy,
  mergeProductListStates,
  plannedAmounts,
  type ShoppingLine,
} from '../../src/domain/shopping';
import type { Dish, Extra, Meal, Product, ProductListState, Unit } from '../../src/domain/types';
import { formatListAmount } from '../../src/domain/units';
import { byId, dish, meal, owsianka } from '../fakes/dishes';

const WEEK = '2026-11-02';

function product(id: string, name: string, unit: Unit = 'g'): Product {
  return { id, name, unit };
}

function state(
  productId: string,
  fields: Partial<Pick<ProductListState, 'ticked' | 'atHome' | 'adjustment'>>,
): ProductListState {
  return { weekStart: WEEK, productId, ticked: false, atHome: false, adjustment: null, ...fields };
}

function extra(id: string, text: string, ticked = false): Extra {
  return { id, weekStart: WEEK, text, ticked };
}

function shuffled<T>(items: readonly T[]): T[] {
  // A fixed permutation: deterministic, but clearly not the input order.
  return items.map((item, i) => ({ item, key: (i * 7919) % 101 })).sort((a, b) => a.key - b.key).map((x) => x.item);
}

function names(lines: readonly ShoppingLine[]): string[] {
  return lines.map((line) => (line.kind === 'product' ? line.product.name : line.extra.text));
}

const platki = product('p-platki', 'płatki owsiane');
const mleko = product('p-mleko', 'mleko', 'ml');

describe('plannedAmounts', () => {
  it('sums Owsianka at 1 and 3 Servings (US1-1)', () => {
    const meals = [meal({ id: 'm1', servings: 1 }), meal({ id: 'm2', servings: 3 })];
    const planned = plannedAmounts(meals, byId([owsianka]));
    expect(planned.get('p-mleko')).toBe(600);
    expect(planned.get('p-platki')).toBe(200);
  });

  it('adds another Dish using the same Product (US1-2)', () => {
    const kakao = dish({ id: 'd-kakao', name: 'Kakao', ingredients: [{ productId: 'p-mleko', amount: 500 }] });
    const meals = [
      meal({ id: 'm1', servings: 1 }),
      meal({ id: 'm2', servings: 3 }),
      meal({ id: 'm3', dishId: kakao.id }),
    ];
    expect(plannedAmounts(meals, byId([owsianka, kakao])).get('p-mleko')).toBe(1100);
  });

  it("counts a Detached Meal's own amounts, not the Dish's (US1-4)", () => {
    const jajecznica = dish({ id: 'd-j', name: 'Jajecznica', ingredients: [{ productId: 'p-maslo', amount: 50 }] });
    const detached = meal({
      id: 'm1',
      dishId: jajecznica.id,
      servings: 2,
      detached: { ...jajecznica, ingredients: [{ productId: 'p-maslo', amount: 80 }] },
    });
    expect(plannedAmounts([detached], byId([jajecznica])).get('p-maslo')).toBe(160);
  });

  it('counts a Meal of an Archived Dish (US1-5)', () => {
    const archived = { ...owsianka, archived: true };
    expect(plannedAmounts([meal({ id: 'm1', servings: 2 })], byId([archived])).get('p-mleko')).toBe(300);
  });

  it('skips a Meal whose Dish record is missing', () => {
    expect(plannedAmounts([meal({ id: 'm1', dishId: 'gone' })], byId([owsianka])).size).toBe(0);
  });

  it('gives the same map for any input order', () => {
    const odd = dish({
      id: 'd-odd',
      name: 'Odd',
      servingsYield: 3,
      ingredients: [{ productId: 'p-mleko', amount: 0.1 }, { productId: 'p-platki', amount: 0.7 }],
    });
    const meals = Array.from({ length: 12 }, (_, i) =>
      meal({ id: `m${String(i).padStart(2, '0')}`, dishId: i % 2 ? odd.id : owsianka.id, servings: 0.1 * (i + 1) }),
    );
    const dishes = byId([owsianka, odd]);
    const expected = plannedAmounts(meals, dishes);
    expect(plannedAmounts([...meals].reverse(), dishes)).toEqual(expected);
    expect(plannedAmounts(shuffled(meals), dishes)).toEqual(expected);
  });

  it('keeps only amounts above zero', () => {
    const zero = dish({ id: 'd-zero', name: 'Zero', ingredients: [{ productId: 'p-sol', amount: 0 }] });
    expect(plannedAmounts([meal({ id: 'm1', dishId: zero.id })], byId([zero])).has('p-sol')).toBe(false);
  });
});

describe('SC-001 reference Week', () => {
  const nalesniki = dish({
    id: 'd1',
    name: 'Naleśniki',
    servingsYield: 4,
    ingredients: [
      { productId: 'p-maka', amount: 400 },
      { productId: 'p-mleko', amount: 1000 },
      { productId: 'p-jajka', amount: 4 },
      { productId: 'p-maslo', amount: 40 },
    ],
  });
  const omlet = dish({
    id: 'd2',
    name: 'Omlet',
    ingredients: [
      { productId: 'p-jajka', amount: 3 },
      { productId: 'p-maslo', amount: 10 },
      { productId: 'p-mleko', amount: 50 },
    ],
  });
  const kasza = dish({
    id: 'd3',
    name: 'Kasza',
    servingsYield: 2,
    ingredients: [
      { productId: 'p-kasza', amount: 150 },
      { productId: 'p-maslo', amount: 15 },
    ],
  });
  const products = [
    product('p-maka', 'mąka'),
    product('p-mleko', 'mleko', 'ml'),
    product('p-jajka', 'jajka', 'pcs'),
    product('p-maslo', 'masło'),
    product('p-kasza', 'kasza'),
  ];
  const linked = (id: string, d: Dish, servings: number) => meal({ id, dishId: d.id, servings });
  const meals: Meal[] = [
    linked('m01', nalesniki, 1),
    linked('m02', nalesniki, 0.5),
    linked('m03', nalesniki, 1.5),
    linked('m04', nalesniki, 3),
    linked('m05', omlet, 1),
    linked('m06', omlet, 0.5),
    linked('m07', omlet, 1.5),
    linked('m08', omlet, 3),
    linked('m09', kasza, 1),
    linked('m10', kasza, 0.5),
    linked('m11', kasza, 1.5),
    linked('m12', kasza, 3),
    meal({
      id: 'm13',
      dishId: nalesniki.id,
      servings: 1,
      detached: { ...nalesniki, ingredients: nalesniki.ingredients.map((i) => (i.productId === 'p-maka' ? { ...i, amount: 500 } : i)) },
    }),
    meal({
      id: 'm14',
      dishId: omlet.id,
      servings: 0.5,
      detached: { ...omlet, ingredients: omlet.ingredients.map((i) => (i.productId === 'p-jajka' ? { ...i, amount: 2 } : i)) },
    }),
    linked('m15', nalesniki, 1),
    linked('m16', omlet, 1),
    linked('m17', kasza, 1),
    linked('m18', kasza, 0.5),
    linked('m19', nalesniki, 0.5),
    meal({
      id: 'm20',
      dishId: kasza.id,
      servings: 1.5,
      detached: { ...kasza, ingredients: [{ productId: 'p-kasza', amount: 100 }, { productId: 'p-maslo', amount: 20 }] },
    }),
  ];

  it('shows the hand-computed amounts', () => {
    // mąka: 100+50+150+300+125+100+50 = 875
    // mleko: 250+125+375+750+250+250+125 + 50+25+75+150+25+50 = 2500
    // jajka: 1+0,5+1,5+3+1+1+0,5 + 3+1,5+4,5+9+1+3 = 30,5 → 31
    // masło: 85 (Naleśniki) + 75 (Omlet) + 71,25 (Kasza) = 231,25 → 231
    // kasza: 75+37,5+112,5+225+75+37,5+75 = 637,5 → 638
    const list = buildShoppingList({
      products,
      meals: shuffled(meals),
      dishesById: byId([nalesniki, omlet, kasza]),
      states: [],
      extras: [],
    });
    const shown = list.toBuy.map((line) =>
      line.kind === 'product' ? `${line.product.name} ${formatListAmount(line.amount, line.product.unit)}` : '',
    );
    expect(shown).toEqual(['jajka 31 szt.', 'kasza 638 g', 'masło 231 g', 'mąka 875 g', 'mleko 2,5 l']);
  });
});

describe('buildShoppingList', () => {
  const base = { products: [platki, mleko], meals: [meal({ id: 'm1', servings: 2 })], dishesById: byId([owsianka]) };

  it('makes one line per planned Product with the unrounded amount', () => {
    const list = buildShoppingList({ ...base, states: [], extras: [] });
    expect(list.toBuy).toEqual([
      { kind: 'product', product: mleko, planned: 300, adjustment: null, amount: 300, ticked: false, atHome: false },
      { kind: 'product', product: platki, planned: 100, adjustment: null, amount: 100, ticked: false, atHome: false },
    ]);
    expect(list.atHome).toEqual([]);
  });

  it('skips a Product id with no Product record', () => {
    const list = buildShoppingList({ ...base, products: [mleko], states: [], extras: [] });
    expect(names(list.toBuy)).toEqual(['mleko']);
  });

  it('sorts in Polish order with Extras among Products (US1-7)', () => {
    const products = [
      product('p1', 'cebula'),
      product('p2', 'Awokado'),
      product('p3', 'łosoś'),
      product('p4', 'ziemniaki'),
    ];
    const d = dish({ id: 'd', name: 'D', ingredients: products.map((p) => ({ productId: p.id, amount: 1 })) });
    const list = buildShoppingList({
      products,
      meals: [meal({ id: 'm1', dishId: d.id })],
      dishesById: byId([d]),
      states: [],
      extras: [extra('e1', 'kawa')],
    });
    expect(names(list.toBuy)).toEqual(['Awokado', 'cebula', 'kawa', 'łosoś', 'ziemniaki']);
  });

  it('keeps id order for equal names, and an Extra apart from a Product of the same name', () => {
    const list = buildShoppingList({
      ...base,
      states: [],
      extras: [extra('e2', 'kawa'), extra('e1', 'kawa'), extra('e3', 'mleko')],
    });
    expect(list.toBuy.map((line) => (line.kind === 'extra' ? line.extra.id : line.product.id))).toEqual([
      'e1',
      'e2',
      'e3',
      'p-mleko',
      'p-platki',
    ]);
  });

  it('moves only At Home Products to the bottom; ticked lines keep their place', () => {
    const list = buildShoppingList({
      ...base,
      states: [state('p-platki', { ticked: true, atHome: true }), state('p-mleko', { ticked: true })],
      extras: [extra('e1', 'kawa', true), extra('e2', 'herbata')],
    });
    expect(names(list.toBuy)).toEqual(['herbata', 'kawa', 'mleko']);
    expect(names(list.atHome)).toEqual(['płatki owsiane']);
    expect(names(leftToBuy(list))).toEqual(['herbata']);
  });

  it('adds nothing for an unplanned Product or its record', () => {
    const list = buildShoppingList({
      ...base,
      products: [...base.products, product('p-other', 'sól')],
      states: [state('p-other', { ticked: true })],
      extras: [],
    });
    expect(names([...list.toBuy, ...list.atHome])).toEqual(['mleko', 'płatki owsiane']);
  });

  it('uses an Adjustment only while the Planned amount is unchanged (FR-020)', () => {
    const typed = { amount: 500, plannedAmount: 300 };
    const applies = buildShoppingList({ ...base, states: [state('p-mleko', { adjustment: typed })], extras: [] });
    expect(applies.toBuy[0]).toMatchObject({ adjustment: typed, amount: 500, planned: 300 });

    const dormant = buildShoppingList({
      ...base,
      meals: [meal({ id: 'm1', servings: 4 })],
      states: [state('p-mleko', { adjustment: typed })],
      extras: [],
    });
    expect(dormant.toBuy[0]).toMatchObject({ adjustment: null, amount: 600, planned: 600 });
  });
});

describe('isListEmpty', () => {
  const empty = { products: [], meals: [], dishesById: byId([]), states: [] };

  it('is true for an empty Week', () => {
    expect(isListEmpty(buildShoppingList({ ...empty, extras: [] }))).toBe(true);
  });

  it('is false with one Extra', () => {
    expect(isListEmpty(buildShoppingList({ ...empty, extras: [extra('e1', 'kawa')] }))).toBe(false);
  });

  it('is false with only a ticked line', () => {
    expect(isListEmpty(buildShoppingList({ ...empty, extras: [extra('e1', 'kawa', true)] }))).toBe(false);
  });
});

describe('adjustmentApplies', () => {
  it.each([
    [null, 400, false],
    [{ amount: 500, plannedAmount: 400 }, 400, true],
    [{ amount: 500, plannedAmount: 400 }, 600, false],
    [{ amount: 500, plannedAmount: 400 }, 400.004, true],
  ] as const)('(%j, %d) → %j', (adjustment, planned, expected) => {
    expect(adjustmentApplies(adjustment, planned)).toBe(expected);
  });
});

describe('adjustmentDirection', () => {
  it('is more above the plan and less below it', () => {
    expect(adjustmentDirection({ amount: 500, plannedAmount: 400 })).toBe('more');
    expect(adjustmentDirection({ amount: 250, plannedAmount: 400 })).toBe('less');
  });
});

describe('applyStatePatch', () => {
  const key = { weekStart: WEEK, productId: 'p1' };

  it('creates a record from a tick', () => {
    expect(applyStatePatch(undefined, key, { ticked: true })).toEqual({
      weekStart: WEEK,
      productId: 'p1',
      ticked: true,
      atHome: false,
      adjustment: null,
    });
  });

  it('returns null when an untick leaves nothing set', () => {
    expect(applyStatePatch(state('p1', { ticked: true }), key, { ticked: false })).toBeNull();
  });

  it('keeps At Home when the Adjustment is cleared', () => {
    const record = state('p1', { atHome: true, adjustment: { amount: 5, plannedAmount: 4 } });
    expect(applyStatePatch(record, key, { adjustment: null })).toEqual(state('p1', { atHome: true }));
  });

  it('keeps the tick when At Home is cleared', () => {
    const record = state('p1', { ticked: true, atHome: true });
    expect(applyStatePatch(record, key, { atHome: false })).toEqual(state('p1', { ticked: true }));
  });

  it('returns null for an empty patch on no record', () => {
    expect(applyStatePatch(undefined, key, {})).toBeNull();
  });
});

describe('mergeProductListStates', () => {
  const typed = { amount: 5, plannedAmount: 4 };
  const from = (fields: Parameters<typeof state>[1]) => state('pA', fields);
  const into = (fields: Parameters<typeof state>[1]) => state('pB', fields);
  const merge = (input: {
    from?: ProductListState;
    into?: ProductListState;
    fromPlanned: number;
    intoPlanned: number;
  }) => mergeProductListStates({ weekStart: WEEK, intoId: 'pB', from: input.from, into: input.into, fromPlanned: input.fromPlanned, intoPlanned: input.intoPlanned });

  it('keeps a tick both planned Products have', () => {
    expect(
      merge({ from: from({ ticked: true }), into: into({ ticked: true }), fromPlanned: 1, intoPlanned: 2 }),
    ).toEqual(state('pB', { ticked: true }));
  });

  it('drops a tick only one planned Product has', () => {
    expect(merge({ from: from({ ticked: true }), fromPlanned: 1, intoPlanned: 2 })).toBeNull();
  });

  it('keeps the only planned Product\'s tick', () => {
    expect(merge({ from: from({}), into: into({ ticked: true }), fromPlanned: 0, intoPlanned: 2 })).toEqual(
      state('pB', { ticked: true }),
    );
  });

  it('moves At Home from the only planned Product to the kept one', () => {
    expect(merge({ from: from({ atHome: true }), fromPlanned: 3, intoPlanned: 0 })).toEqual(
      state('pB', { atHome: true }),
    );
  });

  it('treats both as participants when neither is planned', () => {
    expect(merge({ from: from({ ticked: true }), fromPlanned: 0, intoPlanned: 0 })).toBeNull();
  });

  it('drops Adjustments on either side', () => {
    expect(
      merge({
        from: from({ atHome: true, adjustment: typed }),
        into: into({ atHome: true, adjustment: typed }),
        fromPlanned: 1,
        intoPlanned: 1,
      }),
    ).toEqual(state('pB', { atHome: true }));
    expect(merge({ from: from({ adjustment: typed }), into: into({ adjustment: typed }), fromPlanned: 1, intoPlanned: 1 })).toBeNull();
  });

  it('uses the input Week and the kept id', () => {
    const result = mergeProductListStates({
      weekStart: '2026-11-09',
      intoId: 'pB',
      from: { ...from({ ticked: true }), weekStart: '2026-11-09' },
      into: undefined,
      fromPlanned: 1,
      intoPlanned: 0,
    });
    expect(result).toEqual({ weekStart: '2026-11-09', productId: 'pB', ticked: true, atHome: false, adjustment: null });
  });
});

describe('adjustmentFieldText', () => {
  it.each([
    [1234.5, 'g', '1235'],
    [2.5, 'pcs', '3'],
    [0.3, 'g', '1'],
  ] as const)('(%d, %s) → %j', (amount, unit, expected) => {
    expect(adjustmentFieldText(amount, unit)).toBe(expected);
  });
});

describe('decideAdjustmentSave', () => {
  it.each([
    ['400', '400', 400, { kind: 'unchanged' }],
    ['400,0', '400', 400, { kind: 'unchanged' }],
    ['500', '400', 400, { kind: 'set', adjustment: { amount: 500, plannedAmount: 400 } }],
    [' 250 ', '400', 400, { kind: 'set', adjustment: { amount: 250, plannedAmount: 400 } }],
    ['', '500', 400, { kind: 'clear' }],
    ['   ', '400', 400, { kind: 'clear' }],
    ['400', '500', 400, { kind: 'clear' }],
    ['400,004', '500', 400, { kind: 'clear' }],
    ['0', '400', 400, { kind: 'invalid' }],
    ['-5', '400', 400, { kind: 'invalid' }],
    ['abc', '400', 400, { kind: 'invalid' }],
    ['1236', '1235', 1234.5, { kind: 'set', adjustment: { amount: 1236, plannedAmount: 1234.5 } }],
    ['6', '3', 2.5, { kind: 'set', adjustment: { amount: 6, plannedAmount: 2.5 } }],
    ['2,5', '3', 2.5, { kind: 'clear' }],
  ] as const)('(%j, filled %j, planned %d) → %j', (text, filledText, planned, expected) => {
    expect(decideAdjustmentSave({ text, filledText, planned })).toEqual(expected);
  });
});
