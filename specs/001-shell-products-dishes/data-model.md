# Data Model: App Shell, Products and Dishes

Phase 1 output for [plan.md](plan.md). Terms follow [GLOSSARY.md](../../GLOSSARY.md). Storage decisions are in [research.md](research.md) (R3–R6, R12, R13).

## Domain types (`src/domain/types.ts`)

```ts
type Unit = 'g' | 'ml' | 'pcs';

interface Product {
  id: string;        // UUID
  name: string;      // normalizeName(input), display form
  unit: Unit;
}

interface Ingredient {
  productId: string; // → Product.id
  amount: number;    // > 0, rounded to 2 decimals, in the Product's unit
}

interface Macros {
  kcal: number;      // ≥ 0, rounded to 2 decimals, whole Dish
  protein: number;   // grams, same rules
  fat: number;
  carbs: number;
}

interface Dish {
  id: string;            // UUID
  name: string;          // normalizeName(input), non-empty
  servingsYield: number; // > 0, rounded to 2 decimals
  ingredients: Ingredient[]; // ordered as entered, unique by productId
  macros: Macros;
  notes: string;         // '' when none
  photo: DishPhotoRef | null;
  archived: boolean;
}

interface DishPhotoRef {
  id: string;            // UUID, new on every photo change
  mimeType: 'image/webp' | 'image/jpeg';
}
```

`Ingredient` stores only the `productId`. The Product's name and unit are always read from the Product, so a rename (FR-019) or unit change appears everywhere without rewriting Dishes.

## Validation rules

| Rule | Source | Domain function |
|---|---|---|
| Product name non-empty after `normalizeName` | Edge Cases | `validateProductName` |
| Product `nameKey` unique across Products (except itself on rename) | FR-013, FR-018 | `findNameConflict(products, name, selfId?)` |
| Unit ∈ {g, ml, pcs} | FR-012 | type plus `isUnit` guard at the persistence boundary |
| Dish name non-empty after `normalizeName` | FR-025 | `validateDishDraft` |
| Servings yield parses and is > 0 | FR-025 | `validateDishDraft` |
| Each Macro parses and is ≥ 0, all four required | FR-025 | `validateDishDraft` |
| Each Ingredient amount parses and is > 0 | FR-026 | `validateDishDraft` |
| No duplicate `productId` in a Dish | FR-027 | `validateDishDraft` (and `addIngredient` returns the existing index) |
| Every Ingredient's `productId` exists | integrity | `validateDishDraft` (takes the Product map) |

`validateDishDraft(draft, productsById)` takes the **form draft**, in which numbers are still the strings the user typed. It returns either `{ ok: true, dish }` with parsed and rounded values, or `{ ok: false, errors }`, where `errors` maps a field path (`name`, `servingsYield`, `macros.kcal`, `ingredients[2].amount`, …) to an error code (`required`, `notPositive`, `negative`, `notANumber`, `duplicateProduct`, `unknownProduct`). Polish messages are produced from those codes in `src/ui/view-models/`.

## Derived values (pure, not stored)

| Value | Function | Rule |
|---|---|---|
| `nameKey` | `nameKey(name)` | NFC, trim, collapse whitespace, `toLowerCase()` (R3) |
| Autocomplete suggestions | `suggestProducts(products, query)` | `nameKey` substring, sorted with the Polish collator, empty query → [] |
| Offer to create | `shouldOfferCreate(products, query)` | normalised query non-empty and no exact `nameKey` match |
| Usage count per Product | `countProductUsage(dishes, detachedMealIngredientLists)` | number of Dishes (archived included) plus Detached Meal lists that contain the Product. In this feature the Meal input is `[]` (R13) |
| Can delete / can change unit | `productActions(usage)` | both allowed only when usage = 0 |
| Merge availability | `canMerge(from, into)` | different ids and the same unit |
| Ingredients after a merge | `mergeIngredients(list, fromId, intoId)` | replace `fromId` with `intoId`. If both are present, one Ingredient at the position of the first, amount = `roundTo2(a + b)` |
| Library list | `selectLibrary(dishes)` | `archived === false`, sorted by name with the Polish collator, then by id |
| Product list rows | `selectProductRows(products, usage)` | sorted by name, each with its usage count |
| Dish removal decision | `decideDishRemoval(mealCount)` | 0 → `'delete'`, otherwise `'archive'` |
| Placeholder | `placeholderFor(name)` | `{ color, initials }` (R5) |
| Photo target size | `fitWithin(w, h, 800)` | scale down to longest edge ≤ 800 keeping ratio. Never scale up. Integer pixels, at least 1 |

## State transitions

### Product

```text
(none) --createFromName(name, unit)--> exists
exists --rename(newName)--> exists            [no nameKey conflict with another Product]
exists --rename(newName)--> conflict result   [conflict → UI offers merge into the conflicting Product if units match]
exists --changeUnit(unit)--> exists           [usage = 0, checked inside the transaction]
exists --delete--> (none)                     [usage = 0, checked inside the transaction]
exists(from) --merge into(into)--> (none)     [from ≠ into, same unit; every Dish rewritten with mergeIngredients]
```

### Dish

```text
(none) --create--> active
active --edit--> active
active --delete [mealCount = 0]--> (none)     photo file deleted after the record delete commits
active --delete [mealCount > 0]--> archived   record and photo kept
archived --delete--> archived                 (not reachable from the UI: archived Dishes are hidden)
```

There is no `archived → active` transition (spec Assumptions: no restore).

### Dish photo

```text
none --set(file)--> compress → write photos/<newId>.<ext> → commit Dish.photo = newRef
ref(old) --set(file)--> write new → commit Dish.photo = newRef → delete old file
ref(old) --remove--> commit Dish.photo = null → delete old file
any write failure (decode error, QuotaExceededError) → Dish.photo unchanged; the error is reported and the other Dish edits can still be saved
startup sweep: delete files in photos/ whose id is not referenced by any Dish
```

## Persistence schema (Dexie, `src/data/db.ts`)

```ts
db.version(1).stores({
  products: 'id, &nameKey',
  dishes: 'id',
});
```

| Table | Stored record | Notes |
|---|---|---|
| `products` | `Product & { nameKey: string }` | `nameKey` is written by the repository from `name`. It is never accepted from callers. The unique index is a storage-level backstop for FR-013 |
| `dishes` | `Dish` | Ingredients embedded. `archived` is a plain boolean (not indexed, because filtering at ~hundreds of records is in memory). Photo bytes live in OPFS, never in IndexedDB |

OPFS layout: `/photos/<photoRef.id>.webp` or `/photos/<photoRef.id>.jpg`.

Future features add tables (`meals`, `weekState`, `settings`) through `db.version(2)`. Nothing here needs to change for them, apart from widening the inputs described in R13.

## Relationships

- Ingredient → Product: many-to-one, by `productId`. A Product cannot be deleted while any Ingredient references it (FR-023), so no reference dangles.
- Dish → Ingredient: one-to-many, embedded.
- Dish → photo file: zero-or-one, by `photo.id`.
- Meal → Dish (later feature): many-to-one. That is why a referenced Dish is archived rather than deleted (FR-034, FR-035).
