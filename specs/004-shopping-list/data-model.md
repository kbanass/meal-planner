# Data Model: Shopping List

Phase 1 for [plan.md](plan.md). Domain terms follow [GLOSSARY.md](../../GLOSSARY.md). The Product, Dish, Meal and Week types from features 001 and 002 are unchanged.

## Stored types (`src/domain/types.ts`)

```ts
/**
 * The amount to buy the user typed for one Product, and the Planned amount it was typed
 * against. It applies only while the Planned amount is still that value (FR-020, research R2).
 */
export interface Adjustment {
  amount: number;        // > 0, roundTo2, in the Product's unit
  plannedAmount: number; // > 0, roundTo2(Planned amount) when it was typed
}

/**
 * Everything the user set for one Product on one Week's Shopping List. Stored only while at
 * least one field is set (research R1).
 */
export interface ProductListState {
  weekStart: IsoDate;             // the Week's Monday
  productId: string;              // → Product.id
  ticked: boolean;                // bought
  atHome: boolean;                // At Home
  adjustment: Adjustment | null;
}

/** A free-text Shopping List entry of one Week (glossary: Extra). */
export interface Extra {
  id: string;          // UUID
  weekStart: IsoDate;  // the Week's Monday
  text: string;        // normalizeName(input), non-empty
  amount?: string;     // normalizeName(input) of the optional amount ("2 opak."); absent when blank
  ticked: boolean;
}
```

Field rules:

| Field | Rule | Enforced by |
|---|---|---|
| `weekStart` | a Monday (`weekStartOf(d) === d`) | callers pass the page's `weekStart`, which comes from `weekStartOf` |
| `Adjustment.amount` | finite, > 0, 2 decimals | `decideAdjustmentSave` (FR-018, FR-019) |
| `Adjustment.plannedAmount` | `roundTo2` of the Planned amount at save time, > 0 | `decideAdjustmentSave` |
| `Adjustment.amount ≠ plannedAmount` | saving the planned value clears it instead | `decideAdjustmentSave` (FR-018) |
| a state record | at least one of `ticked`, `atHome`, `adjustment` set | `applyStatePatch` returns `null`, and the repository deletes the record |
| `Extra.text` | `normalizeName(input)`, non-empty | `ShoppingRepository.addExtra` (research R10) |

## Derived types (`src/domain/shopping.ts`)

Never stored. Built on every render from the live data (research R8).

```ts
export interface ProductLine {
  kind: 'product';
  product: Product;
  planned: number;                  // unrounded Planned amount, > 0
  adjustment: Adjustment | null;    // only when it applies (FR-020)
  amount: number;                   // Amount to buy: adjustment.amount ?? planned
  ticked: boolean;
  atHome: boolean;
}

export interface ExtraLine {
  kind: 'extra';
  extra: Extra;
}

export type ShoppingLine = ProductLine | ExtraLine;

export interface ShoppingList {
  toBuy: ShoppingLine[]; // neither ticked nor At Home, sorted (FR-009)
  done: ShoppingLine[];  // ticked or At Home, sorted
}
```

Relationships:

```text
Week (weekStart) ─┬─< Meal (date in the Week) ── Dish / detached copy ──< Ingredient ── Product
                  ├─< ProductListState (weekStart, productId) ── Product
                  └─< Extra (weekStart)

ProductLine = Product × Σ scaled Ingredients of the Week's Meals (> 0)
              + that Week's ProductListState for the Product, if any
```

A state record whose Product has no Planned amount in that Week stays stored but shows nothing. Its tick and At Home mark come back if the Product returns to the plan (spec Edge Cases).

## State transitions

**Product line (one Week)**: `ticked` and `atHome` are independent booleans (FR-016). Each tap flips one of them through `applyStatePatch`.

```text
                 tick                           house
   to buy  ───────────────►  done   ◄───────────────────  to buy
   (top)   ◄───────────────  (bottom)  ───────────────►   (top)
                untick                     house again
   done = ticked || atHome
```

**Adjustment (one Product, one Week)**:

```text
  none ──save typed ≠ planned──► applies ──plan changes──► dormant ──plan returns──► applies
   ▲                               │  │                       │
   │                               │  └─save other value──► applies (replaced)
   └──save empty / planned value───┘                          └──save typed──► applies (replaced)
```

"Dormant" means the record is stored but ignored, because `plannedAmount` no longer matches (research R2).

**Extra**: added → (ticked ⇄ unticked) → deleted. It is never changed by the plan or by copying a Week (FR-024).

## Product maintenance (feature 001 actions)

| Action | Effect on `productListStates` | Requirement |
|---|---|---|
| rename | none (lines show the live name) | spec Edge Cases |
| delete | every record of the Product is deleted | FR-029 |
| change unit | `adjustment` is set to `null` on every record; empty records are deleted | FR-030 |
| merge A into B | per Week: `mergeProductListStates` → one record for B (no Adjustment) or none; A's records are deleted | FR-028, research R4 |

## IndexedDB schema (Dexie version 3)

```ts
// src/data/db.ts. Version 3 only adds tables, so no upgrade function is needed.
this.version(3).stores({
  productListStates: '[weekStart+productId], weekStart, productId',
  extras: 'id, weekStart',
});
```

| Table | Primary key | Indexes | Read by | Written by |
|---|---|---|---|---|
| `productListStates` | `[weekStart+productId]` | `weekStart`, `productId` | the Shopping List page (`weekStart`), Product maintenance (`productId`) | `ShoppingRepository.updateProductState`, `ProductRepository.merge`, `delete`, `changeUnit` |
| `extras` | `id` | `weekStart` | the Shopping List page | `ShoppingRepository` |

Existing tables are unchanged. "Skopiuj do następnego tygodnia" (`WeekRepository.replaceWeek`) does not touch the new tables (FR-031).

## Volume

- State records: at most one per planned Product per Week, typically 10–40 per Week, so about 2,000 a year.
- Extras: a few per Week.
- Records of past Weeks are kept, like past Meals. They are small. No pruning is needed for the MVP.
- Backup export/import (later feature) must include both tables (spec Assumptions).
