# Meal Planner Constitution

Source documents: `docs/SPEC.md` (product contract), `GLOSSARY.md` (domain language) and
`docs/adr/` (architecture decisions). This constitution sets no standards beyond those documents
and the principles below.

## Core Principles

### I. English Code, Polish UI

- All code, identifiers, comments and commit messages MUST be in English.
- User-facing strings MUST be in Polish and written inline. No i18n library is used.

Rationale: the product is used only in Polish, while English code stays readable to tools and
contributors.

### II. Glossary-Bound Domain Language

- Domain terms in code, specs, plans and tasks MUST match `GLOSSARY.md` exactly: Product,
  Ingredient, Dish, Archived Dish, Week, Slot, Added Slot, Meal, Linked Meal, Detached Meal,
  Servings, Macros, Daily Goal, Weekly Goal, Planned, Shopping List, Adjustment, Extra.
- Terms listed under `_Avoid_` in the glossary MUST NOT be used as identifiers.
- A new domain concept MUST be added to `GLOSSARY.md` before it appears in code or specs.

Rationale: in this domain, "meal" or "slot" can mean several things, so one fixed vocabulary
keeps the code from drifting away from the model.

### III. Single-User, Local-Only

- One install serves one person (see ADR 0001).
- The app MUST NOT use a backend, accounts, sync or any runtime network call. All data lives on
  the device (IndexedDB via Dexie, photos in OPFS).
- Entity IDs MUST be UUIDs, so sync can be added later without migrating data.

Rationale: shared meals are too rare to justify the cost of a backend.

### IV. Deterministic Testability (NON-NEGOTIABLE)

As much of the code as possible MUST be testable deterministically. The rules below apply to all
code.

- **Functional core, imperative shell.** All domain logic MUST live as pure TypeScript functions
  in a framework-free domain module. That includes:
  - Servings scaling
  - Linked and Detached Meal resolution
  - Shopping List aggregation with Adjustments and rounding
  - Unit formatting (g→kg, ml→l, pcs rounded up)
  - Day and week summaries against goals
  - Week date math and Slot count per day
  - Copy to next Week
  - Product merge
  - Placeholder color from a name hash

  The domain module MUST NOT import React, Framework7, Dexie, OPFS or DOM APIs.
- **No hidden nondeterminism in the core.** The core MUST NOT call:
  - `Date.now()` or `new Date()` without arguments
  - `crypto.randomUUID()` or `Math.random()`
  - anything that depends on the implicit timezone or locale

  The current date, ID generation and similar inputs MUST be passed in explicitly or injected
  through small interfaces (for example `Clock`, `IdGenerator`). Tests use fixed fakes.
- **Calendar dates as values.** The domain MUST represent dates as local calendar dates (ISO
  `YYYY-MM-DD` strings), not `Date` objects, so week math does not depend on timezone or DST.
- **Explicit numerics.** Rounding and formatting rules MUST be defined in domain functions and
  covered by tests. Floating-point results are rounded at defined points in the domain, never in
  display code.
- **I/O behind interfaces.** These MUST sit behind interfaces with in-memory fakes for tests:
  - persistence (repositories over Dexie)
  - photo storage (OPFS)
  - image compression
  - sharing and clipboard

  Dexie repositories MUST have integration tests against `fake-indexeddb`.
- **Thin components.** React components MUST only render data produced by pure selector or
  view-model functions and dispatch to domain or repository functions. Components MUST NOT compute
  derived values inline.
- **Test hygiene.** Tests run on Vitest and MUST NOT:
  - use the network
  - use real timers (fake timers only where needed)
  - depend on execution order

  Fixtures and seeds MUST be fixed. Component tests (Testing Library, jsdom) cover key
  interactions only.
- **Coverage gate.** The domain module MUST reach 100% line and branch coverage, enforced in the
  test configuration. Domain tests are written together with or before the implementation, and
  every feature's `tasks.md` MUST include them.
- **Isolated adapters.** Code that cannot be tested deterministically MUST be kept minimal and
  isolated in adapters. Examples: real OPFS access, canvas image compression, drag-and-drop
  gestures, Web Share.

Rationale: the app's value depends on correct numbers, namely shopping amounts and Macro totals.
Pure, deterministic logic can be fully verified without a browser.

### V. Simplicity and MVP Scope

- Only behavior described in `docs/SPEC.md` is built. Anything in its "Out of scope" section
  requires a spec change first.
- No state-management library is used beyond Dexie live queries (`useLiveQuery`).
- Any added complexity MUST be justified in the feature's plan.

Rationale: this is a personal tool, and every extra abstraction is maintenance the user carries
alone.

## Technology Constraints

- **Stack:** TypeScript, React, Framework7, Vite, `vite-plugin-pwa`, Dexie + `dexie-react-hooks`,
  OPFS, dnd-kit (desktop drag and drop), Vitest. Changing a stack element requires an ADR.
- **Delivery:** a static site on Cloudflare Pages that is installable as a PWA and works offline.
- **Data safety:** `navigator.storage.persist()` on startup, and JSON export/import of all data
  including photos.

## Development Workflow

- Every feature goes through specify → clarify → plan → tasks → analyze → implement → converge.
- `docs/SPEC.md` is the living product-level contract and MUST be updated when scope changes.
- Feature spec directories are immutable records of what was built.
- A decision that is hard to reverse, would surprise a future reader and came from a real
  trade-off MUST be recorded as an ADR in `docs/adr/`.
- A feature is done only when its domain tests pass at the coverage gate and the plan's
  Constitution Check passes.

## Governance

- This constitution supersedes other practices. Plans MUST pass a Constitution Check against
  these principles, and any deviation MUST be listed and justified in the plan.
- Amendments are made through `/speckit-constitution`, recorded with a Sync Impact Report and
  versioned semantically:
  - MAJOR: a principle is removed or redefined
  - MINOR: a principle or section is added or materially expanded
  - PATCH: clarifications

**Version**: 1.0.1 | **Ratified**: 2026-11-03 | **Last Amended**: 2026-11-04
