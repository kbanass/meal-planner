# Implementation Plan: App Shell, Products and Dishes

**Branch**: `001-shell-products-dishes` | **Date**: 2026-11-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-shell-products-dishes/spec.md`

## Summary

This feature builds the installable, offline PWA shell with four tabs (three of them placeholders), plus the Dania tab with the Dish library, the Dish form, Dish photos with a deterministic placeholder, and the Produkty section for renaming, merging, deleting and changing the unit of Products.

The rules all live in a pure `src/domain/` module at 100% coverage:
- name normalisation and matching
- decimal parsing and rounding
- usage counts
- merging Ingredients
- Dish validation
- placeholder colour and initials
- photo sizing

Dexie repositories and small use-case functions apply those rules transactionally. OPFS stores the photos. Thin Framework7 React screens render view-model output.

Rules that involve Meals (usage, merge, archiving) take Meal data as plain inputs. In this feature those inputs are wired to "no Meals", so Week planning can plug in later without changing the rules (see [research.md](research.md) R13).

## Technical Context

**Language/Version**: TypeScript 5.x (`strict`) on Node 24 LTS for tooling. Browser target: current iOS Safari (26+), Android Chrome, and desktop Chrome, Edge, Firefox and Safari (R1).

**Primary Dependencies**: React 19, Framework7 9 + `framework7-react` + Framework7 Icons, Vite, `vite-plugin-pwa`, Dexie 4 + `dexie-react-hooks` (R1).

**Storage**: IndexedDB through Dexie (`products`, `dishes`). Dish photos in OPFS under `photos/` (R6, R12, [data-model.md](data-model.md)).

**Testing**: Vitest with v8 coverage (100% gate on `src/domain/**`), `fake-indexeddb` for repositories and use cases, Testing Library + jsdom for key component interactions only (R14).

**Target Platform**: Static PWA hosted on Cloudflare Pages, installable on iOS and Android home screens, fully offline after the first load (R8).

**Project Type**: Single-project, client-only web application (mobile-first PWA).

**Performance Goals**: Autocomplete updates within 100 ms with 500 Products (SC-002). The library opens within 1 s with 200 Dishes, 100 of them with photos (SC-003).

**Constraints**:
- No runtime network calls (FR-007).
- Photos at most 800 px on their longest edge, under 10% of the original size (SC-007).
- Polish UI with inline strings, English code.
- No state library beyond `useLiveQuery`.

**Scale/Scope**: One user, up to roughly 500 Products and a few hundred Dishes. Five screens: the shell, Dish library, Dish form, Produkty, and the placeholder pages.

All Technical Context unknowns are resolved in [research.md](research.md). There are no remaining NEEDS CLARIFICATION items.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / constraint | How this plan complies | Pre | Post |
|---|---|---|---|
| I. English code, Polish UI | Identifiers in English. All strings we write are Polish and inline ([contracts/ui.md](contracts/ui.md)). No i18n library. Framework7's default labels are a justified deviation (see Complexity Tracking) | ⚠️ | ⚠️ |
| II. Glossary-bound language | Types and identifiers use Product, Ingredient, Dish, Archived Dish (`archived`), Macros, Servings (`servingsYield`). No avoided terms (item, recipe, template) as identifiers. No new domain terms, since usage count, placeholder and photo reference are UI or technical concepts | ✅ | ✅ |
| III. Single-user, local-only | No backend. IndexedDB + OPFS only. UUIDs through `IdGenerator`. The service worker has no runtime caching of external origins (R8) | ✅ | ✅ |
| IV. Functional core / imperative shell | Every rule listed for this feature (normalisation, merge, usage, validation, placeholder hash, photo sizing) is in `src/domain/` ([contracts/domain-api.md](contracts/domain-api.md)) | ✅ | ✅ |
| IV. No hidden nondeterminism | Lint bans `Date.now`, argument-less `new Date`, `Math.random`, `crypto`, DOM globals and framework imports in `src/domain/` (R2). Collator locale is explicit `'pl'` (R3) | ✅ | ✅ |
| IV. Calendar dates as values | Not applicable. This feature stores no dates | ✅ | ✅ |
| IV. Explicit numerics | `parseDecimal` and `roundTo2` in the domain. Merge sums are rounded in the domain (R4) | ✅ | ✅ |
| IV. I/O behind interfaces | `ProductRepository`, `DishRepository` (tested with `fake-indexeddb`), `PhotoStore`, `ImageCompressor`, `IdGenerator`, `RequestPersistentStorage`, all with fakes ([contracts/persistence-and-ports.md](contracts/persistence-and-ports.md)). Sharing and clipboard are not used in this feature | ✅ | ✅ |
| IV. Thin components | Components render the output of `selectLibrary`, `selectProductRows`, `placeholderFor` and view-models. Messages are mapped from error codes in `src/ui/view-models/` | ✅ | ✅ |
| IV. Test hygiene and coverage gate | Vitest with no network, no real timers and fixed fixtures. 100% threshold on `src/domain/**`. Domain tests are listed per function in the contract and will be required in `tasks.md` | ✅ | ✅ |
| IV. Isolated adapters | OPFS, canvas compression, `crypto.randomUUID`, `storage.persist` sit in `src/adapters/`, one small file each | ✅ | ✅ |
| V. Simplicity and MVP scope | Only SPEC.md behaviour. No Meal storage built early (R13). No master-detail routing (R10). No WASM encoder (R7). No standalone Product creation | ✅ | ✅ |
| Technology constraints | The stack is exactly the constitution's list. `navigator.storage.persist()` on startup (R9). JSON export/import is deferred to the Ustawienia feature (out of this feature's scope) | ✅ | ✅ |
| Development workflow | Spec → plan done. `docs/SPEC.md` updated for the photo format, described in the next note | ✅ | ✅ |

**Gate result: PASS** before and after Phase 1, with one justified deviation from Principle I, recorded under Complexity Tracking.

**Note on SPEC.md**: SPEC.md says photos are stored as WebP. iOS Safari cannot encode WebP, so the plan uses WebP where the browser supports it and JPEG otherwise (R7). This is a format detail, not a scope change. Per the Development Workflow, SPEC.md has been updated (2026-11-03) to say "WebP, or JPEG where the browser cannot encode WebP".

## Project Structure

### Documentation (this feature)

```text
specs/001-shell-products-dishes/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R14
├── data-model.md        # Phase 1: types, validation, state transitions, Dexie schema
├── quickstart.md        # Phase 1: automated and manual validation
├── contracts/
│   ├── domain-api.md            # pure function signatures and required test cases
│   ├── persistence-and-ports.md # repositories, I/O ports, use cases
│   └── ui.md                    # tabs, routes, screens, Polish strings
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
index.html                 # viewport-fit, apple-touch-icon, apple-mobile-web-app-capable
vite.config.ts             # react + vite-plugin-pwa (generateSW, prompt, manifest)
vitest.config.ts           # jsdom for ui tests, 100% coverage thresholds on src/domain/**
eslint.config.js           # domain boundary rules (R2)
pwa-assets.config.ts       # icon generation from public/icons/icon.svg
public/icons/              # 180, 192, 512, 512-maskable
public/_headers            # Cloudflare Pages: no-cache for sw.js, index.html, manifest

src/
├── main.tsx               # requestPersistentStorage, sweepOrphanPhotos, render <App/>
├── domain/                # PURE, 100% coverage, no framework/I/O imports
│   ├── types.ts
│   ├── names.ts
│   ├── numbers.ts
│   ├── units.ts           # UNITS, isUnit
│   ├── products.ts
│   ├── dishes.ts
│   ├── placeholder.ts
│   ├── photo-size.ts
│   └── ports.ts           # IdGenerator
├── data/                  # Dexie + repositories
│   ├── db.ts
│   ├── ports.ts           # PhotoStore, ImageCompressor, errors
│   ├── product-repository.ts
│   └── dish-repository.ts
├── adapters/              # minimal, non-deterministic, outside the coverage gate
│   ├── opfs-photo-store.ts
│   ├── canvas-image-compressor.ts
│   ├── crypto-id-generator.ts
│   └── persist-storage.ts
├── app/                   # use cases
│   ├── dishes.ts          # saveDish, deleteDish
│   ├── photos.ts          # sweepOrphanPhotos
│   └── deps.ts            # wires real adapters + repositories (countMealsUsingDish → 0)
├── ui/
│   ├── App.tsx            # Framework7 App, Views tabs, tabbar
│   ├── routes.ts
│   ├── hooks/             # useDeps, useMediaQuery, usePhotoUrl (lazy, object-URL lifecycle)
│   ├── styles/app.css     # desktop layout (≥ 1024 px), avatars, ingredient rows
│   ├── view-models/       # error-code → Polish message, plural forms, product action hints
│   ├── components/        # DishAvatar, ProductPicker, IngredientRow, PlaceholderPage
│   └── pages/
│       ├── DishLibraryPage.tsx
│       ├── DishFormPage.tsx
│       └── ProductsPage.tsx
└── dev/seed.ts            # DEV-only fixture seeding (quickstart)

tests/
├── setup.ts               # fake-indexeddb, jest-dom matchers, jsdom stand-ins
├── domain/                # one file per domain module
├── data/                  # repositories on fake-indexeddb
├── app/                   # use cases on fake-indexeddb + fakes
├── ui/                    # view-models + key component interactions
└── fakes/                 # FixedIdGenerator, InMemoryPhotoStore, FakeImageCompressor, test-db.ts
```

**Structure Decision**: A single client-only Vite project. Code is split into layers in dependency order: `domain` (pure) ← `data` / `app` ← `ui`, with `adapters` injected through `app/deps.ts`. This is the smallest layout that keeps the functional core isolated and enforceable by lint (Principle IV) without a monorepo (Principle V).

## Implementation notes for /speckit-tasks

- **Order**:
  1. Scaffold and tooling: lint boundary, coverage gate and PWA config.
  2. Domain modules, test-first.
  3. Repositories and use cases.
  4. Shell (US5).
  5. Dish library and form (US1).
  6. Photos and placeholder (US2).
  7. Produkty (US3).
  8. Dish delete and archive (US4).
- **Merge and Meals**: Merge must be one transaction that also rechecks units. When the Week planning feature adds `meals`, it extends the same transaction and replaces the wired `countMealsUsingDish` and Detached Meal Ingredient inputs.
- **Lazy photos**: `usePhotoUrl` creates object URLs only for avatars in view (IntersectionObserver) and revokes them on unmount (SC-003).
- **Number formatting**: Numbers in the form are shown with a comma decimal separator through `draftFromDish`, which is a domain function, not `toLocaleString`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Principle I: Framework7's built-in default labels ("OK", "Cancel", "Back" in standard dialogs and back links) are shown in English. | Decided by the user on 2026-11-04: Polish UI is required for text we write, but Framework7's own short, widely understood labels may stay as shipped. This keeps standard dialogs (`f7.dialog.confirm`, `prompt`, `alert`) usable as-is. | Overriding every Framework7 default text, and building custom dialogs to get per-dialog button labels, adds code and upkeep for labels the user understands anyway. |
