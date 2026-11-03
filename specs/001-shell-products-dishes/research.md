# Research: App Shell, Products and Dishes

Phase 0 output for [plan.md](plan.md). Each entry resolves an open question from the Technical Context.

## R1. Toolchain versions

- **Decision**: Node 24 LTS, TypeScript 5.x (`strict`), React 19, Framework7 9.x with `framework7-react`, Vite (current major), `vite-plugin-pwa`, Dexie 4 with `dexie-react-hooks`, Vitest with `@vitest/coverage-v8`, `fake-indexeddb`, Testing Library with jsdom, ESLint (flat config). Exact versions are pinned in `package.json` at scaffold time.
- **Rationale**: These are the stack elements required by the constitution's Technology Constraints, at the latest stable majors. Framework7 9 is current (its type definitions are published for 9.0.x).
- **Alternatives considered**: Pinning older majors, rejected because nothing in this greenfield repo depends on them.

## R2. Enforcing the functional core

- **Decision**: All domain logic goes in `src/domain/`. ESLint `no-restricted-imports` blocks `react`, `framework7*`, `dexie*` and any path outside `src/domain/` inside that folder. `no-restricted-globals` and `no-restricted-properties` block `Date.now`, argument-less `new Date()` (via `no-restricted-syntax`), `Math.random`, `crypto`, `navigator`, `window` and `document` there. Vitest coverage thresholds of 100% (lines, branches, functions, statements) apply to `src/domain/**`.
- **Rationale**: Principle IV is non-negotiable. A lint rule makes violations fail CI rather than relying on review.
- **Alternatives considered**: A separate workspace package for the domain. Rejected as more setup than a single app needs (Principle V). The lint boundary gives the same guarantee.

## R3. Name normalisation, matching and sorting

- **Decision**:
  - `normalizeName(s)` = `s.normalize('NFC').trim()`, plus collapsing internal runs of whitespace to one space.
  - `nameKey(s)` = `normalizeName(s).toLowerCase()`. This is the uniqueness key for Products and the matching key for autocomplete.
  - Autocomplete: `nameKey(product.name).includes(nameKey(query))`.
  - Alphabetical order: one module-level `Intl.Collator('pl', { sensitivity: 'base', numeric: true })`, with ties broken by `id` so the order is total.
- **Rationale**:
  - `String.prototype.toLowerCase()` uses Unicode default case mapping and does not depend on locale, so "ŁOSOŚ" → "łosoś" in every environment.
  - Using no diacritic folding matches the spec ("losos" must not match "łosoś").
  - The constitution forbids *implicit* locale. The collator names `'pl'` explicitly, and Node ships full ICU by default, so tests and browsers sort the same way.
  - NFC stops visually identical names (composed vs decomposed "ś") from becoming two Products.
- **Alternatives considered**:
  - `toLocaleLowerCase('pl')`: unnecessary, since default mapping already handles Polish letters.
  - `localeCompare` with no locale: implicit locale, which is forbidden.
  - A custom Polish alphabet table: reinvents ICU.

## R4. Decimal input and rounding

- **Decision**:
  - `parseDecimal(text)` accepts optional surrounding spaces, digits, and at most one `,` or `.` separator. It accepts an optional leading `-`, so a negative entry gets a specific message rather than "not a number". It rejects `+`, exponents, thousands separators and empty input.
  - Every user-entered number (Ingredient amount, Servings yield, Macros) and every computed sum (merge) is rounded with `roundTo2` (half away from zero, applied via `Math.round(x * 100) / 100` with an epsilon correction). This happens in the domain before storage.
  - The domain validates amount > 0, Servings yield > 0 and Macros ≥ 0.
- **Rationale**: Principle IV requires rounding at defined points in the domain. Two decimals are enough for g, ml, pcs (0.5 szt.), Servings (2.5) and Macros, and stop merge sums from drifting (0.1 + 0.2).
- **Alternatives considered**:
  - Integers only: rejected by the spec's decimal edge case.
  - Storing strings: pushes parsing into every consumer.
  - A decimal library: more than this precision needs.

## R5. Placeholder colour and initials

- **Decision**:
  - Hash: 32-bit FNV-1a over the code points of `normalizeName(name)` (case preserved), using `Math.imul`.
  - Colour: `PALETTE[hash % PALETTE.length]`, where `PALETTE` is a fixed list of 12 hex colours, each with a WCAG contrast ratio ≥ 4.5:1 against white text. A domain test asserts that ratio for every entry.
  - Initials: split the normalised name on whitespace, take words whose first code point matches `/[\p{L}\p{N}]/u`, then take the first code point of the first two such words, uppercased. If none qualify, return `"•"`.
- **Rationale**:
  - FNV-1a is tiny, deterministic and has no dependency, which satisfies SC-005 across devices.
  - A fixed, pre-checked palette satisfies FR-033 (legible initials) in a way a test can prove. Deriving an HSL hue cannot guarantee that for yellows and greens.
  - Hashing the normalised but case-preserved name means a rename to different letter case may change the colour. That is acceptable, because the spec says "derived from the name".
