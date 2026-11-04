# Contract: Repositories, I/O ports and use cases

Every I/O dependency sits behind an interface with an in-memory fake under `tests/fakes/` (constitution, Principle IV). Repositories run their integration tests against `fake-indexeddb`.

## Repositories (`src/data/`)

```ts
interface ProductRepository {
  list(): Promise<Product[]>;
  createFromName(name: string, unit: Unit): Promise<
    | { kind: 'created'; product: Product }
    | { kind: 'exists'; product: Product }        // nameKey already taken → return the existing Product
    | { kind: 'invalid' }                          // empty after normalisation, or not a Unit (isUnit)
  >;
  rename(id: string, newName: string): Promise<
    | { kind: 'renamed' }
    | { kind: 'invalid' }
    | { kind: 'conflict'; existing: Product; mergeAllowed: boolean }
  >;
  changeUnit(id: string, unit: Unit): Promise<
    { kind: 'changed' } | { kind: 'inUse'; usage: number } | { kind: 'invalid' } // invalid: not a Unit
  >;
  delete(id: string): Promise<{ kind: 'deleted' } | { kind: 'inUse'; usage: number }>;
  merge(fromId: string, intoId: string): Promise<
    { kind: 'merged'; dishesUpdated: number } | { kind: 'unitMismatch' } | { kind: 'sameProduct' }
  >;
}

interface DishRepository {
  list(): Promise<Dish[]>;                         // all Dishes, including archived
  get(id: string): Promise<Dish | undefined>;
  put(dish: Dish): Promise<void>;                  // create or replace
  archive(id: string): Promise<void>;
  deletePermanently(id: string): Promise<void>;
}
```

Rules:

- `changeUnit`, `delete` and `merge` run in one Dexie `rw` transaction over `products` and `dishes`. They recompute usage inside it, using `countProductUsage` with `[]` as the Meal input in this feature.
- `merge` rewrites every Dish whose Ingredients contain `fromId` using `mergeIngredients`, then deletes `fromId`, in the same transaction.
- `createFromName` and `changeUnit` check the unit with `isUnit` before writing, so a value that is not a Unit never reaches storage, even from untyped data.
- `nameKey` is always derived inside the repository. A unique-index `ConstraintError` maps to `exists` or `conflict`.
- Live UI reads use `useLiveQuery(() => repo.list())`. There is no other state store.

## I/O ports (`src/domain/ports.ts` for IdGenerator, `src/data/ports.ts` for the rest)

```ts
interface IdGenerator { next(): string }                          // adapter: crypto.randomUUID()

interface PhotoStore {
  write(ref: DishPhotoRef, blob: Blob): Promise<void>;            // throws PhotoQuotaError on quota
  read(ref: DishPhotoRef): Promise<Blob | null>;
  delete(ref: DishPhotoRef): Promise<void>;                       // no-op if missing
  listIds(): Promise<string[]>;
}

interface ImageCompressor {
  compress(file: Blob, maxEdge: number): Promise<{ blob: Blob; mimeType: 'image/webp' | 'image/jpeg' }>;
  // throws PhotoDecodeError when the file cannot be decoded
}

type RequestPersistentStorage = () => Promise<boolean>;
```

Adapters (`src/adapters/`, kept minimal and excluded from the coverage gate):

- `opfs-photo-store.ts`: `navigator.storage.getDirectory()` → `photos/`, writing with `createWritable()` (R6)
- `canvas-image-compressor.ts`: `createImageBitmap` → canvas → WebP, falling back to JPEG when the blob type check fails (R7)
- `crypto-id-generator.ts`
- `persist-storage.ts`

## Use cases (`src/app/`)

These are plain async functions that take their dependencies as the first argument. Integration tests run them over `fake-indexeddb` and in-memory fakes.

```ts
saveDish(deps: { dishes; photos; compressor; ids }, input: {
  id?: string;                         // absent → create
  draft: DishDraft;
  productsById: ReadonlyMap<string, Product>;
  photoChange: { kind: 'keep' } | { kind: 'remove' } | { kind: 'set'; file: Blob };
}): Promise<
  | { kind: 'saved'; id: string; photoError?: 'decode' | 'quota' } // Dish saved, photo left unchanged on error
  | { kind: 'invalid'; errors: Record<string, DishFieldError> }
>

deleteDish(deps: { dishes; photos; countMealsUsingDish: (dishId: string) => Promise<number> },
  dishId: string): Promise<{ kind: 'deleted' } | { kind: 'archived' }>
// In this feature countMealsUsingDish is wired to async () => 0 (research R13)

sweepOrphanPhotos(deps: { dishes; photos }): Promise<number>      // returns the number of files deleted
```

Order of operations in `saveDish` with `photoChange: set`:

1. Validate the draft. If it is invalid, return `invalid` without touching storage.
2. Compress and write the new photo under a new `DishPhotoRef` whose id comes from the injected `deps.ids.next()` (Principle IV). On `PhotoDecodeError` or `PhotoQuotaError`, record `photoError` and keep the old reference.
3. Put the Dish.
4. If the reference changed, delete the old photo file. A failure here is ignored, because the sweep removes it later.

Required integration tests (minimum):

- Merge of the spec's "pomidor"/"pomidory" example with three Dishes, including the summed case.
- `delete` and `changeUnit` refused for a Product used only by an archived Dish.
- `rename` conflicts, ignoring case, while a case-only rename of the same Product succeeds.
- `createFromName` on an existing name returns `exists`.
- `saveDish`:
  - a photo replacement deletes the old file
  - a quota error saves the Dish with the old photo and reports `photoError: 'quota'`
  - an invalid draft writes nothing
- `deleteDish` with a fake count of 0 deletes the record and the photo, and with 1 archives and keeps the photo.
- `sweepOrphanPhotos` deletes only unreferenced files.
