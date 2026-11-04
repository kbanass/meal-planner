# Contract: Domain module (`src/domain/`)

These are pure functions with no I/O, no clock, no randomness and no implicit locale. The module may only import from inside `src/domain/`. It is covered at 100% (lines, branches, functions, statements). Types are defined in [data-model.md](../data-model.md).

## names.ts

```ts
normalizeName(input: string): string           // NFC, trim, collapse whitespace
nameKey(input: string): string                 // normalizeName + toLowerCase()
compareNames(a: string, b: string): number     // Intl.Collator('pl', { sensitivity: 'base', numeric: true })
```

## numbers.ts

```ts
parseDecimal(text: string): number | null      // "1,5" | "1.5" | " 2 " | "-1,5" → number. Invalid → null
roundTo2(value: number): number                // half away from zero
formatDecimal(value: number): string           // up to 2 decimals, comma separator, no trailing zeros: 1.5 → "1,5"
```

## units.ts

```ts
UNITS: readonly Unit[]                         // ['g', 'ml', 'pcs'], in form order
isUnit(value: unknown): value is Unit          // guard at the persistence boundary
```

## products.ts

```ts
validateProductName(input: string): 'required' | null
findNameConflict(products: readonly Product[], name: string, selfId?: string): Product | null
suggestProducts(products: readonly Product[], query: string): Product[]
shouldOfferCreate(products: readonly Product[], query: string): boolean
countProductUsage(
  dishes: readonly Dish[],
  detachedMealIngredientLists: readonly (readonly Ingredient[])[],
): ReadonlyMap<string, number>                 // productId → count. Absent = 0
productActions(usage: number): { canDelete: boolean; canChangeUnit: boolean }
canMerge(from: Product, into: Product): boolean
mergeIngredients(list: readonly Ingredient[], fromId: string, intoId: string): Ingredient[]
selectProductRows(products: readonly Product[], usage: ReadonlyMap<string, number>):
  { product: Product; usage: number }[]
```

## dishes.ts

```ts
interface DishDraft {
  name: string;
  servingsYield: string;
  ingredients: { productId: string; amount: string }[];
  macros: { kcal: string; protein: string; fat: string; carbs: string };
  notes: string;
}

type DishFieldError =
  'required' | 'notANumber' | 'notPositive' | 'negative' | 'duplicateProduct' | 'unknownProduct';

emptyDishDraft(): DishDraft                    // servingsYield "1", macros "", no ingredients
draftFromDish(dish: Dish): DishDraft           // numbers formatted with a comma decimal separator
addIngredient(draft: DishDraft, productId: string):
  { draft: DishDraft; index: number; existed: boolean }
removeIngredient(draft: DishDraft, index: number): DishDraft
validateDishDraft(draft: DishDraft, productsById: ReadonlyMap<string, Product>):
  | { ok: true; value: Omit<Dish, 'id' | 'photo' | 'archived'> }
  | { ok: false; errors: Record<string, DishFieldError> }
selectLibrary(dishes: readonly Dish[]): Dish[]
decideDishRemoval(mealCountUsingDish: number): 'delete' | 'archive'
```

## placeholder.ts

```ts
PLACEHOLDER_PALETTE: readonly string[]         // 12 hex colours, each ≥ 4.5:1 contrast against #FFFFFF
fnv1a32(input: string): number                 // over code points, unsigned
placeholderFor(name: string): { color: string; initials: string } // initials: up to 2 chars, or "•"
```

## photo-size.ts

```ts
fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number }
```

## ports.ts (interfaces only, no implementations)

```ts
interface IdGenerator { next(): string }
```

## Required test cases (minimum)

- **names**:
  - "  Mleko  " → "Mleko"
  - nameKey("ŁOSOŚ") === "łosoś"
  - composed and decomposed "ś" give the same key
  - sorting "ćma" < "dynia" and "łosoś" < "mąka"
- **numbers**:
  - "1,5" → 1.5
  - "1.5" → 1.5
  - "1,5,3" → null
  - "-1,5" → -1.5
  - "+1" → null
  - "" → null
  - "1e3" → null
  - roundTo2(0.1 + 0.2) === 0.3
  - roundTo2(1.005) === 1.01
- **suggestProducts**: "MLE" and "ml" both match "mleko"; "losos" does not match "łosoś"; empty query returns []
- **shouldOfferCreate**: false for " Mleko " when "mleko" exists
- **mergeIngredients**:
  - only from → replaced in place
  - both → summed at the first position (200 + 100 = 300)
  - neither → unchanged
  - the input list is not mutated
- **countProductUsage**: archived Dishes count; one Dish counts once per Product; Detached Meal lists count
- **validateDishDraft**:
  - each error code
  - field paths for ingredient errors
  - a valid draft returns rounded numbers and a normalised name
- **placeholderFor**:
  - "Owsianka" → "O"
  - "Leczo z kiełbasą" → "LZ"
  - "  2 jajka" → "2J"
  - "!!!" → "•"
  - same name → same colour
  - every palette colour passes the 4.5:1 contrast check
- **fitWithin**: landscape, portrait, square, already-small (unchanged), with a minimum of 1 px
- **decideDishRemoval**: 0 → 'delete', 1 → 'archive'
