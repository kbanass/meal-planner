---
description: "Task list for App Shell, Products and Dishes"
---

# Tasks: App Shell, Products and Dishes

**Input**: Design documents from `specs/001-shell-products-dishes/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md), [analysis-followups.md](analysis-followups.md)

**Tests**: Required. Constitution Principle IV requires domain tests in every feature's `tasks.md`, written together with or before the implementation, plus a 100% coverage gate on `src/domain/**`. Repository tests use `fake-indexeddb`. Component tests cover only key interactions.

**Organization**: One phase per user story. Phases follow priority order, except that US5 (shell, P1) comes before US1 (P1), because every screen lives inside the shell.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: Which user story the task belongs to (US1–US5 from spec.md)

## Conventions for every task

- Code, identifiers and comments are in English. Every user-facing string we write is Polish and inline (Principle I). Exact strings are in [contracts/ui.md](contracts/ui.md). Framework7's own default labels (for example "OK", "Cancel", "Back" in standard dialogs and back links) stay as Framework7 ships them. Do not configure or override them (see the deviation in [plan.md](plan.md), Complexity Tracking).
- Domain terms follow [GLOSSARY.md](../../GLOSSARY.md). Never use Item, Recipe, Template, Entry or Component as identifiers for domain concepts.
- `src/domain/**` may import only from `src/domain/**`. It must not use `Date`, `Math.random`, `crypto` or DOM globals (research R2).
- Components render view-model or selector output and call use cases. They compute no derived values inline.
- Tests: Vitest, no network, no real timers, fixed fixtures, no dependence on test order.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project scaffold, tooling and quality gates.

- [X] T001 Scaffold a Vite + React + TypeScript project at the repository root:
  - `package.json`:
    - `"name": "planner"`, `"type": "module"`, `"engines": { "node": ">=24" }`
    - scripts `dev` (`vite`), `build` (`tsc -b && vite build`), `preview` (`vite preview`), `lint` (`eslint .`), `typecheck` (`tsc -b --noEmit`), `test` (`vitest run`), `coverage` (`vitest run --coverage`)
  - `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess: true`, `jsx: "react-jsx"`, `moduleResolution: "bundler"`, `target: "ES2022"`, `lib: ["ES2022", "DOM", "DOM.Iterable"]`, and `types: ["vite/client"]`.
  - `index.html` with `<html lang="pl">`, `<div id="app">`, and a `<script type="module" src="/src/main.tsx">`.
  - Empty folders (`.gitkeep`) for `src/domain`, `src/data`, `src/adapters`, `src/app`, `src/ui`, `src/dev`, `tests/domain`, `tests/data`, `tests/app`, `tests/ui`, `tests/fakes`.
- [X] T002 Install dependencies and pin exact versions in `package.json`:
  - Runtime: `react@19`, `react-dom@19`, `framework7@9`, `framework7-react@9`, `framework7-icons`, `dexie@4`, `dexie-react-hooks`.
  - Dev: `vite`, `@vitejs/plugin-react`, `vite-plugin-pwa`, `@vite-pwa/assets-generator`, `typescript`, `@types/react`, `@types/react-dom`, `vitest`, `@vitest/coverage-v8`, `jsdom`, `fake-indexeddb`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`.
- [X] T003 [P] Create `vitest.config.ts`:
  - Default environment `node`. Files under `tests/ui/**` run in `jsdom`, using Vitest `projects` (or `environmentMatchGlobs` if the installed Vitest version still supports it).
  - `setupFiles: ['tests/setup.ts']`, and create `tests/setup.ts` importing `fake-indexeddb/auto` and `@testing-library/jest-dom/vitest`.
  - In `tests/setup.ts`, also install test-only stand-ins for browser APIs that jsdom lacks, applied only when `typeof window !== 'undefined'` and the API is missing:
    - `IntersectionObserver`: a class whose `observe`, `unobserve` and `disconnect` do nothing and which never calls back, so `usePhotoUrl` stays on the placeholder in tests.
    - `window.matchMedia`: returns `{ matches: false, media, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }`, so tests render the mobile layout.
    - `URL.createObjectURL` returning `'blob:test'`, and `URL.revokeObjectURL` doing nothing.
  - `coverage: { provider: 'v8', include: ['src/domain/**'], thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 } }`.
  - `restoreMocks: true`.
  - `sequence.shuffle: true`, so dependence on test order is caught.
- [X] T004 [P] Create `eslint.config.js` (flat config) with `typescript-eslint` recommended and `react-hooks`, plus an override for `src/domain/**` (research R2):
  - `no-restricted-imports` with patterns `react*`, `framework7*`, `dexie*`, and `../**` paths that leave `src/domain`.
  - `no-restricted-globals` for `window`, `document`, `navigator`, `crypto`, `localStorage`, `indexedDB`.
  - `no-restricted-properties` for `Date.now` and `Math.random`.
  - `no-restricted-syntax` banning `NewExpression[callee.name='Date'][arguments.length=0]` and any `localeCompare` / `toLocaleLowerCase` / `toLocaleUpperCase` / `toLocaleString` call without arguments.
- [X] T005 [P] Create `.gitignore` (`node_modules`, `dist`, `dev-dist`, `coverage`, `*.local`) and `.nvmrc` containing `24`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core domain primitives, storage, ports, fakes and test harness that every story uses.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T006 [P] Write `tests/domain/names.test.ts` before the implementation. Cases:
  - `normalizeName("  Mleko  ") === "Mleko"`
  - internal whitespace runs collapse to one space
  - `nameKey("ŁOSOŚ") === "łosoś"`
  - composed `"ś"` and decomposed `"ś"` give equal `nameKey`
  - with `compareNames`, `"ćma" < "dynia"`, `"łosoś" < "mąka"` and `"jajko 2" < "jajko 10"`
- [X] T007 [P] Write `tests/domain/numbers.test.ts` before the implementation. Cases:
  - `parseDecimal`: `"1,5"→1.5`, `"1.5"→1.5`, `" 2 "→2`, `"-1,5"→-1.5`, `"1,5,3"→null`, `"+1"→null`, `"--1"→null`, `""→null`, `"1e3"→null`, `"1 000"→null`, `"abc"→null`
  - `roundTo2(0.1 + 0.2) === 0.3`, `roundTo2(1.005) === 1.01`, `roundTo2(2.675) === 2.68`
  - `formatDecimal(1.5) === "1,5"`, `formatDecimal(2) === "2"`, `formatDecimal(0.25) === "0,25"`
- [X] T008 [P] Write `tests/domain/units.test.ts`: `isUnit('g'|'ml'|'pcs') === true`, and `isUnit('kg')`, `isUnit('')` and `isUnit(undefined)` are false.
- [X] T009 Create `src/domain/types.ts`, copying the types from [data-model.md](data-model.md) exactly:
  - `Unit = 'g' | 'ml' | 'pcs'`
  - `Product { id; name; unit }`
  - `Ingredient { productId; amount }`, where amount is "> 0, rounded to 2 decimals, in the Product's unit"
  - `Macros { kcal; protein; fat; carbs }`, each "≥ 0, rounded to 2 decimals, whole Dish"
  - `Dish { id; name; servingsYield; ingredients; macros; notes; photo; archived }`, where:
    - `servingsYield` is "> 0, rounded to 2 decimals"
    - `ingredients` are "ordered as entered, unique by productId"
    - `notes` is `''` when none
  - `DishPhotoRef { id; mimeType: 'image/webp' | 'image/jpeg' }`
- [X] T010 [P] Implement `src/domain/names.ts`, making T006 pass:
  - `normalizeName(input)` = `input.normalize('NFC').trim().replace(/\s+/gu, ' ')`
  - `nameKey(input)` = `normalizeName(input).toLowerCase()`
  - `compareNames(a, b)`, using one module-level `new Intl.Collator('pl', { sensitivity: 'base', numeric: true })`
- [X] T011 [P] Implement `src/domain/numbers.ts`, making T007 pass (research R4):
  - `parseDecimal(text)`: trims the input, matches `/^-?\d+([.,]\d+)?$/`, replaces `,` with `.`, then `Number(...)`, returning `null` otherwise.
  - `roundTo2(value)`: half away from zero, `Math.sign(v) * Math.round((Math.abs(v) + Number.EPSILON) * 100) / 100`.
  - `formatDecimal(value)`: up to 2 decimals, comma separator, no trailing zeros, built without `toLocaleString`.
- [X] T012 [P] Implement `src/domain/units.ts` with `UNITS: readonly Unit[] = ['g', 'ml', 'pcs']` and `isUnit(value: unknown): value is Unit`, making T008 pass. Create `src/domain/ports.ts` exporting `interface IdGenerator { next(): string }`.
- [X] T013 Create `src/data/db.ts`:
  - Class `PlannerDb extends Dexie` with tables `products: Table<Product & { nameKey: string }, string>` and `dishes: Table<Dish, string>`.
  - Schema `db.version(1).stores({ products: 'id, &nameKey', dishes: 'id' })`.
  - Factory `createDb(name = 'planner', dexieOptions?: DexieOptions)`, so tests can pass a fresh `indexedDB: new IDBFactory()` and `IDBKeyRange` from `fake-indexeddb` per test.
- [X] T014 [P] Create `src/data/ports.ts` exactly as in [contracts/persistence-and-ports.md](contracts/persistence-and-ports.md):
  - `PhotoStore { write(ref, blob); read(ref); delete(ref); listIds() }`
  - `ImageCompressor { compress(file, maxEdge) }`, returning `{ blob, mimeType }`
  - `type RequestPersistentStorage = () => Promise<boolean>`
  - error classes `PhotoDecodeError` and `PhotoQuotaError` (both `extends Error`, with `name` set)
- [X] T015 Create the test fakes in `tests/fakes/` (after T013 and T014, which provide `createDb` and the photo error classes):
  - `fixed-id-generator.ts`: `FixedIdGenerator` returns `00000000-0000-4000-8000-` followed by a 12-digit zero-padded counter starting at 1.
  - `in-memory-photo-store.ts`: `InMemoryPhotoStore` uses a `Map<string, Blob>` keyed by `ref.id`. It has a `failNextWriteWith?: Error` option, and exposes `ids()` for assertions.
  - `fake-image-compressor.ts`: `FakeImageCompressor` returns `{ blob: new Blob(['x'], { type: 'image/webp' }), mimeType: 'image/webp' }`, or throws a configured `PhotoDecodeError`.
  - `test-db.ts`: `createTestDb()` returns `createDb(\`test-${n}\`, { indexedDB: new IDBFactory(), IDBKeyRange })`.
- [X] T016 [P] Create `src/adapters/crypto-id-generator.ts`, exporting `cryptoIdGenerator: IdGenerator` that uses `crypto.randomUUID()`.
- [X] T017 Create `src/app/deps.ts` and `src/ui/hooks/useDeps.tsx`:
  - `deps.ts`: `interface Deps { db: PlannerDb; ids: IdGenerator }`, extended by later tasks, and `createDeps(): Deps`, which wires `createDb()` and `cryptoIdGenerator`.
  - `useDeps.tsx`: `DepsProvider` (React context) and the `useDeps()` hook, which throws if no provider is present.
- [X] T018 Create `tests/ui/render.tsx`:
  - It calls `Framework7.use(Framework7React)` once.
  - It exports `renderWithApp(ui, deps?)`, which mounts `ui` inside Framework7 `<App>` and `<DepsProvider>`. The default deps use `createTestDb()` and `FixedIdGenerator`.
  - Verify it with a trivial smoke test in `tests/ui/render.test.tsx`.

**Checkpoint**: `npm run lint`, `npm run typecheck` and `npm run coverage` pass on the foundation.

---

## Phase 3: User Story 5 - Install and use the app offline (Priority: P1) 🎯 MVP part 1

**Goal**: An installable, offline PWA shell with four tabs: Tydzień (default), Dania, Lista zakupów, Ustawienia. Placeholders where the screens come later. Persistent storage requested on startup.

**Independent Test**: Build, preview, install to the home screen, go offline, restart, and switch tabs. Creating a Dish offline is verified after US1 (quickstart rows 10–11).

### Tests for User Story 5

- [X] T019 [P] [US5] Write `tests/ui/app-shell.test.tsx` before the implementation:
  - rendering `<AppShell />` shows tab links labelled exactly "Tydzień", "Dania", "Lista zakupów", "Ustawienia", in this order
  - "Tydzień" is the active tab
  - the active tab's page contains "Ten ekran pojawi się w kolejnej wersji."
  - tapping "Lista zakupów" activates that tab and shows the same notice

### Implementation for User Story 5

- [X] T020 [P] [US5] Create `src/adapters/persist-storage.ts`, exporting `requestPersistentStorage: RequestPersistentStorage`. It calls `navigator.storage?.persist?.()` and resolves `false` on absence or error (research R9).
- [X] T021 [P] [US5] Create `src/ui/components/PlaceholderPage.tsx`: a Framework7 `Page` with a `Navbar` titled by the `title` prop, and a `Block` with the text "Ten ekran pojawi się w kolejnej wersji."
- [X] T022 [P] [US5] Create `src/ui/styles/app.css` and `src/ui/hooks/useMediaQuery.ts`:
  - At `@media (min-width: 1024px)`: move the `.toolbar.tabbar` to the top, restyle `.page-wide` (centred, `max-width: 960px`) and switch `.card-grid` to `display: grid` with `repeat(auto-fill, minmax(200px, 1fr))`.
  - `useMediaQuery(query)` wraps `matchMedia` with a subscription.
  - Later pages use these classes (FR-009, research R10).
- [X] T023 [US5] Create `src/ui/routes.ts`, exporting per-tab route arrays `weekRoutes`, `dishesRoutes`, `shoppingRoutes`, `settingsRoutes`. In this phase each contains one `/` route rendering `PlaceholderPage` with that tab's title. US1 replaces `dishesRoutes`.
- [X] T024 [US5] Create `src/ui/App.tsx`, exporting `AppShell`:
  - Framework7 `<App name="Planer posiłków" theme="auto">` with `<Views tabs>` holding four `<View>`s: `id` `view-week` (`tab`, `tabActive`, `main`), `view-dishes`, `view-shopping`, `view-settings`. Each has `url="/"` and its own `routes` from T023, and `browserHistory` stays off.
  - A bottom `<Toolbar tabbar icons>` with `<Link tabLink>` entries, labelled and iconed per [contracts/ui.md](contracts/ui.md): Tydzień `calendar`, Dania `book`, Lista zakupów `cart`, Ustawienia `gear`.
  - Make T019 pass.
- [X] T025 [US5] Implement `src/main.tsx`:
  - Import `framework7/css/bundle`, `framework7-icons/css/framework7-icons.css` and `./ui/styles/app.css`.
  - Call `Framework7.use(Framework7React)`.
  - Call `void requestPersistentStorage()`.
  - Render `<DepsProvider value={createDeps()}><AppShell /></DepsProvider>` into `#app`.
- [X] T026 [US5] Configure the PWA (research R8):
  - In `vite.config.ts`, add `VitePWA({ registerType: 'prompt', injectRegister: 'script', strategies: 'generateSW', workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,ttf,webmanifest}'], navigateFallback: 'index.html', runtimeCaching: [] }, manifest: { name: 'Planer posiłków', short_name: 'Planer', lang: 'pl', display: 'standalone', start_url: '/', scope: '/', theme_color: '#2f6f4f', background_color: '#ffffff', icons: [192, 512, 512-maskable] } })`. Do not call `skipWaiting` and do not show a prompt UI.
  - Create `public/icons/icon.svg` (a simple plate glyph on `#2f6f4f`) and `pwa-assets.config.ts`. Generate `public/icons/pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png` and `apple-touch-icon-180x180.png` with `npx pwa-assets-generator`.
  - In `index.html`, add `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-title" content="Planer">` and `<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180x180.png">`.
- [ ] T027 [US5] Create `public/_headers` for Cloudflare Pages, with `Cache-Control: no-cache` for `/sw.js`, `/index.html` and `/manifest.webmanifest`. Then run `npm run build` and confirm `dist/` contains `sw.js` and `manifest.webmanifest`, and that the generated service worker has no `runtimeCaching` routes to external origins (FR-007).

  Make the build reachable over HTTPS for phone testing. Phones need a secure context for the service worker, installing and photo storage, and `npm run preview` over the local network is plain HTTP.
  - Add the script `"deploy:preview": "npm run build && wrangler pages deploy dist --project-name planner --branch preview"` and install `wrangler` as a dev dependency.
  - The first deploy needs the user's Cloudflare account. Ask the user to run `npx wrangler login` themselves; do not handle credentials.
  - If the user has no Cloudflare access yet, a quick tunnel is the fallback: `npm run preview -- --host` plus `cloudflared tunnel --url http://localhost:4173`. Note it in quickstart.md.
  - Record the resulting preview URL in the Prerequisites section of `specs/001-shell-products-dishes/quickstart.md`.

**Checkpoint**: The shell runs, installs and loads offline. T019 passes.

---

## Phase 4: User Story 1 - Build the Dish library (Priority: P1) 🎯 MVP part 2

**Goal**: Create, view and edit Dishes with Ingredients chosen through Product autocomplete, creating new Products inline.

**Independent Test**: On a fresh install, create three Dishes that share at least one Product. Restart, and confirm every value is intact and editable (spec US1).

### Tests for User Story 1

- [X] T028 [P] [US1] Write `tests/domain/products-catalog.test.ts` before the implementation:
  - `validateProductName("   ") === 'required'`, and `"mleko"` → `null`
  - `findNameConflict`: `" Mleko "` vs existing `"mleko"` → that Product; the same name with `selfId` of that Product → `null`
  - `suggestProducts`: `"MLE"` and `"ml"` both return `"mleko"`; `"losos"` does not return `"łosoś"`; `""` and `"  "` return `[]`; results are sorted with `compareNames`
  - `shouldOfferCreate`: `false` for `" Mleko "` when `"mleko"` exists, `true` for `"jogurt grecki"`, `false` for `"  "`
- [X] T029 [P] [US1] Write `tests/domain/dishes.test.ts` before the implementation:
  - `emptyDishDraft()` has `servingsYield: "1"`, empty macros and `[]` ingredients
  - `draftFromDish` formats numbers with `formatDecimal` (`1.5 → "1,5"`)
  - `addIngredient` appends with `amount: ""`, and for an existing productId returns `{ existed: true, index }` with the draft unchanged
  - `removeIngredient` removes by index
  - `validateDishDraft`:
    - every code: `required` (name `"  "`, missing macro), `notANumber` (`"abc"`), `notPositive` (servingsYield `"0"` and `"-1"`, amount `"0"`), `negative` (macro kcal `"-5"`), `duplicateProduct`, `unknownProduct`
    - field paths `name`, `servingsYield`, `macros.kcal`, `ingredients[1].amount`, `ingredients[1].productId`
    - a valid draft returns the normalised name, values rounded with `roundTo2`, and `notes` trimmed
  - `selectLibrary` excludes `archived: true` and sorts by `compareNames`, then by `id`
- [X] T030 [P] [US1] Write `tests/data/product-repository.test.ts` before the implementation, using `createTestDb()` and `FixedIdGenerator`:
  - `createFromName(" Mleko ", 'ml')` → `created`, with name `"Mleko"` and stored `nameKey` `"mleko"`
  - a second `createFromName("MLEKO", 'g')` → `exists`, returning the first Product
  - `createFromName("  ", 'g')` → `invalid`
  - `list()` returns all Products without the `nameKey` field
- [X] T031 [P] [US1] Write `tests/data/dish-repository.test.ts` before the implementation: a `put`/`get`/`list` roundtrip keeps the Ingredient order, the Macros, the empty `notes`, `photo: null` and `archived: false`.
- [X] T032 [P] [US1] Write `tests/app/save-dish.test.ts` before the implementation:
  - creating with a valid draft stores a Dish with an id from `FixedIdGenerator`, `photo: null` and `archived: false`
  - editing keeps the id and the existing `photo`
  - an invalid draft returns `{ kind: 'invalid', errors }` and writes nothing (the `dishes` table count is unchanged)
- [X] T033 [P] [US1] Write `tests/ui/dish-form-vm.test.ts` before the implementation:
  - `errorMessage(code)` returns the exact Polish messages from [contracts/ui.md](contracts/ui.md)
  - `unitLabel('pcs') === 'szt.'`
  - `firstInvalidField(errors)` follows form order: `name`, `servingsYield`, `ingredients[i]…`, `macros.kcal`, `macros.protein`, `macros.fat`, `macros.carbs`

### Implementation for User Story 1

- [X] T034 [P] [US1] In `src/domain/products.ts`, implement `validateProductName`, `findNameConflict(products, name, selfId?)`, `suggestProducts(products, query)` and `shouldOfferCreate(products, query)`, making T028 pass. Matching is `nameKey(product.name).includes(nameKey(query))`. Do not fold diacritics.
- [X] T035 [P] [US1] In `src/domain/dishes.ts`, implement `DishDraft`, `DishFieldError`, `emptyDishDraft`, `draftFromDish`, `addIngredient`, `removeIngredient`, `validateDishDraft(draft, productsById)` and `selectLibrary(dishes)`, making T029 pass. Rules from [data-model.md](data-model.md):
  - "Dish name non-empty after `normalizeName`"
  - "Servings yield parses and is > 0"
  - "Each Macro parses and is ≥ 0, all four required"
  - "Each Ingredient amount parses and is > 0"
  - "No duplicate `productId` in a Dish"
  - "Every Ingredient's `productId` exists"
  - Use `parseDecimal` and `roundTo2`. The functions must never mutate their inputs.
- [X] T036 [US1] Implement `src/data/product-repository.ts`:
  - `createProductRepository(db, ids): ProductRepository`, with `list()` and `createFromName(name, unit)`, per [contracts/persistence-and-ports.md](contracts/persistence-and-ports.md).
  - `nameKey` is always derived from `nameKey(name)` inside the repository. It is never accepted from callers.
  - A Dexie `ConstraintError` on `&nameKey` maps to `exists`.
  - Strip `nameKey` from returned objects.
  - Make T030 pass.
- [X] T037 [P] [US1] Implement `src/data/dish-repository.ts`: `createDishRepository(db): DishRepository`, with `list()`, `get(id)` and `put(dish)`. Make T031 pass.
- [X] T038 [US1] Implement `saveDish` in `src/app/dishes.ts` for the `photoChange: { kind: 'keep' }` case:
  1. `validateDishDraft`; if invalid, return `invalid` without writing.
  2. Build the `Dish`: on create, a new id from `deps.ids.next()`, `photo: null`, `archived: false`; on edit, keep `photo` and `archived` from the stored Dish.
  3. `dishes.put`.
  4. Return `{ kind: 'saved', id }`.

  Type `photoChange` with the full union from the contract. The `set` and `remove` branches are added in T056. Make T032 pass.
- [X] T039 [US1] Extend `Deps` in `src/app/deps.ts` with `products: ProductRepository` and `dishes: DishRepository`, wired in `createDeps()`. Update the defaults in `tests/ui/render.tsx` accordingly.
- [X] T040 [P] [US1] Create `src/ui/view-models/dish-form.ts` with `errorMessage(code)`, `unitLabel(unit)` and `firstInvalidField(errors)`, making T033 pass. All strings come from [contracts/ui.md](contracts/ui.md).
- [X] T041 [P] [US1] Create `src/ui/components/IngredientRow.tsx`:
  - Shows the Product name.
  - Has an amount `<input inputmode="decimal">`, with `unitLabel(product.unit)` as a non-editable suffix (US1-5).
  - Has a remove button with `aria-label="Usuń składnik"`.
  - Shows the error message when present.
  - Accepts a `ref` so the parent can focus it.
- [X] T042 [US1] Create `src/ui/components/ProductPicker.tsx` (research R11):
  - A text input with placeholder "Dodaj składnik…".
  - A Framework7 `List` rendering `suggestProducts(products, query)`, each row showing the name and `unitLabel`.
  - When `shouldOfferCreate`, a last row "Dodaj „{query}”" that opens a Framework7 `Sheet` titled "Nowy produkt", with a `Segmented` control g/ml/szt. (g preselected) and the buttons "Dodaj" and "Anuluj". "Dodaj" calls `deps.products.createFromName`, then `onPick(product)`.
  - Products are read with `useLiveQuery(() => deps.products.list())`.
  - Clear the input after a pick.
- [X] T043 [US1] Create `src/ui/pages/DishFormPage.tsx`, handling both `/dishes/new/` and `/dishes/:dishId/`:
  - Holds a `DishDraft` in `useState`, initialised from `emptyDishDraft()` or `draftFromDish(stored)`.
  - Fields in the order and with the labels from [contracts/ui.md](contracts/ui.md): Nazwa, Liczba porcji, Składniki (`IngredientRow` list + `ProductPicker`), Makro (całe danie) (kcal, Białko (g), Tłuszcz (g), Węglowodany (g)), Notatki.
  - When a pick returns `existed: true`, focus that row and show a toast "Ten produkt jest już w daniu.".
  - Navbar "Zapisz" calls `saveDish`. On `invalid`, show the per-field messages and scroll `firstInvalidField` into view. On `saved`, `router.back()`.
  - Wrap the content in `.page-wide`.
- [X] T044 [US1] Create `src/ui/pages/DishLibraryPage.tsx`:
  - Navbar "Dania" with a right "+" link to `/dishes/new/`.
  - A list from `selectLibrary(useLiveQuery(() => deps.dishes.list()) ?? [])`, each row showing the name and linking to `/dishes/{id}/`. The container has the `card-grid` class at ≥ 1024 px.
  - Empty state "Nie masz jeszcze żadnych dań. Dodaj pierwsze przyciskiem +."
  - Wrap the content in `.page-wide`.
- [X] T045 [US1] Replace `dishesRoutes` in `src/ui/routes.ts` with `/` → redirect to `/dishes/`, plus `/dishes/` → `DishLibraryPage`, `/dishes/new/` → `DishFormPage` and `/dishes/:dishId/` → `DishFormPage`. Set `view-dishes` `url="/dishes/"` in `src/ui/App.tsx`.
- [X] T046 [P] [US1] Write `tests/ui/product-picker.test.tsx`:
  - with "mleko" seeded, typing "MLE" shows "mleko"
  - typing "jogurt grecki" shows "Dodaj „jogurt grecki”"; choosing it opens the sheet with g selected; "Dodaj" calls `onPick` with a Product in unit `g`
  - typing "Mleko" does not show a "Dodaj" row
- [X] T047 [P] [US1] Write `tests/ui/dish-form.test.tsx`: clearing Nazwa, setting Liczba porcji to "0" and pressing "Zapisz" shows "To pole jest wymagane." and "Wartość musi być większa od zera.", and the `dishes` table stays empty (US1-6).

**Checkpoint**: MVP = US5 + US1. Quickstart rows 1–4 and 10–11 pass.

---

## Phase 5: User Story 2 - Recognise Dishes at a glance (Priority: P2)

**Goal**: Dish photos (compressed, stored on the device) and a deterministic coloured placeholder with initials.

**Independent Test**: One Dish with a photo, one without. Restart, and both render correctly. The placeholder is stable for the same name (spec US2).

### Tests for User Story 2

- [X] T048 [P] [US2] Write `tests/domain/placeholder.test.ts` before the implementation:
  - `fnv1a32("")` equals the FNV-1a offset basis `2166136261`, and known vectors hold: `fnv1a32("a") === 0xe40c292c`, `fnv1a32("foobar") === 0xbf9cf968`
  - `placeholderFor("Owsianka").initials === "O"`, `"Leczo z kiełbasą"` → `"LZ"`, `"  2 jajka"` → `"2J"`, `"!!!"` → `"•"`, `"łosoś wędzony"` → `"ŁW"`
  - the same name always gives the same colour, and `"  Owsianka "` gives the same colour as `"Owsianka"`
  - `PLACEHOLDER_PALETTE.length === 12`, and every entry has a WCAG contrast ratio ≥ 4.5 against `#FFFFFF`, computed by a test helper `contrastRatio(hex, '#ffffff')` in the test file
- [X] T049 [P] [US2] Write `tests/domain/photo-size.test.ts` before the implementation:
  - `fitWithin(4000, 3000, 800)` → `{800, 600}`
  - `fitWithin(3000, 4000, 800)` → `{600, 800}`
  - `fitWithin(1000, 1000, 800)` → `{800, 800}`
  - `fitWithin(640, 480, 800)` → `{640, 480}`, never upscaled
  - `fitWithin(8000, 1, 800)` → `{800, 1}`, minimum 1 px
- [X] T050 [P] [US2] Write `tests/app/save-dish-photo.test.ts` before the implementation, using `InMemoryPhotoStore` and `FakeImageCompressor`:
  - `set` on a new Dish writes one photo and stores `photo: { id, mimeType: 'image/webp' }`
  - `set` on a Dish that has a photo writes the new one, commits, then deletes the old one (the store holds exactly one id)
  - `remove` sets `photo: null` and deletes the file
  - a decode error → `{ kind: 'saved', photoError: 'decode' }`, with the other edits saved and the old photo kept
  - `failNextWriteWith = new PhotoQuotaError()` → `photoError: 'quota'`, with the other edits saved and the old photo kept
  - an invalid draft with `set` calls neither the compressor nor the store
- [X] T051 [P] [US2] Write `tests/app/sweep-orphan-photos.test.ts` before the implementation: with photo files `a`, `b`, `c` and Dishes referencing `a` (active) and `b` (archived), `sweepOrphanPhotos` deletes only `c` and returns `1`.

### Implementation for User Story 2

- [X] T052 [P] [US2] Implement `src/domain/placeholder.ts` (research R5), making T048 pass:
  - `fnv1a32(input)` over the code points (`for…of`, `codePointAt`), using `Math.imul(h, 16777619) >>> 0`.
  - `PLACEHOLDER_PALETTE`: 12 hex colours, all dark enough for white text.
  - `placeholderFor(name)` → `{ color: PALETTE[fnv1a32(normalizeName(name)) % 12], initials }`. For the initials: split the normalised name on spaces, keep words whose first code point matches `/[\p{L}\p{N}]/u`, take the first code point of the first two words, apply `.toUpperCase()`, and fall back to `"•"`.
- [X] T053 [P] [US2] Implement `src/domain/photo-size.ts`, `fitWithin(width, height, maxEdge)`: scale = `min(1, maxEdge / max(width, height))`, each side `max(1, Math.round(side * scale))`. Make T049 pass.
- [X] T054 [P] [US2] Create `src/adapters/opfs-photo-store.ts`, `createOpfsPhotoStore(): PhotoStore` (research R6):
  - Root is `navigator.storage.getDirectory()` → `getDirectoryHandle('photos', { create: true })`.
  - The file name is `${ref.id}.${ref.mimeType === 'image/webp' ? 'webp' : 'jpg'}`.
  - `write` uses `getFileHandle(name, { create: true })` → `createWritable()` → `write(blob)` → `close()`, mapping `QuotaExceededError` to `PhotoQuotaError`.
  - `read` uses `getFile()`, returning `null` on `NotFoundError`.
  - `delete` uses `removeEntry`, ignoring `NotFoundError`.
  - `listIds` iterates `entries()` and strips the extensions.
- [X] T055 [P] [US2] Create `src/adapters/canvas-image-compressor.ts`, `createCanvasImageCompressor(): ImageCompressor` (research R7):
  - Decode with `createImageBitmap(file, { imageOrientation: 'from-image' })`, wrapped so any failure throws `PhotoDecodeError`.
  - Size the canvas with `fitWithin(bitmap.width, bitmap.height, maxEdge)`, then `drawImage`.
  - `toBlob('image/webp', 0.8)`. If the blob is null or `blob.type !== 'image/webp'`, re-encode with `toBlob('image/jpeg', 0.8)`.
  - Return `{ blob, mimeType }` and `bitmap.close()`.
- [X] T056 [US2] Extend `saveDish` in `src/app/dishes.ts` for `photoChange.kind === 'set' | 'remove'`, following the "Order of operations" in [contracts/persistence-and-ports.md](contracts/persistence-and-ports.md):
  1. Validate.
  2. Compress with `maxEdge = 800`, then write with a new `DishPhotoRef` id. On `PhotoDecodeError` set `photoError = 'decode'`, on `PhotoQuotaError` set `photoError = 'quota'`, and keep the old reference in both cases.
  3. Put the Dish.
  4. Delete the old file if the reference changed, swallowing errors.

  Add `photos: PhotoStore` and `compressor: ImageCompressor` to the `saveDish` deps. Make T050 pass.
- [X] T057 [P] [US2] Implement `sweepOrphanPhotos(deps: { dishes; photos })` in `src/app/photos.ts`. It lists all Dishes, including archived ones, collects `photo.id`, deletes every `photos.listIds()` entry not in that set, and returns the count. Make T051 pass.
- [X] T058 [US2] Extend `Deps` in `src/app/deps.ts` with `photos: PhotoStore` (`createOpfsPhotoStore()`) and `compressor: ImageCompressor` (`createCanvasImageCompressor()`). In `src/main.tsx`, call `void sweepOrphanPhotos(deps)` after rendering. Update the `tests/ui/render.tsx` defaults with the in-memory fakes.
- [X] T059 [US2] Create `src/ui/hooks/usePhotoUrl.ts`: `usePhotoUrl(ref: DishPhotoRef | null, elementRef)`. It waits until the element intersects the viewport (`IntersectionObserver`, `rootMargin: '200px'`), then reads the blob via `deps.photos.read(ref)` and creates an object URL. It revokes the URL on unmount or when the ref changes, and returns `string | null` (SC-003).
- [X] T060 [US2] Create `src/ui/components/DishAvatar.tsx` with props `{ name, photo, size }`:
  - Renders the `<img>` from `usePhotoUrl` when available.
  - Otherwise renders a circle with `background: placeholderFor(name).color`, white text and the `initials`.
  - `alt`/`aria-label` is the Dish name.
- [X] T061 [US2] Add the photo section to the top of `src/ui/pages/DishFormPage.tsx`:
  - `DishAvatar` at 160 px.
  - A hidden `<input type="file" accept="image/*">` triggered by "Dodaj zdjęcie" or "Zmień zdjęcie".
  - "Usuń zdjęcie" when a photo or pending file exists.
  - Track a `photoChange` state (`keep`/`set`/`remove`) and pass it to `saveDish`.
  - On `photoError`, show the toast from [contracts/ui.md](contracts/ui.md): "Nie udało się wczytać zdjęcia. Spróbuj innego pliku." or "Brak miejsca na urządzeniu. Danie zapisano bez nowego zdjęcia."
  - The placeholder updates live as Nazwa changes (US2-5).
- [X] T062 [US2] In `src/ui/pages/DishLibraryPage.tsx`, render a 48 px `DishAvatar` in each row, and a larger one in the card layout at ≥ 1024 px.

**Checkpoint**: US2 works on top of US1. Quickstart rows 5–6 pass.

---

## Phase 6: User Story 3 - Keep the Product list clean (Priority: P2)

**Goal**: The Produkty section lists each Product with its usage count, and supports rename (with conflict → merge offer), merge (same unit, summing duplicates), and delete or unit change only when the Product is unused.

**Independent Test**: The "pomidor"/"pomidory" example from spec US3: merge, then check the Dishes and counts (spec US3).

### Tests for User Story 3

- [X] T063 [P] [US3] Write `tests/domain/products-maintenance.test.ts` before the implementation:
  - `countProductUsage`:
    - two Dishes using the same Product → 2
    - archived Dishes count
    - Detached Meal lists count
    - Products absent from the map mean 0
  - `productActions(0)` → both actions allowed; `productActions(2)` → neither
  - `canMerge`: same id → false, different unit → false, same unit and different id → true
  - `mergeIngredients`:
    - only `from` → replaced in place
    - both present (`[pomidor 200, x 50, pomidory 100]`) → `[pomidor 300, x 50]`
    - `[pomidory 100, pomidor 200]` → `[pomidor 300]` at index 0
    - neither → an equal list
    - the input array and objects are not mutated
    - `0.1 + 0.2` sums to `0.3`
  - `selectProductRows` sorts by `compareNames` and attaches the usage, defaulting to 0
- [X] T064 [P] [US3] Write `tests/data/product-repository-maintenance.test.ts` before the implementation:
  - **Merge**: in spec US3-1 with three Dishes, a merge returns `{ kind: 'merged', dishesUpdated: 3 }`, "pomidory" is gone, and usage of "pomidor" = 3. In US3-2, summed to 300.
  - **Merge refusals**: different units → `unitMismatch`; same id → `sameProduct`.
  - **Rename**:
    - "pomidr" → "pomidor" → `renamed`, with both Dishes resolving the new name through `productId`
    - "pomidory" → "Pomidor" while "pomidor" exists → `conflict` with `mergeAllowed: true`
    - a conflict with a different unit → `mergeAllowed: false`
    - "mleko" → "Mleko" (the same Product) → `renamed`
    - `"  "` → `invalid`
  - **Used Products**: `delete` and `changeUnit` on a Product used only by an archived Dish → `inUse` with `usage: 1`.
  - **Unused Products**: `delete` and `changeUnit` on unused Products → `deleted` / `changed`.
- [X] T065 [P] [US3] Write `tests/ui/products-vm.test.ts` before the implementation:
  - `dishCountPhrase(1) === "1 daniu"`, `(2) === "2 daniach"`, `(5) === "5 daniach"`, `(22) === "22 daniach"`
  - `deleteHint(3) === "Produkt jest używany w 3 daniach – nie można go usunąć."`
  - `unitHint(1) === "Produkt jest używany w 1 daniu – jednostki nie można zmienić."`
  - `mergeHint` is "Brak innych produktów z tą samą jednostką." when there are no candidates
  - `usageLabel(4) === "używany: 4"`

### Implementation for User Story 3

- [X] T066 [US3] Add `countProductUsage(dishes, detachedMealIngredientLists)`, `productActions(usage)`, `canMerge(from, into)`, `mergeIngredients(list, fromId, intoId)` and `selectProductRows(products, usage)` to `src/domain/products.ts`, per [contracts/domain-api.md](contracts/domain-api.md) and the "Derived values" table in [data-model.md](data-model.md). Merge rule, quoted: "replace `fromId` with `intoId`. If both are present, one Ingredient at the position of the first, amount = `roundTo2(a + b)`". Make T063 pass.
- [X] T067 [US3] Add `rename`, `changeUnit`, `delete` and `merge` to `src/data/product-repository.ts`, per [contracts/persistence-and-ports.md](contracts/persistence-and-ports.md):
  - Each runs in `db.transaction('rw', db.products, db.dishes, …)`.
  - Usage is recomputed inside the transaction with `countProductUsage(await db.dishes.toArray(), [])`. The `[]` stands for Detached Meals, which do not exist yet (research R13); add a `// TODO(week-planning)` comment pointing to R13.
  - `rename` uses `findNameConflict`, and the unique-index `ConstraintError` maps to `conflict`.
  - `merge` rewrites every Dish containing `fromId` with `mergeIngredients`, then deletes `fromId`.
  - Make T064 pass.
- [X] T068 [P] [US3] Create `src/ui/view-models/products.ts` with `dishCountPhrase(n)` (Polish locative: "1 daniu", otherwise "N daniach"), `usageLabel(n)`, `deleteHint(n)`, `unitHint(n)`, `mergeHint(hasCandidates)` and `renameConflictMessage(name)` ("Produkt „{name}” już istnieje."). Make T065 pass.
- [X] T069 [US3] Create `src/ui/pages/ProductsPage.tsx`:
  - Navbar "Produkty" with a back link. The list is `selectProductRows(products, countProductUsage(dishes, []))`, each row showing the name, `unitLabel(unit)` and `usageLabel(usage)`, wrapped in `.page-wide`.
  - Tapping a row opens a Framework7 `Actions` sheet with:
    - "Zmień nazwę": `f7.dialog.prompt` prefilled with the name, with Framework7's default buttons. On `conflict`:
      - when `mergeAllowed`, open `f7.dialog.confirm` with `renameConflictMessage(name)` followed by "Scalić „{from}” z „{name}”?". Confirming runs `merge(from, existing)`.
      - otherwise, open `f7.dialog.alert` with `renameConflictMessage(name)`.
    - "Zmień jednostkę": disabled with `unitHint` when used; otherwise a g/ml/szt. choice.
    - "Scal z innym produktem…": disabled with `mergeHint` when there are no same-unit candidates. Otherwise a picker of same-unit Products, then `f7.dialog.confirm` with "Scalić „{from}” z „{into}”? Wszystkie dania będą używać „{into}”." and Framework7's default buttons.
    - "Usuń": disabled with `deleteHint` when used. Otherwise `f7.dialog.confirm` with "Usunąć produkt „{name}”?" and Framework7's default buttons.
  - Disabled actions show their hint text below the label.
- [X] T070 [US3] Add the route `/products/` → `ProductsPage` to `dishesRoutes` in `src/ui/routes.ts`, and a "Produkty" navbar link (left side) to `/products/` in `src/ui/pages/DishLibraryPage.tsx` (FR-004).
- [X] T071 [P] [US3] Write `tests/ui/products-page.test.tsx`: with a seeded Product used by one Dish, opening its actions shows "Usuń" and "Zmień jednostkę" disabled, with "Produkt jest używany w 1 daniu – nie można go usunąć." visible.

**Checkpoint**: US3 works. Quickstart rows 7–8 pass.

---

## Phase 7: User Story 4 - Remove Dishes without breaking the plan (Priority: P3)

**Goal**: Deleting a Dish removes it for good when no Meal uses it, and archives it otherwise. In this feature the Meal count is always 0 (research R13).

**Independent Test**: Delete a Dish with a photo, and the record and file are gone. The archive path is covered by the use-case test with a faked Meal count of 1 (spec US4, quickstart note).

### Tests for User Story 4

- [X] T072 [US4] Add tests to `tests/domain/dishes.test.ts`: `decideDishRemoval(0) === 'delete'`, `decideDishRemoval(1) === 'archive'`, `decideDishRemoval(7) === 'archive'`.
- [X] T073 [P] [US4] Add tests to `tests/data/dish-repository.test.ts`: `archive(id)` sets `archived: true` and keeps every other field, and `deletePermanently(id)` removes the record.
- [X] T074 [P] [US4] Write `tests/app/delete-dish.test.ts` before the implementation:
  - with `countMealsUsingDish: async () => 0`, a Dish with a photo → `{ kind: 'deleted' }`, the record is gone, the photo file is gone, and its Products still exist
  - with `async () => 1` → `{ kind: 'archived' }`, the record has `archived: true`, the photo file is kept, and `selectLibrary` no longer returns it (SC-008)

### Implementation for User Story 4

- [X] T075 [P] [US4] Add `decideDishRemoval(mealCountUsingDish: number): 'delete' | 'archive'` to `src/domain/dishes.ts`. Make T072 pass.
- [X] T076 [P] [US4] Add `archive(id)` (via `db.dishes.update(id, { archived: true })`) and `deletePermanently(id)` to `src/data/dish-repository.ts`. Make T073 pass.
- [X] T077 [US4] Implement `deleteDish(deps: { dishes; photos; countMealsUsingDish }, dishId)` in `src/app/dishes.ts`:
  - `decideDishRemoval(await countMealsUsingDish(dishId))`
  - for `delete`: `deletePermanently`, then `photos.delete(photo)` if one exists, swallowing photo errors
  - for `archive`: `archive`
  - return the kind

  Make T074 pass.
- [X] T078 [US4] In `src/app/deps.ts`, add `countMealsUsingDish: (dishId: string) => Promise<number>`, wired to `async () => 0`, with a comment: "No Meals exist until the Week planning feature; see specs/001-shell-products-dishes/research.md R13". Add the same default in `tests/ui/render.tsx`.
- [X] T079 [US4] In `src/ui/pages/DishFormPage.tsx` (edit mode only), add a red "Usuń danie" button at the bottom. It opens `f7.dialog.confirm("Usunąć danie „{nazwa}”?")` with Framework7's default buttons. On confirm it calls `deleteDish`, then `router.back()`. On cancel nothing changes (US4-3).

**Checkpoint**: All five stories work. Quickstart row 9 passes.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T080 [P] Create `src/dev/seed.ts`. It is imported only behind `if (import.meta.env.DEV)` in `src/main.tsx`. It reads `?seed=products-N` or `?seed=dishes-N-photos-M` and replaces local data with deterministic fixtures:
  - Product names `Produkt 001…`, with the unit cycling g/ml/pcs.
  - Dish names `Danie 001…`, each with 5 Ingredients.
  - Photos drawn as solid-colour 1200×900 canvases passed through the real compressor.
  - Ids from a counter-based generator.

  Verify that `npm run build` output contains no `seed` code (SC-002, SC-003 spot checks).
- [ ] T081 [P] Review the ≥ 1024 px layout of `DishLibraryPage`, `DishFormPage` and `ProductsPage` against [contracts/ui.md](contracts/ui.md): the tabbar is at the top, the library is a card grid, forms and lists are centred in `.page-wide`, and no function is lost (FR-009, US5-5). Fix any gaps in `src/ui/styles/app.css`.
- [ ] T082 [P] Run `grep -rniE "\b(item|recipe|przepis|template|entry)\b" src/` and rename any domain identifier that matches (Principle II). Confirm every user-facing string written in `src/ui/**` is Polish (Principle I). Framework7's default labels are exempt (plan.md deviation).
- [ ] T083 Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage` (100% on `src/domain/**`) and `npm run build`. Fix anything that fails.
- [ ] T084 Run every manual and performance check in [quickstart.md](quickstart.md) on an iPhone (current iOS Safari) and an Android phone (Chrome), plus a desktop browser. Record the results, and any deviations, at the bottom of `specs/001-shell-products-dishes/quickstart.md`.
- [ ] T085 Resolve the open documentation and spec-wording items in [analysis-followups.md](analysis-followups.md): M5, L6 and L7 in `contracts/` and `plan.md`; L1, L3, L4 and L5 in `spec.md`. Tick each item there with a note on how it was resolved. Leave L2 open, because it carries over to the Week planning feature. Change only documentation, plus `src/app/dishes.ts` if L7 shows the photo reference id is not taken from `deps.ids.next()`.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → user story phases → **Polish (Phase 8)**.
- **US5 (Phase 3)** has to come first among the stories, because it creates `AppShell`, `routes.ts`, `main.tsx` and the layout CSS that every page uses.
- **US1 (Phase 4)** depends on US5. **US2, US3 and US4** each depend on US1 (Dish form, library and repositories), but not on each other:
  - US2 touches the photo parts of `DishFormPage`, `DishLibraryPage` and `saveDish`.
  - US3 touches `products.ts`, `product-repository.ts` and `ProductsPage`.
  - US4 touches `decideDishRemoval`, the dish repository's delete methods and `deleteDish`.
- **Shared files between stories**: US2 (T061), US4 (T079) and US1 all edit `src/ui/pages/DishFormPage.tsx`. US2 (T062) and US3 (T070) both edit `DishLibraryPage.tsx`. Run these tasks one after another if the stories are worked on together.

### Within each story

- Tests marked "before the implementation" are written first and must fail before their implementation task.
- Domain → repository → use case → deps wiring → view-model → components → pages → routes.

### Parallel opportunities

- **Setup**: T003, T004 and T005 in parallel after T002.
- **Foundational**: T006, T007 and T008 (tests) in parallel. Then T010, T011 and T012 in parallel after T009. T014 and T016 in parallel, then T015 after T013 and T014.
- **US5**: T019, T020, T021 and T022 in parallel.
- **US1**: tests T028–T033 all in parallel. T034, T035 and T037 in parallel. T040 and T041 in parallel. T046 and T047 in parallel.
- **US2**: tests T048–T051 in parallel. T052, T053, T054, T055 and T057 in parallel.
- **US3**: tests T063, T064 and T065 in parallel. T068 in parallel with T066 and T067.
- **US4**: T073 and T074 in parallel. T075 and T076 in parallel.
- **Across stories**: once US1 is done, US2, US3 and US4 can proceed in parallel, apart from the shared page files listed above.

---

## Parallel Example: User Story 1

```text
# Write all US1 tests together:
Task: "T028 tests/domain/products-catalog.test.ts"
Task: "T029 tests/domain/dishes.test.ts"
Task: "T030 tests/data/product-repository.test.ts"
Task: "T031 tests/data/dish-repository.test.ts"
Task: "T032 tests/app/save-dish.test.ts"
Task: "T033 tests/ui/dish-form-vm.test.ts"

# Then the independent implementations together:
Task: "T034 src/domain/products.ts (catalog functions)"
Task: "T035 src/domain/dishes.ts (draft + validation + library)"
Task: "T037 src/data/dish-repository.ts"
```

## Parallel Example: User Story 2

```text
Task: "T052 src/domain/placeholder.ts"
Task: "T053 src/domain/photo-size.ts"
Task: "T054 src/adapters/opfs-photo-store.ts"
Task: "T055 src/adapters/canvas-image-compressor.ts"
Task: "T057 src/app/photos.ts"
```

---

## Implementation Strategy

### MVP first (US5 + US1)

1. Phase 1 Setup, then Phase 2 Foundational. Lint, typecheck and the coverage gate pass.
2. Phase 3 (US5): the shell installs and runs offline.
3. Phase 4 (US1): Dishes and Products can be created and edited.
4. **Stop and validate** with quickstart rows 1–4 and 10–11 on a real phone. This is the first usable build: Dishes can be entered.

### Incremental delivery

1. Add US2 (photos and placeholder), then validate quickstart rows 5–6.
2. Add US3 (Produkty clean-up), then validate rows 7–8.
3. Add US4 (delete and archive), then validate row 9 and the `deleteDish` tests.
4. Phase 8 Polish, then the full quickstart run on iOS, Android and desktop.

### Handoff to the Week planning feature

- Replace `countMealsUsingDish` in `src/app/deps.ts` with a Meal repository query.
- Replace the `[]` Detached Meal input in `src/data/product-repository.ts` (the `TODO(week-planning)` comment) and in `ProductsPage`.
- Extend the merge transaction to the `meals` table.
- Count Detached Meals in the Produkty usage hints (`src/ui/view-models/products.ts`), per item L2 in [analysis-followups.md](analysis-followups.md).
