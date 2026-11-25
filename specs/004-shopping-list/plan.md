# Implementation Plan: Shopping List

**Branch**: `004-shopping-list` | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-shopping-list/spec.md`

## Summary

The Lista zakupów tab stops being a placeholder. It shows the Week's live Shopping List: one row per Product the Week's Meals need, with the summed amount in shop units (kg, l, whole szt.). It has its own Week header (← / →, a swipe, "Udostępnij listę"). On each row the user can:
- tick it (bought: dimmed, moved down)
- mark it **At Home** with a house button (crossed out, moved down)
- tap the amount to type a different amount to buy (an **Adjustment**), shown as more or less than planned, with the plan's amount below

Extras are typed into the list and deleted by swiping. Sharing sends only what is left to buy.

**Approach** (see [research.md](research.md)):
- **Domain**: every rule is a pure function in `src/domain/shopping.ts` and `units.ts`, covered at 100%:
  - Planned amounts (summed unrounded, in a fixed order)
  - display rounding (kg/l, whole szt., never "0 g")
  - the two-part sorted list
  - the Adjustment save decision
  - "applies while the Planned amount is unchanged"
  - the merge rule for ticks and At Home marks
- **Storage**: Dexie version 3 adds `productListStates`, one record per Week and Product holding tick, At Home and Adjustment, and `extras` (R1).
- **Typed amounts expire by comparison, not by cleanup.** An Adjustment stores the Planned amount it was typed against and is ignored once the plan differs. No feature 001 or 002 write path needs to know about the Shopping List (R2).
- **Product maintenance**: merge, delete and unit change update the new table inside their existing transactions (R4).
- **Sharing** goes through a new `TextSharer` port: Web Share, falling back to the clipboard (R5).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`), Node 24 LTS for tooling. Browser targets are unchanged. Web Share (text) is in iOS Safari 12.2+ and installed iOS PWAs. The Clipboard API `writeText` is in all current browsers in a secure context (R5).

**Primary Dependencies**: React 19, Framework7 9.3 + `framework7-react` + Framework7 Icons (checkbox, swipeout, sheet, toast, `house` / `house_fill`, `square_arrow_up`, all in the lite bundle), Vite 8, `vite-plugin-pwa`, Dexie 4 + `dexie-react-hooks`. **No new dependencies** (R12).

**Storage**: IndexedDB through Dexie. Version 3 adds `productListStates` (`[weekStart+productId], weekStart, productId`) and `extras` (`id, weekStart`) ([data-model.md](data-model.md)). Existing tables are unchanged.

**Testing**: Vitest + v8 coverage (100% gate on `src/domain/**`), `fake-indexeddb` for the repositories and use cases, Testing Library + jsdom for the page's key interactions (S1–S11 in [contracts/ui.md](contracts/ui.md)), and a stubbed `navigator` for the sharer adapter (R11).

**Target Platform**: Static offline PWA on Cloudflare Pages. iPhone first, as the installed app and in Safari. The Android check stays deferred.

**Project Type**: Single-project, client-only web application (mobile-first PWA).

**Performance Goals**:
- The list appears in under 300 ms with 35 Meals over 100 Products and a year of Weeks stored (SC-002). Building it is linear and well under 1 ms (R8). The cost is the five indexed or small IndexedDB reads the Week page already makes.
- Ticks and At Home marks show at once: one small transaction per tap.

**Constraints**:
- No runtime network calls. Sharing hands text to local apps (FR-027).
- Dates as `IsoDate`, with the Week identified by its Monday.
- Rounding only in domain functions (`displayQuantity`, `roundTo2`).
- `navigator.share` called synchronously in the click handler (user activation, R5).
- Polish UI with inline strings.
- No state library beyond `useLiveQuery`.

**Scale/Scope**: One new page, one sheet, one repository, one port and adapter, one domain module, changes to `ProductRepository`, `db.ts`, `deps.ts`, `units.ts`, routes, CSS and the dev seed. Typically 10–40 rows per Week.

