# Implementation Plan: Week Planning

**Branch**: `002-week-planning` | **Date**: 2026-11-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-week-planning/spec.md`

## Summary

This feature turns the placeholder Tydzień tab into the planner:
- a Week page (Mon–Sun, ← / →, Planned kcal per day, "Skopiuj do następnego tygodnia")
- a Day page with numbered Slots, the horizontal Dish picker and "dodaj kolejny"
- a bottom-sheet Meal editor with Servings scaling, detaching on a real change, and "przywróć z Dania"

Ustawienia gets its first setting, "Liczba slotów".

The approach follows feature 001:
- **Domain**: every rule is a pure function in `src/domain/`, covered at 100%:
  - Week date math (integer days, no `Date`)
  - Meal resolution and scaling
  - the per-Meal edit draft and its change detection
  - Slot count per day
  - Week copy planning
  - display rounding
- **Storage**: Dexie version 2 adds the `meals`, `daySlots` and `settings` tables. `WeekRepository.replaceWeek` makes the copy one transaction.
- **Ports**: a new `Clock` port supplies "today".
- **Feature 001 handoff** (its research R13): Dish deletion and Product usage and merge now see Meals.

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`), Node 24 LTS for tooling. Browser targets are unchanged from feature 001.

**Primary Dependencies**: React 19, Framework7 9.3 + `framework7-react` + Framework7 Icons, Vite 8, `vite-plugin-pwa`, Dexie 4 + `dexie-react-hooks`. **No new dependencies** (research R1, R11).

**Storage**: IndexedDB through Dexie. Version 2 adds `meals` (`id, date, dishId`), `daySlots` (`date`) and `settings` (`id`) ([data-model.md](data-model.md)). OPFS photos are unchanged.

**Testing**: Vitest + v8 coverage (100% gate on `src/domain/**`), `fake-indexeddb` for repositories and use cases, and Testing Library + jsdom for four key interactions (research R13).

**Target Platform**: Static offline PWA on Cloudflare Pages, as in feature 001.

**Project Type**: Single-project, client-only web application (mobile-first PWA).

**Performance Goals**:
- ← / → shows a Week in under 300 ms with a year of Weeks stored (SC-006).
- Copying 35 Meals in under 1 s (SC-005).
- 28 Meals planned in under 5 minutes (SC-001).

**Constraints**:
- No runtime network calls.
- Dates as `IsoDate` strings, with no timezone or DST dependence (SC-008).
- Display rounding defined in the domain (FR-023).
- Polish UI with inline strings.
- No state library beyond `useLiveQuery`.

**Scale/Scope**: One user, about 35 Meals a Week and 52+ Weeks a year (about 2,000 Meals a year), a few hundred Dishes. Four new screens or overlays: the Week page, the Day page, the Dish picker sheet and the Meal sheet, plus the Settings page.

All Technical Context items are resolved in [research.md](research.md). There are no remaining NEEDS CLARIFICATION items.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / constraint | How this plan complies | Pre | Post |
|---|---|---|---|
| I. English code, Polish UI | Identifiers are English. Every string we write is Polish and inline ([contracts/ui.md](contracts/ui.md)). Framework7's default dialog labels stay as shipped: a justified deviation carried over from feature 001 (Complexity Tracking) | ⚠️ | ⚠️ |
| II. Glossary-bound language | `Week`, `Slot`, `Meal`, `Servings`, `Macros`, Linked and Detached (`detached`), `Planned` (`plannedKcal`). `MealSource` uses SPEC.md's "source of truth" wording. Slots raised with "dodaj kolejny" are `daySlots` / `slotCount`, never "extra", which is the glossary's Shopping List term (research R4). `WeekRepository` is named after **Week**, not "plan". No avoided terms (entry, plan item, multiplier, posiłek or pora for a Slot) appear as identifiers. One new domain concept, **Added Slot**, was added to GLOSSARY.md (2026-11-04) before implementation, as the principle requires | ✅ | ✅ |
| III. Single-user, local-only | Only new IndexedDB tables. UUIDs for Meals through `IdGenerator`, including copies. `daySlots` and `settings` have natural keys (`date`, `'app'`) that are stable across devices, so they need no UUIDs | ✅ | ✅ |
| IV. Functional core / imperative shell | The constitution's list for this feature is all in `src/domain/` ([contracts/domain-api.md](contracts/domain-api.md)): Servings scaling, Linked and Detached resolution, week date math, Slot count per day, copy to next Week, day summaries (Planned kcal only) | ✅ | ✅ |
| IV. No hidden nondeterminism | "Today" comes from the injected `Clock` (R2). Copy ids come from `IdGenerator` (R8). `dates.ts` uses integer math and fixed Polish arrays, with no `Date` or `Intl` (R1). The existing lint rules cover the new files | ✅ | ✅ |
| IV. Calendar dates as values | `IsoDate` strings everywhere. The adapter converts the device's local day once, at the boundary | ✅ | ✅ |
| IV. Explicit numerics | Scaling stays unrounded. Display rounding is `formatKcal`, `formatMacro`, `formatAmount` and `formatServings` in the domain. Stored values use `roundTo2`. Sums are taken before rounding (R6, R9) | ✅ | ✅ |
| IV. I/O behind interfaces | `WeekRepository`, `SettingsRepository`, the `DishRepository` and `ProductRepository` changes (all on `fake-indexeddb`), and `Clock` with `FixedClock` ([contracts/persistence-and-ports.md](contracts/persistence-and-ports.md)) | ✅ | ✅ |
| IV. Thin components | Pages render `selectWeekDays`, `selectDay`, `draftFromMeal` / `rescaleMealDraft` output and the `src/ui/view-models/week.ts` labels. Edits dispatch to `src/app/week.ts` use cases | ✅ | ✅ |
| IV. Test hygiene and coverage | Fixed clock and ids, no real timers, shuffled order (already configured). Domain tests are listed per function and will be required in `tasks.md` | ✅ | ✅ |
| IV. Isolated adapters | `system-clock.ts` (3 lines) is the only new adapter | ✅ | ✅ |
| V. Simplicity and MVP scope | Only SPEC.md behaviour. Desktop grid and drag and drop deferred (user decision, 2026-11-04). No Meal reordering, no removal of added Slots, no "today" button. No new libraries. The horizontal picker is the one custom CSS block (R11) | ✅ | ✅ |
| Technology constraints | Stack unchanged. dnd-kit stays unused until the desktop feature | ✅ | ✅ |
| Development workflow | Specify → plan → tasks → analyze done. `docs/SPEC.md` updated (see the next note). `/speckit-clarify` was not run as a separate step: a justified deviation, see Complexity Tracking | ⚠️ | ⚠️ |

