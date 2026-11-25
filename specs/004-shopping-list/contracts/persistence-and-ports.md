# Contract: Repositories, ports and use cases

The rules from features [001](../../001-shell-products-dishes/contracts/persistence-and-ports.md) and [002](../../002-week-planning/contracts/persistence-and-ports.md) still apply:
- Every I/O dependency sits behind an interface with an in-memory fake under `tests/fakes/`.
- Repositories have integration tests on `fake-indexeddb`.
- Live UI reads use `useLiveQuery(() => repo.…)`.

## Schema

Dexie version 3 adds `productListStates` and `extras` ([data-model.md](../data-model.md)). `tests/fakes/test-db.ts` needs no change, because it builds the real schema.

## New repository (`src/data/shopping-repository.ts`)

```ts
interface ShoppingRepository {
  listProductStates(weekStart: IsoDate): Promise<ProductListState[]>;
  listExtras(weekStart: IsoDate): Promise<Extra[]>;
  /** Tick, At Home or Adjustment for one Product in one Week (FR-013, FR-016, FR-018). */
  updateProductState(
    weekStart: IsoDate,
    productId: string,
    patch: Partial<Pick<ProductListState, 'ticked' | 'atHome' | 'adjustment'>>,
  ): Promise<void>;
  /** null when the text normalises to '' (FR-022). */
  addExtra(weekStart: IsoDate, text: string): Promise<Extra | null>;
  setExtraTicked(id: string, ticked: boolean): Promise<void>;
  deleteExtra(id: string): Promise<void>;           // no-op when missing
}

createShoppingRepository(db: PlannerDb, ids: IdGenerator): ShoppingRepository
```

Rules:
- `listProductStates` and `listExtras` query the `weekStart` index with `equals`.
- `updateProductState` runs in one `rw` transaction over `productListStates`: get `[weekStart, productId]`, apply `applyStatePatch`, then `put` the result or `delete` the key when it is `null`.
- `addExtra` stores `{ id: ids.next(), weekStart, text: normalizeName(text), ticked: false }`.
- `setExtraTicked` uses `update`. A missing Extra (deleted in another tab) is a no-op.

## Changes to `ProductRepository` (`src/data/product-repository.ts`)

The signatures and result types are unchanged. Each method below adds `db.productListStates` to its transaction (research R4):

- **`delete`**: after the usage check passes, `productListStates.where('productId').equals(id).delete()` (FR-029).
- **`changeUnit`**: after the usage check passes, for every record of the Product, `applyStatePatch(record, key, { adjustment: null })`, then `put` or `delete` (FR-030).
- **`merge`**: after the unit check, before Dishes and Meals are rewritten:
  1. `records = productListStates.where('productId').anyOf(fromId, intoId)`.
  2. For each distinct `weekStart`: `planned = plannedAmounts(meals of weekRange(weekStart), dishesById)` from the Dishes already read in the transaction, before the rewrite.
  3. `mergeProductListStates({ weekStart, intoId, from, into, fromPlanned, intoPlanned })`.
  4. Delete both Products' records for that Week, then `put` the result if it isn't `null` (FR-028).

## Port (`src/data/ports.ts`)

```ts
/** Shares plain text, or copies it where sharing isn't available (research R5). */
interface TextSharer {
  share(text: string): Promise<'shared' | 'copied' | 'cancelled'>;  // other failures throw
}
```

- **Adapter** `src/adapters/web-text-sharer.ts`, `webTextSharer`:
  - With `navigator.share`: `share({ text })`. An `AbortError` → `'cancelled'`. Anything else is rethrown.
  - Without it: `navigator.clipboard.writeText(text)` → `'copied'`.
- **Fake** `tests/fakes/recording-text-sharer.ts`, `RecordingTextSharer`: records each text, and returns the result it was constructed with (default `'shared'`), or throws when constructed with `'fail'`.

## Deps (`src/app/deps.ts`)

```ts
interface Deps {
  // …unchanged…
  shopping: ShoppingRepository;   // new
  sharer: TextSharer;             // new
}
```

`tests/ui/render.tsx`'s `createTestDeps` adds `shopping: createShoppingRepository(db, ids)` and `sharer: new RecordingTextSharer()`.

## Use cases (`src/app/shopping.ts`)

```ts
saveAdjustment(deps: { shopping }, input: {
  weekStart: IsoDate;
  productId: string;
  text: string;
  filledText: string;
  planned: number;                 // the line's current Planned amount
}): Promise<{ kind: 'saved' } | { kind: 'cleared' } | { kind: 'unchanged' } | { kind: 'invalid' }>
  // decideAdjustmentSave → set: updateProductState({ adjustment }), clear: ({ adjustment: null }),
  // unchanged / invalid: no write

addExtra(deps: { shopping }, weekStart: IsoDate, text: string): Promise<'added' | 'empty'>

shareList(deps: { sharer }, text: string): Promise<'shared' | 'copied' | 'cancelled'>
  // passes through; the page shows the toast or the alert
```

Ticks, At Home marks, Extra ticks and Extra deletion are single repository calls. The page calls them directly, as the Week page does with `deps.week` (no use case wrapper).

## Required integration tests (minimum)

- **`ShoppingRepository`**:
  - Tick, then untick → no record left.
  - Tick and At Home on one Product → one record with both. Clearing At Home keeps the tick.
  - A record in Week A is not listed for Week B.
  - Two Extras with the text "kawa" → two records. `addExtra('  ')` → `null`, nothing stored.
  - `deleteExtra` of a missing id doesn't throw.
- **`ProductRepository`**:
  - `delete` of an unused Product with records in two Weeks → both gone. Other Products' records untouched.
  - `changeUnit` → Adjustments removed, ticks and At Home kept, an Adjustment-only record deleted.
  - `merge` across two Weeks: in Week 1 both are planned and only one is ticked → B unticked. In Week 2 only A is planned and At Home → B At Home. Adjustments gone, no A records left.
  - `merge` with a unit mismatch writes nothing to `productListStates`.
- **`WeekRepository.replaceWeek`** (regression): the target Week's records and Extras are unchanged (FR-031).
- **`saveAdjustment`**: the US4-2 example stores `{ 500, 400 }`. Saving the filled value writes nothing (record identical). Empty → the Adjustment is removed and At Home kept. `"abc"` → `invalid` with no write.
- **`addExtra`**: `" papier  toaletowy "` → stored as `"papier toaletowy"`.
- **`webTextSharer`** (stubbed `navigator`): share → `'shared'`. `AbortError` → `'cancelled'`. `NotAllowedError` → throws. No `share` → clipboard called, `'copied'`.
