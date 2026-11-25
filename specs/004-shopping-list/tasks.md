---
description: "Task list for the Shopping List"
---

# Tasks: Shopping List

**Input**: Design documents from `specs/004-shopping-list/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Required. Constitution Principle IV requires domain tests in every feature's `tasks.md`, written together with or before the implementation, plus a 100% coverage gate on `src/domain/**`. Repository and use-case tests use `fake-indexeddb`. Component tests cover only the key interactions S1–S11 of [contracts/ui.md](contracts/ui.md) (research R11).

**Organization**: One phase per user story, in priority order: US1, US2 (P1), then US3, US4, US5 (P2), then US6 (P3). The core list rules, the storage and the Product maintenance rules (FR-028–FR-030) are in Phase 2: once a tick can be stored, deleting, merging or changing the unit of a Product must already handle it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: Which user story the task belongs to (US1–US6 from spec.md)

## Conventions for every task

- **Language**:
  - Code, identifiers and comments are in English.
  - Every user-facing string we write is Polish and inline, with the exact strings from [contracts/ui.md](contracts/ui.md).
  - Framework7's own default labels ("OK") stay as shipped (plan.md, Complexity Tracking).
- **Domain terms** follow [GLOSSARY.md](../../GLOSSARY.md): Shopping List, Adjustment, At Home (`atHome`), Extra, Planned (`planned`, `plannedAmounts`), Week, Meal, Product.
  - Never use override, correction, pantry, stock, inventory or have as identifiers.
  - "Item" / "row" names only UI rows (`ShoppingRow`), never a Product.
- **Domain boundary**: `src/domain/**` imports only from `src/domain/**`. No `Date`, `Math.random`, `crypto`, DOM globals or implicit locale. Sorting uses the existing `compareNames` / `compareIds`.
- **Rounding** happens only in `displayQuantity` and `roundTo2` (research R3).
- **Thin components**: components render `shoppingPage(…)` output and call repository methods or `src/app/shopping.ts`. They compute nothing inline.
- **Tests**: Vitest, no network, no real timers, `FixedIdGenerator`, `FixedClock('2026-11-04')` (Week "2–8 lis 2026"), shuffled order.
- **Framework7 structure**: Framework7 9 parts in the app's look (project memory: Framework7 native patterns). Check every story at 375 pt with an iOS user agent and at desktop width.
- **Commits**: Commit after each task group with tests passing (Conventional Commits, e.g. `feat(shopping): …`, `test(domain): …`). Stage specific paths. Don't push or merge without asking.

---

## Phase 1: Setup

**Purpose**: Confirm the starting point. This feature adds no dependencies or tooling (research R12).

- [X] T001 On branch `004-shopping-list`, run `npm run lint`, `npm run typecheck`, `npm test` and `npm run coverage`, and confirm everything passes before any change. If anything fails, stop and report it, because it predates this feature.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The stored types, display rounding, the list-building rules, Dexie v3, `ShoppingRepository`, and the Product maintenance rules. Every story uses these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Domain tests (write first, they must fail)

- [X] T002 [P] Extend `tests/domain/units.test.ts` with every "Required cases" row of [contracts/domain-api.md](contracts/domain-api.md) "units.ts":
  - `formatListAmount`: 750 g → `"750 g"`, 74.6 g → `"75 g"`, 0.3 g → `"1 g"`, 999.6 g → `"1 kg"`, 1000 g → `"1 kg"`, 1250 g → `"1,25 kg"`, 1234 g → `"1,23 kg"`, 2000 g → `"2 kg"`, 600 ml → `"600 ml"`, 1100 ml → `"1,1 l"`, 2.5 pcs → `"3 szt."`, 2.01 pcs → `"3 szt."`, 2.0000000004 pcs → `"2 szt."`, 0.2 pcs → `"1 szt."`.
  - `displayQuantity(0, 'g') === 0`, `displayQuantity(0, 'pcs') === 0`, `displayQuantity(0.3, 'ml') === 1`.
  - Every existing `formatAmount` test still passes unchanged.
- [X] T003 [P] Create `tests/domain/shopping.test.ts` (list part), with Products, Dishes and Meals built from `tests/fakes/dishes.ts` helpers where they fit:
  - **`plannedAmounts`**:
    - US1-1: "Owsianka" (yield 2: 100 g płatki owsiane, 300 ml mleko) at 1 and 3 Servings → mleko 600, płatki 200.
    - US1-2: plus a Dish with 500 ml mleko → mleko 1100.
    - US1-4: a Detached Meal whose copy has 80 g per Serving counts 80 per Serving, not the Dish's 50.
    - US1-5: a Meal of a Dish with `archived: true` is counted.
    - A Meal whose Dish record is missing (and isn't detached) is skipped.
    - The same Meals in reversed and shuffled input order give a deep-equal map (summed in `compareIds` order, research R3).
    - Only amounts > 0 are present.
  - **SC-001 reference Week**: 20 Meals (Linked and Detached, Servings 0.5 / 1 / 1.5 / 3, one Product used by three Dishes, every unit). Every `formatListAmount(planned, unit)` equals a hand-computed string written into the test.
  - **`buildShoppingList`**:
    - One `ProductLine` per Product with a Planned amount, with `planned` unrounded and `amount === planned` when there is no Adjustment.
    - A Product id with no Product record is skipped.
    - US1-7: "cebula", "Awokado", "łosoś", "ziemniaki" → Awokado, cebula, łosoś, ziemniaki. An Extra "kawa" sorts among them.
    - Two Extras "kawa" keep `compareIds` order. An Extra and a Product with the same name are two lines.
    - A ticked Product line, an At Home line and a ticked Extra go to `done`, sorted the same way. A line both ticked and At Home appears once, in `done`.
    - A state record for a Product with no Meals in the Week adds no line.
    - An Adjustment `{ amount: 500, plannedAmount: 400 }` with planned 400 → `line.adjustment` set and `line.amount === 500`. With planned 600 → `line.adjustment === null` and `line.amount === 600` (dormant, FR-020).
  - **`isListEmpty`**: an empty Week → `true`. Only one Extra → `false`. Only a `done` line → `false`.
  - **`adjustmentApplies`**: `(null, 400)` → false. `({500, 400}, 400)` → true. `(…, 600)` → false. `(…, 400.004)` → true.
  - **`adjustmentDirection`**: `{500, 400}` → `'more'`, `{250, 400}` → `'less'`.
  - **`applyStatePatch`** (key `{ weekStart: '2026-11-02', productId: 'p1' }`):
    - From `undefined`, `{ ticked: true }` → `{ weekStart, productId, ticked: true, atHome: false, adjustment: null }`.
    - `{ ticked: false }` on a record with only `ticked` → `null`.
    - `{ adjustment: null }` on a record with `atHome: true` and an Adjustment → keeps `atHome`, `adjustment: null`.
    - `{ atHome: false }` on a ticked and At Home record → still ticked.
    - An empty patch on `undefined` → `null`.
- [X] T004 Extend `tests/domain/shopping.test.ts` (merge part, after T003 because it is the same file) with `mergeProductListStates` per [contracts/domain-api.md](contracts/domain-api.md):
  - Both planned, both ticked → ticked, under `intoId`. Only one ticked → not ticked.
  - Only `into` planned and ticked, `from` unticked → ticked.
  - Only `from` planned and At Home, `into` missing → At Home under `intoId`.
  - Neither planned: `from` ticked, `into` missing → not ticked (`null`).
  - Adjustments on either side → `adjustment: null`. Nothing left → `null`.
  - The result's `weekStart` is the input's, and `productId` is `intoId`.

### Domain implementation

- [X] T005 Extend `src/domain/types.ts` with the stored types from [data-model.md](data-model.md), copied exactly with their comments:
  - `Adjustment { amount; plannedAmount }`: `amount` is "> 0, roundTo2, in the Product's unit", `plannedAmount` is "> 0, roundTo2(Planned amount) when it was typed".
  - `ProductListState { weekStart; productId; ticked; atHome; adjustment: Adjustment | null }`, stored only while at least one field is set.
  - `Extra { id; weekStart; text; ticked }`: `id` is a UUID, `text` is "normalizeName(input), non-empty".
- [X] T006 [P] Add `displayQuantity(amount, unit)` and `formatListAmount(amount, unit)` to `src/domain/units.ts`:
  - g, ml: `roundTo(amount, 0)`, and at least 1 when `amount > 0`. pcs: `Math.ceil(roundTo2(amount))`.
  - From 1000 g or ml (on the rounded quantity) divide by 1000 and use `formatDecimal(q / 1000)` with "kg" / "l". Labels "g", "kg", "ml", "l", "szt.".

  This makes T002 pass.
- [X] T007 Create `src/domain/shopping.ts` with the derived types `ProductLine`, `ExtraLine`, `ShoppingLine`, `ShoppingList` (copied from [data-model.md](data-model.md)) and `plannedAmounts`, `adjustmentApplies`, `adjustmentDirection`, `buildShoppingList`, `isListEmpty`, `applyStatePatch`, per [contracts/domain-api.md](contracts/domain-api.md):
  - `plannedAmounts` sorts the Meals with `compareIds`, resolves each with `mealSource`, skips `null`, and sums `scaleMeal(source, meal.servings).ingredients` by `productId`.
  - `adjustmentApplies` compares `roundTo2(planned) === adjustment.plannedAmount`.
  - `buildShoppingList` sorts each part with `compareNames` on the shown text, then `compareIds` on the Product or Extra id. `done` = ticked or At Home (Products), ticked (Extras).
  - `applyStatePatch` returns `null` when `ticked` and `atHome` are false and `adjustment` is `null`.

  This makes T003 pass. `adjustmentFieldText` and `decideAdjustmentSave` come in US4 (T037).
- [X] T008 Add `mergeProductListStates` to `src/domain/shopping.ts` (research R4): participants are the Products with planned > 0 that Week, or both when neither has one; a missing record has no marks; a mark is kept only if every participant has it; the Adjustment is always `null`; returns `null` when nothing is set. This makes T004 pass.

### Storage, repositories and wiring

- [X] T009 Add to `src/data/db.ts`, keeping versions 1 and 2 unchanged and with no upgrade function:

  ```ts
  this.version(3).stores({
    productListStates: '[weekStart+productId], weekStart, productId',
    extras: 'id, weekStart',
  });
  ```

  Declare `productListStates: Table<ProductListState, [IsoDate, string]>` and `extras: Table<Extra, string>`. `tests/fakes/test-db.ts` needs no change.
- [X] T010 [P] Create `tests/data/shopping-repository.test.ts` (on `createTestDb()` and `FixedIdGenerator`), per [contracts/persistence-and-ports.md](contracts/persistence-and-ports.md) "Required integration tests":
  - Tick, then untick → no record left in `productListStates`.
  - Tick and At Home on one Product → one record with both. Clearing At Home keeps the tick.
  - `updateProductState(w, p, { adjustment: { amount: 500, plannedAmount: 400 } })` stores it. `{ adjustment: null }` on an Adjustment-only record deletes it.
  - A record or Extra in Week `2026-11-02` is not listed for `2026-11-09`.
  - `addExtra(w, '  kawa ')` → `{ id, weekStart: w, text: 'kawa', ticked: false }`. Two `'kawa'` → two records with different ids. `addExtra(w, '  ')` → `null`, nothing stored.
  - `setExtraTicked(id, true)` stores the tick. `setExtraTicked` and `deleteExtra` of a missing id don't throw.
- [X] T011 [P] Extend `tests/data/week-repository.test.ts` with the FR-031 regression: seed a state record (ticked, At Home and an Adjustment) and an Extra in the target Week, run `replaceWeek` from the previous Week, and assert both are deep-equal to before.
- [X] T012 Create `src/data/shopping-repository.ts` exporting `ShoppingRepository` and `createShoppingRepository(db, ids)` per [contracts/persistence-and-ports.md](contracts/persistence-and-ports.md):
  - `listProductStates` / `listExtras`: `where('weekStart').equals(weekStart).toArray()`.
  - `updateProductState`: one `rw` transaction over `productListStates`: `get([weekStart, productId])`, `applyStatePatch`, then `put` or `delete`.
  - `addExtra`: `normalizeName(text)`; `''` → `null`; otherwise `add({ id: ids.next(), weekStart, text, ticked: false })`.
  - `setExtraTicked`: `extras.update(id, { ticked })`. `deleteExtra`: `extras.delete(id)`.

  This makes T010 pass.
- [X] T013 Wire `shopping: ShoppingRepository` into `Deps` and `createDeps()` in `src/app/deps.ts`, and into `createTestDeps()` in `tests/ui/render.tsx` (`createShoppingRepository(db, ids)`).

### Product maintenance (FR-028–FR-030, research R4)

- [X] T014 Extend `tests/data/product-repository-maintenance.test.ts`:
  - `delete` of an unused Product with records in two Weeks → both gone; another Product's record untouched.
  - `changeUnit` of an unused Product: Adjustments removed, ticks and At Home kept, an Adjustment-only record deleted.
  - `merge(A, B)` across two Weeks, with Meals seeded through `deps.week` / the db:
    - Week 1: both planned, only A ticked → B's record not ticked (no record if nothing else is set).
    - Week 2: only A planned and A At Home → B At Home.
    - Adjustments on both are gone, and no record of A is left in any Week.
  - `merge` with a unit mismatch leaves `productListStates` deep-equal to before.
- [X] T015 Update `src/data/product-repository.ts`, keeping every signature and result type:
  - Add `db.productListStates` to the transactions of `delete`, `changeUnit` and `merge`.
  - **`delete`**: after the usage check passes, `productListStates.where('productId').equals(id).delete()`.
  - **`changeUnit`**: after the usage check passes, for each record of the Product, `applyStatePatch(record, record, { adjustment: null })`, then `put` or `delete`.
  - **`merge`**: after the unit check and before Dishes and Meals are rewritten:
    1. read `productListStates.where('productId').anyOf(fromId, intoId)`;
    2. for each distinct `weekStart`, read that Week's Meals (`const { start, end } = weekRange(weekStart)`, then `meals.where('date').between(start, end, true, true)`) and compute `plannedAmounts` from the Dishes as read before the rewrite;
    3. `mergeProductListStates({ weekStart, intoId, from, into, fromPlanned, intoPlanned })` with `?? 0` for absent amounts;
    4. delete both Products' records for that Week, then `put` the result if it isn't `null`.

  This makes T014 pass.

**Checkpoint**: Lint, typecheck, tests and the coverage gate pass (100% on `units.ts` and `shopping.ts`). The app looks the same as before.

---

## Phase 3: User Story 1 - See what to buy for the Week (Priority: P1) 🎯 MVP

**Goal**: The Lista zakupów tab shows the Shown Week's live list (name and Amount to buy per row, alphabetical), with its own Week header (← / →, header swipe), opening on the current Week.

**Independent Test**: Plan the quickstart Week, open Lista zakupów, and compare each amount with a hand calculation. Change a Meal's Servings in Tydzień and confirm the list follows. Move the list's Week and confirm Tydzień keeps its own (spec US1, quickstart rows 1–3).

### Tests for User Story 1

- [X] T016 [P] [US1] Create `tests/ui/shopping-vm.test.ts` for `src/ui/view-models/shopping.ts`:
  - `shoppingPage('2026-11-02', data)` returns `null` while any of `products`, `meals`, `dishes`, `states`, `extras` is `undefined` (research R8).
  - With data: `weekLabel` "2–8 lis 2026", `empty`, and rows with `kind`, `key`, `productId` / `id`, `name`, `ticked`, `atHome` and `amountText` ("1,1 l", "3 szt.").
  - `empty: true` for no Meals and no Extras.
  - `headerSwipeDelta`: (−49, 0) → 0, (−50, 0) → 7, (50, 0) → −7, (−60, 50) → 0 (diagonal), (0, 0) → 0.
  - `emptyMessage` equals "Na ten tydzień nie ma nic do kupienia.".
- [X] T017 [P] [US1] Create `tests/ui/shopping-page.test.tsx` (jsdom, `createTestDeps()`, data seeded through the repositories):
  - **S1**: the US1-1/2/3 Week → rows "jajka 3 szt.", "mleko 1,1 l", "płatki owsiane 200 g" in alphabetical order.
  - **Live**: while the page is open, add a Meal using "mleko" through `deps.week` → the row shows the new amount with no other action (FR-006). Then rename "mleko" through `deps.products` → the row shows the new name at once (spec Edge Cases "Product renamed", SC-008).
  - **S8**: tap "Następny tydzień" → label "9–15 lis 2026" and only that Week's rows. Then a header swipe right (`tests/ui/pointer.ts` helpers, starting outside the edge zone) → "2–8 lis 2026". A swipe starting in the edge zone does nothing.
  - **S11** (US1 part): an empty Week shows `emptyMessage`. US5 and US6 extend this test.

### Implementation for User Story 1

- [X] T018 [P] [US1] Create `src/ui/view-models/shopping.ts` with `ShoppingPageModel`, `ShoppingRow` (US1 fields), `shoppingPage`, `headerSwipeDelta` and `emptyMessage` per [contracts/ui.md](contracts/ui.md):
  - `shoppingPage` indexes Dishes with `indexDishes`, filters Meals to `weekRange(weekStart)`, calls `buildShoppingList`, and maps lines to rows: `amountText = formatListAmount(line.amount, product.unit)`, `key` = `p:{productId}` or `e:{id}`.
  - `headerSwipeDelta`: `|dx| ≥ 50` and `|dx| > 1.5·|dy|`; `dx < 0` → 7, otherwise −7; else 0.
  - US3, US4 and US6 add their row fields and `shareText`.

  This makes T016 pass.
- [X] T019 [P] [US1] Create `src/ui/components/ShoppingRow.tsx`: a Framework7 list item `li.shopping-row` that renders a Product row (name, wrapping; amount text on the right) or an Extra row (text only). US2–US5 add the tick, the house button, the amount button and the swipeout.
- [X] T020 [US1] Create `src/ui/pages/ShoppingListPage.tsx`:
  - `weekStart` state = `weekStartOf(deps.clock.today())` on mount (FR-003).
  - Five live queries: `deps.week.listMeals(weekRange(weekStart))`, `deps.dishes.list()`, `deps.products.list()`, `deps.shopping.listProductStates(weekStart)`, `deps.shopping.listExtras(weekStart)` (match the existing method names). `shoppingPage(…)`; render nothing while it's `null`.
  - Inside `.page-wide`: `Navbar title="Lista zakupów"`; the `.list-week-card` with round 44 px ← / → buttons (`arrow_left` "Poprzedni tydzień", `arrow_right` "Następny tydzień") around the centred label; the `Block` with `emptyMessage` when `empty`; `List strong inset dividersIos` `.shopping-list` of `toBuy` (omitted when empty); `.shopping-list.is-done` of `done` (omitted when empty).
  - Header swipe: `touch-action: pan-y`; on pointer down record `(x, y)` unless `inEdgeZone(x, window.innerWidth)`; on pointer up `setWeekStart(addDays(weekStart, headerSwipeDelta(dx, dy)))` when non-zero.

  This makes T017 pass.
- [X] T021 [P] [US1] Add to `src/ui/styles/app.css`: `.list-week-card` (the Week card's look; label 20 px, weight 700, centred), its round buttons, `.shopping-list`, `.shopping-row` (name wraps, amount right-aligned, row min height 44 px).
- [X] T022 [US1] In `src/ui/routes.ts` set `shoppingRoutes = [{ path: '/', component: ShoppingListPage }]`, remove `placeholder()` and delete `src/ui/components/PlaceholderPage.tsx` (no other user; check with grep). Update `tests/ui/app-shell.test.tsx`: the Lista zakupów tab shows "2–8 lis 2026" instead of the placeholder notice (the one earlier test changed on purpose). Add a test for FR-003 and US1-11: on Lista zakupów tap "Następny tydzień", switch to Tydzień (still "2–8 lis 2026" there) and back → the list still shows "9–15 lis 2026".

**Checkpoint**: The list is visible and live. Quickstart rows 1–3 pass at 375 pt.

---

## Phase 4: User Story 2 - Tick items off while shopping (Priority: P1)

**Goal**: One tap on the tick (or the name) ticks or unticks any List item. Ticked items show a filled tick, dimmed and not crossed out, in the bottom part, stored per Week.

**Independent Test**: Tick three of ten items, reload offline, and confirm they are still ticked and at the bottom. Change the plan and confirm the ticks stay (spec US2, quickstart rows 4 and 12).

### Tests for User Story 2

- [X] T023 [P] [US2] Extend `tests/ui/shopping-page.test.tsx`:
  - **S2**: tick "cebula" → it is in `.is-done`, has `.is-ticked`, the checkbox is checked, and the row has no `.is-at-home`. Tap its name → back in the top part.
  - US2-5: tick "mleko", add a Meal using "mleko" → new amount, still ticked.
  - US2-6: the next Week's "mleko" is not ticked.
  - An Extra seeded with `deps.shopping.addExtra` can be ticked and moves to `.is-done`.

### Implementation for User Story 2

- [X] T024 [US2] In `src/ui/components/ShoppingRow.tsx`, add the tick: a `<label class="item-checkbox shopping-tick">` holding a hidden `<input type="checkbox" checked={row.ticked}>`, Framework7's `<i class="icon icon-checkbox">` and the name, with an `onToggleTick(row)` prop. The amount stays outside the label. Add `.is-ticked` to the `li` when `row.ticked`.
- [X] T025 [US2] In `src/ui/pages/ShoppingListPage.tsx`, handle `onToggleTick`: Product → `deps.shopping.updateProductState(weekStart, productId, { ticked: !row.ticked })`; Extra → `deps.shopping.setExtraTicked(id, !row.ticked)`. This makes T023 pass.
- [X] T026 [P] [US2] Add `.shopping-row.is-ticked` to `src/ui/styles/app.css`: name and amount in `--planner-muted` at 0.55 opacity, **no** line-through (FR-012).

**Checkpoint**: Quickstart rows 4 and 12 (ticks) pass. US1 and US2 together are a usable shopping list.

---

## Phase 5: User Story 3 - Mark what is already at home (Priority: P2)

**Goal**: A house button on each Product row marks it At Home with one tap: crossed out, dimmed, bottom part, house filled. Extras have no house button.

**Independent Test**: Mark three Products At Home, reload, confirm they are still crossed out at the bottom. Unmark one and confirm it returns (spec US3, quickstart row 5).

### Tests for User Story 3

- [X] T027 [P] [US3] Extend `tests/ui/shopping-vm.test.ts`: a Product row's `atHomeLabel` is "Mam w domu: ryż". An At Home row is in `done`.
- [X] T028 [P] [US3] Extend `tests/ui/shopping-page.test.tsx`:
  - **S3** (US3 part): tap "Mam w domu: ryż" → `aria-pressed="true"`, the row in `.is-done` with `.is-at-home`. Tap again → back in the top part, `aria-pressed="false"`.
  - US3-6: At Home, then tick → both `.is-at-home` and `.is-ticked`.
  - US3-3: with "ryż" At Home, add a Meal using rice → the row shows the new amount and stays `.is-at-home`.
  - US3-5: an Extra row has no "Mam w domu" button.

### Implementation for User Story 3

- [X] T029 [US3] Add `atHomeLabel` (`"Mam w domu: {name}"`) to Product rows in `src/ui/view-models/shopping.ts`. This makes T027 pass.
- [X] T030 [US3] In `src/ui/components/ShoppingRow.tsx`, add the At Home button to Product rows, outside the label, right of the amount: `<button class="shopping-at-home" aria-pressed={row.atHome} aria-label={row.atHomeLabel}>` with the Framework7 icon `house`, or `house_fill` when pressed, and no visible text, 44 × 44 px. Add `.is-at-home` to the `li` when `row.atHome`. Prop `onToggleAtHome(row)`.
- [X] T031 [US3] In `src/ui/pages/ShoppingListPage.tsx`, handle `onToggleAtHome`: `deps.shopping.updateProductState(weekStart, productId, { atHome: !row.atHome })`. This makes T028 pass.
- [X] T032 [P] [US3] Add to `src/ui/styles/app.css`: `.shopping-row.is-at-home` name and amount `text-decoration: line-through` with the same dimming; `.shopping-at-home` 44 × 44 px, muted icon, `[aria-pressed="true"]` icon in `--planner-accent` (FR-015).

**Checkpoint**: Quickstart row 5 passes.

---

## Phase 6: User Story 4 - Buy a different amount than the plan needs (Priority: P2)

**Goal**: Tapping a Product row's amount opens a sheet to type the amount to buy. It shows as more (green ↑) or less (amber ↓) with "plan: …" below, and drops out when the Planned amount changes.

**Independent Test**: With 400 g "ryż" planned, type 500 and save → "500 g" styled more, "plan: 400 g" below. Add a rice Meal → the new Planned amount, unstyled (spec US4, quickstart rows 6–9).

### Tests for User Story 4

- [X] T033 [P] [US4] Extend `tests/domain/shopping.test.ts`:
  - `adjustmentFieldText(1234.5, 'g')` → `"1235"`, `(2.5, 'pcs')` → `"3"`, `(0.3, 'g')` → `"1"`.
  - `decideAdjustmentSave`, every row of the contract table: `"400"`/`"400"`/400 → unchanged; `"400,0"`/`"400"` → unchanged; `"500"`/`"400"` → set {500, 400}; `" 250 "` → set {250, 400}; `""`/`"500"` → clear; `"   "` → clear; `"400"`/`"500"` → clear; `"400,004"`/`"500"` → clear; `"0"`, `"-5"`, `"abc"` → invalid; `"1236"`/`"1235"`/1234.5 → set {1236, 1234.5}; `"6"`/`"3"`/2.5 → set {6, 2.5}; `"2,5"`/`"3"`/2.5 → clear.
- [X] T034 [P] [US4] Create `tests/app/shopping.test.ts` (`saveAdjustment` part) on a test db:
  - The US4-2 example stores `{ amount: 500, plannedAmount: 400 }` → `{ kind: 'saved' }`.
  - Saving the filled value → `unchanged`, record deep-equal to before.
  - Empty text on a record with an Adjustment and At Home → `cleared`, Adjustment removed, At Home kept.
  - `"abc"` → `invalid`, nothing written.
- [X] T035 [P] [US4] Extend `tests/ui/shopping-vm.test.ts`:
  - With an applying Adjustment {500, 400} on "ryż": `amountText` "500 g", `direction: 'more'`, `plannedText` "plan: 400 g", `amountLabel` "ryż: 500 g, więcej niż w planie (400 g), zmień ilość". {250, 400} → `'less'` and "mniej niż w planie".
  - Without one (or dormant): `direction: null`, `plannedText: null`, `amountLabel` "ryż: 400 g, zmień ilość".
  - `planned` is the unrounded Planned amount, `fieldText` is `adjustmentFieldText(line.amount, unit)`, `unitLabel` is "g" / "ml" / "szt." (`unitLabel` from `view-models/dish-form.ts`).
  - `amountErrorMessage` "Wpisz liczbę większą od zera." and `amountFooter` "Zostaw puste, aby wrócić do ilości z planu.".
- [X] T036 [P] [US4] Extend `tests/ui/shopping-page.test.tsx`:
  - **S4**: tap "ryż: 400 g, zmień ilość" → the sheet shows "W planie: 400 g" and the field "400". Type 500, "Zapisz" → "500 g", `.is-more`, "plan: 400 g".
  - **S5**: type "abc", "Zapisz" → the error text is shown, the sheet stays open, nothing is stored.
  - **S6**: with the typed 500 g, add a Meal using rice → the row shows the new Planned amount, no `.is-more`, no "plan:" line.
  - US4-9: tick the row → "500 g" still shown.

### Implementation for User Story 4

- [X] T037 [US4] Add `adjustmentFieldText(amount, unit)` (`String(displayQuantity(amount, unit))`) and `decideAdjustmentSave({ text, filledText, planned })` to `src/domain/shopping.ts`, in the contract's order: (1) `parseDecimal(text)` equals `parseDecimal(filledText)` → unchanged; (2) blank → clear; (3) not a number or ≤ 0 → invalid; (4) `roundTo2(value) === roundTo2(planned)` → clear; (5) set `{ amount: roundTo2(value), plannedAmount: roundTo2(planned) }`. This makes T033 pass at 100% coverage.
- [X] T038 [US4] Create `src/app/shopping.ts` with `saveAdjustment(deps: { shopping }, { weekStart, productId, text, filledText, planned })`: `decideAdjustmentSave` → set: `updateProductState(…, { adjustment })` → `saved`; clear: `{ adjustment: null }` → `cleared`; unchanged / invalid: no write. This makes T034 pass.
- [X] T039 [US4] Add the row fields `direction`, `plannedText`, `amountLabel`, `planned`, `fieldText`, `unitLabel` and the constants `amountErrorMessage`, `amountFooter` to `src/ui/view-models/shopping.ts`. This makes T035 pass.
- [X] T040 [US4] Create `src/ui/components/AmountSheet.tsx`: a Framework7 `Sheet` (`backdrop`, `swipeToClose`, height auto, aligned with the desktop column like the other sheets, FR-034), props `row` (or `null`), `opened`, `onClose()`, `onSave(text)`:
  - `Toolbar`: left "Anuluj" (`sheetClose`), title the Product name, right "Zapisz".
  - "W planie: {formatListAmount(planned)}" (from the row's text), an outlined `ListInput` "Ilość do kupienia", `inputmode="decimal"`, filled with `row.fieldText`, the `unitLabel` after it, and the footer `amountFooter`.
  - `onSave` returning `invalid` keeps it open and shows `amountErrorMessage` on the field (FR-019).
- [X] T041 [US4] In `src/ui/components/ShoppingRow.tsx`, turn the amount into `<button class="shopping-amount" aria-label={row.amountLabel}>`: line 1 `amountText` plus an `arrow_up` / `arrow_down` icon and the class `is-more` / `is-less` when `direction` is set; line 2 `plannedText` when set. In `src/ui/pages/ShoppingListPage.tsx`, keep the target `productId` in state, render one `AmountSheet` per page, look the row up in the live model at render and at save time (so `planned` is current), and call `saveAdjustment` with `filledText: row.fieldText`. This makes T036 pass.
- [X] T042 [P] [US4] Add to `src/ui/styles/app.css`: a `--planner-adjust-less` token on `:root` (a dark amber with at least 4.5:1 contrast on white), `.shopping-amount` (two lines, right-aligned, 44 px min height), `.is-more` in `--planner-accent`, `.is-less` in `--planner-adjust-less`, and the plan line at 12 px in `--planner-muted`.

**Checkpoint**: Quickstart rows 6–9 pass.

---

## Phase 7: User Story 5 - Add things the plan doesn't cover (Priority: P2)

**Goal**: A field on the list adds Extras (text only) that sort with the Products, tick like them, and are deleted by swiping.

**Independent Test**: Add two Extras, tick one, change the plan, reload, and confirm both are unchanged. Swipe one away (spec US5, quickstart rows 10–11).

### Tests for User Story 5

- [X] T043 [P] [US5] Extend `tests/app/shopping.test.ts` with `addExtra`: `" papier  toaletowy "` → `'added'`, stored as `"papier toaletowy"`. `"  "` → `'empty'`, nothing stored.
- [X] T044 [P] [US5] Extend `tests/ui/shopping-page.test.tsx`:
  - **S7**: type "kawa" in the "Coś spoza planu…" field and press Enter → the row appears in alphabetical place, and the input is empty and focused. Tap "Usuń" in its swipeout → gone, with no dialog.
  - US5-2: Enter on an empty or spaces-only field adds nothing.
  - **S11** (US5 part): an empty Week still shows the Extra field.

### Implementation for User Story 5

- [X] T045 [US5] Add `addExtra(deps: { shopping }, weekStart, text): Promise<'added' | 'empty'>` to `src/app/shopping.ts`. This makes T043 pass.
- [X] T046 [US5] Add `extraPlaceholder` ("Coś spoza planu…") to `src/ui/view-models/shopping.ts`.
- [X] T047 [US5] In `src/ui/pages/ShoppingListPage.tsx`, add the Add Extra block between the top list and the done list (also in the empty state): an inset list with one row holding a `<form>` with an outlined text input (`extraPlaceholder`, `enterkeyhint="done"`) and a "Dodaj" button. Submit calls `addExtra`; on `'added'` clear the input and keep focus (FR-022).
- [X] T048 [US5] In `src/ui/components/ShoppingRow.tsx`, wrap Extra rows in Framework7's `swipeout` with one right-side `SwipeoutButton delete` labelled "Usuń" and no `confirmText`. Its `onDelete` calls `deps.shopping.deleteExtra(id)` from the page (FR-023). This makes T044 pass.
- [X] T049 [P] [US5] Add the Extra form styles to `src/ui/styles/app.css` (input fills the row, "Dodaj" as a text button in the accent colour).

**Checkpoint**: Quickstart rows 10–11 pass.

---

## Phase 8: User Story 6 - Share the list (Priority: P3)

**Goal**: "Udostępnij listę" sends what is left to buy as plain text through the share sheet, or copies it to the clipboard with a toast.

**Independent Test**: With a ticked item, an At Home item, a typed amount and an Extra, share to Notatki and confirm the heading and only the items still to buy. In desktop Firefox, confirm the clipboard and toast (spec US6, quickstart rows 13–15).

### Tests for User Story 6

- [X] T050 [P] [US6] Create `tests/adapters/web-text-sharer.test.ts` (node project, `vi.stubGlobal('navigator', …)`, with `afterEach(() => vi.unstubAllGlobals())`, because the config restores mocks but not stubbed globals): `share` resolves → `'shared'` and was called with `{ text }`; rejects with `AbortError` → `'cancelled'`; rejects with `NotAllowedError` → throws; no `share` → `clipboard.writeText(text)` called, `'copied'`.
- [X] T051 [P] [US6] Extend `tests/ui/shopping-vm.test.ts`:
  - `shareText('2026-11-16', toBuy)` → `"Lista zakupów 16–22 lis 2026\nmleko 1,1 l\npapier toaletowy\nryż 500 g"`: heading, screen order, the typed amount, Extras as text, no ticked or At Home lines, no plan amount.
  - `shoppingPage(...).shareText` is `null` when `toBuy` is empty (every item ticked or At Home).
  - `copiedToast` "Skopiowano listę do schowka." and `shareFailedMessage` "Nie udało się udostępnić listy.".
- [X] T052 [P] [US6] Extend `tests/ui/shopping-page.test.tsx` (each test passes its own `RecordingTextSharer` to `createTestDeps`):
  - **S9**: sharer `'copied'` → the sharer recorded the US6 text and the toast is shown.
  - **S10**: `'cancelled'` → no toast, no dialog. `'fail'` → an alert with `shareFailedMessage`.
  - **S3** (share part): after marking "ryż" At Home the shared text has no "ryż".
  - **S11** (share part): an empty Week has no "Udostępnij listę".

### Implementation for User Story 6

- [X] T053 [US6] Add the `TextSharer` interface to `src/data/ports.ts` (`share(text): Promise<'shared' | 'copied' | 'cancelled'>`, other failures throw), and create `tests/fakes/recording-text-sharer.ts`: `RecordingTextSharer` with `texts: string[]`, constructed with a result (default `'shared'`) or `'fail'` (throws).
- [X] T054 [US6] Create `src/adapters/web-text-sharer.ts` exporting `webTextSharer: TextSharer` per research R5. This makes T050 pass.
- [X] T055 [US6] Add `shareList(deps: { sharer }, text)` to `src/app/shopping.ts` (passes through). Add `sharer: TextSharer` to `Deps` / `createDeps()` (`webTextSharer`) and to `createTestDeps()` (`new RecordingTextSharer()` by default, overridable).
- [X] T056 [US6] Add `shareText(weekStart, toBuy)`, the `shareText` model field, `copiedToast` and `shareFailedMessage` to `src/ui/view-models/shopping.ts`. Lines use `formatListAmount(line.amount, unit)` for Products and the text for Extras. This makes T051 pass.
- [X] T057 [US6] In `src/ui/pages/ShoppingListPage.tsx`, add the full-width "Udostępnij listę" text button (`square_arrow_up` icon) under the Week row, styled like "Skopiuj do następnego tygodnia", rendered only when `model.shareText !== null` (FR-025). The click handler calls `shareList(deps, model.shareText)` **synchronously, with no `await` before it** (research R5): `'copied'` → `f7.toast.show({ text: copiedToast })`; `'shared'` / `'cancelled'` → nothing; a throw → `f7.dialog.alert(shareFailedMessage)`. This makes T052 pass.

**Checkpoint**: Quickstart rows 13–15 pass.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: The dev seed for SC-002, the device run and the final checks.

- [X] T058 [P] Update `src/dev/seed.ts`:
  - `replaceData` also clears `productListStates` and `extras`.
  - `weeks-N` gives the current Week 35 Meals over at least 100 distinct Products (more seeded Products, or Ingredients spread over them), and gives each past Week a few state records (ticked, At Home, one Adjustment) and Extras, using `deps.shopping`.
  - `dishes-N-photos-M` and `products-N` behave as before.
- [X] T059 [P] Remove leftovers: `grep -rn "PlaceholderPage\|placeholder(" src tests` finds nothing related to tabs, and every string in [contracts/ui.md](contracts/ui.md) appears exactly once as a constant or inline in the page or components.
- [ ] T060 Check every story at 375 pt with an iOS user agent and at ≥ 1024 px desktop width (FR-034, quickstart row 18): the page sits in the shared column, the amount sheet lines up with it, long names and Extras wrap, and the amount and house buttons stay tappable.
- [ ] T061 Run the full [quickstart.md](quickstart.md) on an iPhone (rows 1–18), as the installed PWA and in a Safari tab, plus the SC-002 spot check with `?seed=weeks-52`. Check that a row swipe doesn't scroll the page sideways and the system back swipe still works. Record the results under "Results" in `quickstart.md`. If no device is available, record that and leave the task open (as with feature 001's Android check).
- [X] T062 Final gate:
  - `npm run lint`, `npm run typecheck`, `npm run coverage` (100% on `src/domain/**`) and `npm run build` all pass.
  - `git diff main -- package.json package-lock.json` is empty (no new dependencies).
  - `grep -n "Date\|Math.random\|toLocale" src/domain/shopping.ts` finds nothing.
  - Commit.

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: none.
- **Phase 2 (Foundational)**: after Setup. Blocks every story.
- **US1 (Phase 3)**: after Phase 2. Every other story renders in its page, so each depends on US1.
- **US2, US3, US4, US5**: each after US1, independent of each other apart from the shared files below.
- **US6 (Phase 8)**: after US1. Its tests mark an item At Home (S3 share part), so run that test after US3, or seed the At Home record through `deps.shopping` directly.
- **Polish (Phase 9)**: T058 and T059 any time after US1. T060–T062 after all stories.

### Within phases

- Domain tests before their implementation: T002 → T006; T003 → T007; T004 → T008 (T003 → T004, same file); T033 → T037.
- T005 before T006–T008. T009 before T010–T012. T012 → T013. T008 and T009 before T015.
- In each story: tests → domain → use case → view model → component → page.

### Shared files between stories

| File | Edited by |
|---|---|
| `src/domain/shopping.ts` | T007, T008, T037 |
| `tests/domain/shopping.test.ts` | T003, T004, T033 |
| `src/app/shopping.ts` / `tests/app/shopping.test.ts` | T038, T045, T055 / T034, T043 |
| `src/ui/view-models/shopping.ts` | T018, T029, T039, T046, T056 |
| `tests/ui/shopping-vm.test.ts` | T016, T027, T035, T051 |
| `src/ui/components/ShoppingRow.tsx` | T019, T024, T030, T041, T048 |
| `src/ui/pages/ShoppingListPage.tsx` | T020, T025, T031, T041, T047, T057 |
| `tests/ui/shopping-page.test.tsx` | T017, T023, T028, T036, T044, T052 |
| `src/ui/styles/app.css` | T021, T026, T032, T042, T049 |
| `src/app/deps.ts` / `tests/ui/render.tsx` | T013, T055 |

Run these tasks one after another when stories are worked on together.

### Parallel opportunities

- **Foundational**: T002 and T003 together; then T006 and T007 after T005; T010 and T011 together after T009.
- **US1**: T016 and T017 together; then T018, T019 and T021 together.
- **US3**: T027 and T028 together; T032 alongside T029–T031.
- **US4**: T033–T036 together; T042 alongside T037–T041.
- **US5**: T043 and T044 together; T049 alongside T045–T048.
- **US6**: T050–T052 together.
- **Polish**: T058 and T059 together.

---

## Parallel Example: Foundational

```text
Task: "T002 tests/domain/units.test.ts (displayQuantity, formatListAmount)"
Task: "T003 tests/domain/shopping.test.ts (list part)"

# After T005 (types):
Task: "T006 src/domain/units.ts"
Task: "T007 src/domain/shopping.ts (list rules)"

# After T009 (Dexie v3):
Task: "T010 tests/data/shopping-repository.test.ts"
Task: "T011 tests/data/week-repository.test.ts (FR-031 regression)"
```

## Parallel Example: User Story 4

```text
Task: "T033 tests/domain/shopping.test.ts (adjustmentFieldText, decideAdjustmentSave)"
Task: "T034 tests/app/shopping.test.ts (saveAdjustment)"
Task: "T035 tests/ui/shopping-vm.test.ts (more / less rows)"
Task: "T036 tests/ui/shopping-page.test.tsx (S4, S5, S6)"
```

## Parallel Example: User Story 6

```text
Task: "T050 tests/adapters/web-text-sharer.test.ts"
Task: "T051 tests/ui/shopping-vm.test.ts (shareText)"
Task: "T052 tests/ui/shopping-page.test.tsx (S9, S10)"
```

---

## Implementation Strategy

### MVP first (US1 + US2)

1. Phase 1, then Phase 2: lint, typecheck and the coverage gate pass; Product maintenance already handles list records.
2. Phase 3 (US1): the live list with its own Week.
3. Phase 4 (US2): ticks.
4. **Stop and validate** with quickstart rows 1–4 and 12 on a real iPhone. This is already a list to shop with.

### Incremental delivery

1. US3 (At Home), then quickstart row 5.
2. US4 (typed amounts), then rows 6–9.
3. US5 (Extras), then rows 10–11.
4. US6 (share), then rows 13–15.
5. Phase 9: seed, the full quickstart on an iPhone and a desktop browser, and the final gate.

### Notes

- The constitution's Principle II term list names At Home since v1.0.2 (2026-11-22).
- `checklists/requirements.md` notes still describe the pre-clarify ±Adjustments; leave them as the record of the specify step.
