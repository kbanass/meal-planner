# Data Model: Week Planning

Phase 1 output for [plan.md](plan.md). Terms follow [GLOSSARY.md](../../GLOSSARY.md). Storage decisions are in [research.md](research.md) (R3–R5, R8, R10). Product, Ingredient, Macros, Dish and DishPhotoRef are unchanged from [feature 001](../001-shell-products-dishes/data-model.md).

## Domain types (added to `src/domain/types.ts`)

```ts
/** A local calendar date, 'YYYY-MM-DD'. Never a Date object (Principle IV). */
type IsoDate = string;

/** What a Meal's numbers are computed from: its Dish, or a Detached Meal's own copy. */
type MealSource = Pick<Dish, 'name' | 'servingsYield' | 'ingredients' | 'macros'>;

interface Meal {
  id: string;             // UUID
  date: IsoDate;
  slot: number;           // 1, 2, 3…
  position: number;       // order within (date, slot), 0-based, ascending = order added
  dishId: string;         // → Dish.id, kept when detached (restore, archive rule)
  servings: number;       // > 0, rounded to 2 decimals, default 1
  detached: MealSource | null; // null = Linked Meal; otherwise whole-recipe values
}

/** The Slot count a day was raised to with "dodaj kolejny". */
interface DaySlots {
  date: IsoDate;
  slotCount: number;      // ≥ 1, whole number
}

interface Settings {
  slotsPerDay: number;    // whole number, 1–10, default 4
}
```

- A **Linked Meal** is `detached === null`. A **Detached Meal** is `detached !== null`. There is no separate flag, so the two cannot disagree.
- `detached.ingredients` follow the Dish rules: unique by `productId`, amounts > 0, rounded to 2 decimals, in the Product's unit. They store only `productId`, so Product renames show up (spec Edge Cases).
- `detached.macros` and amounts are **whole-recipe** values, so docs/SPEC.md's single scaling formula applies to both kinds of Meal.

## Validation rules

| Rule | Source | Domain function |
|---|---|---|
| Servings parse and are > 0 (comma or dot) | FR-019 | `validateMealDraft` (`servings`) |
| Meal name non-empty after `normalizeName` | FR-017 | `validateMealDraft` (`name`) |
| Each Ingredient amount parses and is > 0 | FR-017 | `validateMealDraft` (`ingredients[i].amount`) |
| Each Macro parses and is ≥ 0, all four required | FR-017 | `validateMealDraft` (`macros.*`) |
| No duplicate `productId` in a Meal | Edge Cases | `validateMealDraft`, `addMealIngredient` returns the existing index |
| Every Ingredient's `productId` exists | integrity | `validateMealDraft` |
| `slotsPerDay` is a whole number in 1–10 | FR-011 | `readSettings` (persistence boundary) and `isValidSlotsPerDay` |
| `IsoDate` is a real calendar date | integrity | `isIsoDate` (route parameter `/day/:date/`) |

Error codes are the existing `DishFieldError` codes (`required`, `notANumber`, `notPositive`, `negative`, `duplicateProduct`, `unknownProduct`), exported under the shared name `FieldError` (`DishFieldError` stays as an alias). Polish messages come from the existing view-model, except that `duplicateProduct` in the Meal sheet reads "Ten produkt jest już w posiłku."

## Derived values (pure, not stored)