- **Alternatives considered**:
  - HSL hue from the hash: fails contrast for some hues.
  - SHA-based hash via `crypto.subtle`: async, and forbidden in the domain.
  - Hashing `nameKey`: also valid. Rejected only to keep the input exactly "the name".

## R6. Photo storage (OPFS) on iOS

- **Decision**:
  - Store each photo as one file in the OPFS directory `photos/`, named `<photoId>.<ext>`. `photoId` is a new UUID each time a photo is set.
  - Write it with `FileSystemFileHandle.createWritable()` and read it with `getFile()`, both behind the `PhotoStore` port.
  - On startup, a sweep deletes files in `photos/` whose id no Dish references. This cleans up after crashes between the photo write and the Dish write.
- **Rationale**:
  - OPFS is available in Safari since 15.2. `createWritable()` (the File System WritableStream API) shipped in Safari 26, which is the "current iOS Safari" the spec supports. Chrome has supported it for years. So the main thread can write directly, with no worker.
  - A new id per photo means a stale cached object URL never shows an old image, and the old file can be deleted after the Dish save commits.
  - IndexedDB and OPFS cannot share one transaction, so the order is: write the new photo, commit the Dish, then delete the old photo, with the sweep as a backstop.
- **Alternatives considered**:
  - A worker using `createSyncAccessHandle()`: only needed for Safari before 26, which is out of the supported range. It can be added later behind the same port if needed.
  - Blobs in IndexedDB: would contradict the stack in SPEC.md and the constitution, and need an ADR.

## R7. Photo compression format

- **Decision**:
  - The `ImageCompressor` adapter decodes the file with `createImageBitmap`, using `imageOrientation: 'from-image'` so EXIF rotation is applied.
  - It draws the image to a canvas sized by the domain's `fitWithin(w, h, 800)`, then calls `toBlob('image/webp', 0.8)`.
  - **If the returned blob's `type` is not `image/webp`** (Safari silently falls back to PNG), it re-encodes with `toBlob('image/jpeg', 0.8)`.
  - The file extension follows the actual MIME type.
- **Rationale**:
  - Safari decodes WebP but does not encode it from canvas, and returns PNG without any error. A PNG at 800 px would miss SC-007's size target, while JPEG at 0.8 meets it.
  - Chrome on Android and desktop still produces WebP as SPEC.md asks.
- **Alternatives considered**:
  - A WebAssembly WebP encoder (`@jsquash/webp`): adds a large dependency and a WASM asset for a marginal size gain on iOS. Rejected under Principle V.
- **Follow-up (done)**: SPEC.md now reads "WebP, or JPEG where the browser cannot encode WebP". This is a format detail, not a scope change.

## R8. PWA: install, offline, updates

- **Decision**:
  - `vite-plugin-pwa` with `strategies: 'generateSW'`, precaching all build output (`js, css, html, svg, png, woff2, webmanifest`), `navigateFallback: 'index.html'` and no `runtimeCaching`.
  - Manifest:
    - `name: "Planer posiłków"`, `short_name: "Planer"`, `lang: "pl"`
    - `display: "standalone"`, `start_url: "/"`, `scope: "/"`, plus theme and background colours
    - icons at 192 and 512, plus a 512 maskable icon
  - `index.html` adds `apple-touch-icon` (180 px), `apple-mobile-web-app-capable` and `viewport-fit=cover`.
  - Updates: `registerType: 'prompt'` with no prompt UI and no `skipWaiting`. A new service worker activates once all app windows are closed, so the next start runs the new version.
  - Framework7 icon fonts are bundled from `node_modules`, with no CDN.
- **Rationale**:
  - Precaching everything gives full offline use after the first load (FR-006, SC-004).
  - No runtime caching and no external assets keeps the app off the network at runtime (FR-007).
  - Waiting for windows to close avoids swapping code under an unsaved Dish form. It meets the assumption "picked up at the latest on the next start".
- **Alternatives considered**:
  - `autoUpdate` with forced reload: can discard form input.
  - A visible "update available" prompt: UI the spec does not ask for.

## R9. Persistent storage request

- **Decision**: At startup, `main.tsx` calls `navigator.storage?.persist?.()` once, fire-and-forget, inside the `requestPersistentStorage` adapter. The result is not shown to the user in this feature.
- **Rationale**: FR-008 and SPEC.md's data safety section. Showing the result belongs with the Ustawienia and backup feature.
- **Alternatives considered**: Asking only after the first Dish is saved. Rejected because SPEC.md says "on startup".

## R10. UI layout: tabs, navigation, desktop width

- **Decision**:
  - One Framework7 `App` with a `Views tabs` layout of four tab `View`s (Tydzień, Dania, Lista zakupów, Ustawienia), each with its own router history and a bottom `Toolbar tabbar`.
  - The Dania view's routes:
    - `/dishes/` (library)
    - `/dishes/new/`
    - `/dishes/:dishId/`
    - `/products/`
  - Desktop (≥ 1024 px):
    - The tabbar moves to the top through a CSS media query.
    - The library becomes a responsive card grid.
    - Forms and the Product list get a `max-width` and stay centred.
  - Framework7 master-detail routing is **not** used.