**Gate result: PASS** before and after Phase 1, with two justified deviations recorded under Complexity Tracking: Principle I (Framework7 default labels) and the Development Workflow (no separate clarify step).

**Note on SPEC.md** (Development Workflow): SPEC.md's Slots and Week sections were updated on 2026-11-04:
- The setting's range and initial value are stated (1–10, initially 4).
- "extra Slots" became "added Slots", because **Extra** is a glossary term for Shopping List entries.
- The `max(…)` formula now names the day's raised Slot count.

These record decisions from the spec. They do not change scope.

**No ADR**: Each decision here follows from the spec or SPEC.md, or is easy to reverse while there is no sync: the `daySlots` count, per-Meal editing, and the single-record settings. None meets the constitution's ADR bar.

## Project Structure

### Documentation (this feature)

```text
specs/002-week-planning/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R13
├── data-model.md        # Phase 1: types, validation, state transitions, Dexie v2
├── quickstart.md        # Phase 1: automated and manual validation
├── contracts/
│   ├── domain-api.md            # new and changed pure functions, required test cases
│   ├── persistence-and-ports.md # WeekRepository, SettingsRepository, Clock, use cases, 001 changes
│   └── ui.md                    # Week, Day, picker, Meal sheet, Settings, Polish strings
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

New files are marked `+`, changed files `~`. Everything else is unchanged from feature 001.

```text
src/
├── main.tsx
├── domain/                    # PURE, 100% coverage
│   ├── types.ts             ~ # IsoDate, MealSource, Meal, DaySlots, Settings
│   ├── ports.ts             ~ # + Clock
│   ├── numbers.ts           ~ # roundTo, formatDecimal(value, places)
│   ├── units.ts             ~ # formatAmount
│   ├── products.ts          ~ # productUsageBreakdown
│   ├── dishes.ts            ~ # field parsing moved to drafts.ts (API unchanged)
│   ├── drafts.ts            + # shared text → number field parsing for Dish and Meal drafts
│   ├── dates.ts             + # IsoDate math, Polish day and month labels
│   ├── settings.ts          + # defaults, range, readSettings
│   ├── slots.ts             + # slotCountForDay, nextSlotCount, nextPosition
│   ├── meals.ts             + # source, scaling, MealDraft, decideMealSave, restore
│   ├── week.ts              + # selectWeekDays, selectDay, weekHasPlan, planWeekCopy
│   └── nutrition.ts         + # formatKcal, formatMacro, formatServings
├── data/
│   ├── db.ts                ~ # version(2): meals, daySlots, settings
│   ├── dish-repository.ts   ~ # removeOrArchive
│   ├── product-repository.ts~ # Detached Meal usage and merge
│   ├── week-repository.ts   + # Meals and DaySlots, replaceWeek
│   └── settings-repository.ts + 
├── adapters/
│   └── system-clock.ts      + # local calendar day → IsoDate
├── app/
│   ├── deps.ts              ~ # + clock, week, settings; − countMealsUsingDish
│   ├── dishes.ts            ~ # deleteDish via removeOrArchive
│   └── week.ts              + # addMealFromDish, saveMeal, restoreMealFromDish, removeMeal,
│                              # addSlotToDay, weekHasPlanAt, copyWeekToNext
├── ui/
│   ├── routes.ts            ~ # weekRoutes: /, /day/:date/; settingsRoutes: /
│   ├── styles/app.css       ~ # picker strip, day-today, meal sheet height
│   ├── view-models/
│   │   ├── week.ts          + # day row, slot row, Meal subtitle, copy and confirm texts
│   │   ├── meal-sheet.ts    + # field ids, messages (duplicateProduct for Meals), toasts
│   │   └── products.ts      ~ # mealCountPhrase, combined usage hints
│   ├── components/
│   │   ├── DishPickerSheet.tsx + 
│   │   └── MealSheet.tsx       + 
│   └── pages/
│       ├── WeekPage.tsx     +
│       ├── DayPage.tsx      +
│       ├── SettingsPage.tsx +
│       └── ProductsPage.tsx ~ # Detached Meal usage
└── dev/seed.ts              ~ # + 52 Weeks × 35 Meals fixture for SC-005/SC-006

