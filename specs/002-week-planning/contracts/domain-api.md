# Contract: Domain module additions (`src/domain/`)

These rules are unchanged from [feature 001](../../001-shell-products-dishes/contracts/domain-api.md):
- The module is pure, with no I/O, clock, randomness or implicit locale.
- It imports only from inside `src/domain/`, and the lint boundary enforces this.
- Coverage is 100%.

Types are defined in [data-model.md](../data-model.md). Existing functions keep their signatures and behaviour unless this file says otherwise.

## dates.ts (new)

```ts
isIsoDate(value: unknown): value is IsoDate     // 'YYYY-MM-DD' and a real date (no 2026-02-30)
toDayNumber(date: IsoDate): number             // days since 1970-01-01 (days_from_civil)
fromDayNumber(day: number): IsoDate            // inverse (civil_from_days)
addDays(date: IsoDate, days: number): IsoDate
weekdayIndex(date: IsoDate): number            // Monday = 0 … Sunday = 6
weekStartOf(date: IsoDate): IsoDate            // that day's Monday
weekDates(weekStart: IsoDate): IsoDate[]       // 7 dates, Mon → Sun
DAY_NAMES: readonly string[]                   // 'Poniedziałek' … 'Niedziela'
MONTH_ABBREVIATIONS: readonly string[]         // 'sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'
dayLabel(date: IsoDate): { dayName: string; dateText: string } // { 'Czwartek', '5 lis' }
weekRangeLabel(weekStart: IsoDate): string
weekRange(weekStart: IsoDate): { start: IsoDate; end: IsoDate } // Monday to Sunday

// Added by the 2026-11-04 redesign (research R14):
SHORT_DAY_NAMES: readonly string[]              // 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'
MONTH_NAMES: readonly string[]                  // 'styczeń' … 'grudzień' (nominative)
weekMonthLabel(weekStart: IsoDate): string      // "Listopad 2026", "Listopad – grudzień 2026",
                                                // "Grudzień 2026 – styczeń 2027"
dayOfMonth(date: IsoDate): number
sameWeekday(date: IsoDate, weekStart: IsoDate): IsoDate // that weekday in the given Week
```

## numbers.ts (extended)

```ts
roundTo(value: number, places: number): number // half away from zero; roundTo2 = roundTo(v, 2)
formatDecimal(value: number, places?: number): string // default 2; existing output unchanged
```

## units.ts (extended)

```ts
formatAmount(amount: number, unit: Unit): string // g, ml → whole; pcs → ≤ 2 decimals; comma separator
```

## settings.ts (new)

```ts
DEFAULT_SETTINGS: Settings                     // { slotsPerDay: 4 }
SLOTS_PER_DAY: { min: 1; max: 10 }
isValidSlotsPerDay(value: unknown): value is number // whole number within SLOTS_PER_DAY
readSettings(stored: unknown): Settings        // missing or invalid fields → defaults
```

## slots.ts (new)

```ts
slotCountForDay(slotsPerDay: number, mealsOfDay: readonly Meal[], daySlots: DaySlots | undefined): number
nextSlotCount(shown: number): number
nextPosition(mealsInSlot: readonly Meal[]): number
```

## meals.ts (new)

