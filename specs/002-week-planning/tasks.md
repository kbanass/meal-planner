---
description: "Task list for Week Planning"
---

# Tasks: Week Planning

**Input**: Design documents from `specs/002-week-planning/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Required. Constitution Principle IV requires domain tests in every feature's `tasks.md`, written together with or before the implementation, plus a 100% coverage gate on `src/domain/**`. Repository and use-case tests use `fake-indexeddb`. Component tests cover only key interactions (research R13).

**Organization**: One phase per user story, in priority order: US1, US2 (P1), then US3, US4 (P2), then US5, US6 (P3). The feature 001 handoff is in Phase 2, because once Meals can be created, deleting a Dish or a Product must already see them.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: Which user story the task belongs to (US1–US6 from spec.md)

## Conventions for every task

- **Language**:
  - Code, identifiers and comments are in English.
  - Every user-facing string we write is Polish and inline, with exact strings from [contracts/ui.md](contracts/ui.md).
  - Framework7's own default labels ("OK", "Cancel", "Back") stay as shipped (plan.md, Complexity Tracking).
- **Domain terms** follow [GLOSSARY.md](../../GLOSSARY.md): Week, Slot, Meal, Linked Meal, Detached Meal, Servings, Macros, Planned.
  - Never use Entry, Plan item, Multiplier, Quantity or Portions count as identifiers.
  - Never call Slots raised with "dodaj kolejny" "extra": they are `daySlots` / `slotCount` (research R4).
- **Domain boundary**: `src/domain/**` imports only from `src/domain/**`. It uses no `Date.now`, no argument-less `new Date`, no `Math.random`, no `crypto` and no DOM globals. `src/domain/dates.ts` uses no `Date` at all (research R1).
- **Thin components**: Components render selector or view-model output and call use cases. They compute no derived values inline.
- **Tests**: Vitest, no network, no real timers, fixed fixtures (`FixedIdGenerator`, `FixedClock`), no dependence on test order.
- **Framework7 structure**: Mirror Framework7 9's documented patterns (research R11). Check every new screen at 375 pt with an iOS user agent as well as at desktop width.
- **Commits**: Commit after each task group, with tests passing (Conventional Commits, e.g. `feat(week): …`, `test(domain): …`).

---

## Phase 1: Setup

**Purpose**: Confirm the starting point. This feature adds no dependencies or tooling.

- [X] T001 On branch `002-week-planning`, run `npm run lint`, `npm run typecheck`, `npm test` and `npm run coverage`, and confirm everything passes before any change. If anything fails, stop and report it, because it predates this feature.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Dates, display numbers, settings and Slot rules, the Meal storage and ports, and the feature 001 handoff. Every story uses these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Domain tests (write first, they must fail)

- [X] T002 [P] Write `tests/domain/dates.test.ts` per [contracts/domain-api.md](contracts/domain-api.md) "dates":
  - `weekStartOf`: `'2026-11-04'` → `'2026-11-02'`, `'2026-11-08'` → `'2026-11-02'`, `'2026-11-02'` → `'2026-11-02'`.
  - `weekDates('2026-03-30')` and `weekDates('2026-10-19')` and `weekDates('2026-10-26')` each have 7 consecutive dates, Mon → Sun.
  - `addDays('2024-02-28', 1) === '2024-02-29'`, `addDays('2024-02-29', 1) === '2024-03-01'`, `addDays('2026-12-28', 6) === '2027-01-03'`, `addDays('2026-11-09', -7) === '2026-11-02'`.
  - `toDayNumber('1970-01-01') === 0`, `toDayNumber('1969-12-31') === -1`, and `fromDayNumber(toDayNumber(d)) === d` for every day from `'2023-01-01'` to `'2028-12-31'`.
  - `weekdayIndex('2026-11-02') === 0` and `weekdayIndex('2026-11-08') === 6`.
  - `isIsoDate` accepts `'2026-11-04'` and `'2024-02-29'`, and rejects `'2026-02-30'`, `'2025-02-29'`, `'2026-13-01'`, `'2026-1-5'`, `''` and `42`.
  - `dayLabel('2026-11-05')` → `{ dayName: 'Czwartek', dateText: '5 lis' }`.
  - `weekRangeLabel`: `'2026-11-02'` → `"2–8 lis 2026"` (en dash, no spaces), `'2026-11-30'` → `"30 lis – 6 gru 2026"` (spaced en dash), `'2026-12-28'` → `"28 gru 2026 – 3 sty 2027"`.
  - `DAY_NAMES` and `MONTH_ABBREVIATIONS` equal the arrays in the contract.
- [X] T003 [P] Extend `tests/domain/numbers.test.ts`:
  - `roundTo(18.75, 1) === 18.8`, `roundTo(11.25, 1) === 11.3`, `roundTo(-1.25, 1) === -1.3`, `roundTo(349.5, 0) === 350`, and `roundTo(x, 2) === roundTo2(x)` for the existing `roundTo2` cases.
  - `formatDecimal(18.75, 1) === "18,8"`, `formatDecimal(55, 1) === "55"`, and every existing `formatDecimal` case still passes without `places`.
- [X] T004 [P] Create `tests/domain/nutrition.test.ts`:
  - `formatKcal`: 350 → "350", 349.5 → "350", 99.999 → "100".
  - `formatMacro`: 12.5 → "12,5", 18.75 → "18,8", 11.25 → "11,3", 55 → "55", 0 → "0".
  - `formatServings`: 1 → "1", 1.5 → "1,5", 0.25 → "0,25".
- [X] T005 [P] Extend `tests/domain/units.test.ts`: `formatAmount(0.5, 'pcs') === "0,5"`, `formatAmount(1/3, 'pcs') === "0,33"`, `formatAmount(74.6, 'g') === "75"`, `formatAmount(150, 'ml') === "150"`, `formatAmount(1500, 'g') === "1500"`. This feature does not convert to kg or l; the Shopping List feature does.
- [X] T006 [P] Create `tests/domain/settings.test.ts`:
  - `readSettings(undefined)`, `readSettings(null)` and `readSettings({})` → `{ slotsPerDay: 4 }`.
  - `readSettings({ slotsPerDay: 1 })` and `({ slotsPerDay: 10 })` keep the value.
  - `slotsPerDay` 0, 11, 2.5, `'4'`, `NaN` and `null` fall back to 4.
  - `isValidSlotsPerDay` agrees with those cases.
- [X] T007 [P] Create `tests/domain/slots.test.ts`:
  - `slotCountForDay(4, [], undefined) === 4`.
  - A Meal in Slot 6 → 6.
  - `{ slotCount: 5 }` with a default of 3 → 5, and with a default of 6 → 6.
  - Meals in Slots 2 and 7 plus `{ slotCount: 5 }` with a default of 4 → 7.
  - `nextSlotCount(4) === 5`.
  - `nextPosition([]) === 0`, and with positions 0 and 3 → 4.
- [X] T008 [P] Extend `tests/domain/products-maintenance.test.ts` with `productUsageBreakdown`:
  - A Product in one active Dish, one archived Dish and two Detached Meal lists → `{ dishes: 2, meals: 2 }`.
  - A Product in no list is absent from the map.
  - `countProductUsage` returns the sum (4), and every existing `countProductUsage` test still passes.

### Domain implementation

- [X] T009 Extend `src/domain/types.ts` with the types from [data-model.md](data-model.md), copied exactly with their comments:
  - `IsoDate = string`: "A local calendar date, 'YYYY-MM-DD'. Never a Date object".
  - `MealSource = Pick<Dish, 'name' | 'servingsYield' | 'ingredients' | 'macros'>`.
  - `Meal { id; date; slot; position; dishId; servings; detached }`, where:
    - `slot` is "1, 2, 3…"
    - `position` is "order within (date, slot), 0-based, ascending = order added"
    - `dishId` is "kept when detached"
    - `servings` is "> 0, rounded to 2 decimals, default 1"
    - `detached: MealSource | null` is "null = Linked Meal; otherwise whole-recipe values"
  - `DaySlots { date; slotCount }`, where `slotCount` is "≥ 1, whole number".
  - `Settings { slotsPerDay }`, where `slotsPerDay` is "whole number, 1–10, default 4".
- [X] T010 [P] Implement `src/domain/dates.ts`, making T002 pass:
  - Integer days-from-civil / civil-from-days (research R1), with no `Date` use.
  - `weekdayIndex = ((dayNumber + 3) % 7 + 7) % 7`.
  - `DAY_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela']`.
  - `MONTH_ABBREVIATIONS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru']`.
  - `weekRangeLabel` formats:
    - same month: `"{d1}–{d2} {mon} {yyyy}"`
    - different month, same year: `"{d1} {mon1} – {d2} {mon2} {yyyy}"`
    - different years: `"{d1} {mon1} {yyyy1} – {d2} {mon2} {yyyy2}"`
- [X] T011 [P] In `src/domain/numbers.ts`, add `roundTo(value, places)`, rounding half away from zero with the same `Number.EPSILON` approach. Make `roundTo2(v)` return `roundTo(v, 2)`, and give `formatDecimal` an optional `places = 2`. This makes T003 pass.
- [X] T012 [P] Create `src/domain/nutrition.ts` with `formatKcal` (`formatDecimal(v, 0)`), `formatMacro` (`formatDecimal(v, 1)`) and `formatServings` (`formatDecimal(v, 2)`), making T004 pass.
- [X] T013 [P] Add `formatAmount(amount, unit)` to `src/domain/units.ts`: `formatDecimal(amount, unit === 'pcs' ? 2 : 0)`. This makes T005 pass.
- [X] T014 [P] Create `src/domain/settings.ts` with `DEFAULT_SETTINGS = { slotsPerDay: 4 }`, `SLOTS_PER_DAY = { min: 1, max: 10 } as const`, `isValidSlotsPerDay(value: unknown)` (`Number.isInteger`, in range) and `readSettings(stored: unknown): Settings`, making T006 pass.
- [X] T015 [P] Create `src/domain/slots.ts` with `slotCountForDay`, `nextSlotCount` and `nextPosition` per [contracts/domain-api.md](contracts/domain-api.md), making T007 pass. The formula is `max(slotsPerDay, highest meal.slot, daySlots?.slotCount ?? 0)` (FR-009).
- [X] T016 [P] Add `productUsageBreakdown(dishes, detachedMealIngredientLists)` to `src/domain/products.ts`, returning `ReadonlyMap<string, { dishes: number; meals: number }>`. Each Dish counts once per Product, archived included, and each Detached Meal list counts once per Product. Reimplement `countProductUsage` as the sum. This makes T008 pass.
- [X] T017 [P] Add `interface Clock { today(): IsoDate }` to `src/domain/ports.ts`. Create `src/adapters/system-clock.ts`, exporting `systemClock: Clock`, which builds the `IsoDate` from `new Date()` local `getFullYear()`, `getMonth() + 1` and `getDate()`, zero-padded. Create `tests/fakes/fixed-clock.ts`: a `FixedClock` class with `constructor(today: IsoDate)`, `today()` and `set(date)` for tests that move the day.

### Storage, repositories and wiring

- [X] T018 Add `db.version(2).stores({ meals: 'id, date, dishId', daySlots: 'date', settings: 'id' })` to `src/data/db.ts`, keeping `version(1)` unchanged. Declare the tables:
  - `meals: Table<Meal, string>`
  - `daySlots: Table<DaySlots, string>`
  - `settings: Table<Settings & { id: 'app' }, string>`

  No upgrade function (data-model.md).
- [X] T019 [P] Write `tests/data/week-repository.test.ts` (on `createTestDb()` and `FixedIdGenerator`) for the core members:
  - `listMeals({ start: '2026-11-02', end: '2026-11-08' })` returns Meals dated `2026-11-02` and `2026-11-08`, but not `2026-11-01` or `2026-11-09`. `listDaySlots` behaves the same way.
  - Three `addMeal({ date, slot: 2, dishId })` calls on the same date and Slot get positions 0, 1 and 2. A Meal in another Slot starts at 0.
  - `addMeal` returns `servings: 1` and `detached: null`.
  - `putMeal` replaces the record, `getMeal` reads it back, and `removeMeal` deletes it.
- [X] T020 [P] Write `tests/data/settings-repository.test.ts` for `get()`: an empty db → `{ slotsPerDay: 4 }`. A stored record `{ id: 'app', slotsPerDay: 99 }` written directly into the table → `{ slotsPerDay: 4 }`.
- [X] T021 Create `src/data/week-repository.ts` exporting `WeekRepository`, `DateRange` and `createWeekRepository(db, ids)`, with `listMeals`, `listDaySlots`, `getMeal`, `addMeal`, `putMeal` and `removeMeal` per [contracts/persistence-and-ports.md](contracts/persistence-and-ports.md):
  - Range reads use `where('date').between(start, end, true, true)`.
  - `addMeal` runs in one `rw` transaction over `meals`, computing `nextPosition` from the Meals of that `(date, slot)`.
  - `setDaySlotCount` and `replaceWeek` come in US5 and US6.

  Add `newMeal` to `src/domain/meals.ts` (servings 1, `detached` null) in this task, with its test in `tests/domain/meals.test.ts`. This makes T019 pass.
- [X] T022 Create `src/data/settings-repository.ts` exporting `SettingsRepository` and `createSettingsRepository(db)`, with `get()` = `readSettings(await db.settings.get('app'))`. `setSlotsPerDay` comes in US5. This makes T020 pass.
- [X] T023 Wire the new dependencies:
  - In `src/app/deps.ts`, add `clock: Clock` (`systemClock`), `week: WeekRepository` and `settings: SettingsRepository` to `Deps` and `createDeps()`.
  - In `tests/ui/render.tsx`, update `createTestDeps()` the same way, using `new FixedClock('2026-11-04')` and the repositories over the test db.

  Keep `countMealsUsingDish` for now. T026 removes it.

### Feature 001 handoff (research R10)

- [X] T024 [P] Extend `tests/data/dish-repository.test.ts` with `removeOrArchive`:
  - A Dish with 0 Meals → `{ kind: 'deleted', photo }`, and the record is gone.
  - A Dish used only by a Detached Meal (`detached` not `null`) → `{ kind: 'archived' }`, with `archived: true` and the record kept.
  - A Dish used by a Linked Meal → `archived`.
- [X] T025 [P] Extend `tests/data/product-repository-maintenance.test.ts`:
  - `delete` and `changeUnit` return `inUse` for a Product used only in a Detached Meal's `detached.ingredients`. `inUse` carries `usage: 1` and `breakdown: { dishes: 0, meals: 1 }`.
  - `merge('pomidor', 'pomidory')` rewrites a Detached Meal that holds both: one Ingredient at the first position, with the amounts summed. It leaves a Linked Meal record untouched, and returns `{ kind: 'merged', dishesUpdated, mealsUpdated: 1 }`.
- [X] T026 Implement the handoff:
  - **`src/data/dish-repository.ts`**: add `removeOrArchive(id)`. In one `rw` transaction over `dishes` and `meals`, it counts `meals.where('dishId').equals(id)`, applies `decideDishRemoval`, then deletes or archives the Dish.
  - **`src/app/dishes.ts`**: `deleteDish` now takes `deps: { dishes; photos }`, calls `removeOrArchive`, and deletes the returned photo after the commit (failure ignored).
  - **`src/data/product-repository.ts`**:
    - `usageOf`, `changeUnit`, `delete` and `merge` include `db.meals` in their transactions.
    - `usageOf` passes the `detached.ingredients` of every Meal with `detached !== null`, replacing the `TODO(week-planning)` comment.
    - `inUse` results gain `breakdown: { dishes: number; meals: number }`.
    - `merge` rewrites the affected Detached Meals with `mergeIngredients` and returns `mealsUpdated`.
  - **Remove `countMealsUsingDish`** from `Deps`, `createDeps()` and `createTestDeps()`.
  - **Update `tests/app/delete-dish.test.ts`** to seed a real Meal through `WeekRepository.addMeal` for the archive case, instead of a fake count.

  This makes T024 and T025 pass.
- [X] T027 [P] Extend `tests/ui/products-vm.test.ts`, then `src/ui/view-models/products.ts`:
  - Add `mealCountPhrase(n)`: "1 posiłku", otherwise "N posiłkach".
  - `deleteHint(breakdown)` and `unitHint(breakdown)` take `{ dishes, meals }` and produce the three cases in [contracts/ui.md](contracts/ui.md) "Produkty hints":
    - dishes only: unchanged text
    - meals only: "w 1 posiłku"
    - both: "w 2 daniach i 3 posiłkach"
  - `productMenu` takes the row's breakdown.
  - `usageLabel` shows the total.
- [X] T028 Add `listAllDetachedIngredientLists()` to `src/data/week-repository.ts`, per [contracts/persistence-and-ports.md](contracts/persistence-and-ports.md): it returns `detached.ingredients` for every Meal whose `detached` is not `null`, across all Weeks.
  - Test it first in `tests/data/week-repository.test.ts` (Principle IV, repository integration test): with one Linked and two Detached Meals in different Weeks, it returns exactly the two `detached.ingredients` lists, and `[]` when no Meal is detached.
  - Then update `src/ui/pages/ProductsPage.tsx`:
    - read the lists with `useLiveQuery(() => deps.week.listAllDetachedIngredientLists())`
    - build rows with `productUsageBreakdown`, replacing the `TODO(week-planning)` comment
    - pass the breakdown to the hints and to the `inUse` alerts

**Checkpoint**: Lint, typecheck, tests and the coverage gate pass. Feature 001 behaves as before, except that it now sees Meals.

---

## Phase 3: User Story 1 - Plan a Week from Dishes (Priority: P1) 🎯 MVP

**Goal**:
- The Tydzień tab shows the current Week as seven day rows, with today marked and Planned kcal per day.
- A day opens the Day page with numbered Slots.
- Tapping a Slot's "Dodaj posiłek" opens the horizontal Dish picker, and picking adds a Linked Meal with 1 Serving.
- A Meal can be removed after confirmation.

**Independent Test**: Plan Monday to Sunday with at least one Meal per day and two Meals in one Slot, then reopen the app. Every Meal is in its day and Slot (spec US1, quickstart rows 1–3).

### Tests for User Story 1

- [X] T029 [P] [US1] Write `tests/domain/meals.test.ts` (resolution and scaling part):
  - `mealSource`:
    - Linked → the Dish.
    - A Dish with `archived: true` → still the Dish.
    - `detached` set → the copy, even when the Dish has other values.
    - Missing Dish → `null`.
  - `scaleMeal` with "Owsianka" (`servingsYield` 2, 100 g "płatki owsiane", 300 ml "mleko", Macros 700 / 25 / 15 / 110):
    - at 1 Serving → 50, 150, 350 / 12.5 / 7.5 / 55
    - at 1.5 Servings → 75, 225, 525 / 18.75 / 11.25 / 82.5, unrounded
  - `isDetached`.
  - `servingsWord`: 1 → porcja, 2 → porcje, 4 → porcje, 5 → porcji, 12 → porcji, 22 → porcje, 1.5 → porcji.
- [X] T030 [P] [US1] Write `tests/domain/week.test.ts` (selectors part):
  - `plannedKcal` of three Meals at 33.333 kcal each is the unrounded sum, not the sum of rounded values.
  - `selectWeekDays('2026-11-02', '2026-11-04', meals, dishesById)`:
    - always 7 days, Mon → Sun
    - `isToday` only on `2026-11-04`
    - `mealCount` and `plannedKcal` per day
    - Meals outside the Week are ignored
  - `selectDay('2026-11-05', meals, undefined, dishesById, { slotsPerDay: 4 })`:
    - Slots 1–4, with the empty ones included
    - Meals ordered by `position`, then `id`
    - a Meal in Slot 6 makes 6 Slots
  - `MealView`: `missingDish: true` and `name: ''` for a missing Dish. A Detached Meal takes its name from the copy and its `photo` from the Dish.
- [X] T031 [P] [US1] Write `tests/app/week-meals.test.ts`:
  - `addMealFromDish` stores a Linked Meal with 1 Serving at the given date and Slot.
  - Two adds to the same Slot get positions 0 and 1.
  - `removeMeal` deletes the record.
- [X] T032 [P] [US1] Write `tests/ui/week-vm.test.ts` for `src/ui/view-models/week.ts`:
  - `dayRow(dayView)`:
    - title "Czwartek", subtitle "5 lis"
    - for today, subtitle "4 lis · dziś" and `isToday: true`
    - after "350 kcal", or "brak posiłków" when `mealCount === 0`
  - `mealRow(mealView, products)`:
    - title, or "Nieznane danie" when `missingDish`
    - subtitle "1 porcja · 350 kcal" / "1,5 porcji · 525 kcal"
    - `badge: 'zmieniony' | null`
  - `dayTitle('2026-11-05')` → "Czwartek, 5 lis".
  - `pickerEmptyMessage` text.
- [X] T033 [P] [US1] Write `tests/ui/day-page.test.tsx` (key interaction):
  - Render `DayPage` for `2026-11-05` with one Dish "Owsianka" seeded.
  - Tap Slot 2's "Dodaj posiłek", then the "Owsianka" tile in the picker.
  - Slot 2 lists "Owsianka" with "1 porcja · 350 kcal", and the picker is closed.
  - Seed an archived Dish too, and assert it is not offered.

### Implementation for User Story 1

- [X] T034 [US1] Extend `src/domain/meals.ts` with `isDetached`, `mealSource`, `scaleMeal` and `servingsWord` per [contracts/domain-api.md](contracts/domain-api.md). This makes T029 pass.
  - `servingsWord`: 1 → 'porcja'; a whole number whose last digit is 2–4 and whose last two digits are not 12–14 → 'porcje'; otherwise, fractions included → 'porcji'.
- [X] T035 [US1] Create `src/domain/week.ts` with the `DayView`, `SlotView` and `MealView` types, `plannedKcal`, `selectWeekDays` and `selectDay`, using `weekDates`, `mealSource`, `scaleMeal` and `slotCountForDay`. This makes T030 pass.
- [X] T036 [US1] Create `src/app/week.ts` with `addMealFromDish(deps: { week }, { date, slot, dishId })` and `removeMeal(deps: { week }, mealId)`. This makes T031 pass.
- [X] T037 [P] [US1] Create `src/ui/view-models/week.ts` with `dayRow`, `mealRow`, `dayTitle`, `pickerEmptyMessage` ("Nie masz jeszcze żadnych dań. Dodaj je w zakładce Dania."), `removeMealConfirmMessage(name)` ("Usunąć posiłek „{nazwa}”?") and `invalidDayMessage` ("Nie ma takiego dnia."). Use `formatKcal` and `formatServings`. This makes T032 pass.
- [X] T038 [P] [US1] Create `src/ui/components/DishPickerSheet.tsx`:
  - A Framework7 `Sheet` with `backdrop` and `swipeToClose`, and props `opened`, `onClose()` and `onPick(dish)`.
  - A title row "Wybierz danie" with a "Zamknij" link.
  - A horizontally scrolling strip of tiles (`DishAvatar` at 72 px plus the name, clamped to 2 lines) from `selectLibrary(dishes)`, or `pickerEmptyMessage` when it is empty.
  - Add `.dish-picker-strip` (`display: flex; overflow-x: auto; scroll-snap-type: x mandatory; gap`) and the tile styles to `src/ui/styles/app.css`.
- [X] T039 [US1] Create `src/ui/components/MealSheet.tsx` (minimal for US1):
  - A Framework7 `Sheet` with `backdrop` and `swipeToClose`, and props `meal`, `opened` and `onClose()`.
  - A `Toolbar` with "Anuluj" and the Meal name.
  - A red list button "Usuń posiłek", which confirms with `removeMealConfirmMessage`, then calls `removeMeal` and closes the sheet.

  US2 and US3 add the fields and "Zapisz".
- [X] T040 [US1] Create `src/ui/pages/DayPage.tsx` for route `/day/:date/`:
  - An invalid `date` (`!isIsoDate`) shows `invalidDayMessage`.
  - Otherwise, a `Navbar` with a back link and `dayTitle`.
  - Live queries: `deps.week.listMeals({ start: date, end: date })`, `deps.week.listDaySlots(...)`, `deps.dishes.list()` and `deps.settings.get()`.
  - `selectDay` decides the Slots. For each Slot:
    - a `BlockTitle` with the number
    - a `List mediaList` of `mealRow`s (`DishAvatar` 40 px, title, subtitle, a `Badge` when `badge` is set; tapping opens `MealSheet`)
    - a last row "Dodaj posiłek" (plus icon), which opens `DishPickerSheet` for that Slot
  - Picking calls `addMealFromDish` and closes the picker.
  - Render each sheet once per page, with the target Slot or Meal in state (plan.md implementation notes).
  - Wrap the content in `.page-wide` (FR-041).

  This makes T033 pass.
- [X] T041 [US1] Create `src/ui/pages/WeekPage.tsx`:
  - `weekStart` state = `weekStartOf(deps.clock.today())` on mount (FR-002), and `today` state from the same read.
  - Live queries for the Week's Meals and all Dishes. `selectWeekDays` produces seven `dayRow`s in a `List mediaList`, each linking to `/day/{date}/`.
  - A `Navbar` titled `weekRangeLabel(weekStart)`. US4 adds the arrows, US6 the copy button.
  - The today row gets the class `day-today`. Add its accent left-border style to `src/ui/styles/app.css`.
  - `.page-wide` wrapper.
- [X] T042 [US1] In `src/ui/routes.ts`, set `weekRoutes = [{ path: '/', component: WeekPage }, { path: '/day/:date/', component: DayPage }]`. Update `tests/ui/app-shell.test.tsx`: the Tydzień tab no longer shows the placeholder notice (assert the Week range label "2–8 lis 2026" instead, with `FixedClock('2026-11-04')`), while Lista zakupów still does.

**Checkpoint**: Meals can be planned for the current Week, and they survive a restart. Quickstart rows 1–3 pass on an iPhone-sized viewport.

---

## Phase 4: User Story 2 - Scale a Meal by Servings (Priority: P1)

**Goal**: The Meal sheet edits Servings. Macros and Ingredient amounts follow, shown per Meal, and the Meal stays linked.

**Independent Test**: Add "Owsianka", then set Servings to 1,5. The sheet and the Day page show 75 g, 225 ml, 525 kcal and 18,8 g protein, with no "zmieniony" badge. Servings of 0 or "abc" block saving (spec US2, quickstart rows 4–5).

### Tests for User Story 2

- [X] T043 [P] [US2] Extend `tests/domain/meals.test.ts` (draft part):
  - `draftFromMeal` for "Owsianka" at 1,5 Servings: `servings: "1,5"`, `basisServings: 1.5`, amounts `"75"` and `"225"`, Macros `"525"`, `"18,75"`, `"11,25"` and `"82,5"` (`formatDecimal`, 2 decimals).
  - `rescaleMealDraft(draft, source, "2")` recomputes untouched fields from the source (100, 300, 700…) and sets `basisServings: 2`.
  - `rescaleMealDraft` with `"0"`, `"abc"` or `""` returns the draft with only `servings` text updated and the numbers unchanged.
  - Drift: a source with `servingsYield` 3 and 100 g; rescaling 1 → 2 → 1 → 2 leaves the amount text equal to `formatDecimal(100 / 3 * 2)`.
  - `validateMealDraft`: `servings` `"0"` → `notPositive`, `"-1"` → `notPositive`, `"abc"` → `notANumber`, `""` → `required`. Every other code uses the same paths as the Dish draft.
  - `decideMealSave`, Servings and no-change cases:
    - An unchanged draft, including retyped `"50,00"` for 50 → `unchanged`.
    - Only Servings changed → `{ kind: 'save', meal: { …, servings: 1.5, detached: null }, detachedNow: false }`.
  - `decideMealSave`, detach cases (research R7). The US2 sheet cannot produce them yet, but the whole function is built and covered here, so the 100% gate holds at the US2 checkpoint:
    - The US3-1 example: "płatki owsiane" 50 → 80 g at 1 Serving with yield 2 → `detached.ingredients` amount 160, "mleko" 300 copied exactly, Macros 700 / 25 / 15 / 110 copied exactly, `servingsYield: 2`, `detachedNow: true`.
    - The same Detached Meal saved at Servings 2 → `scaleMeal` gives 160 g, 300 ml and 700 kcal (US3-2).
    - Each of these detaches: a name change, an added Ingredient, a removed Ingredient, and a change to each Macro.
    - A change to an already Detached Meal updates its copy, with `detachedNow: false`.
    - Servings and a field changed together → the copy is converted back at the new Servings.
- [X] T044 [P] [US2] Write `tests/app/save-meal.test.ts` (Servings part):
  - `saveMeal` with Servings 1 → 1,5 stores `servings: 1.5` and leaves `detached` `null`, returning `{ kind: 'saved', detachedNow: false }`.
  - An unchanged draft → `{ kind: 'unchanged' }`, and the stored record is deep-equal to before.
  - Invalid Servings → `invalid` with nothing written.
  - A removed Meal → `gone`.
- [X] T045 [P] [US2] Write `tests/ui/meal-sheet-vm.test.ts` for `src/ui/view-models/meal-sheet.ts`:
  - `mealFieldDomId('ingredients[1].amount')` → `"meal-ingredients-1-amount"`.
  - `mealErrorMessage('duplicateProduct')` → "Ten produkt jest już w posiłku.", and the other codes give the feature 001 messages.
  - `goneMessage` → "Ten posiłek już nie istnieje.".
  - `sheetValues(draft, products)` gives each Ingredient row as `{ name, unitLabel, amount }`.

### Implementation for User Story 2

- [X] T046 [US2] Create `src/domain/drafts.ts` with the shared field parser now private to `dishes.ts` (`parseField(text, 'positive' | 'nonNegative')`, returning a number or a `DishFieldError`). Make `dishes.ts` use it, with its public API and tests unchanged. Export `type FieldError = DishFieldError` from `meals.ts`.
- [X] T047 [US2] Extend `src/domain/meals.ts` with `MealDraft`, `ValidMealValue`, `draftFromMeal`, `rescaleMealDraft`, `validateMealDraft` and the complete `decideMealSave`, per [contracts/domain-api.md](contracts/domain-api.md) and research R7:
  - A **real change** is checked in this order: the name via `normalizeName`, then the Product id list in order, then each amount and Macro vs `roundTo2(scaled source)` at the saved Servings. No real change → `unchanged`, or a Servings-only `save`.
  - **Detach branch**:
    - The copy starts from the source's whole-recipe values.
    - Each changed per-Meal value becomes `roundTo2(value × servingsYield / servings)`, while unchanged values are copied exactly.
    - Added Ingredients are converted the same way. Removed Ingredients are dropped.
    - `detachedNow = meal.detached === null`.
  - `addMealIngredient`, `removeMealIngredient` and `restoreMeal` come in US3 (T055), together with their tests.

  This makes T043 pass at 100% coverage.
- [X] T048 [US2] Add `saveMeal(deps: { week }, { mealId, draft, dishesById, productsById })` to `src/app/week.ts`, following the order in [contracts/persistence-and-ports.md](contracts/persistence-and-ports.md): load → `gone`, source → `gone`, validate → `invalid`, `decideMealSave`, then `putMeal`. This makes T044 pass.
- [X] T049 [P] [US2] Create `src/ui/view-models/meal-sheet.ts` with `mealFieldDomId`, `mealErrorMessage`, `goneMessage`, `sheetValues` and `detachToast` ("Posiłek zmieniony – nie będzie już śledził zmian w daniu.", used in US3). This makes T045 pass.
- [X] T050 [US2] Extend `src/ui/components/MealSheet.tsx`:
  - Draft state from `draftFromMeal` when the sheet opens.
  - A "Porcje" outlined `ListInput` (`inputmode="decimal"`, id `mealFieldDomId('servings')`). Its change handler calls `rescaleMealDraft`.
  - Read-only lists of the Ingredients (`name`, `formatAmount`, unit label) and the four Macros (`formatKcal` / `formatMacro`) under "Składniki (w tym posiłku)" and "Makro (ten posiłek)".
  - A "Zapisz" toolbar link that calls `saveMeal`:
    - `invalid` marks the fields
    - `gone` shows the alert `goneMessage` and closes
    - otherwise the sheet closes
  - "Anuluj" or swipe-to-close discards the draft (FR-018).
  - Set the sheet height through Framework7's sheet CSS variable in `src/ui/styles/app.css`.
- [X] T051 [US2] Write `tests/ui/meal-sheet.test.tsx` (key interaction): open "Owsianka" from the Day page, type "1,5" into "Porcje" and tap "Zapisz". The Day page row reads "1,5 porcji · 525 kcal" with no "zmieniony" badge. Typing "0" and tapping "Zapisz" keeps the sheet open with "Wartość musi być większa od zera.".

**Checkpoint**: US1 and US2 work together. Quickstart rows 1–5 pass.

---

## Phase 5: User Story 3 - Adjust one Meal without touching its Dish (Priority: P2)

**Goal**:
- The Meal sheet edits name, Ingredients and Macros.
- A real change detaches the Meal: it gets the "zmieniony" badge and no longer follows its Dish.
- "Przywróć z dania" links it again.

**Independent Test**: Plan "Owsianka" twice. Change an amount in one, edit the Dish's Macros, and only the untouched Meal changes. Restore the edited Meal, and it matches the Dish (spec US3, quickstart rows 6–8, 17).

### Tests for User Story 3

- [X] T052 [P] [US3] Extend `tests/domain/meals.test.ts` (editing helpers and restore). The detach rules themselves are tested in T043.
  - `addMealIngredient` appends a new Product with an empty amount and returns `{ existed: false, index }`. With a Product already in the draft it returns `{ existed: true, index }` and the draft unchanged.
  - `removeMealIngredient` drops the row at the index and leaves the input draft unmutated.
  - `restoreMeal` keeps `servings` and sets `detached: null`.
- [X] T053 [P] [US3] Extend `tests/app/save-meal.test.ts`:
  - The US3-1 flow stores `detached.ingredients[0].amount === 160` and returns `detachedNow: true`.
  - `restoreMealFromDish` → `restored`. After `dishes.put` with 800 kcal, `scaleMeal(mealSource(...))` gives 600 kcal at 1,5 Servings.
  - A Linked Meal whose Dish is then archived through `deleteDish` still resolves to the Dish's values.
  - Restoring a missing Meal → `gone`.
- [X] T054 [P] [US3] Extend `tests/ui/meal-sheet.test.tsx`:
  - Change "płatki owsiane" to 80 and save. The row shows the "zmieniony" badge and the toast `detachToast` appears.
  - Reopen the sheet: it shows "Przywróć z dania". Confirm it, and the badge disappears.
  - A Linked Meal's sheet has no "Przywróć z dania".
  - Creating a new Product from inside the Meal sheet: type "jogurt grecki" in the picker, tap "Dodaj „jogurt grecki”", choose "g" in the "Nowy produkt" sheet and tap "Dodaj". The Meal sheet stays open and shows a "jogurt grecki" Ingredient row with an empty amount, and the Product exists in the repository.

### Implementation for User Story 3

- [X] T055 [US3] Add `addMealIngredient`, `removeMealIngredient` and `restoreMeal` to `src/domain/meals.ts`, per [contracts/domain-api.md](contracts/domain-api.md). `addMealIngredient` mirrors the Dish draft's `addIngredient`. This makes T052 pass at 100% coverage.
- [X] T056 [US3] Add `restoreMealFromDish(deps: { week }, mealId)` to `src/app/week.ts`: load → `gone`, otherwise `putMeal(restoreMeal(meal))`. Make T053 pass.
- [X] T057 [P] [US3] Add to `src/ui/view-models/meal-sheet.ts`:
  - `restoreConfirmMessage(dishName)`: "Przywrócić „{nazwa dania}” z dania? Zmiany w tym posiłku zostaną utracone."
  - `detachedNote`: "Posiłek zmieniony – zmiany w daniu go nie dotyczą."

  Include tests in `tests/ui/meal-sheet-vm.test.ts`.
- [X] T058 [US3] Make `src/ui/components/MealSheet.tsx` fully editable:
  - **Fields**:
    - a "Nazwa" outlined `ListInput`
    - `IngredientRow`s with editable amounts and remove buttons, plus a `ProductPicker` that calls `addMealIngredient`, showing the toast `mealErrorMessage('duplicateProduct')` and focusing the existing row when the Product is already there
    - four outlined Macro inputs
  - **Detached Meals only**: the `detachedNote` above the fields, and a "Przywróć z dania" list button that confirms with `restoreConfirmMessage(dish.name)` and calls `restoreMealFromDish`.
  - **After saving**: on `saved` with `detachedNow`, show the toast `detachToast`.
  - **Nested sheet**: `ProductPicker` opens its own "Nowy produkt" `Sheet` on top of the Meal sheet. Closing it must not close the Meal sheet or drop the draft. Check this at 375 pt with an iOS user agent (Framework7 iOS styling, project memory). If the two sheets fight over the backdrop or swipe gestures, give the inner sheet `closeByBackdropClick` and `swipeToClose` settings that keep the outer one open, and say so in a comment.

  Make T054 pass.
- [X] T059 [US3] Check `src/ui/pages/DayPage.tsx`: `mealRow` shows the `Badge` "zmieniony" for Detached Meals and the placeholder of the Meal's displayed name when the Dish has no photo (spec Edge Cases "Photo of a Meal"). Add a `tests/ui/week-vm.test.ts` case for a renamed Detached Meal's avatar name.

**Checkpoint**: US1–US3 work. Quickstart rows 1–8 and 17–18 pass.

---

## Phase 6: User Story 4 - Move between Weeks (Priority: P2)

**Goal**: ← and → move between Weeks without limit. Past Weeks keep their Meals. The app opens on the current Week, and the today mark follows the real day.

**Independent Test**: Plan the current Week, then → next Week and plan different Meals. ← twice, then back: each Week shows only its own Meals. Reopen on another Week, and it opens on the current Week (spec US4, quickstart rows 9–10).

### Tests for User Story 4

- [X] T060 [P] [US4] Write `tests/ui/week-page.test.tsx` (key interaction) with `FixedClock('2026-11-04')`:
  - The title is "2–8 lis 2026" and the Wednesday row has `day-today`.
  - Tapping "Następny tydzień" shows "9–15 lis 2026" and a Meal seeded on `2026-11-10`.
  - Tapping "Poprzedni tydzień" twice shows "26 paź – 1 lis 2026".
  - After `clock.set('2026-11-05')` and a dispatched `visibilitychange`, the today mark moves to Thursday while the viewed Week stays put.

### Implementation for User Story 4

- [X] T061 [US4] Extend `src/ui/pages/WeekPage.tsx`:
  - A `Navbar` with ordered `NavLeft` / `NavTitle` / `NavRight` (research R11):
    - ← `Link` with `iconF7="chevron_left"` and `aria-label="Poprzedni tydzień"` → `setWeekStart(addDays(weekStart, -7))`
    - → `Link` with `iconF7="chevron_right"` and `aria-label="Następny tydzień"` → `+7`
  - Re-read `deps.clock.today()` into `today` on `document` `visibilitychange` (when visible), without changing `weekStart` (research R2).
  - The live query depends on `weekStart`.

  Make T060 pass.
- [X] T062 [US4] Confirm in `src/ui/pages/WeekPage.tsx` that going back from the Day page keeps `weekStart`: the Framework7 page stack keeps `WeekPage` mounted. Extend `tests/ui/week-page.test.tsx`: → once, open a day, go back, and the title is still "9–15 lis 2026" (FR-007).

**Checkpoint**: US1–US4 work. Quickstart rows 9–10 pass.

---

## Phase 7: User Story 5 - Add a Slot to one day (Priority: P3)

**Goal**:
- "dodaj kolejny" adds one Slot to one day, kept while empty.
- Ustawienia offers "Liczba slotów" (1–10, initially 4), applied to every day of every Week.

**Independent Test**: Tap "dodaj kolejny" twice on Saturday: Saturday has two more Slots than Friday, still after a reopen. Set "Liczba slotów" to 3, then 6, and check the day counts (spec US5, quickstart rows 11–12).

### Tests for User Story 5

- [X] T063 [P] [US5] Extend `tests/data/week-repository.test.ts` with `setDaySlotCount('2026-11-07', 5)`: it creates the record, a second call with 6 replaces it, and `listDaySlots` returns it.
- [X] T064 [P] [US5] Extend `tests/data/settings-repository.test.ts` with `setSlotsPerDay`:
  - 6 → `saved`, then `get()` gives 6.
  - 0, 11 and 2.5 → `invalid`, with nothing written.
- [X] T065 [P] [US5] Write `tests/app/add-slot.test.ts`:
  - With the default of 4 and no Meals, `addSlotToDay(deps, '2026-11-07')` returns 5 and stores `{ slotCount: 5 }`. A second call returns 6.
  - With a Meal in Slot 7, it returns 8.
  - With `slotsPerDay` 6 and a record of 5, it returns 7.
- [X] T066 [P] [US5] Write `tests/ui/settings-page.test.tsx` (key interaction):
  - The "Liczba slotów" stepper shows 4. Tapping the plus button stores 5.
  - The minus button is disabled at 1 and the plus button at 10 (Framework7 `Stepper` `min` and `max`).

### Implementation for User Story 5

- [X] T067 [US5] Add `setDaySlotCount(date, slotCount)` (`daySlots.put({ date, slotCount })`) to `src/data/week-repository.ts`. Add `setSlotsPerDay(n)` (rejects unless `isValidSlotsPerDay(n)`, then `settings.put({ id: 'app', slotsPerDay: n })`) to `src/data/settings-repository.ts`. This makes T063 and T064 pass.
- [X] T068 [US5] Add `addSlotToDay(deps: { week; settings }, date)` to `src/app/week.ts`: read that date's Meals, its `DaySlots` and the settings, then store `nextSlotCount(slotCountForDay(...))` and return it. This makes T065 pass.
- [X] T069 [US5] In `src/ui/pages/DayPage.tsx`, add a `List` below the last Slot with one list button "dodaj kolejny" that calls `addSlotToDay`. The live query updates the Slots. Extend `tests/ui/day-page.test.tsx`: tapping "dodaj kolejny" shows a `BlockTitle` "5".
- [X] T070 [US5] Create `src/ui/pages/SettingsPage.tsx`:
  - A `Navbar` "Ustawienia".
  - A `List` with one `ListItem` "Liczba slotów". Its `after` content is a Framework7 `Stepper` (`min={SLOTS_PER_DAY.min}`, `max={SLOTS_PER_DAY.max}`, `step={1}`, `small`, `round`), with its value from `useLiveQuery(() => deps.settings.get())`. `onStepperChange` calls `setSlotsPerDay`.
  - The list footer reads "Domyślna liczba slotów w każdym dniu. Dzień może mieć ich więcej."
  - A `Block` reads "Cele i kopia zapasowa pojawią się w kolejnej wersji."
  - `.page-wide` wrapper.

  In `src/ui/routes.ts`, set `settingsRoutes = [{ path: '/', component: SettingsPage }]`. Update `tests/ui/app-shell.test.tsx`: Ustawienia no longer shows the placeholder notice. This makes T066 pass.

**Checkpoint**: US1–US5 work. Quickstart rows 11–12 pass.

---

## Phase 8: User Story 6 - Copy a Week to the next one (Priority: P3)

**Goal**: "Skopiuj do następnego tygodnia" replaces the next Week's Meals and added Slots with copies from the viewed Week, all or nothing:
- It asks first if the next Week has a plan.
- It is disabled for an empty Week.
- It stays on the viewed Week and shows a toast.

**Independent Test**: Plan a Week with Linked and Detached Meals and an added Slot, copy it, and → shows a matching next Week. Change the original and copy again: the replacement is confirmed, and the result matches exactly (spec US6, quickstart rows 13–16).

### Tests for User Story 6

- [X] T071 [P] [US6] Extend `tests/domain/week.test.ts`:
  - `weekHasPlan`: no records → false, one Meal → true, only one `DaySlots` record → true.
  - `planWeekCopy('2026-11-30', …)`:
    - Dates move + 7 across the month boundary (`2026-12-06` → `2026-12-13`) and the year boundary (from Week `2026-12-28`, `2027-01-03` → `2027-01-10`).
    - New ids come from `FixedIdGenerator`.
    - `slot`, `position`, `dishId` and `servings` are kept.
    - `detached` is deep-copied: mutating `result.meals[0].detached.ingredients[0].amount` leaves the input unchanged.
    - Records dated outside the source Week are ignored.
- [X] T072 [P] [US6] Extend `tests/data/week-repository.test.ts` with `replaceWeek('2026-11-09', plan)`:
  - The target Week's old Meals and old `daySlots` are removed and the new ones stored.
  - Meals on `2026-11-08` and `2026-11-16` are untouched.
  - A plan containing two Meals with the same id makes `bulkAdd` fail, and afterwards the target Week is exactly as before (FR-038).
- [X] T073 [P] [US6] Write `tests/app/copy-week.test.ts`:
  - The US6-1 and US6-2 examples: "Owsianka" ×1.5 on Monday Slot 1, a Detached "Leczo" on Friday Slot 3 and `{ date: '2026-11-07', slotCount: 5 }`. After `copyWeekToNext(deps, '2026-11-02')`, `2026-11-09` Slot 1 holds a Linked "Owsianka" ×1.5, `2026-11-13` Slot 3 holds a Detached "Leczo" with equal `detached`, and `2026-11-14` has `slotCount` 5.
  - Copying twice gives the same Week contents as copying once (ids differ).
  - An empty source → `{ kind: 'empty' }`, with the next Week untouched.
  - `weekHasPlanAt` → true after the copy.
  - Editing the copy's `detached` leaves the original alone (FR-035).
- [X] T074 [P] [US6] Extend `tests/ui/week-page.test.tsx` (key interaction):
  - The copy button is disabled on an empty Week.
  - With a Meal this Week and the next Week empty, tapping it shows the toast "Skopiowano do następnego tygodnia." with no dialog, and the title stays "2–8 lis 2026".
  - With a Meal in the next Week too, a dialog with the confirm text appears. Cancelling leaves the next Week's Meal in place.

### Implementation for User Story 6

- [X] T075 [US6] Add `weekHasPlan` and `planWeekCopy` to `src/domain/week.ts` per [contracts/domain-api.md](contracts/domain-api.md) and research R8, making T071 pass at 100% coverage.
- [X] T076 [US6] Add `replaceWeek(weekStart, { meals, daySlots })` to `src/data/week-repository.ts`. In one `rw` transaction over `meals` and `daySlots`, it deletes every record with `date` between `weekStart` and `addDays(weekStart, 6)`, then calls `bulkAdd` for both. This makes T072 pass.
- [X] T077 [US6] Add to `src/app/week.ts`:
  - `weekHasPlanAt(deps: { week }, weekStart)`
  - `copyWeekToNext(deps: { week; ids }, weekStart)`: read the source Week; if `!weekHasPlan` return `empty`; otherwise `replaceWeek(addDays(weekStart, 7), planWeekCopy(...))` and return `{ kind: 'copied', meals: n }`

  This makes T073 pass.
- [X] T078 [US6] Add to `src/ui/view-models/week.ts`, with tests in `tests/ui/week-vm.test.ts`:
  - `copyConfirmMessage`: "Następny tydzień ma już plan. Zastąpić go planem z tego tygodnia?"
  - `copyDoneToast`: "Skopiowano do następnego tygodnia."
  - `copyFailedMessage`: "Nie udało się skopiować tygodnia. Następny tydzień nie został zmieniony."
- [X] T079 [US6] In `src/ui/pages/WeekPage.tsx`, add a `Block` below the navbar with an outlined `Button` "Skopiuj do następnego tygodnia":
  - It is disabled when `weekHasPlan` is false for the viewed Week's live data (FR-036).
  - On tap, `await weekHasPlanAt(next)`. If true, use `f7.dialog.confirm(copyConfirmMessage, run)`, otherwise `run()`.
  - `run` calls `copyWeekToNext` and shows `copyDoneToast`. On a thrown error, it shows `f7.dialog.alert(copyFailedMessage)`.
  - It never changes `weekStart` (FR-037).

  This makes T074 pass.

**Checkpoint**: All six stories work. Quickstart rows 1–20 can be run.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Order note (2026-11-04)**: Phase 10, the Week view redesign, was added after this phase was written. Run T080, T082 and T083 at any time, but run T081, T084 and T085 after Phase 10, so they check the redesigned screen.

- [X] T080 [P] Extend `src/dev/seed.ts` with `?seed=weeks-52`:
  - It seeds 20 Dishes (reusing `seedDishes`) and 52 past Weeks plus the current one, each with 35 Meals (5 per day in Slots 1–5). Every fifth Meal is Detached, with a copy of its Dish.
  - It uses the counter id generator and dates from `weekStartOf(deps.clock.today())` going back. It never uses `Math.random`.

  Verify that the production `npm run build` output contains no seed code (SC-005, SC-006 spot checks).
- [X] T081 [P] Review the Week, Day and Settings pages and both sheets at ≥ 1024 px against [contracts/ui.md](contracts/ui.md) "Desktop": a centred `.page-wide` column, no lost functions, no grid (FR-041). Review them at 375 pt with an iOS user agent too. Fix any gaps in `src/ui/styles/app.css`.
- [X] T082 [P] Run `grep -rniE "\b(extra|entry|multiplier|quantity|posilek|pora)\b" src/` and rename any domain identifier that matches (Principle II, research R4). Confirm every user-facing string written in `src/ui/**` is Polish (Principle I). Framework7's default labels are exempt.
- [X] T083 [P] Record as-built details in this feature's contracts: any Polish string written beyond [contracts/ui.md](contracts/ui.md), and any repository or use-case signature that ended up different from [contracts/persistence-and-ports.md](contracts/persistence-and-ports.md). `inUse.breakdown` and `listAllDetachedIngredientLists` are already there. In [../001-shell-products-dishes/analysis-followups.md](../001-shell-products-dishes/analysis-followups.md), tick item L2 with a note that T027 and T028 resolved it. Do not edit feature 001's spec, plan or contracts, which are immutable records.
- [X] T084 Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage` (100% on `src/domain/**`) and `npm run build`. Fix anything that fails.
- [X] T085 Run every manual and performance check in [quickstart.md](quickstart.md) on an iPhone (current iOS Safari) and a desktop browser, using the `preview` or `seed` deploy. Record the results, and any deviations, at the bottom of `specs/002-week-planning/quickstart.md`. Android stays deferred, as in feature 001 (T084 there). Done 2026-11-05: the user ran rows 1–20 and all pass (results in quickstart.md). SC-001 hand timing and the swipe feel were not reported separately. Android deferred.

---

## Phase 10: Week view redesign (spec Revisions 2026-11-04)

**Goal**: The Tydzień tab becomes one designed screen, following the user's reference screenshot ([contracts/ui.md](contracts/ui.md) "Week page (redesigned 2026-11-04)", research R14):
- a Week card with the month, round ← / →, the day strip and the copy action
- the selected day's Slots below, as Meal cards with the photo on the left

The Day page goes away. Behaviour and data are unchanged.

**Independent Test**: At 390×844 with an iOS user agent:
- The app opens on today's pill.
- Tapping another day shows its Slots without leaving the screen.
- ← / → keep the weekday.
- Adding, editing, detaching, restoring and copying work as in quickstart rows 1–16.

**Decided (2026-11-04)**: the screenshot is only a reference, the accent stays green `#2f6f4f`, and the Day page is removed.

### Tests for the redesign

- [X] T086 [P] Extend `tests/domain/dates.test.ts`:
  - `SHORT_DAY_NAMES` equals `['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']`, and `MONTH_NAMES` equals the 12 nominative names (`'styczeń'` … `'grudzień'`).
  - `weekMonthLabel`: `'2026-11-02'` → "Listopad 2026", `'2026-11-30'` → "Listopad – grudzień 2026", `'2026-12-28'` → "Grudzień 2026 – styczeń 2027".
  - `dayOfMonth('2026-11-05') === 5`.
  - `sameWeekday('2026-11-05', '2026-11-09') === '2026-11-12'` and `sameWeekday('2026-11-08', '2026-10-26') === '2026-11-01'`.
- [X] T087 [P] Extend `tests/domain/meals.test.ts` with `mealsWord`: 1 → posiłek, 2 → posiłki, 4 → posiłki, 5 → posiłków, 12 → posiłków, 22 → posiłki, 0 → posiłków.
- [X] T088 [P] Extend `tests/ui/week-vm.test.ts` for the new `weekPage(weekStart, today, selected, data)` model:
  - `monthLabel` is "Listopad 2026".
  - `strip` has 7 cells `{ date, shortName, dayNumber, kcal, isToday, isSelected }`, with `kcal: ''` for an empty day and "350" for a planned one.
  - `heading` is "Czwartek, 5 lis", and `summary` is "2 posiłki · 875 kcal" or "brak posiłków".
  - `slots` reuse the `dayPage` rows.
  - `canCopy` is unchanged.
- [X] T089 [P] Rewrite `tests/ui/week-page.test.tsx` for the one-screen flow, moving the cases from `tests/ui/day-page.test.tsx` and deleting that file:
  - It opens with Wednesday's pill `aria-pressed="true"` and "Środa, 4 lis".
  - Tapping "Cz 5" shows "Czwartek, 5 lis" without navigating.
  - → keeps Thursday selected and shows "Czwartek, 12 lis".
  - The picker adds a Meal card to Slot 2, and "dodaj kolejny" adds Slot 5.
  - The copy flow tests are unchanged.
  - Update `tests/ui/meal-sheet.test.tsx` to open Meal cards from the Week page, and the FR-007 test in `tests/ui/app-shell.test.tsx` to "the selection survives switching tabs".

### Implementation for the redesign

- [X] T090 [P] Add `SHORT_DAY_NAMES`, `MONTH_NAMES`, `weekMonthLabel`, `dayOfMonth` and `sameWeekday` to `src/domain/dates.ts`, and `mealsWord` to `src/domain/meals.ts`, per [contracts/domain-api.md](contracts/domain-api.md). This makes T086 and T087 pass at 100% coverage.
- [X] T091 [P] Add the redesign tokens and component styles to `src/ui/styles/app.css`, per [contracts/ui.md](contracts/ui.md) "Look":
  - `--planner-page-bg`, `--planner-card-*`, `--planner-accent`, `--planner-muted`
  - `.week-card`, `.day-strip`, `.day-pill`, `.meal-card`, `.slot-add-card`
  - Scope them to `#view-week`, with `--planner-accent: #2f6f4f` and `--f7-theme-color` set to the same green within `#view-week`.
  - Remove the now unused `.day-today` style.
- [X] T092 Rework `src/ui/view-models/week.ts`:
  - `weekPage(weekStart, today, selected, { meals, daySlots, dishes, settings })` returns `{ monthLabel, strip, heading, summary, slots, canCopy }`, built from `selectWeekDays`, `selectDay`, `weekMonthLabel` and `mealsWord`.
  - Drop `dayRow` and `dayPage` once nothing uses them.

  This makes T088 pass.
- [X] T093 [P] Create `src/ui/components/DayStrip.tsx`: 7 `button`s with `aria-pressed`, `aria-label` "{dayName}, {dateText}" and `onSelect(date)`. It renders the `strip` cells only.
- [X] T094 [P] Create `src/ui/components/MealCard.tsx`: the Meal card from contracts/ui.md, with the `DishAvatar` square variant filling the left side. Add a `shape?: 'circle' | 'square'` prop to `DishAvatar` (default `'circle'`, so the Dish library is unchanged). Also create the `SlotAddCard` dashed card used for empty Slots and "dodaj kolejny".
- [X] T095 Rewrite `src/ui/pages/WeekPage.tsx` as one screen:
  - A large "Tydzień" title, then the Week card (month label, round ← / → `Button`s, `DayStrip`, copy action), the day heading and summary, the Slots with `MealCard`s and "Dodaj posiłek" actions, and "dodaj kolejny".
  - It renders `DishPickerSheet` and `MealSheet` once.
  - State: `weekStart`, `selected` (today on open) and `today`. ← / → set `weekStart ± 7` and `selected = sameWeekday(selected, newStart)`.
  - The live queries cover the whole Week (Meals, DaySlots), Dishes and settings.

  Then delete `src/ui/pages/DayPage.tsx` and its route in `src/ui/routes.ts`. This makes T089 pass.
- [X] T096 Check the screen at 390×844 (iOS user agent) and at 1280 px with the headless-Chrome screenshot flow (project memory). Compare it with the reference: card radius and shadow, pill, Meal card proportions, spacing. Check that the strip fits 375 pt without wrapping, with "1850" under each day. Fix gaps in `src/ui/styles/app.css`.
- [X] T097 Update [quickstart.md](quickstart.md) rows 1–3, 7, 9 and 11 for the one-screen flow, and record the final colour, spacing and component names in [contracts/ui.md](contracts/ui.md).

**Checkpoint**: the redesigned Tydzień tab passes T089 and the quickstart rows, and lint, typecheck and the 100% domain coverage gate pass.

---

## Phase 11: Week view refinements (spec Revisions, later 2026-11-04)

**Goal**: the refinements the user asked for after the one-screen redesign. See spec.md Revisions, FR-004, FR-005, FR-011 and FR-042–FR-045.

**Independent Test**: At 390×844 (iOS user agent):
- There is no page title.
- Swiping the Week card changes the Week.
- The day totals with icons show under the strip.
- Each Slot is a card with its own totals, and "dodaj kolejny" stands apart.
- Picker tiles show photo, name, kcal and macros.
- Every tab has the warm background and green elements, and input borders are clearly visible.
- "Liczba slotów" opens a sheet.

At 1280 px the ← / → buttons are visible.

- [X] T098 [P] Domain, test-first, in `tests/domain/week.test.ts`, `tests/domain/meals.test.ts`, `src/domain/week.ts` and `src/domain/meals.ts`:
  - `plannedMacros(meals, dishesById)`: an unrounded sum of the four Macros, skipping a missing Dish.
  - `DayView.macros` and `SlotView.macros`.
  - `perServing(source)`: Macros ÷ Servings yield.

  100% coverage.
- [X] T099 [P] View-model in `src/ui/view-models/week.ts` with `tests/ui/week-vm.test.ts`:
  - `weekPage` adds `dayTotals` (four `{ key, label, value, unit, icon }`: `flame_fill` kcal, `cube_fill` białko, `drop_fill` tłuszcz, `hexagon_fill` węglowodany, with values rounded as in spec Edge Cases).
  - Each Slot gets `totals` in the same shape.
  - `summary` becomes the Meal count only ("2 posiłki" / "brak posiłków").
  - Add `pickerTile(dish)`, with the per-Serving values in the same shape.
  - Add `swipeWeekDelta(dx, dy)`, a pure gesture rule: `|dx| ≥ 50` and `|dx| > 1.5·|dy|` gives `dx < 0 → 7`, `dx > 0 → −7`, otherwise 0.
- [X] T100 Week page in `src/ui/pages/WeekPage.tsx` and `src/ui/components/`:
  - Remove the large navbar, and pad the top by the safe area.
  - Add `MacroTotals` (icon plus number per Macro) under the strip.
  - Make `SlotCard` hold its number, its totals, its Meals as rows (64 px rounded photo) and "Dodaj posiłek". Remove the standalone `MealCard`/`SlotAddCard` styles that no longer apply.
  - Make "dodaj kolejny" a separate accent-tinted button after a gap.
  - Swipe: `onTouchStart`/`onTouchEnd` on the Week card call `swipeWeekDelta`, with a short slide-in animation in the swipe direction.
  - The ← / → buttons are visually hidden below 1024 px, and visible at 1024 px and up.
- [X] T101 [P] Dish picker in `src/ui/components/DishPickerSheet.tsx`: tiles become small white cards (photo on top, name, then the `pickerTile` icons and numbers).
- [X] T102 [P] App-wide theme in `src/ui/App.tsx` and `src/ui/styles/app.css`:
  - `<App colors={{ primary: '#2f6f4f' }}>`, Framework7's documented theme-colour setting, so links, icons, the tabbar and dialogs turn green.
  - Move the warm background, the navbar background and the card tokens from `#view-week` to all views.
  - `--f7-input-outline-border-color` at least 3:1 against white (about `#7a746e`), and green when focused.
  - Update `tests/ui/render.tsx` if the shared test `<App>` needs the same colours.
- [X] T103 Settings in `src/ui/pages/SettingsPage.tsx`: "Liczba slotów" becomes a link row with the value as `after`. Tapping it opens a `Sheet` titled "Liczba slotów" with radio rows 1–10. Picking one saves it and closes the sheet. Rewrite `tests/ui/settings-page.test.tsx`.
- [X] T104 Tests in `tests/ui/week-page.test.tsx` and `tests/ui/meal-sheet.test.tsx`: Slot totals and day totals visible, swipe left and right changes the Week (dispatched touch events), the picker tile shows per-Serving kcal, and no "Tydzień" title.
- [X] T105 Check at 390×844 and 1280 px with the headless-Chrome screenshots, on all four tabs. Record as-built details in [contracts/ui.md](contracts/ui.md) and [quickstart.md](quickstart.md).

---

## Phase 12: Desktop layout, Dania cards, consistent forms (spec Revisions 2026-11-05)

**Goal**: spec Revisions 2026-11-05: FR-041, FR-045, FR-046, FR-047.

**Independent Test**:
- At 1440×900: navigation on the left, every tab in the same 960 px column next to it, the iOS style, the Meal sheet and the picker no wider than the column, and the picker strip scrolling with the wheel.
- At 390×844: Dania shows cards, and the Dish form matches the Meal sheet.

- [X] T106 [P] Theme in `src/ui/App.tsx`: `theme` becomes `'md'` on Android and `'ios'` everywhere else, desktop included, through the user-agent check Framework7 exposes (`getDevice().android`) (FR-041).
- [X] T107 [P] Desktop shell in `src/ui/styles/app.css` (≥ 1024 px):
  - The tabbar becomes a fixed vertical bar on the left (`--planner-sidebar-width: 232px`), with each tab as a row of icon and label and the active tab highlighted.
  - The views start after it.
  - `.page-wide` becomes the shared column: `max-width: var(--planner-container-max, 960px)`, left-aligned with 32 px side padding. Drop `.page-wide-grid`.
  - Sheets get the same width and left edge as the column.
- [X] T108 [P] Picker wheel:
  - Add `wheelScrollDelta(deltaX, deltaY)` to `src/ui/view-models/week.ts` (a mostly vertical wheel gives `deltaY`, otherwise 0), with tests.
  - `DishPickerSheet` adds a non-passive `wheel` listener on the strip that scrolls it sideways (FR-045).
- [X] T109 Dania cards:
  - `dishCard(dish)` in a new `src/ui/view-models/dishes.ts` returns name, photo, "2 porcje · 5 składników" (with Polish plurals for składnik), per-Serving `macroTotals`, and the notes trimmed to the first 120 characters. Test it in `tests/ui/dishes-vm.test.ts`.
  - New `src/ui/components/DishCard.tsx`. `DishLibraryPage` renders the cards in `.dish-grid`: one column on phones, `repeat(auto-fill, minmax(260px, 1fr))` on desktop.
  - Remove the old `.card-grid` styles (FR-046).
- [X] T110 Shared form parts:
  - `src/ui/components/IngredientsEditor.tsx`: the Ingredient rows in a white card section, plus `ProductPicker`.
  - `src/ui/components/MacroFields.tsx`: the four outlined Macro inputs in a white card section.

  `DishFormPage` and `MealSheet` both use them. The Dish form's name, Servings yield and notes sections become white card sections too, and the Meal sheet's background is the warm page colour (FR-047).
- [X] T111 Update `tests/ui/dish-form.test.tsx`, `tests/ui/meal-sheet.test.tsx`, `tests/ui/app-shell.test.tsx` and any test affected by the card markup. Add a Dania card test: name, "na porcję" values, notes snippet, and that tapping opens the form.
- [X] T112 Check at 1440×900 and 390×844 on all four tabs, plus the Meal sheet and picker, with the headless-Chrome screenshots. Record as-built details in [contracts/ui.md](contracts/ui.md).

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → user story phases → **Polish (Phase 9)**.
- **US1 (Phase 3)** comes first among the stories. It creates `meals.ts` (resolution), `week.ts` (selectors), `app/week.ts`, `WeekPage`, `DayPage`, `MealSheet` and the routes.
- **US2 (Phase 4)** depends on US1, because it extends `MealSheet`.
- **US3 (Phase 5)** depends on US2: it completes `decideMealSave` and makes the sheet editable.
- **US4 (Phase 6)** depends on US1 only (`WeekPage`).
- **US5 (Phase 7)** depends on US1 only (`DayPage`, `routes.ts`).
- **US6 (Phase 8)** depends on US1. Its tests seed Detached Meals and `daySlots` records directly, so it does not need US3 or US5.

### Shared files between stories

| File | Edited by |
|---|---|
| `src/domain/meals.ts` | T021, T034, T047, T055 |
| `src/domain/week.ts` | T035, T075 |
| `src/app/week.ts` | T036, T048, T056, T068, T077 |
| `src/ui/pages/WeekPage.tsx` | T041, T061, T079 |
| `src/ui/pages/DayPage.tsx` | T040, T059, T069 |
| `src/ui/components/MealSheet.tsx` | T039, T050, T058 |
| `src/data/week-repository.ts` | T021, T028, T067, T076 |
| `src/ui/routes.ts` and `tests/ui/app-shell.test.tsx` | T042, T070 |

Run these tasks one after another when stories are worked on together.

### Within each story

- Tests are written first and must fail before their implementation task.
- Order: domain → repository → use case → view-model → components → pages → routes.

### Parallel opportunities

- **Foundational**:
  - Tests T002–T008 in parallel.
  - Then T010–T017 in parallel after T009.
  - T019 and T020 in parallel after T018.
  - T024, T025 and T027 in parallel.
- **US1**: tests T029–T033 in parallel. Then T037 and T038 in parallel with T034–T036.
- **US2**: tests T043–T045 in parallel. T049 in parallel with T046–T048.
- **US3**: tests T052–T054 in parallel. T057 in parallel with T055 and T056.
- **US4**: a single test file and page. The story is short and sequential.
- **US5**: tests T063–T066 in parallel.
- **US6**: tests T071–T074 in parallel.
- **Across stories**: after US1, the US4, US5 and US6 lines can proceed alongside US2 → US3, apart from the shared files above.
- **Polish**: T080–T083 in parallel.

---

## Parallel Example: Foundational

```text
# Write all domain tests together:
Task: "T002 tests/domain/dates.test.ts"
Task: "T003 tests/domain/numbers.test.ts (roundTo, formatDecimal places)"
Task: "T004 tests/domain/nutrition.test.ts"
Task: "T005 tests/domain/units.test.ts (formatAmount)"
Task: "T006 tests/domain/settings.test.ts"
Task: "T007 tests/domain/slots.test.ts"
Task: "T008 tests/domain/products-maintenance.test.ts (productUsageBreakdown)"

# Then, after T009 (types), the implementations together:
Task: "T010 src/domain/dates.ts"
Task: "T011 src/domain/numbers.ts"
Task: "T012 src/domain/nutrition.ts"
Task: "T013 src/domain/units.ts"
Task: "T014 src/domain/settings.ts"
Task: "T015 src/domain/slots.ts"
Task: "T016 src/domain/products.ts"
Task: "T017 src/domain/ports.ts + src/adapters/system-clock.ts + tests/fakes/fixed-clock.ts"
```

## Parallel Example: User Story 1

```text
Task: "T029 tests/domain/meals.test.ts (resolution, scaling)"
Task: "T030 tests/domain/week.test.ts (selectors)"
Task: "T031 tests/app/week-meals.test.ts"
Task: "T032 tests/ui/week-vm.test.ts"
Task: "T033 tests/ui/day-page.test.tsx"

# Then:
Task: "T037 src/ui/view-models/week.ts"
Task: "T038 src/ui/components/DishPickerSheet.tsx"
```

## Parallel Example: User Story 6

```text
Task: "T071 tests/domain/week.test.ts (weekHasPlan, planWeekCopy)"
Task: "T072 tests/data/week-repository.test.ts (replaceWeek)"
Task: "T073 tests/app/copy-week.test.ts"
Task: "T074 tests/ui/week-page.test.tsx (copy flow)"
```

---

## Implementation Strategy

### MVP first (US1 + US2)

1. Phase 1, then Phase 2. Lint, typecheck and the coverage gate pass, and feature 001 now sees Meals.
2. Phase 3 (US1): Meals can be planned for the current Week.
3. Phase 4 (US2): Servings scale.
4. **Stop and validate** with quickstart rows 1–5 on a real iPhone. This is the first usable planner: one Week with correct per-Meal numbers.

### Incremental delivery

1. US3 (detach and restore), then quickstart rows 6–8 and 17–18.
2. US4 (← / →), then rows 9–10. This is what makes planning next Week possible, so do it right after US3, or before it if next Week's plan is needed sooner.
3. US5 ("dodaj kolejny", Liczba slotów), then rows 11–12.
4. US6 (copy), then rows 13–16.
5. Phase 9 Polish, then the full quickstart run on an iPhone and a desktop browser.

---

## Phase 13: Convergence

- [X] T113 CRITICAL: Move the "Liczba slotów" choice list (1–10 from `SLOTS_PER_DAY`) and the row's displayed value out of `src/ui/pages/SettingsPage.tsx` into a new `src/ui/view-models/settings.ts` (e.g. `slotChoices` and `slotsPerDayLabel(settings)`), tested in `tests/ui/settings-vm.test.ts`, so the page only renders view-model output per Constitution IV (contradicts)
- [X] T114 Update the doc comment in `src/ui/components/DishPickerSheet.tsx` that still places the picker "at the bottom of the Day page": since the Phase 10 redesign it opens on the Week page, per T095 (contradicts)