tests/
├── domain/      + dates, meals, slots, week, settings, nutrition; ~ numbers, units, products
├── data/        + week-repository, settings-repository; ~ dish-repository, product-repository-maintenance
├── app/         + week (save, restore, copy, add slot); ~ delete-dish
├── ui/          + week-page, day-page (picker adds, sheet detaches), settings-page; ~ products-vm
└── fakes/       + fixed-clock.ts; ~ test-db.ts (new tables)
```

**Structure Decision**: The same single client-only Vite project and layering as feature 001: `domain` (pure) ← `data` / `app` ← `ui`, with adapters injected through `app/deps.ts`. The new code slots into the existing folders, with no new layers or packages.

## Implementation notes for /speckit-tasks

- **Order**:
  1. Domain, test-first: dates, numbers and nutrition, settings, slots, meals, week, products breakdown.
  2. Dexie v2, the repositories and the `FixedClock` fake.
  3. The feature 001 handoff: `removeOrArchive`, Product usage and merge with Meals, and the hints.
  4. US1: Week page, Day page, picker, add and remove.
  5. US2: the Meal sheet with Servings.
  6. US3: detach and restore.
  7. US4: navigation and the clock.
  8. US5: "dodaj kolejny" and the Settings Stepper.
  9. US6: copy.
- **Feature 001 tests that change on purpose**: the `deleteDish` tests (no `countMealsUsingDish` fake, now real Meals) and the merge result shape (`mealsUpdated`). Both are intended contract changes ([contracts/persistence-and-ports.md](contracts/persistence-and-ports.md)).
- **Resolve the `TODO(week-planning)` markers** in `src/data/product-repository.ts` and `src/ui/pages/ProductsPage.tsx`. Mark feature 001's [analysis-followups.md](../001-shell-products-dishes/analysis-followups.md) item L2 as resolved there, as that file asks. That is a checkbox in a follow-up list, not a change to the feature's spec record.
- **Meal sheet rescaling**: call `rescaleMealDraft` only from the Servings field's change handler. The other fields write straight into the draft. Keep `basisServings` out of the UI.
- **iPhone check**: test the Week page, the Day page and both sheets at 375 pt with an iOS user agent before calling a story done (project memory: Framework7 native patterns).
- **Sheets**: render the picker and the Meal sheet once per Day page, with the target Slot or Meal in state. Framework7 sheets are portal modals, and mounting one per Slot would multiply them.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Principle I: Framework7's built-in default labels ("OK", "Cancel", "Back" in standard dialogs and back links) are shown in English. | Decided by the user on 2026-11-04 (feature 001): Polish UI is required for text we write, but Framework7's own short, widely understood labels may stay as shipped. This feature adds more standard confirm dialogs (remove, restore, copy) and back links. | Overriding every Framework7 default, or building custom dialogs to get per-dialog Polish button labels, adds code and upkeep for labels the user understands anyway. |
| Development Workflow: `/speckit-clarify` did not run as its own step between specify and plan. | The spec's two scope questions (the Slot setting, the desktop layout) were asked and answered during `/speckit-specify` on 2026-11-04. The remaining informed defaults are listed in [checklists/requirements.md](checklists/requirements.md). The one spec ambiguity found later by `/speckit-analyze` (FR-009) was fixed directly in spec.md. The user chose to apply the analyze fixes as edits (2026-11-04). | Running `/speckit-clarify` now, after plan and tasks, would mainly revisit the checklist defaults, and any changed answer would also have to be carried into plan and tasks. It can still be run before `/speckit-implement` if the user wants those defaults questioned. |
