import { describe, expect, it } from 'vitest';
import {
  canMerge,
  countProductUsage,
  mergeCandidates,
  mergeIngredients,
  productActions,
  productUsageBreakdown,
  selectProductRows,
} from '../../src/domain/products';
import type { Dish, Ingredient, Product } from '../../src/domain/types';

const pomidor: Product = { id: 'p-pomidor', name: 'pomidor', unit: 'g' };
const pomidory: Product = { id: 'p-pomidory', name: 'pomidory', unit: 'g' };
const jajka: Product = { id: 'p-jajka', name: 'jajka', unit: 'pcs' };
const cebula: Product = { id: 'p-cebula', name: 'cebula', unit: 'g' };

function dish(id: string, ingredients: Ingredient[], archived = false): Dish {
  return {
    id,
    name: id,
    servingsYield: 1,
    ingredients,
    macros: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
    notes: '',
    photo: null,
    archived,
  };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe('countProductUsage', () => {
  it('counts each Dish that uses a Product', () => {
    const usage = countProductUsage(
      [
        dish('d-1', [{ productId: pomidor.id, amount: 100 }]),
        dish('d-2', [
          { productId: pomidor.id, amount: 50 },
          { productId: cebula.id, amount: 20 },
        ]),
      ],
      [],
    );

    expect(usage.get(pomidor.id)).toBe(2);
    expect(usage.get(cebula.id)).toBe(1);
  });

  it('counts Archived Dishes and Detached Meal Ingredient lists', () => {
    const usage = countProductUsage(
      [dish('d-1', [{ productId: pomidor.id, amount: 100 }], true)],
      [[{ productId: pomidor.id, amount: 30 }], [{ productId: jajka.id, amount: 2 }]],
    );

    expect(usage.get(pomidor.id)).toBe(2);
    expect(usage.get(jajka.id)).toBe(1);
  });

  it('leaves unused Products out of the map', () => {
    expect(countProductUsage([], []).has(pomidor.id)).toBe(false);
  });
});

describe('productUsageBreakdown', () => {
  const dishes = [
    dish('d-1', [{ productId: pomidor.id, amount: 100 }]),
    dish('d-2', [{ productId: pomidor.id, amount: 50 }], true),
  ];
  const detachedLists = [
    [{ productId: pomidor.id, amount: 30 }],
    [
      { productId: pomidor.id, amount: 10 },
      { productId: cebula.id, amount: 5 },
    ],
  ];

  it('counts Dishes (archived included) and Detached Meals separately', () => {
    const breakdown = productUsageBreakdown(dishes, detachedLists);

    expect(breakdown.get(pomidor.id)).toEqual({ dishes: 2, meals: 2 });
    expect(breakdown.get(cebula.id)).toEqual({ dishes: 0, meals: 1 });
    expect(breakdown.has(jajka.id)).toBe(false);
  });

  it('agrees with countProductUsage, which is its sum', () => {
    const usage = countProductUsage(dishes, detachedLists);

    expect(usage.get(pomidor.id)).toBe(4);
    expect(usage.get(cebula.id)).toBe(1);
  });
});

describe('productActions', () => {
  it('allows delete and unit change only for unused Products', () => {
    expect(productActions(0)).toEqual({ canDelete: true, canChangeUnit: true });
    expect(productActions(2)).toEqual({ canDelete: false, canChangeUnit: false });
  });
});

describe('canMerge', () => {
  it('needs two different Products with the same unit', () => {
    expect(canMerge(pomidor, pomidor)).toBe(false);
    expect(canMerge(pomidor, jajka)).toBe(false);
    expect(canMerge(pomidory, pomidor)).toBe(true);
  });
});

describe('mergeCandidates', () => {
  it('lists the other Products with the same unit, alphabetically', () => {
    expect(mergeCandidates([pomidory, jajka, pomidor, cebula], pomidory)).toEqual([cebula, pomidor]);
  });
});

describe('mergeIngredients', () => {
  it('replaces the merged Product in place', () => {
    expect(
      mergeIngredients(
        [
          { productId: cebula.id, amount: 20 },
          { productId: pomidory.id, amount: 100 },
        ],
        pomidory.id,
        pomidor.id,
      ),
    ).toEqual([
      { productId: cebula.id, amount: 20 },
      { productId: pomidor.id, amount: 100 },
    ]);
  });

  it('sums both amounts at the position of the kept Product when it comes first', () => {
    const list = deepFreeze([
      { productId: pomidor.id, amount: 200 },
      { productId: 'x', amount: 50 },
      { productId: pomidory.id, amount: 100 },
    ]);

    expect(mergeIngredients(list, pomidory.id, pomidor.id)).toEqual([
      { productId: pomidor.id, amount: 300 },
      { productId: 'x', amount: 50 },
    ]);
    expect(list).toHaveLength(3);
  });

  it('sums both amounts at the position of the merged Product when it comes first', () => {
    expect(
      mergeIngredients(
        [
          { productId: pomidory.id, amount: 100 },
          { productId: pomidor.id, amount: 200 },
        ],
        pomidory.id,
        pomidor.id,
      ),
    ).toEqual([{ productId: pomidor.id, amount: 300 }]);
  });

  it('returns an equal list when the merged Product is absent', () => {
    const list = deepFreeze([{ productId: cebula.id, amount: 20 }]);

    expect(mergeIngredients(list, pomidory.id, pomidor.id)).toEqual(list);
  });

  it('rounds the sum to two decimals', () => {
    expect(
      mergeIngredients(
        [
          { productId: pomidor.id, amount: 0.1 },
          { productId: pomidory.id, amount: 0.2 },
        ],
        pomidory.id,
        pomidor.id,
      ),
    ).toEqual([{ productId: pomidor.id, amount: 0.3 }]);
  });
});

describe('selectProductRows', () => {
  it('sorts Products by name and attaches usage, defaulting to 0', () => {
    const usage = new Map([[pomidor.id, 3]]);

    expect(selectProductRows([pomidory, pomidor, cebula], usage)).toEqual([
      { product: cebula, usage: 0 },
      { product: pomidor, usage: 3 },
      { product: pomidory, usage: 0 },
    ]);
  });
});
