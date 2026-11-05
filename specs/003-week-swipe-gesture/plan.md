# Implementation Plan: Week Swipe Gesture

**Branch**: `003-week-swipe-gesture` | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-week-swipe-gesture/spec.md`

## Summary

On phones, the Week card's month label and day strip follow the finger. The previous and next Weeks peek in beside them, dimmed. On release, a drag past a third of the width or a quick flick settles the neighbour in 150–250 ms, and anything else springs back. A touch during a settle catches the card, so quick flicks chain. Totals, "Skopiuj do następnego tygodnia" and the selected day's Slots stay fixed and update once a Week is reached.

**Approach** (see [research.md](research.md)):
- **Engine.** A hand-rolled Pointer Events track, not the Swiper that Framework7 bundles. Swiper's release rule and its synthetic `transitionend` on a mid-animation touch can't give FR-017 and FR-009 (R1, verified in the installed Swiper 12.2.0 source). This is the fallback that `docs/research/week-swipe-gesture.md` named.
- **Track model.** One continuous `position` in Weeks. Five faces (−2…+2) on a rail moved by one transform. The viewed Week changes only when a settle ends or a touch catches one, with position rebased in the same task, so nothing jumps (R2).
- **Pure core.** Every decision and number is a pure function in `src/ui/view-models/week-track.ts`, unit-tested:
  - edge zone, axis lock, drag position with rubber band, release velocity and target
  - settle duration and curve
  - the per-frame transform and opacity
- **Thin adapter.** `src/ui/hooks/useWeekTrackGesture.ts` only wires pointer events, `requestAnimationFrame` and `matchMedia` to those functions (R3–R7).
- **Data.** One Meals query widened to the five faces' 35 days. A new domain helper `mealsInRange` keeps "Skopiuj…" tied to the viewed Week (R9).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`), Node 24 LTS for tooling. Browser targets are unchanged. Pointer Events and `touch-action` are supported in iOS Safari 13+ (docs research ref [22]).

**Primary Dependencies**: React 19 (`flushSync`, `inert`), Framework7 9.3 (page and icons only), Dexie 4 + `dexie-react-hooks`. **No new dependencies**, and Swiper isn't used (R1).

**Storage**: N/A. No schema change, and IndexedDB is only read, through the existing `listMeals` over a wider range ([data-model.md](data-model.md)).

**Testing**: Vitest.
- Pure tests for `week-track.ts`, `weekFace`, `trackMealsRange` and `mealsInRange` (100% gate on the domain).
- jsdom component tests drive the real adapter with `PointerEvent`s, fixed `timeStamp`s and a defined `clientWidth`. Settles are instant through a reduced-motion `matchMedia` stand-in. Three tests use fake `requestAnimationFrame` for the catch and its safety rules (R10, [contracts/ui.md](contracts/ui.md) T1–T18).
- Feel checks on an iPhone ([quickstart.md](quickstart.md)).

**Target Platform**: Static offline PWA on Cloudflare Pages. The gesture is for touch and pen. Desktop uses the ← / → buttons.

**Project Type**: Single-project, client-only web application (mobile-first PWA).

**Performance Goals**:
- The face follows the finger in the same frame: per-move work is arithmetic plus two to six `style` writes, with no React render (R6).
- A settle takes 150–250 ms (FR-006, SC-002).
- A commit is one synchronous React render of the Week page, before paint (R2).

**Constraints**:
- No runtime network calls (FR-016).
- No state library.
- No CSS transitions on the track (the adapter owns motion).
- `touch-action: pan-y` on the card.
- Swipe thresholds live in one tunable constant object (`WEEK_TRACK`).

**Scale/Scope**: One component (`WeekTrack`), one adapter hook, one view-model module, changes to `WeekPage`, `week.ts` view model and `app.css`, and one domain helper. Five faces × 7 day buttons on screen.

