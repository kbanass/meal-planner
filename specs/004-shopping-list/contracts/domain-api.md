# Contract: Domain module additions (`src/domain/`)

The rules from features [001](../../001-shell-products-dishes/contracts/domain-api.md) and [002](../../002-week-planning/contracts/domain-api.md) still apply:
- The module is pure, with no I/O, clock, randomness or implicit locale.
- It imports only from inside `src/domain/`, and the lint boundary enforces this.
- Coverage is 100%.

Types are defined in [data-model.md](../data-model.md). Existing functions keep their signatures and behaviour.

## types.ts (extended)

`Adjustment`, `ProductListState` and `Extra`, as in [data-model.md](../data-model.md).

## units.ts (extended)

```ts
/** The quantity shown for an amount, in the Product's base unit (research R3). */
displayQuantity(amount: number, unit: Unit): number
  // g, ml: roundTo(amount, 0); at least 1 when amount > 0
  // pcs:   Math.ceil(roundTo2(amount))
  // amount ≤ 0 → the same formulas (0 → 0); the list never passes one

/** The Shopping List's amount text with its unit (FR-008). */
formatListAmount(amount: number, unit: Unit): string
  // q = displayQuantity(amount, unit)
  // g:   q < 1000 → "{q} g";  else "{formatDecimal(q / 1000)} kg"
  // ml:  q < 1000 → "{q} ml"; else "{formatDecimal(q / 1000)} l"
  // pcs: "{q} szt."
```

`formatAmount` (feature 002, Meal sheet) is unchanged.

Required cases:

| Call | Result |
|---|---|
| `formatListAmount(750, 'g')` | `"750 g"` |
| `formatListAmount(74.6, 'g')` | `"75 g"` |
| `formatListAmount(0.3, 'g')` | `"1 g"` |
| `formatListAmount(999.6, 'g')` | `"1 kg"` |
| `formatListAmount(1000, 'g')` | `"1 kg"` |
| `formatListAmount(1250, 'g')` | `"1,25 kg"` |
| `formatListAmount(1234, 'g')` | `"1,23 kg"` |
| `formatListAmount(2000, 'g')` | `"2 kg"` |
| `formatListAmount(600, 'ml')` | `"600 ml"` |
| `formatListAmount(1100, 'ml')` | `"1,1 l"` |
| `formatListAmount(2.5, 'pcs')` | `"3 szt."` |
| `formatListAmount(2.01, 'pcs')` | `"3 szt."` |
| `formatListAmount(2.0000000004, 'pcs')` | `"2 szt."` |
| `formatListAmount(0.2, 'pcs')` | `"1 szt."` |
| `displayQuantity(0, 'g')` | `0` |

## shopping.ts (new)

```ts
interface ProductLine { … }  // data-model.md
interface ExtraLine { … }
type ShoppingLine = ProductLine | ExtraLine
interface ShoppingList { toBuy: ShoppingLine[]; done: ShoppingLine[] }

/**
 * productId → Planned amount: Σ scaleMeal(mealSource(meal), meal.servings).ingredients,
 * unrounded. Meals are summed in compareIds order (research R3). Meals with no source are
 * skipped. Only amounts > 0 are present.
 */
plannedAmounts(meals: readonly Meal[], dishesById: ReadonlyMap<string, Dish>): ReadonlyMap<string, number>

/** FR-020: the Adjustment applies while roundTo2(planned) equals its plannedAmount. */
adjustmentApplies(adjustment: Adjustment | null, planned: number): boolean

/** 'more' when the typed amount is above its plannedAmount, otherwise 'less'. */
adjustmentDirection(adjustment: Adjustment): 'more' | 'less'

/**
 * The Week's list (FR-004, FR-009). One ProductLine per Product with a Planned amount > 0
 * whose record exists. `done` = ticked or atHome (Products), ticked (Extras). Each part is
 * sorted by compareNames(text shown), then compareIds(Product id or Extra id). A state record
 * for a Product with no Planned amount adds nothing.
 */
buildShoppingList(input: {
  products: readonly Product[];
  meals: readonly Meal[];                       // the Week's Meals
  dishesById: ReadonlyMap<string, Dish>;
  states: readonly ProductListState[];          // the Week's records
  extras: readonly Extra[];                     // the Week's Extras
}): ShoppingList

isListEmpty(list: ShoppingList): boolean       // no lines in either part (FR-010)

/**
 * Applies a tap or a save to a Product's record. Returns null when nothing is left set, which
 * means "delete the record" (research R1).
 */
applyStatePatch(
  state: ProductListState | undefined,
  key: { weekStart: IsoDate; productId: string },
  patch: Partial<Pick<ProductListState, 'ticked' | 'atHome' | 'adjustment'>>,
): ProductListState | null

/** The amount field's starting text: displayQuantity as plain digits, e.g. "1235", "3" (FR-017). */
adjustmentFieldText(amount: number, unit: Unit): string

/**
 * FR-018, FR-019, in this order:
 * 1. parseDecimal(text) equals parseDecimal(filledText) → unchanged
 * 2. text is blank → clear
 * 3. not a number, ≤ 0 → invalid
 * 4. roundTo2(value) === roundTo2(planned) → clear
 * 5. otherwise → set { amount: roundTo2(value), plannedAmount: roundTo2(planned) }
 */
decideAdjustmentSave(input: { text: string; filledText: string; planned: number }):
  | { kind: 'unchanged' }
  | { kind: 'clear' }
  | { kind: 'set'; adjustment: Adjustment }
  | { kind: 'invalid' }

/**
 * FR-028, research R4: the kept Product's record for one Week after merging `from` into it.
 * Both Adjustments are dropped. A mark (ticked, atHome) is kept only if every participant has
 * it. Participants are the Products with a Planned amount > 0 that Week, or both when neither
 * has one. A missing record has no marks. Returns null when nothing is left set.
 */
mergeProductListStates(input: {
  weekStart: IsoDate;
  intoId: string;
  from: ProductListState | undefined;
  into: ProductListState | undefined;
  fromPlanned: number;                          // pre-merge Planned amounts in that Week
  intoPlanned: number;
}): ProductListState | null
```

