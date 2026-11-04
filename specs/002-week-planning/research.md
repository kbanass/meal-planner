# Research: Week Planning

Phase 0 output for [plan.md](plan.md). Terms follow [GLOSSARY.md](../../GLOSSARY.md). Decisions from feature 001 ([research.md](../001-shell-products-dishes/research.md) R1–R14) still apply, and this file adds to them. The stack, versions and lint boundary stay as they are, and this feature adds no dependencies.

## R1. Calendar dates and Week math

- **Decision**:
  - Dates are `IsoDate` strings (`'YYYY-MM-DD'`), as Principle IV requires.
  - Week math in `src/domain/dates.ts` uses integer day numbers (days since 1970-01-01, using the standard days-from-civil algorithm) and converts back to `IsoDate`. It uses no `Date` object at all.
  - Day of week = `(dayNumber + 3) mod 7`, with Monday = 0, because 1970-01-01 was a Thursday.
  - `weekStartOf(date)` returns that day's Monday. A Week is identified by its Monday (`weekStart`) and runs to `addDays(weekStart, 6)`.
  - Polish day names and month abbreviations are fixed arrays in the domain, not `Intl` or `toLocaleDateString`.
- **Rationale**:
  - Integer day arithmetic cannot be affected by timezones or DST (spec Edge Cases, SC-008).
  - Fixed arrays give the same labels on every engine. `Intl` month abbreviations differ between browsers ("lis" vs "lis."), and the constitution bans implicit locale.
- **Alternatives considered**:
  - `Date.UTC` arithmetic: deterministic too, but it creates `Date` objects in the core and needs care with every getter.
  - A date library such as date-fns or Temporal polyfills: a new dependency for about 40 lines of tested code (Principle V).

## R2. Today: the `Clock` port

- **Decision**:
  - Add `interface Clock { today(): IsoDate }` to `src/domain/ports.ts`.
  - The adapter `src/adapters/system-clock.ts` reads the device's local date with `getFullYear()`, `getMonth()` and `getDate()`. "Today" deliberately means the user's local calendar day.
  - Tests use `FixedClock`.
  - The Week page reads the clock when it mounts (this gives FR-002: the app opens on the current Week). It reads it again on `visibilitychange`, so the "today" mark (FR-003) moves on when the app is resumed after midnight. It does not change the viewed Week.
- **Rationale**: This is the only non-deterministic input of the feature, and Principle IV requires it to be injected.
- **Alternatives considered**:
  - Persisting the viewed Week: the spec requires opening on the current Week.
  - A timer at midnight: more code for a case that resuming the app already covers.

## R3. Meal storage

- **Decision**:
  - A new `meals` table holds one record per Meal: `{ id, date, slot, position, dishId, servings, detached }`.
  - `detached` is `null` for a Linked Meal. For a Detached Meal it is the Meal's own `MealSource`: `{ name, servingsYield, ingredients, macros }`, as whole-recipe values (data-model.md).
  - Indexes: `date` (Week and day range queries) and `dishId` (whether a Dish is in use).
  - `position` orders the Meals within one date and Slot. A new Meal gets `max(position) + 1`, computed inside the write transaction.
  - A Meal always keeps `dishId`, linked or detached, so "przywróć z Dania" (FR-029) and the archive rule (FR-030) work.
- **Rationale**:
  - One flat table with a date index makes Week reads one range query (SC-006).
  - Embedding the Detached Meal's values matches how Dishes embed Ingredients (feature 001 data model).
  - A `null` / non-`null` field makes Linked and Detached a single explicit state, rather than per-field overrides, which ADR 0002 rejected.
- **Alternatives considered**:
  - A Week document holding seven days of Slots: copying becomes trivial, but every Meal edit rewrites the whole Week, and range queries for future summaries get harder.
  - Ordering by creation time: needs the clock in the write path, and ties are possible.
  - Fractional or "linked list" positions: there is no reordering in this feature, so plain integers suffice.

## R4. Slots added to a day

- **Decision**:
  - A new `daySlots` table, keyed by `date`, holds `{ date, slotCount }`. `slotCount` is the number of Slots the user raised that day to with "dodaj kolejny".
  - Slots shown on a day = `max(slotsPerDay, highest Slot holding a Meal, slotCount ?? 0)` (FR-009), computed by `slotCountForDay` in `src/domain/slots.ts`.
  - "dodaj kolejny" stores `shown + 1` for that date (FR-010), where `shown` is the current result of that formula.
  - A day "has added Slots" exactly when it has a `daySlots` record. This is what the copy carries over (FR-032) and what makes a Week "not empty" (FR-034, FR-036), whatever the current `slotsPerDay` is.
  - Removing a Meal never deletes the record, so the added Slot stays (spec Edge Cases).