- **Rationale**:
  - Per-tab views keep each tab's back stack, which is the native-feeling mobile pattern.
  - FR-009 only requires the same functions in a wider layout, and SPEC.md says other tabs "reuse the mobile screens in a wider layout".
  - Master-detail routing has known pitfalls in the framework integrations, such as links opening in the wrong pane and back-navigation errors. It is not needed here.
- **Alternatives considered**:
  - Master-detail with `masterDetailBreakpoint: 1024`: more polish, more risk, not required.
  - A single View with tab routes: loses per-tab history.

## R11. Product picker (autocomplete)

- **Decision**: A custom `ProductPicker` component with a text input and a Framework7 list of suggestions, which renders `suggestProducts(products, query)` from the domain. When `shouldOfferCreate(products, query)` is true, it shows a last row "Dodaj „{name}”". Choosing that row opens a sheet with a segmented unit control (g preselected) and "Dodaj" and "Anuluj" buttons. Picking a Product already in the Dish scrolls to and focuses that Ingredient's amount field.
- **Rationale**:
  - Framework7's Autocomplete is imperative and owns its own filtering, which would put matching logic outside the domain (Principle IV, thin components).
  - With 500 Products, synchronous filtering takes well under 100 ms (SC-002), so no debounce is needed.
- **Alternatives considered**: Framework7 Autocomplete in dropdown mode. Rejected for the reason above.

## R12. Persistence shape and transactions

- **Decision**:
  - Dexie database `planner`, version 1, with two tables: `products` and `dishes`.
  - Ingredients are embedded in the Dish record as an ordered array.
  - Usage counts and merges are computed in the domain over all Dishes, loaded in one read.
  - Product rename, merge, delete and unit change each run in one `rw` transaction over `products` and `dishes`, re-checking their preconditions inside the transaction.
  - The unique index `&nameKey` enforces FR-013 at the storage level as well.
- **Rationale**:
  - At the expected scale (hundreds of Dishes, about 500 Products), a full scan is at most a few milliseconds and avoids a denormalised `productIds` index that would need its own invariant.
  - Rechecking preconditions inside the transaction closes the gap between the UI reading "usage 0" and the write (for example, a second tab adding the Product meanwhile).
- **Alternatives considered**:
  - A separate `ingredients` table: more joins, with no query that needs it.
  - A multiEntry index on product ids: premature at this scale.

## R13. Meal-dependent rules before Meals exist

- **Decision**:
  - Domain functions take Meal data as plain inputs:
    - `decideDishRemoval(mealCountUsingDish)`
    - `countProductUsage(dishes, detachedMealIngredientLists)`
    - `mergeIngredients(list, fromId, intoId)`, applied to any Ingredient list
  - The `deleteDish` use case takes a `countMealsUsingDish(dishId)` function dependency. In this feature it is wired to `async () => 0`, and Detached Meal Ingredient lists are wired to `[]`.
  - The Week planning feature replaces both with Meal repository queries, and extends the merge transaction to the `meals` table.
- **Rationale**:
  - The spec defines these rules now (FR-017, FR-021, FR-022, FR-034), but Principle V forbids building Meal storage early.
  - Plain inputs keep the rules fully tested now. Domain tests and a use-case test with a fake count of 1 cover the archive path.
- **Alternatives considered**:
  - Creating a `meals` table now: designs Meal storage before its feature.
  - A `MealReferences` port interface: more ceremony than one function dependency.

## R14. Testing approach for UI

- **Decision**:
  - Component tests (Testing Library + jsdom) cover only the key interactions:
    - Dish form validation blocks save and marks the field
    - ProductPicker suggests, offers create and handles duplicates
    - Product actions are disabled when the Product is used
  - Components render inside a small test wrapper that initialises Framework7 React.
  - View-model functions (`src/ui/view-models/`) map domain results to display data and Polish messages. They are tested as plain functions.
- **Rationale**: The constitution limits component tests to key interactions. Pushing mapping logic into view-models keeps components thin and keeps most UI behaviour testable without jsdom.
- **Alternatives considered**: Playwright end-to-end tests. Not required by the constitution, and they cannot run deterministically offline in CI as simply. The manual checks in [quickstart.md](quickstart.md) cover installation and offline use.

## Sources

- [WebKit bug 231706 (Safari 26 notes: File System WritableStream API)](https://bugs.webkit.org/show_bug.cgi?id=231706)
- [web.dev: The origin private file system](https://web.dev/opfs)
- [DEV: Ask canvas for a WebP in Safari and you silently get a PNG](https://dev.to/harshit_katheria/ask-canvas-for-a-webp-in-safari-and-you-silently-get-a-png-5hn6)
- [Framework7 9.0.3 View type definitions](https://app.unpkg.com/framework7@9.0.3/files/components/view/view.d.ts)
- [Framework7 forum: master-detail links not routing to detail](https://forum.framework7.io/t/urgent-help-needed-master-detail-view-links-in-master-not-routing-to-detail-view/9239)
- [Framework7 forum: master-detail router error](https://forum.framework7.io/t/master-detail-router-error/10869)
