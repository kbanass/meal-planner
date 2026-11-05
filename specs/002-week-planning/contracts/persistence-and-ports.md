# Contract: Repositories, ports and use cases

The rules of [feature 001's contract](../../001-shell-products-dishes/contracts/persistence-and-ports.md) still apply:
- Every I/O dependency sits behind an interface with an in-memory fake under `tests/fakes/`.
- Repositories have integration tests on `fake-indexeddb`.
- Live UI reads use `useLiveQuery(() => repo.…)`.

## New repositories (`src/data/`)

```ts
interface DateRange { start: IsoDate; end: IsoDate }   // inclusive

interface WeekRepository {
  listMeals(range: DateRange): Promise<Meal[]>;
  listDaySlots(range: DateRange): Promise<DaySlots[]>;
  getMeal(id: string): Promise<Meal | undefined>;
  addMeal(input: { date: IsoDate; slot: number; dishId: string }): Promise<Meal>;
  putMeal(meal: Meal): Promise<void>;
  removeMeal(id: string): Promise<void>;
  setDaySlotCount(date: IsoDate, slotCount: number): Promise<void>;
  replaceWeek(weekStart: IsoDate, plan: { meals: Meal[]; daySlots: DaySlots[] }): Promise<void>;
  listAllDetachedIngredientLists(): Promise<Ingredient[][]>; // detached.ingredients of every Detached Meal, all Weeks
}

interface SettingsRepository {
  get(): Promise<Settings>;                     // readSettings(stored record)
  setSlotsPerDay(n: number): Promise<{ kind: 'saved' } | { kind: 'invalid' }>;
}
```

Rules:

- `listMeals` and `listDaySlots` query `date` with `between(start, end, true, true)`.
- `addMeal` runs in one `rw` transaction over `meals`. It reads the Meals of `(date, slot)` and stores `newMeal({ id: ids.next(), …, position: nextPosition(those) })`. It does not check whether the Dish is archived, because the picker never offers archived Dishes.
- `replaceWeek` runs in one `rw` transaction over `meals` and `daySlots`:
  1. Delete every record with a `date` in `weekDates(weekStart)`.
  2. `bulkAdd` the new records.

  Any failure rolls the whole transaction back, which gives FR-038.
- `listAllDetachedIngredientLists` reads every Meal whose `detached` is not `null`, across all Weeks. Linked Meals are left out, because their Ingredients belong to the Dish. The Produkty page feeds the result to `productUsageBreakdown`.
- `setSlotsPerDay` rejects any value for which `isValidSlotsPerDay` is false before writing, as `isUnit` guards Products.

## Changes to feature 001 repositories

```ts
interface DishRepository {
  // …unchanged members…
  removeOrArchive(id: string): Promise<{ kind: 'deleted'; photo: DishPhotoRef | null } | { kind: 'archived' }>;
  // `deletePermanently` and `archive` stay for tests and the seed, but the UI no longer calls them
}

type InUse = { kind: 'inUse'; usage: number; breakdown: { dishes: number; meals: number } };
// changeUnit and delete return InUse in place of feature 001's { kind: 'inUse'; usage }.
// usage stays the total, so existing callers keep working.

type MergeProductsResult =
  | { kind: 'merged'; dishesUpdated: number; mealsUpdated: number }  // mealsUpdated: Detached Meals rewritten
  | { kind: 'unitMismatch' }
  | { kind: 'sameProduct' };
```

- `removeOrArchive` runs in one `rw` transaction over `dishes` and `meals`. It counts `meals.where('dishId').equals(id)`, then applies `decideDishRemoval`.
- `ProductRepository.usageOf`, `changeUnit`, `delete` and `merge` add `meals` to their transactions. Usage reads `countProductUsage(dishes, detachedLists)`, where `detachedLists` holds the `detached.ingredients` of each Meal whose `detached` is not `null`. This replaces the `TODO(week-planning)` comment.
- `merge` also rewrites each Detached Meal whose `detached.ingredients` contain `fromId`, using `mergeIngredients`. Linked Meals need no rewrite, because they read their Dish.

## Ports

```ts
interface Clock { today(): IsoDate }            // src/domain/ports.ts. Adapter: src/adapters/system-clock.ts
```

Fakes:
- `tests/fakes/fixed-clock.ts` (`new FixedClock('2026-11-04')`)
- the existing `FixedIdGenerator`

## Deps (`src/app/deps.ts`)

```ts
interface Deps {
  db; ids; products; dishes; photos; compressor;   // unchanged
  clock: Clock;                                     // new
  week: WeekRepository;                             // new
  settings: SettingsRepository;                     // new
  // countMealsUsingDish removed (replaced by DishRepository.removeOrArchive, research R10)
}
```

## Use cases (`src/app/week.ts`, plus `src/app/dishes.ts` changes)

```ts
addMealFromDish(deps: { week }, input: { date: IsoDate; slot: number; dishId: string }): Promise<Meal>

saveMeal(deps: { week }, input: {
  mealId: string;
  draft: MealDraft;
  dishesById: ReadonlyMap<string, Dish>;
  productsById: ReadonlyMap<string, Product>;
}): Promise<
  | { kind: 'saved'; detachedNow: boolean }
  | { kind: 'unchanged' }
  | { kind: 'invalid'; errors: Record<string, FieldError> }
  | { kind: 'gone' }                              // the Meal or its source no longer exists
>

restoreMealFromDish(deps: { week }, mealId: string): Promise<{ kind: 'restored' } | { kind: 'gone' }>
removeMeal(deps: { week }, mealId: string): Promise<void>

addSlotToDay(deps: { week; settings }, date: IsoDate): Promise<number>  // returns the new count
  // reads Meals, DaySlots and settings for the date, stores nextSlotCount(slotCountForDay(...))

weekHasPlanAt(deps: { week }, weekStart: IsoDate): Promise<boolean>
copyWeekToNext(deps: { week; ids }, weekStart: IsoDate): Promise<
  { kind: 'copied'; meals: number } | { kind: 'empty' }
>
  // empty: the source Week has no plan, so nothing is written (FR-036 backstop)

deleteDish(deps: { dishes; photos }, dishId: string): Promise<{ kind: 'deleted' } | { kind: 'archived' }>
  // now: removeOrArchive, then delete the photo file if deleted (failure ignored, sweep removes it)
```

`saveMeal` order:
1. Load the Meal. If it is missing, return `gone`.
2. Resolve `mealSource`. If it is `null`, return `gone`.
3. Validate the draft. If it is invalid, return `invalid` without writing.
4. Call `decideMealSave`. For `unchanged`, write nothing.
5. Otherwise `putMeal`.

Required integration tests (minimum):

- **`WeekRepository`**:
  - A range returns only the Week's dates, including Sunday.
  - Three `addMeal`s in one Slot get positions 0, 1 and 2.
  - `replaceWeek` deletes the old Meals and the old `daySlots` record of the target Week, and leaves the source Week and other Weeks alone.
  - `replaceWeek` with a failing `bulkAdd` (a duplicate id injected) leaves the target Week exactly as it was.
- **`SettingsRepository`**: defaults on an empty db. Saving 6 and then reading gives 6. 11 → `invalid`, with nothing written.
- **`DishRepository.removeOrArchive`**: deletes a Dish with 0 Meals. Archives a Dish used only by a Detached Meal.
- **`WeekRepository.listAllDetachedIngredientLists`**: with one Linked and two Detached Meals in different Weeks, it returns exactly the two `detached.ingredients` lists. It returns `[]` when no Meal is detached.
- **`ProductRepository`**:
  - `delete` and `changeUnit` refused for a Product used only in a Detached Meal, with `breakdown: { dishes: 0, meals: 1 }`.
  - `merge` rewrites the Detached Meal's Ingredients, with the summed case, and reports `mealsUpdated`.
- **`saveMeal`**:
  - The US3-1 example stores `detached.ingredients` "płatki owsiane" 160 and reports `detachedNow: true`.
  - Servings only → stays linked.
  - Unchanged → no write. Checked by asserting the stored record is identical.
- **`copyWeekToNext`**:
  - The US6-1 and US6-2 examples.
  - An empty source → `empty`, and the next Week is untouched.
  - Copying twice gives the same result as copying once.
  - The `restoreMealFromDish` flow.
- **`addSlotToDay`**: with a default of 4 → stores 5. Called again → stores 6.