```ts
type FieldError = DishFieldError;              // shared codes, see data-model.md

interface ScaledMeal { macros: Macros; ingredients: Ingredient[] } // unrounded

interface ValidMealValue {                     // per-Meal values, parsed and rounded to 2 decimals
  servings: number;
  name: string;
  ingredients: Ingredient[];
  macros: Macros;
}

interface MealDraft {
  basisServings: number;                       // the Servings the numbers below are expressed in
  servings: string;
  name: string;
  ingredients: { productId: string; amount: string }[];
  macros: { kcal: string; protein: string; fat: string; carbs: string };
}

isDetached(meal: Meal): boolean
newMeal(input: { id: string; date: IsoDate; slot: number; position: number; dishId: string }): Meal
                                               // servings 1, detached null
mealSource(meal: Meal, dishesById: ReadonlyMap<string, Dish>): MealSource | null
scaleMeal(source: MealSource, servings: number): ScaledMeal
draftFromMeal(meal: Meal, source: MealSource): MealDraft
rescaleMealDraft(draft: MealDraft, source: MealSource, newServingsText: string): MealDraft
                                               // unchanged if the text is not a valid Servings value
addMealIngredient(draft: MealDraft, productId: string):
  { draft: MealDraft; index: number; existed: boolean }
removeMealIngredient(draft: MealDraft, index: number): MealDraft
validateMealDraft(draft: MealDraft, productsById: ReadonlyMap<string, Product>):
  | { ok: true; value: ValidMealValue }
  | { ok: false; errors: Record<string, FieldError> } // paths as in DishDraft, plus 'servings'
decideMealSave(meal: Meal, source: MealSource, value: ValidMealValue):
  | { kind: 'unchanged' }
  | { kind: 'save'; meal: Meal; detachedNow: boolean } // detachedNow: was linked, now detached
restoreMeal(meal: Meal): Meal                  // detached = null, servings kept
servingsWord(servings: number): 'porcja' | 'porcje' | 'porcji'
perServing(source: MealSource): Macros          // Macros of 1 Serving, for the Dish picker
mealsWord(count: number): 'posiłek' | 'posiłki' | 'posiłków' // 1; 2–4 (not 12–14); else (redesign)
                                               // 1 → porcja; 2–4 (not 12–14), whole → porcje; else porcji
```

## week.ts (new)

```ts
interface DayView {
  date: IsoDate;
  isToday: boolean;
  mealCount: number;
  plannedKcal: number;                         // unrounded
}

interface SlotView {
  number: number;
  meals: MealView[];                           // ordered by position, then id
}

interface MealView {
  meal: Meal;
  name: string;                                // source name, or null source → ''
  missingDish: boolean;
  photo: DishPhotoRef | null;                  // from the Dish, also for Detached Meals
  servings: number;
  kcal: number;                                // unrounded
  detached: boolean;
}

plannedKcal(meals: readonly Meal[], dishesById: ReadonlyMap<string, Dish>): number
plannedMacros(meals: readonly Meal[], dishesById: ReadonlyMap<string, Dish>): Macros // unrounded sum
// Refinements (2026-11-04): DayView and SlotView also carry `macros: Macros` (unrounded sums)
selectWeekDays(weekStart: IsoDate, today: IsoDate, meals: readonly Meal[],
  dishesById: ReadonlyMap<string, Dish>): DayView[]   // always 7
selectDay(date: IsoDate, meals: readonly Meal[], daySlots: DaySlots | undefined,
  dishesById: ReadonlyMap<string, Dish>, settings: Settings): SlotView[]
weekHasPlan(meals: readonly Meal[], daySlots: readonly DaySlots[]): boolean
planWeekCopy(weekStart: IsoDate, meals: readonly Meal[], daySlots: readonly DaySlots[],
  ids: IdGenerator): { meals: Meal[]; daySlots: DaySlots[] }
                                               // only records dated within the source Week
```

## nutrition.ts (new, display only)

```ts
formatKcal(kcal: number): string               // whole number: 349.6 → "350"
formatMacro(grams: number): string             // ≤ 1 decimal: 12.5 → "12,5", 55 → "55", 18.75 → "18,8"
formatServings(servings: number): string       // ≤ 2 decimals: 1.5 → "1,5"
```

## products.ts (extended)

```ts
productUsageBreakdown(dishes: readonly Dish[], detachedMealIngredientLists: readonly (readonly Ingredient[])[]):
  ReadonlyMap<string, { dishes: number; meals: number }>
countProductUsage(...)                         // unchanged signature; now the sum of the breakdown
```

## dishes.ts (unchanged API)

`DishFieldError` stays. `meals.ts` re-exports it as `FieldError`. The shared draft parsing (`parseField`) moves to a small internal helper in `drafts.ts` so both drafts use it. The helper is internal, so no public name changes.

## ports.ts (extended)

```ts
interface Clock { today(): IsoDate }
```

## Required test cases (minimum)