All Technical Context items are resolved in [research.md](research.md). There are no remaining NEEDS CLARIFICATION items.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / constraint | How this plan complies | Pre | Post |
|---|---|---|---|
| I. English code, Polish UI | Identifiers are English. Every string we write is Polish and inline ([contracts/ui.md](contracts/ui.md)). The share-failure alert shows Framework7's default "OK": the justified deviation carried over from features 001 and 002 (Complexity Tracking) | ⚠️ | ⚠️ |
| II. Glossary-bound language | `ShoppingList`, `Adjustment`, `Extra`, `atHome` (**At Home**), `Planned` (`plannedAmounts`, `planned`). The tick is a UI concept (`ticked`; SPEC.md's "checked state"). **At Home** was added to GLOSSARY.md and **Adjustment** redefined on 2026-11-17, before any code, as the principle requires. Avoided terms (override, correction, pantry, stock, have) aren't used as identifiers. "Item" names only UI rows (`ShoppingRow`), never a Product. The principle's term list names At Home since constitution v1.0.2 (2026-11-22) | ✅ | ✅ |
| III. Single-user, local-only | Only new IndexedDB tables. Extras get UUIDs from `IdGenerator`. State records use the natural key (Week Monday, Product UUID), which is stable across devices, like `daySlots` (R1). Sharing is a local OS hand-off, not a network call | ✅ | ✅ |
| IV. Functional core / imperative shell | The constitution's own list names "Shopping List aggregation with Adjustments and rounding" and "Unit formatting (g→kg, ml→l, pcs rounded up)". Both live in `src/domain/shopping.ts` and `units.ts` ([contracts/domain-api.md](contracts/domain-api.md)), and so do the save decision and merge rule | ✅ | ✅ |
| IV. No hidden nondeterminism | "Today" comes from `Clock` (page mount only). Extra ids come from `IdGenerator`. Sorting uses the existing explicit `Intl.Collator('pl')`. Meals are summed in id order, so float sums don't depend on IndexedDB order (R3) | ✅ | ✅ |
| IV. Calendar dates as values | `weekStart` is an `IsoDate`. Week math is `addDays` / `weekStartOf` / `weekRangeLabel` from feature 002 | ✅ | ✅ |
| IV. Explicit numerics | Sums are unrounded. Display goes through `displayQuantity` (g/ml whole, min 1; pcs `ceil(roundTo2)`). Stored amounts use `roundTo2`. Adjustment validity compares `roundTo2` values (R2, R3) | ✅ | ✅ |
| IV. I/O behind interfaces | `ShoppingRepository` and the `ProductRepository` changes on `fake-indexeddb`. `TextSharer` (Web Share and clipboard) with `RecordingTextSharer` ([contracts/persistence-and-ports.md](contracts/persistence-and-ports.md)) | ✅ | ✅ |
| IV. Thin components | The page renders `shoppingPage(…)` rows. The sheet renders a row's `fieldText` / `plannedText`. Taps dispatch to repository calls or `src/app/shopping.ts` | ✅ | ✅ |
| IV. Test hygiene and coverage | Fixed clock and ids, no real timers, shuffled order (already configured). Domain tests listed per function in the contract, required in `tasks.md` | ✅ | ✅ |
| IV. Isolated adapters | `web-text-sharer.ts` (about 15 lines) is the only new adapter. The header swipe's pointer wiring is a few lines in the page, with its decision in the pure `headerSwipeDelta` | ✅ | ✅ |
| V. Simplicity and MVP scope | Only SPEC.md behaviour, as updated by this feature's clarifications. No pruning of old Weeks, no editing of Extras, no follow-the-finger swipe, no "today" button, no new libraries | ✅ | ✅ |
| Technology constraints | Stack unchanged | ✅ | ✅ |
| Development workflow | Specify → clarify (5 questions, 2026-11-17) → plan. `docs/SPEC.md` (Shopping List section and the copy rule) and GLOSSARY.md were updated during clarify, because the user changed Adjustments' scope | ✅ | ✅ |

**Gate result: PASS** before and after Phase 1. The one deviation (Principle I, Framework7 default labels) is the existing one, recorded under Complexity Tracking.

**No ADR**: The storage shape (R1) and the expiry-by-comparison of Adjustments (R2) are local to this feature and easy to change while there is no sync or backup format. The At Home / Adjustment split is a product decision, recorded in the spec's Clarifications, GLOSSARY.md and SPEC.md. None meets the constitution's ADR bar.

## Project Structure

### Documentation (this feature)

```text
specs/004-shopping-list/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R12
├── data-model.md        # Phase 1: stored and derived types, transitions, Dexie v3
├── quickstart.md        # Phase 1: automated and manual validation
├── contracts/
│   ├── domain-api.md            # shopping.ts and units.ts, required test cases
│   ├── persistence-and-ports.md # ShoppingRepository, ProductRepository changes, TextSharer, use cases
│   └── ui.md                    # page, rows, amount sheet, view model, strings, component tests
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

New files are marked `+`, changed files `~`. Everything else is unchanged.

```text
src/
├── domain/                        # PURE, 100% coverage
│   ├── types.ts                 ~ # + Adjustment, ProductListState, Extra
│   ├── units.ts                 ~ # + displayQuantity, formatListAmount
│   └── shopping.ts              + # plannedAmounts, buildShoppingList, adjustment rules,
│                                  # applyStatePatch, mergeProductListStates
├── data/
│   ├── db.ts                    ~ # version(3): productListStates, extras
│   ├── ports.ts                 ~ # + TextSharer
│   ├── shopping-repository.ts   + 
│   └── product-repository.ts    ~ # merge / delete / changeUnit also update productListStates
├── adapters/
│   └── web-text-sharer.ts       + # navigator.share → clipboard fallback
├── app/
│   ├── deps.ts                  ~ # + shopping, sharer
│   └── shopping.ts              + # saveAdjustment, addExtra, shareList
├── ui/
│   ├── routes.ts                ~ # shoppingRoutes → ShoppingListPage; placeholder() removed
│   ├── styles/app.css           ~ # list Week card, rows, ticked / At Home / more / less looks
│   ├── view-models/shopping.ts  + # shoppingPage, shareText, headerSwipeDelta, strings
│   ├── components/
│   │   ├── AmountSheet.tsx      + 
│   │   ├── ShoppingRow.tsx      + # Product and Extra rows (tick label, amount, house, swipeout)
│   │   └── PlaceholderPage.tsx  − # no tab uses it any more
│   └── pages/
│       └── ShoppingListPage.tsx + 
└── dev/seed.ts                  ~ # weeks-N: 100 distinct Products in the current Week; clears
                                   # and seeds productListStates and extras

tests/
├── domain/   + shopping; ~ units
├── data/     + shopping-repository; ~ product-repository-maintenance, week-repository (FR-031)
├── app/      + shopping (saveAdjustment, addExtra)
├── adapters/ + web-text-sharer (stubbed navigator)
├── ui/       + shopping-page, shopping-vm; ~ app-shell, render.tsx (createTestDeps)
└── fakes/    + recording-text-sharer.ts
```

**Structure Decision**: The same single client-only Vite project and layering as features 001–003: `domain` (pure) ← `data` / `app` ← `ui`, with adapters injected through `app/deps.ts`. The new code slots into the existing folders. `tests/adapters/` is new because this is the first adapter with logic worth a unit test (the `AbortError` and fallback branches). It runs in the node project with a stubbed `navigator`.

## Implementation notes for /speckit-tasks

- **Order**:
  1. Domain, test-first: `units.ts` (`displayQuantity`, `formatListAmount`), then `shopping.ts` (planned amounts → list building → adjustment rules → patch → merge).
  2. Dexie v3, `ShoppingRepository`, `TextSharer` port, adapter and fake, deps.
  3. US1: the page, the Week header and navigation, the view model, the route. Remove the placeholder and update the app-shell test.
  4. US2: ticks.
  5. US3: At Home.
  6. US4: the amount sheet and `saveAdjustment`.
  7. US5: Extras.
  8. US6: sharing.
  9. Product maintenance (merge, delete, unit change).
  10. The dev seed.
  11. iPhone run ([quickstart.md](quickstart.md)).
- **Seed**: `replaceData` must also clear `productListStates` and `extras`, or old records would survive a reseed. `weeks-N` needs at least 100 distinct Products in the current Week for SC-002. That means more Products than `SEED_PRODUCTS_FOR_DISHES` (50) or spread Ingredients, while keeping the existing `dishes-N` fixture's behaviour.
- **Share call**: don't `await` anything before `deps.sharer.share(...)` in the click handler. Build the text from the rendered model (R5).
- **Sheets**: one `AmountSheet` per page, with the target row's `productId` in state. Look the row up in the live model at render and save time, so `planned` is current (contracts/ui.md).
- **Swipeout and the header swipe** don't overlap: the swipe handlers sit only on the header card. Check on the iPhone that a row swipe doesn't scroll the page sideways and that the system back swipe from the edge still works.
- **iPhone check**: test every story at 375 pt with an iOS user agent before calling it done, then on the device (project memory: Framework7 native patterns).
- **Constitution PATCH**: done. v1.0.2 (2026-11-22) adds At Home to Principle II's term list.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Principle I: Framework7's built-in default labels (the "OK" of the share-failure alert) are shown in English. | Decided by the user on 2026-11-04 (feature 001): Polish UI is required for text we write, but Framework7's own short, widely understood labels may stay as shipped. This feature adds one standard alert. | Overriding Framework7's defaults or building a custom dialog for one rare error adds code and upkeep for a label the user understands anyway. |