- **Rationale**:
  - Storing the absolute count is what makes docs/SPEC.md's `max(setting, slots in use, that day's added slots)` formula work, and gives the spec's "raising the default above a day's added Slots makes them part of the default".
  - The name avoids "extra", because **Extra** is a Shopping List entry in the glossary (spec Assumptions).
- **Alternatives considered**:
  - Storing a delta ("2 more than the default"): it contradicts docs/SPEC.md's `max` formula, because raising the default would push added Slots further out.
  - Treating a record whose `slotCount` ≤ `slotsPerDay` as "no added Slots": the emptiness check would then depend on a setting, and the result of copying would change when the setting does.

## R5. Settings

- **Decision**:
  - A new `settings` table with a single record `{ id: 'app', slotsPerDay }`. The Daily Goal will join it in a later feature.
  - Domain `src/domain/settings.ts`: `DEFAULT_SETTINGS = { slotsPerDay: 4 }`, `SLOTS_PER_DAY = { min: 1, max: 10 }`, and `readSettings(stored: unknown): Settings`. `readSettings` fills in defaults and rejects anything that is not a whole number in range, at the persistence boundary, as `isUnit` does for Products.
  - The Ustawienia screen uses Framework7's `Stepper` (min 1, max 10, step 1). Every change is saved at once, and the plan re-renders through `useLiveQuery`.
- **Rationale**:
  - A stepper cannot produce invalid input, so the screen needs no validation messages. Saving on change matches iOS settings conventions.
  - A missing record means defaults, so a fresh install needs no migration.
- **Alternatives considered**:
  - `localStorage`: not reactive with `useLiveQuery`, and it would be a second storage mechanism to export later.
  - A key-value table (`{ key, value }`): untyped values. One record with a typed reader is simpler.

## R6. Resolving and scaling a Meal

- **Decision**: `src/domain/meals.ts` has three pure layers:
  1. `mealSource(meal, dishesById)`: the Meal's own copy for a Detached Meal, otherwise the Dish (archived ones included, so FR-025 and US3-7 hold). It returns `null` only if the Dish record is missing.
  2. `scaleMeal(source, servings)`: Macros and Ingredient amounts × `servings / servingsYield` (FR-020), **unrounded**.
  3. Rounding happens only for display, through `formatKcal`, `formatMacro` and `formatAmount` (R9), and for sums, after adding up unrounded values (FR-023).
- **Rationale**: Every number on screen derives from one pure path that 100% coverage can pin down (SC-002).
- **Missing Dish**: In theory a Meal could point to a missing Dish, e.g. after a race between two windows. Such a Meal is shown as "Nieznane danie" with no Macros, and can still be removed. The `deleteDish` change in R10 makes this practically unreachable.

## R7. Editing a Meal: draft, change detection and detaching

- **Decision**:
  - The edit sheet works on a `MealDraft`: `servings`, `name`, `ingredients[]` and `macros`, all held as typed text like `DishDraft`. Every number in the draft is expressed **per Meal**, at the draft's current Servings (FR-021, spec Assumptions).
  - `draftFromMeal(meal, source)` formats `scaleMeal(source, meal.servings)` with `formatDecimal`, so the values have 2 decimals and a comma.
  - `rescaleMealDraft(draft, source, newServings)` runs when the Servings field holds a valid new value:
    - A field that still equals the source's value at the old Servings is recomputed from the source at the new Servings, so no rounding drift builds up.
    - A field the user changed is multiplied by `new / old`.
    - The draft records the Servings value its numbers are expressed in, as `basisServings`.
  - `validateMealDraft(draft, productsById)` uses the same rules and error codes as `validateDishDraft`: name required, Servings > 0, amounts > 0, Macros ≥ 0, no duplicate Product.
  - `decideMealSave(meal, source, value)` returns the record to store:
    - A **real change** means the normalised name differs, or the list of Product ids differs (in order), or any amount or Macro differs from `roundTo2(scaled source value)` at the saved Servings. Comparing at 2 decimals makes "typed and changed back" count as no change (spec Edge Cases).
    - No real change: the Meal keeps `detached` as it was (still `null` for a Linked Meal), and only `servings` is updated (FR-026).
    - A real change: `detached` = the source's whole-recipe values, with each changed per-Meal value converted back as `value × servingsYield / servings`, rounded to 2 decimals. Unchanged values are copied from the source exactly. `servingsYield` is copied from the source.
    - A real change on an already Detached Meal updates its own copy the same way.
  - `restoreMeal(meal)` sets `detached = null` and keeps `servings` (FR-029).
- **Rationale**:
  - Users think in what they will eat (per Meal). Storing whole-recipe values keeps docs/SPEC.md's single scaling formula for Linked and Detached Meals alike.
  - Recomputing untouched fields from the source, instead of from their rounded text, prevents values such as 100 g ÷ 3 Servings from drifting and falsely detaching a Meal after several Servings changes.
- **Alternatives considered**:
  - Editing whole-recipe values in the sheet: matches storage, but the user would have to multiply in their head, and it contradicts what the plan shows.
  - Not rescaling the sheet's fields while Servings is typed: the sheet would show 50 g at 2 Servings, then save 100 g, which is confusing.
  - Detaching on any focus or keystroke: violates "changed back counts as no change".

## R8. Copy to next Week

- **Decision**:
  - Domain `planWeekCopy(sourceWeekStart, meals, daySlots, ids)` returns the next Week's records:
    - every Meal with `date + 7`, a new id from `IdGenerator`, and the same `slot`, `position`, `dishId`, `servings` and `detached` (deep-copied)
    - every `daySlots` record with `date + 7`
  - `weekHasPlan(meals, daySlots)` decides whether a Week counts as non-empty.
  - The use case `copyWeekToNext` reads the source Week and calls `WeekRepository.replaceWeek(nextWeekStart, plan)`. That runs in **one** Dexie `rw` transaction over `meals` and `daySlots`: it deletes the next Week's records by date range, then bulk-adds the new ones (FR-033, FR-038).
  - The UI first asks `weekHasPlan` for the next Week. If it is true, it shows the confirm dialog (FR-034). The copy action is disabled when the viewed Week has no plan (FR-036).
- **Rationale**:
  - A single transaction makes the copy all or nothing.
  - New ids and deep-copied `detached` values make copies independent (FR-035).
  - Keeping `dishId` keeps copied Linked Meals live (US6-6).
- **Alternatives considered**: Diffing the next Week and updating it in place: no benefit, because FR-033 says to replace everything.

## R9. Display rounding and Polish formatting

- **Decision**:
  - `numbers.ts` gains `roundTo(value, places)`, rounding half away from zero. `roundTo2` becomes `roundTo(value, 2)` and behaves as before.
  - `formatDecimal(value, places = 2)` keeps its current output for existing callers.
  - New display formatters in the domain:
    - `formatKcal(v)`: whole number, e.g. "350"
    - `formatMacro(v)`: at most 1 decimal, e.g. "12,5" and "55"
    - `formatAmount(v, unit)`: whole numbers for g and ml, at most 2 decimals for pcs
    - `formatServings(v)`: at most 2 decimals
  - Day kcal = `formatKcal(sum of unrounded Meal kcal)`.
  - Polish words such as day names and "porcja"/"porcje"/"porcji" are in view-models, and use domain helpers where a rule is involved (e.g. `servingsWord(n)`).
- **Rationale**: Principle IV requires rounding to be defined in the domain and kept out of display code. These rules come from the spec's Edge Cases.

## R10. Feature 001 handoff (research R13 there)

- **Decision**:
  - **Dish deletion**: the `deleteDish` use case asks a new `DishRepository.removeOrArchive(id)`. That counts the Dish's Meals and deletes or archives the Dish in **one** transaction over `dishes` and `meals` (`decideDishRemoval` decides). The `countMealsUsingDish` dependency in `Deps` is removed. Photo deletion stays in the use case, after the commit.
  - **Product usage**: `ProductRepository.usageOf` and `ProductsPage` pass the `ingredients` of every Detached Meal to `countProductUsage`. The read happens inside the existing transactions, which now also include `meals`.
  - **Merge**: the merge transaction also rewrites each Detached Meal whose own Ingredients contain `fromId`, using `mergeIngredients`. `dishesUpdated` keeps its meaning, and `mealsUpdated` is added.
  - **Usage hints (feature 001 analysis L2)**: a new domain `productUsageBreakdown(dishes, detachedMealIngredientLists)` returns `{ dishes, meals }` per Product, and `countProductUsage` is its sum. The hints read, for example, "Produkt jest używany w 2 daniach i 1 posiłku – nie można go usunąć.", and leave out the zero part.
- **Rationale**:
  - Counting and deleting in one transaction closes the race between deleting a Dish and adding a Meal for it (SC-008 of feature 001).
  - The other items are the handoff tasks feature 001 listed.

## R11. Screens and Framework7 structure

- **Decision**: These are mirrored from Framework7 9's kitchen-sink patterns (see the user's feedback in the project memory):
  - **Week page** (`/` in the Tydzień view):
    - A `Navbar` with ordered `NavLeft` (← link, `chevron_left`, accessible label "Poprzedni tydzień"), `NavTitle` (the Week's date range) and `NavRight` (→ link, `chevron_right`, "Następny tydzień").
    - A `Block` with an outlined `Button` "Skopiuj do następnego tygodnia".
    - A `List` `mediaList` of seven day rows, each with title = day name, subtitle = date, after = kcal or "brak posiłków", and a link to `/day/:date/`.
  - **Day page** (`/day/:date/`):
    - A `Navbar` with a back link, title e.g. "Czwartek, 5 lis".
    - Per Slot, a `BlockTitle` with just the number and a `List` `mediaList` of its Meals (`DishAvatar`, name, subtitle "1,5 porcji · 525 kcal", after = the "zmieniony" badge).
    - An empty Slot is a single list item "Dodaj posiłek". A non-empty Slot ends with a "Dodaj posiłek" list button (FR-013).
    - The page ends with a list button "dodaj kolejny".
  - **Dish picker**: a Framework7 `Sheet` (`backdrop`, `swipeToClose`) with a horizontally scrolling row of Dish tiles: an avatar plus a name. Horizontal scrolling is the one bit of custom CSS (`overflow-x: auto`, `scroll-snap-type: x`), because Framework7 has no horizontal list component.
  - **Meal edit sheet**: a `Sheet` (`backdrop`, `swipeToClose`) with a `Toolbar` holding "Anuluj" and "Zapisz" links and a scrollable `PageContent`, containing:
    - a "Porcje" decimal input
    - "Nazwa"
    - the Ingredient rows (reusing `IngredientRow` and `ProductPicker`)
    - the four Macros
    - "Przywróć z dania" (Detached Meals only)
    - "Usuń posiłek" (red)

    Its height is set through Framework7's sheet CSS variable.
  - **Ustawienia**: a page with a `List` holding one item "Liczba slotów" with a `Stepper` as its `after` content.
  - **Desktop** (≥ 1024 px): the same pages, inside the existing `.page-wide` column (FR-041). No grid.
- **Rationale**: Framework7's iOS theme styles these components only in their expected structure (feature 001 lesson). The rest of the layout reuses the feature 001 CSS.
- **Alternatives considered**:
  - A `Popup` for the Meal editor: full-screen, but docs/SPEC.md asks for a bottom sheet.
  - Framework7 Swiper for the picker: heavier than a CSS scroller, for a strip of tappable tiles.

## R12. Live data and routing

- **Decision**:
  - The Week and Day pages read through `useLiveQuery`:
    - Meals of the date range
    - `daySlots` of the range
    - all Dishes (archived included, so Linked Meals resolve)
    - the Products
    - the settings
  - Pure selectors (`selectWeekDays`, `selectDay` in the domain, plus Polish labels in `src/ui/view-models/week.ts`) build everything the components render (Principle IV, thin components).
  - The viewed `weekStart` is React state in the Week page. Framework7 keeps the Week page alive under the Day page, so going back returns to the same Week (FR-007).
  - Routes in the Tydzień view: `/` → `WeekPage`, `/day/:date/` → `DayPage`. Ustawienia: `/` → `SettingsPage`.
- **Rationale**: No state library (Principle V). Dexie's live queries refresh after every write, including Dish edits, so Linked Meals update at once (SC-003).
- **Alternatives considered**: Storing the viewed Week in the URL: Framework7 tab views do not show URLs, and the spec requires opening on the current Week anyway.

## R13. Testing approach

- **Decision**:
  - **Domain**: test-first with fixed fixtures, at 100% coverage, using the minimum cases listed in [contracts/domain-api.md](contracts/domain-api.md).
  - **Repositories** on `fake-indexeddb`:
    - `WeekRepository` range queries and positions
    - an all-or-nothing `replaceWeek`, tested by failing a `bulkAdd` mid-way
    - `removeOrArchive`
    - merge and usage including Detached Meals
    - settings defaults
  - **Use cases** with `FixedIdGenerator` and `FixedClock`.
  - **Component tests**, key interactions only (R14 of feature 001):
    - tapping a picker Dish adds a Meal
    - saving an amount change shows the "zmieniony" marker
    - the copy asks for confirmation when the next Week has a plan
    - the Stepper changes the number of Slots shown
- **Rationale**: Same split as feature 001, and the constitution's coverage gate applies unchanged.

## Sources

- Howard Hinnant, "chrono-Compatible Low-Level Date Algorithms" (`days_from_civil`, `civil_from_days`): https://howardhinnant.github.io/date_algorithms.html
- Framework7 Sheet modal: https://framework7.io/docs/sheet-modal
- Framework7 Stepper: https://framework7.io/docs/stepper
- Dexie `WhereClause.between()` and transactions: https://dexie.org/docs/WhereClause/WhereClause.between() and https://dexie.org/docs/Dexie/Dexie.transaction()