| Value | Function | Rule |
|---|---|---|
| Monday of a date's Week | `weekStartOf(date)` | integer day math, Monday = 0 (R1) |
| Week's dates | `weekDates(weekStart)` | 7 `IsoDate`s, Mon → Sun |
| Previous / next Week | `addDays(weekStart, ∓7)` | |
| Week label | `weekRangeLabel(weekStart)` | "2–8 lis 2026", "30 lis – 6 gru 2026", "28 gru 2026 – 3 sty 2027" |
| Day label | `dayLabel(date)` | `{ dayName: 'Czwartek', dateText: '5 lis' }` |
| Meal source | `mealSource(meal, dishesById)` | `meal.detached ?? dish` (archived included), or `null` if the Dish is missing |
| Scaled Meal | `scaleMeal(source, servings)` | Macros and amounts × `servings / servingsYield`, unrounded (FR-020) |
| Day Planned kcal | `plannedKcal(meals, dishesById)` | sum of unrounded scaled kcal |
| Slots shown on a day | `slotCountForDay(slotsPerDay, mealsOfDay, daySlots?)` | `max(slotsPerDay, max meal.slot, daySlots?.slotCount ?? 0)` (FR-009) |
| Slot count after "dodaj kolejny" | `nextSlotCount(shown)` | `shown + 1` (FR-010) |
| Position of a new Meal | `nextPosition(mealsInSlot)` | `max(position) + 1`, or 0 |
| Week has a plan | `weekHasPlan(meals, daySlots)` | any Meal or any `DaySlots` record in the Week (R4) |
| Next Week's records | `planWeekCopy(weekStart, meals, daySlots, ids)` | dates + 7, new Meal ids, deep-copied `detached` (R8) |
| Product usage | `productUsageBreakdown(dishes, detachedLists)` | `{ dishes, meals }` per Product; `countProductUsage` = the sum (R10) |
| Display numbers | `formatKcal`, `formatMacro`, `formatAmount`, `formatServings` | spec Edge Cases, R9 |

## State transitions

### Meal

```text
(none)   --pick Dish in Slot-->                 linked(servings = 1)          [Dish not archived]
linked   --save, only Servings changed-->       linked(servings')
linked   --save, real change-->                 detached(copy = source with changes, servings')
detached --save, only Servings changed-->       detached(servings')
detached --save, real change-->                 detached(copy updated, servings')
detached --przywróć z Dania (confirmed)-->      linked(servings kept)          [Dish may be archived]
any      --remove (confirmed)-->                (none)
any      --copy to next Week-->                 a new, independent Meal in the next Week, same state
```

A "real change" is defined in research R7: name, Product list or any amount or Macro differs at 2 decimals. Saving with no change at all writes nothing.

### Day Slots

```text
(no record) --dodaj kolejny (shown = n)--> slotCount = n + 1
slotCount n --dodaj kolejny (shown = m ≥ n)--> slotCount = m + 1
any         --copy (source day has a record)--> next Week's day gets slotCount
any         --copy (source day has none)-->     next Week's day record removed
```

There is no transition that removes a Slot (spec Assumptions).

### Settings

```text
(no record) = DEFAULT_SETTINGS --set slotsPerDay(n), 1 ≤ n ≤ 10--> { id: 'app', slotsPerDay: n }
```

### Dish (change to feature 001)

`delete` now decides inside one transaction over `dishes` and `meals`. If there are 0 Meals the Dish is deleted. If there is at least one, linked or detached, the Dish is archived (R10).

## Persistence schema (Dexie, `src/data/db.ts`)

```ts
db.version(1).stores({ products: 'id, &nameKey', dishes: 'id' });
db.version(2).stores({
  meals: 'id, date, dishId',
  daySlots: 'date',
  settings: 'id',
});
```

| Table | Stored record | Notes |
|---|---|---|
| `meals` | `Meal` | `date` index for Week and day ranges (`between(start, end, true, true)`, which works because ISO strings sort by date). `dishId` index for `removeOrArchive`. Detached values are embedded |
| `daySlots` | `DaySlots` | Primary key `date`. At most one record per day |
| `settings` | `Settings & { id: 'app' }` | One record. Read through `readSettings`, so a missing or invalid value falls back to defaults |

Version 2 only adds tables, so no upgrade function is needed. Existing Products and Dishes are untouched.

## Relationships

- Meal → Dish: many-to-one by `dishId`, always present. A Dish that any Meal references is archived instead of deleted, so the reference never dangles. In theory it can be missing after a cross-window race, which is shown as "Nieznane danie" (R6).
- Detached Meal → Ingredient → Product: embedded Ingredients reference Products by id. They count toward Product usage, and merges rewrite them (R10).
- Meal → day: by `date` and `slot`. Ordered within the Slot by `position`.
- DaySlots → day: one-to-zero-or-one by `date`.
- A Week is not stored. It is the set of `meals` and `daySlots` with `date` in `weekDates(weekStart)`.