- **dates**:
  - `weekStartOf`: '2026-11-04' (Wed) → '2026-11-02'. '2026-11-08' (Sun) → '2026-11-02'. '2026-11-02' (Mon) → itself.
  - The week of 2026-03-30 to 2026-04-05 and the one around 2026-10-25 (the EU DST changes) both have exactly 7 dates.
  - The 2024-02-29 leap day round-trips. `addDays('2026-12-28', 6)` → '2027-01-03'.
  - `toDayNumber('1970-01-01') === 0`, and `fromDayNumber(toDayNumber(d)) === d` for a range of dates.
  - `isIsoDate` rejects '2026-02-30', '2026-13-01', '2026-1-5' and `42`.
  - `weekRangeLabel`: '2026-11-02' → "2–8 lis 2026". '2026-11-30' → "30 lis – 6 gru 2026". '2026-12-28' → "28 gru 2026 – 3 sty 2027".
  - `dayLabel('2026-11-05')` → { 'Czwartek', '5 lis' }.
- **numbers / nutrition / units**:
  - `formatMacro`: 12.5, 18.75 → "18,8", 11.25 → "11,3", 55 → "55".
  - `formatKcal(349.5) === "350"`.
  - `formatAmount(0.5, 'pcs') === "0,5"`, `formatAmount(1/3, 'pcs') === "0,33"`, `formatAmount(74.6, 'g') === "75"`.
  - `formatDecimal` without `places` behaves exactly as before.
- **settings**: `readSettings(undefined)` gives the defaults. 0, 11, 2.5, '4' and `null` are rejected and fall back to 4. 1 and 10 are accepted.
- **slots**:
  - Default 4, no Meals, no record → 4.
  - A Meal in Slot 6 → 6.
  - A record of 5 with a default of 3 → 5, and with a default of 6 → 6.
  - `nextPosition([])` = 0, and with positions 0 and 3 → 4.
- **meals**:
  - Scaling: spec US2-1 and US2-2 exactly ("Owsianka" yielding 2: 1 Serving → 50 g, 150 ml, 350 kcal, 12.5 g protein; 1.5 Servings → 75 g, 225 ml, 525 kcal).
  - `mealSource`: linked → Dish. Archived Dish → still resolves. Detached → own copy, even after the Dish changes. Missing Dish → `null`.
  - `decideMealSave`:
    - Servings only → `save` with `detached` still `null`.
    - The same values retyped ("50" vs "50,00") → `unchanged`.
    - Amount 50 → 80 g at 1 Serving with yield 2 → detached copy amount 160, Macros copied exactly.
    - Name, added Ingredient, removed Ingredient and Macro changes each detach.
    - A change on an already Detached Meal → `detachedNow: false`.
  - `rescaleMealDraft`:
    - 1 → 2 Servings: untouched fields come from the source, an edited 80 becomes 160.
    - Yield 3, 100 g: going 1 → 2 → 1 → 2 Servings never drifts, so saving gives `unchanged`.
    - An invalid Servings text leaves the draft unchanged.
  - `validateMealDraft`: every error code, including `servings` 0, -1 and "abc", and `duplicateProduct`.
  - `restoreMeal`: keeps Servings and clears `detached`.
  - `servingsWord`: 1, 2, 4, 5, 12, 22, 1.5.
- **week**:
  - `selectWeekDays` always returns 7 days, Mon → Sun, with `isToday` on exactly the matching date. Day kcal is the sum of unrounded values (3 × 33.333 → 99.999, shown as "100").
  - `selectDay` orders Meals by position, includes empty Slots up to the count, and puts a Meal in Slot 6 in Slot 6.
  - `weekHasPlan`: no records → false. Only a `DaySlots` record → true.
  - `planWeekCopy`:
    - dates + 7 across a month and year boundary
    - new ids from `FixedIdGenerator`
    - `detached` deep-copied (mutating the copy leaves the original alone)
    - slot, position and servings kept
    - records outside the source Week are ignored
- **products**: `productUsageBreakdown` counts an archived Dish and a Detached Meal separately. `countProductUsage` equals the sum, so the feature 001 tests still pass.