Required cases (the spec's examples first):

**`plannedAmounts` / `buildShoppingList`**:
- US1-1: "Owsianka" (yield 2: 100 g płatki, 300 ml mleko) at 1 and 3 Servings → mleko 600, płatki 200, one line each.
- US1-2: plus a Dish with 500 ml mleko → mleko 1100.
- US1-4: a Detached Meal with its own 80 g per Serving counts 80, not the Dish's 50.
- US1-5: a Meal of an Archived Dish is counted.
- A Meal whose Dish record is missing is skipped. A Product id with no Product record is skipped.
- US1-7: "cebula", "Awokado", "łosoś", "ziemniaki" → Awokado, cebula, łosoś, ziemniaki. Extras sort among them.
- Two Extras "kawa" keep id order. An Extra and a Product with the same name are separate lines.
- A ticked Product line, an At Home line and a ticked Extra go to `done`, sorted the same way. A line that is both ticked and At Home appears once.
- A state record for a Product with no Meals in the Week adds no line.
- The same Meals in a different input order give an identical result.
- An empty Week → `isListEmpty` true. Only one Extra → false.

**Adjustments**:
- `adjustmentApplies(null, 400)` → false. `{500, 400}` with planned 400 → true. With 600 → false. With 400.004 → true.
- `amount` on a line is the Adjustment's when it applies, and the Planned amount when it is dormant (in which case `adjustment` is `null` on the line).
- `adjustmentDirection({500, 400})` → `'more'`, `({250, 400})` → `'less'`.
- `decideAdjustmentSave`:

  | text | filledText | planned | Result |
  |---|---|---|---|
  | `"400"` | `"400"` | 400 | unchanged |
  | `"400,0"` | `"400"` | 400 | unchanged |
  | `"500"` | `"400"` | 400 | set {500, 400} |
  | `" 250 "` | `"400"` | 400 | set {250, 400} |
  | `""` | `"500"` | 400 | clear |
  | `"   "` | `"400"` | 400 | clear |
  | `"400"` | `"500"` | 400 | clear |
  | `"400,004"` | `"500"` | 400 | clear |
  | `"0"` / `"-5"` / `"abc"` | `"400"` | 400 | invalid |
  | `"1236"` | `"1235"` | 1234.5 | set {1236, 1234.5} |
  | `"6"` | `"3"` | 2.5 | set {6, 2.5} (US4-8) |
  | `"2,5"` | `"3"` | 2.5 | clear |

- `adjustmentFieldText(1234.5, 'g')` → `"1235"`. `(2.5, 'pcs')` → `"3"`. `(0.3, 'g')` → `"1"`.

**`applyStatePatch`**:
- From `undefined`: `{ ticked: true }` → a record with `atHome: false`, `adjustment: null`.
- `{ ticked: false }` on a record with only `ticked` → `null`.
- `{ adjustment: null }` on a record with `atHome` → keeps `atHome`.
- An empty patch on `undefined` → `null`.

**`mergeProductListStates`**:
- Both planned, both ticked → ticked. Only one ticked → not ticked.
- Only `into` planned and ticked, `from` unticked → ticked.
- Only `from` planned and At Home → At Home under `intoId`.
- Neither planned: `from` ticked, `into` missing → not ticked.
- Adjustments on either side → `adjustment: null`. Nothing left → `null`.