All Technical Context items are resolved in [research.md](research.md). There are no remaining NEEDS CLARIFICATION items.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / constraint | How this plan complies | Pre | Post |
|---|---|---|---|
| I. English code, Polish UI | New identifiers are English. No new user-facing strings: the existing "Poprzedni tydzień" / "Następny tydzień" labels move with the buttons | ✅ | ✅ |
| II. Glossary-bound language | Domain terms used: **Week**, **Meal**, **Planned** (kcal). UI-only words are **Week card**, **Week face**, **track**, **settle** and **neighbour**. They name screen parts, not domain concepts, so GLOSSARY.md needs no addition (the same treatment as feature 002's "day strip"). No avoided terms | ✅ | ✅ |
| III. Single-user, local-only | Nothing stored, nothing fetched | ✅ | ✅ |
| IV. Functional core / imperative shell | Domain: `mealsInRange` (Week date math). Gesture decisions are UI logic, kept pure in `src/ui/view-models/week-track.ts` ([contracts/view-models.md](contracts/view-models.md)) | ✅ | ✅ |
| IV. No hidden nondeterminism | The pure functions take timestamps and positions as arguments. Only the adapter reads `event.timeStamp`, the `requestAnimationFrame` time, `matchMedia` and `clientWidth`. The domain lint rules are unchanged and cover `mealsInRange` | ✅ | ✅ |
| IV. Calendar dates as values | Faces are built with `addDays` and `sameWeekday` on `IsoDate` | ✅ | ✅ |
| IV. Explicit numerics | All thresholds and curves are named constants and tested functions. No numbers inline in the adapter | ✅ | ✅ |
| IV. I/O behind interfaces | No new I/O. The existing `WeekRepository.listMeals` is reused | ✅ | ✅ |
| IV. Thin components | `WeekTrack` renders `weekTrackFaces` output. `WeekPage` keeps dispatching `moveWeek` | ✅ | ✅ |
| IV. Test hygiene and coverage | Fixed event timestamps, no real timers (fake `requestAnimationFrame` only in T15–T17), shuffled order. `mealsInRange` keeps `src/domain` at 100% | ✅ | ✅ |
| IV. Isolated adapters | The constitution names drag gestures as an adapter. `useWeekTrackGesture.ts` is the one new adapter, at about 150 lines, with no decisions of its own | ✅ | ✅ |
| V. Simplicity and MVP scope | Only SPEC.md's planned swipe behaviour (Tydzień, "Planned (later)"). No mouse drag, no momentum across several Weeks. The added complexity (a custom gesture adapter instead of a library) is justified under Complexity Tracking | ⚠️ | ⚠️ |
| Technology constraints | Stack unchanged. Pointer Events and `requestAnimationFrame` are platform APIs. No ADR (R11) | ✅ | ✅ |
| Development workflow | Specify → clarify → plan done. `docs/SPEC.md` must be updated when the feature is built (next note) | ✅ | ✅ |

**Gate result: PASS** before and after Phase 1, with one justified item under Complexity Tracking (Principle V).

**Note on SPEC.md** (Development Workflow): when this feature is built, the Tydzień "Planned (later)" bullet becomes the current behaviour. Its wording "fade or slide away and the new Week fade gently in" becomes a slide with dimmed neighbours (spec Clarifications, 2026-11-05). The "Today the Week changes on release…" sentence and the research pointer are removed. That's a task for `/speckit-tasks`.

**Spec refinement made during planning**: FR-017 now says that a settle caught by a new touch counts as finished at that moment. The viewed Week becomes its target, and the new drag is measured from there. This makes FR-003, FR-007 and FR-009 agree for chained flicks (research R2). It doesn't change behaviour the user described.

## Project Structure

### Documentation (this feature)

```text
specs/003-week-swipe-gesture/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R11
├── data-model.md        # Phase 1: page state, Week face, gesture state machine
├── quickstart.md        # Phase 1: automated checks and iPhone scenarios M1–M14
├── contracts/
│   ├── view-models.md   # pure functions, constants and required tests
│   └── ui.md            # Week card structure, WeekTrack, CSS, component tests T1–T18
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

New files are marked `+`, changed `~`, removed `−`. Everything else is unchanged from feature 002.

```text
src/
├── domain/
│   └── week.ts                     ~ # + mealsInRange
├── ui/
│   ├── view-models/
│   │   ├── week.ts                 ~ # + trackMealsRange, weekFace, weekTrackFaces;
│   │   │                             #   weekPage uses weekFace and mealsInRange; − swipeWeekDelta
│   │   └── week-track.ts           + # WEEK_TRACK constants and the pure gesture functions
│   ├── hooks/
│   │   └── useWeekTrackGesture.ts  + # adapter: pointer events, rAF tween, style writes
│   ├── components/
│   │   └── WeekTrack.tsx           + # rail, five faces, ← / → overlay
│   ├── pages/
│   │   └── WeekPage.tsx            ~ # WeekTrack, wider Meals query, − touch handlers and slide state
│   └── styles/app.css              ~ # + .week-track, rail, face, nav overlay; − .week-slide-* keyframes
docs/SPEC.md                        ~ # Tydzień: planned swipe becomes current behaviour

tests/
├── domain/week.test.ts             ~ # mealsInRange
├── ui/
│   ├── week-track-vm.test.ts       + # every row of contracts/view-models.md
│   ├── week-vm.test.ts             ~ # weekFace, weekTrackFaces, trackMealsRange, canCopy; − swipeWeekDelta
│   └── week-page.test.tsx          ~ # T1–T18 replace the TouchEvent swipe test; queries scoped to the viewed face
└── setup.ts                        ~ # pointer-capture stubs; matchMedia matches prefers-reduced-motion
```

**Structure Decision**: The same single Vite project and layering as features 001 and 002: `domain` (pure) ← `app` / `data` ← `ui`. The gesture follows the existing split inside `ui`:
- pure logic in `view-models/`
- the platform-facing code in `hooks/` (it's a UI adapter that is injected nowhere else, so not in `src/adapters/`, which holds `deps` ports)
- rendering in `components/`

## Implementation notes for /speckit-tasks

- **Order**:
  1. Pure functions, test-first: `mealsInRange`, `week-track.ts`, `weekFace`, `weekTrackFaces`, `trackMealsRange`, and the `weekPage` change.
  2. `tests/setup.ts` stand-ins (R10).
  3. US1: `WeekTrack`, `useWeekTrackGesture`, `WeekPage` wiring, CSS, and T1–T4, T12 and T15.
  4. US2: coexistence rules and T5–T10.
  5. US3: buttons through `step`, reduced motion, `inert` faces, and T11, T13 and T14.
  6. SPEC.md update.
  7. Device run: quickstart M1–M14, then tune `WEEK_TRACK`.
- **Existing tests that change on purpose**:
  - `tests/ui/week-page.test.tsx` uses `screen.findByText('Listopad 2026')` and `getByRole('button', { name: … })`. With five faces, "Listopad 2026" appears in several faces, and day names repeat a week apart. Role queries skip the `aria-hidden` neighbours. Text queries must be scoped to the viewed face (`.week-face:not([inert])`) or switched to `getByRole('heading', { level: 2 })`.
  - The TouchEvent swipe test is replaced by T1–T10.
- **`matchMedia` stand-in**: it currently never matches ("mobile layout"). Make it match only `(prefers-reduced-motion: reduce)`, so existing button tests settle instantly. Keep every other query false, so the layout stays mobile.
- **Commit timing**: always `flushSync(() => onMove(days))`, then write the rebased frame through the refs. Never write the transform before `flushSync` returns, or the faces and the rail disagree for a frame (FR-008).
- **Keys**: face key = `weekStart` (date), so a rebase keeps DOM nodes and only their offset styles change.
- **iPhone check**: before calling a story done, test at 375 pt with an iOS user agent (project memory: Framework7 native patterns). The real-device run in quickstart decides the final `WEEK_TRACK` values.
- **Fallback**: if the device run can't make the hand-rolled feel right, `WeekTrack`'s props (`faces`, `onMove`, `onSelect`) are the seam for swapping the engine. Everything outside the adapter stays.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Principle V: a custom gesture adapter (about 150 lines in `useWeekTrackGesture.ts`, plus about 100 lines of pure functions) instead of the Swiper component Framework7 already bundles. | FR-017 and FR-009 (catch mid-settle, so two quick flicks move exactly two Weeks) and FR-004 (dimming tied to progress) need control over the release decision and the position during animation. | Swiper's release rule picks the target from the slide band the track is in, so a second flick mid-settle is lost. Its synthetic `transitionend` on a mid-animation touch breaks three-slide re-centring (research R1, verified in Swiper 12.2.0 source). Motion would give control but adds about 40 kB gzipped and a new stack element with an ADR. |
