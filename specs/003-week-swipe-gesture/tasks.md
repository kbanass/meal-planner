---
description: "Task list for Week Swipe Gesture"
---

# Tasks: Week Swipe Gesture

**Input**: Design documents from `specs/003-week-swipe-gesture/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Required. Constitution Principle IV requires domain tests in every feature's `tasks.md`, written together with or before the implementation, and a 100% coverage gate on `src/domain/**`. The pure gesture functions get the same test-first treatment ([contracts/view-models.md](contracts/view-models.md)). Component tests drive the real adapter with `PointerEvent`s (T1–T18 in [contracts/ui.md](contracts/ui.md)). The feel is checked on an iPhone ([quickstart.md](quickstart.md)).

**Organization**: One phase per user story, in priority order: US1 and US2 (P1), then US3 (P2). The pure functions and test stand-ins are in Phase 2, because every story uses them.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: Which user story the task belongs to (US1–US3 from spec.md)

## Conventions for every task

- **Language**: code, identifiers and comments are in English. This feature adds no user-facing strings: the existing "Poprzedni tydzień" / "Następny tydzień" labels move with the buttons.
- **Terms**:
  - Domain terms follow [GLOSSARY.md](../../GLOSSARY.md): Week, Meal, Planned.
  - UI-only names are Week card, Week face, track, rail, settle and neighbour. They name screen parts, not domain concepts (plan.md, Constitution Check II).
- **Pure core, thin adapter**:
  - Every number the adapter writes to the DOM comes from a function in `src/ui/view-models/week-track.ts`.
  - Thresholds live only in `WEEK_TRACK`, with no inline numbers in the adapter.
  - Tests reference `WEEK_TRACK` fields, not literal values, except where the contract table gives exact expected values.
- **Platform APIs**: only `src/ui/hooks/useWeekTrackGesture.ts` touches these (contracts/ui.md):
  - `PointerEvent`
  - `setPointerCapture`
  - `requestAnimationFrame`
  - `matchMedia`
  - `clientWidth`
  - `visibilitychange`
- **Commit path**: the only way the Week changes from the track is `flushSync(() => onMove(7 * n))`, then `position -= n`, then the frame is written through the refs, all in one task (data-model.md, rule 1).
- **Tests**:
  - Vitest, no network, no dependence on test order.
  - No real timers. Fake `requestAnimationFrame` is used only in T15–T17.
  - Event timestamps are fixed on the event object, so velocity is deterministic (research R10).
- **iPhone check**: before calling a story done, check the Week page at 375 pt with an iOS user agent (project memory), and run that story's quickstart rows on a real iPhone.
- **Commits**: after each task group, with tests passing. Use Conventional Commits, e.g. `feat(week): …`, `test(ui): …`, `docs(spec): …`.

---

## Phase 1: Setup

**Purpose**: Confirm the starting point. This feature adds no dependencies or tooling.

- [ ] T001 On branch `003-week-swipe-gesture`, run `npm run lint`, `npm run typecheck`, `npm test` and `npm run coverage`, and confirm everything passes before any change. If anything fails, stop and report it, because it predates this feature.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pure functions every story uses (`mealsInRange`, the gesture rules, the Week faces) and the jsdom stand-ins the component tests need.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests (write first, they must fail)

- [ ] T002 [P] Add `mealsInRange` tests to `tests/domain/week.test.ts`, per [contracts/view-models.md](contracts/view-models.md) "Domain":
  - It keeps Meals dated on the range's first and last day, and drops Meals the day before and the day after.
  - An empty input gives `[]`.
  - Input order is kept.
- [ ] T003 [P] Create `tests/ui/week-track-vm.test.ts` with one `describe` per row of the "Functions and required tests" table in [contracts/view-models.md](contracts/view-models.md). Cover every case listed:
  - `inEdgeZone` (0, 23, 24, `width − 24` and `width − 23` against `WEEK_TRACK.EDGE_ZONE_PX`)
  - `classifyDrag`, including the (9, 9) tie, which is `'vertical'`
  - `dragPosition`: half pitch, 1.5 pitches with `RESISTANCE`, the catch start −0.3, pitch 0
  - `releaseVelocity`: steady 1 px/ms, old samples ignored, one sample, equal timestamps
  - `releaseTarget`: d = 0.34, 0.32 slow, −0.34; flick left at d = 0.07; a flick that moved only −15 px; a flick against the drag; d = 1.4 never giving +2; the catch case anchor 0 / position −0.2
  - `settleDuration`: 0, 0.5, 1 and 1.3
  - `easeOutCubic`: 0, 1, 0.5 → 0.875, and clamping of −1 and 2
  - `tweenPosition`: halfway, past the duration, duration 0
  - `trackFrame` at positions 0 and 0.5
  - `railTransform` / `faceTransform`: exact strings for 0, 1 and −0.25, with no exponent notation
- [ ] T004 [P] Add to `tests/ui/week-vm.test.ts`, per [contracts/view-models.md](contracts/view-models.md) "View model: week.ts":
  - `trackMealsRange('2026-11-02')` → `2026-10-19`…`2026-11-22`, and `trackMealsRange('2026-12-28')` → `2026-12-14`…`2027-01-17`.
  - `weekFace`:
    - The next face of Wed 4 Nov 2026 has Wed 11 `isSelected`.
    - A face containing today marks `isToday`.
    - The Week of 26 Oct gets "Październik – listopad 2026".
    - A neighbour day with a Meal shows its kcal, and Meals outside the face are ignored.
  - `weekTrackFaces` returns five faces, offsets −2…2, `weekStart`s 7 days apart, with only offset 0 `isViewed`.
  - `weekPage`: an empty viewed Week with Meals only in the next Week has `canCopy === false` and no kcal in its strip.
  - Leave the existing `swipeWeekDelta` tests in place. They're removed in T013.

### Implementation

- [ ] T005 [P] Implement `mealsInRange(meals: readonly Meal[], range: DateRange): Meal[]` in `src/domain/week.ts`. It keeps Meals with `range.start ≤ date ≤ range.end` (ISO string comparison), in input order. T002 must pass, and `npm run coverage` must stay at 100%.
- [ ] T006 [P] Create `src/ui/view-models/week-track.ts`:
  - `WEEK_TRACK` holds exactly the constants in [contracts/view-models.md](contracts/view-models.md): `GAP_PX` 12, `EDGE_ZONE_PX` 24, `SLOP_PX` 8, `COMMIT_RATIO` 1/3, `FLICK_VELOCITY` 0.3, `FLICK_MIN_PX` 20, `VELOCITY_WINDOW_MS` 100, `RESISTANCE` 0.35, `DIM_OPACITY` 0.5, `SETTLE_MIN_MS` 150, `SETTLE_MAX_MS` 250, `as const`.
  - The pure functions are `inEdgeZone`, `classifyDrag`, `dragPosition`, `releaseVelocity`, `releaseTarget`, `settleDuration`, `easeOutCubic`, `tweenPosition`, `trackFrame`, `railTransform` and `faceTransform`, with the signatures and contracts of that table and [research.md](research.md) R4–R6.
  - The file imports no DOM, React or Framework7 code.
  - Format transform numbers with a fixed number of decimal places, so the output never uses exponent notation.
  - T003 must pass.
- [ ] T007 Add `trackMealsRange`, the `WeekFace` type, `weekFace` and `weekTrackFaces` to `src/ui/view-models/week.ts`:
  - The face's `strip` reuses the existing `StripCell` mapping, with `isSelected = cell.date === sameWeekday(selected, faceWeekStart)`.
  - Change `weekPage` so `monthLabel` and `strip` come from `weekFace(weekStart, 0, …)`, and `canCopy = weekHasPlan(mealsInRange(meals, weekRange(weekStart)), daySlots)`.
  - Keep `swipeWeekDelta` for now, because `WeekPage` still uses it until T013.
  - Depends on T005. T004 must pass.
- [ ] T008 [P] Update the jsdom stand-ins in `tests/setup.ts` (research R10):
  - Add no-op `Element.prototype.setPointerCapture`, `releasePointerCapture` and `hasPointerCapture` (returns `false`), only when they're missing.
  - Change the `matchMedia` stand-in so it returns `matches: true` only for a query containing `prefers-reduced-motion: reduce`, and `false` for everything else, so tests keep the mobile layout. Update its comment.
  - Confirm `npm test` still passes.
- [ ] T009 [P] Create `tests/ui/pointer.ts`, with test helpers for driving the track:
  - `setTrackWidth(el, px)` defines `clientWidth` with `Object.defineProperty`.
  - `pointer(el, type, { x, y, t, pointerId = 1, pointerType = 'touch' })` dispatches a bubbling `PointerEvent` inside `act`, with `timeStamp` overridden to `t` through `Object.defineProperty` on the event.
  - `drag(el, { from: [x, y], to: [x, y], steps, durationMs, startT = 0, pointerType })` sends down, evenly spaced moves and up.
  - `tap(el)` sends down and up with no move, then `click`.

**Checkpoint**: The pure core is done and tested, `src/domain` is at 100%, and the existing suite still passes on the old Week page.

---

## Phase 3: User Story 1 - Drag to the next or previous Week (Priority: P1) 🎯 MVP

**Goal**: On a phone, the month label and day strip follow the finger, and the neighbour Weeks peek in, dimmed, with their own kcal. A drag past a third of the width, or a flick, settles the neighbour in 150–250 ms, and anything else springs back. A touch mid-settle catches the card, so two flicks move two Weeks. Totals, "Skopiuj…" and the Slots stay fixed until a Week is reached.

**Independent Test**: spec.md US1. On an iPhone, drag slowly left on a Week whose neighbours have Meals, and see the next Week's month and kcal. Release past a third: the same weekday is selected in the next Week. Repeat to the right. Two quick flicks move two Weeks.

### Tests for User Story 1 (write first, they must fail)

- [ ] T010 [US1] In `tests/ui/week-page.test.tsx`, using `tests/ui/pointer.ts` and `setTrackWidth(track, 360)` on `.week-track`, add tests T1–T4, T12, T15 and T16 from [contracts/ui.md](contracts/ui.md):
  - **T1**: a slow 140 px drag left over 600 ms. After the moves and before `pointerup`, the heading still reads "Środa, 4 lis" (FR-003). After `pointerup`, it reads "Środa, 11 lis", and Wed 11 is pressed.
  - **T2**: two slow 140 px drags right give "Środa, 28 paź".
  - **T3**: a slow 60 px drag left leaves the Week unchanged.
  - **T4**: a 30 px flick left in 50 ms moves to the next Week.
  - **T12**: with a Meal on 2026-11-11, `350` shows in the next face's strip before any move.
  - **T15**: override `window.matchMedia` in that test to never match, and use `vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })`. Flick left, advance 60 ms, and check the heading reads "Środa, 11 lis" right after the second `pointerdown`. Then flick left again and run all frames: the heading reads "Środa, 18 lis".
  - **T16**: in the T15 setup, flick left, advance 60 ms, then `tap` the card and run all frames. The heading reads "Środa, 11 lis", and the rail's `style.transform` equals `railTransform(0)`.

  Also update the existing tests for five faces. The same month label and today's pill now appear in more than one face:
  - Add a `viewedFace()` helper returning `.week-face:not([inert])`.
  - Scope **every** text query and `.day-pill*` selector in the file to it, old tests included. For example:
    - `screen.findByText('Listopad 2026')`
    - `screen.findByText('Październik – listopad 2026')`
    - `container.querySelector('.day-pill-today')` (it must be null after "Następny tydzień" in the viewed face only, because the previous face still holds today)
  - Alternatively, use `getByRole('heading', { level: 2 })` for the month.
  - Keep `pill()` as a role query, which skips `aria-hidden` neighbours.
  - Delete the old TouchEvent test "changes the Week with a swipe on the Week card (FR-005)".

### Implementation for User Story 1

- [ ] T011 [P] [US1] Create `src/ui/components/WeekTrack.tsx` with props `{ faces: WeekFace[]; onMove(days: number): void; onSelect(date: IsoDate): void }`. It renders exactly the structure in [contracts/ui.md](contracts/ui.md) "Week card structure":
  - `.week-track` holds `.week-track-rail` and the five `.week-face` elements, with `key={face.weekStart}`.
  - Each face's `style.transform` is `faceTransform(face.offset)`.
  - Each face has `inert` and `aria-hidden="true"` when `!face.isViewed`.
  - Each face contains `<h2 className="week-card-month">{face.monthLabel}</h2>` and `<DayStrip cells={face.strip} onSelect={onSelect} />`.
  - `.week-card-nav` holds the two `round-button`s with `aria-label` "Poprzedni tydzień" / "Następny tydzień" and the `arrow_left` / `arrow_right` icons, calling `step(-1)` / `step(1)`.
  - Refs for the track, the rail and each face (a `Map` keyed by offset) are passed to `useWeekTrackGesture`.
  - No logic beyond rendering.
- [ ] T012 [US1] Create the adapter `src/ui/hooks/useWeekTrackGesture.ts`: `useWeekTrackGesture(trackRef, railRef, faceRefs, { onMove }) → { step(direction: 1 | -1) }`. It implements the [data-model.md](data-model.md) gesture state with refs only, no React state:
  - **Listeners**: attach `pointerdown`, `pointermove`, `pointerup` and `pointercancel` in a `useEffect` on the track, and remove them on cleanup.
  - **`pointerdown`**: read `pitch = clientWidth + WEEK_TRACK.GAP_PX`, ignore the gesture if `pitch ≤ 0`, and record `start` and the first sample. If a tween is running, **catch** it: cancel the frame, then `commit(tween.to)`, which runs `flushSync(() => onMove(7 * n))`, then `position -= n`, then writes the frame. So `anchor` is 0 (spec FR-017).
  - **`pointermove`**: while `classifyDrag` is `'pending'`, do nothing. On `'horizontal'`, call `setPointerCapture`. Then set `position = dragPosition(start.position, dx, pitch, anchor)`, push a sample trimmed to `VELOCITY_WINDOW_MS`, and write `trackFrame(position)`: the rail gets `railTransform(railShift)`, and each face ref gets its `opacity`.
  - **`pointerup`**: clear the tracked pointer first, so a later `lostpointercapture` is a no-op ([data-model.md](data-model.md), "Event order"). After a horizontal drag: `target = releaseTarget({ anchor, position, velocity: releaseVelocity(samples, t), movedPx: dx })`, then `settle(target)`. From `pressed` (a tap, no move past `SLOP_PX`): `settle(anchor)` when `position ≠ anchor`, which happens after a catch. This is data-model rule 4, tested by T16.
  - **`settle(to)`**: if `matchMedia('(prefers-reduced-motion: reduce)').matches`, the duration is 0: write the frame and commit synchronously (FR-014). Otherwise run a `requestAnimationFrame` loop with `tweenPosition(from, to, elapsed, settleDuration(to − from))`, and on the last frame `commit(to)` when `to ≠ 0`.
  - **`step(direction)`**: catch any running tween as on `pointerdown`, then `settle(direction)`.
  - **Initial frame**: on mount and after every commit, write `trackFrame(position)`.
  - Every number comes from `week-track.ts`.
  - Leave the start filters (rule 5) to T017. Even so, structure `pointerdown` as "filter, then catch, then record", so T017 only adds conditions to the filter step.
  - Depends on T006 and T011.
- [ ] T013 [US1] Rewire `src/ui/pages/WeekPage.tsx` ([contracts/ui.md](contracts/ui.md) "WeekPage changes"):
  - Remove the `slide` state, the `touchStart` ref, `onTouchStart` / `onTouchEnd`, the `key={weekStart}` `.week-slide` wrapper and the old header with its buttons.
  - `moveWeek(days)` keeps its `addDays` / `sameWeekday` body, without `setSlide`.
  - Change the Meals query to `deps.week.listMeals(trackMealsRange(weekStart))`. `daySlots` stays `weekRange(weekStart)`.
  - Render `<WeekTrack faces={weekTrackFaces(weekStart, today, selected, { meals, dishes })} onMove={moveWeek} onSelect={setSelected} />` inside `.week-card`, before `.week-card-totals`.
  - Then delete `swipeWeekDelta` and its `SWIPE_DISTANCE` constant from `src/ui/view-models/week.ts`, and its `describe` block from `tests/ui/week-vm.test.ts`.
  - Depends on T007 and T012.
- [ ] T014 [P] [US1] Update `src/ui/styles/app.css` ([contracts/ui.md](contracts/ui.md) "CSS"):
  - Delete `.week-slide-next`, `.week-slide-previous`, both `@keyframes week-slide-from-*` and their `prefers-reduced-motion` block.
  - Add `.week-track { position: relative; overflow: hidden; }`, `.week-track-rail { display: grid; will-change: transform; }` and `.week-face { grid-area: 1 / 1; }`.
  - Move the old `.week-card-header` spacing (`padding: 0 4px 16px`) onto the face's month row, so the face matches today's look.
  - Keep `.week-card { touch-action: pan-y; }`, and add no transitions on the rail or faces.
  - The phone rule that visually hides `.week-card-nav` stays.
- [ ] T015 [US1] Run `npm test`: T1–T4, T12, T15, T16 and all earlier tests must pass, including feature 002's button test, which `step` now drives. Check at 375 pt with an iOS user agent (`npm run dev`). Then on an iPhone, run quickstart M1, M2 and M6. Commit.

**Checkpoint**: US1 works: follow, peek, settle or spring back, and chained flicks. This is the MVP.

---

## Phase 4: User Story 2 - The gesture doesn't fight scrolling, taps or the system (Priority: P1)

**Goal**: Vertical scrolls, day taps and the system edge swipe never move the strip or change the Week. Interrupted gestures always end centred on one Week.

**Independent Test**: spec.md US2. On an iPhone, as the installed app and in a Safari tab:
- 20 vertical and diagonal scrolls started on the card never change the Week.
- Every day tap selects the day.
- A swipe from the left screen edge doesn't drag the strip.

### Tests for User Story 2 (write first, they must fail)

- [ ] T016 [US2] In `tests/ui/week-page.test.tsx`, add tests T5–T10, T17 and T18 from [contracts/ui.md](contracts/ui.md):
  - **T5**: a move of 40 px right and 120 px down leaves the Week unchanged, and a later tap on a pill still selects it.
  - **T6**: `pointerdown` at `clientX` 10, with `window.innerWidth` 390, then a 140 px drag left, leaves the Week unchanged.
  - **T7**: the same 140 px drag with `pointerType: 'mouse'` leaves the Week unchanged.
  - **T8**: a 140 px drag starting on "Czwartek, 5 lis", followed by a dispatched `click` on that pill, changes the Week to 9–15 Nov with Wednesday 11 selected, not Thursday.
  - **T9**: `tap` on "Czwartek, 5 lis" selects it.
  - **T10**: `pointercancel` after a 140 px move leaves the Week unchanged.
  - **T17**: in the T15 setup (motion on, fake `requestAnimationFrame`), flick left and advance 60 ms. Then dispatch, in turn, a `pointerdown` at `clientX` 10, a `pointerdown` with `pointerType: 'mouse'`, and a `pointerdown` on the "Następny tydzień" button, each followed by `pointerup`. Run all frames: the heading reads "Środa, 11 lis", and the rail's transform equals `railTransform(0)`. None of them caught the settle.
  - **T18**: a slow 140 px drag left, then `pointerup`, then `lostpointercapture` for the same `pointerId`. The heading reads "Środa, 11 lis".

### Implementation for User Story 2

- [ ] T017 [US2] In `src/ui/hooks/useWeekTrackGesture.ts`, add the start filters (research R3, [data-model.md](data-model.md) rule 5). They run **before** the catch, so an ignored pointer never stops or commits a running tween:
  - Ignore `pointerType === 'mouse'` (FR-013).
  - Ignore a `pointerdown` where `inEdgeZone(clientX, window.innerWidth)` for the whole gesture (FR-011).
  - Ignore a `pointerdown` whose target is inside `.week-card-nav`. The buttons act only through `click`.
  - Track only the first `pointerId`, and ignore other pointers until it ends.
- [ ] T018 [US2] In the same file, add the axis rules (FR-010):
  - When `classifyDrag` returns `'vertical'`, stop tracking that pointer for the rest of its life.
  - If that `pointerdown` caught a settle, `settle(anchor)` straight away, so the face doesn't stay between Weeks.
- [ ] T019 [US2] In the same file, add click suppression (FR-012): when a gesture locks `'horizontal'`, set `swallowClick`. A capture-phase `click` listener on the track then calls `preventDefault()` and `stopPropagation()` once and clears the flag. A tap never sets it.
- [ ] T020 [US2] In the same file, add the interruption rules (FR-009):
  - `pointercancel` for the tracked pointer calls `settle(anchor)`.
  - So does `lostpointercapture` for a pointer that is **still tracked**, meaning it isn't preceded by its `pointerup`. Browsers fire `lostpointercapture` after `pointerup`, and T012 clears the tracked pointer on `pointerup`, so a normal release ignores it (T18).
  - A `visibilitychange` to `hidden` during a drag or a tween writes the anchor frame instantly and commits any pending target, so the face ends centred on one Week.
  - Remove the listener on cleanup.
- [ ] T021 [US2] Run `npm test` (T5–T10, T17 and T18 pass). On an iPhone, run quickstart M3, M4, M5, M7 and M8. If M4 shows the page scrolling during a horizontal drag, add a non-passive `touchmove` listener that calls `preventDefault()` only while locked horizontal (research R3, alternatives), and repeat M4. Commit.

**Checkpoint**: US1 and US2 work together: the gesture is safe on the most-used screen.

---

## Phase 5: User Story 3 - Buttons, reduced motion and screen readers (Priority: P2)

**Goal**: On desktop, ← / → slide the Week like a swipe and chain when clicked quickly. With Reduce Motion, settles are instant and the drag still follows. VoiceOver reads only the viewed Week.

**Independent Test**: spec.md US3:
- At ≥ 1024 px, click → and ←.
- With Reduce Motion on, swipe on a phone.
- With VoiceOver on, move through the Week card and use the buttons.

### Tests for User Story 3 (write first, they must fail)

- [ ] T022 [US3] In `tests/ui/week-page.test.tsx`, add tests T11, T13 and T14 from [contracts/ui.md](contracts/ui.md):
  - **T11**: exactly four `.week-face` elements have the `inert` attribute, and `screen.getAllByRole('heading', { level: 2 })` has length 1, reading "Listopad 2026".
  - **T13**: the existing "moves between Weeks keeping the weekday (US4-1, US4-2)" test still passes through the buttons, and add a check that two quick clicks on "Następny tydzień" move two Weeks.
  - **T14**: with a Meal only on 2026-11-11, "Skopiuj do następnego tygodnia" is disabled on the Week of 2 Nov.

### Implementation for User Story 3

- [ ] T023 [US3] Desktop layout in `src/ui/styles/app.css`. At `min-width: 1024px`:
  - Position `.week-card-nav` absolutely at the top right of `.week-track`, vertically aligned with the month row.
  - Give `.week-face .week-card-month` enough `padding-right` that a long label ("Grudzień 2026 – styczeń 2027") never sits under the buttons.
  - Check the result at 1280 px and 1024 px in `npm run dev`.
- [ ] T024 [US3] Check `src/ui/hooks/useWeekTrackGesture.ts` against FR-013 and FR-014:
  - The reduced-motion query is read at the start of every settle, not once on mount.
  - `step` during a running tween catches and chains, like a flick (research R8).
  - Fix any gap, and keep T11, T13 and T14 green.
- [ ] T025 [US3] Run `npm test`, then quickstart M10, M11 and M12 (Reduce Motion, VoiceOver, desktop buttons). Commit.

**Checkpoint**: All three stories work.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Contract docs, the full device run and the final checks.

- [ ] T026 [P] Update `docs/SPEC.md`, Tydzień "Week" bullet (plan.md, "Note on SPEC.md"). Replace the "Planned (later)" sub-bullet with the current behaviour:
  - On phones, the month label and day strip follow the finger, and the previous and next Weeks show beside them, dimmed.
  - A long enough drag or a quick flick slides the neighbour into place in roughly 150–250 ms, and a short drag springs back.
  - Touching the card while it's still sliding catches it, so quick flicks chain.
  - The day totals and "skopiuj do następnego tygodnia" stay fixed.
  - Vertical scrolling and the system back swipe keep working.
  - With Reduce Motion, the change is instant.

  Remove the "Today the Week changes on release…" sentence and the research pointer.
- [ ] T027 [P] Add a short "Outcome" note under the status line of `docs/research/week-swipe-gesture.md`. It says the plan for feature 003 chose the §3.4 hand-rolled track over Swiper, because of FR-017, with a link to `specs/003-week-swipe-gesture/research.md` R1. Leave the rest of the document as the record it is.
- [ ] T028 Run the full quickstart on an iPhone (M1–M14), as the installed PWA and, where marked, in a Safari tab. Tune `WEEK_TRACK` in `src/ui/view-models/week-track.ts` if M3 or M6 feel wrong, and keep `tests/ui/week-track-vm.test.ts` green after any change. Record the final values and the device results for the PR description.
- [ ] T029 Final gate:
  - `npm run lint`, `npm run typecheck`, `npm run coverage` (100% on `src/domain/**`) and `npm run build` all pass.
  - `git diff main -- package.json package-lock.json` is empty (no new dependencies).
  - `grep -rn "swiper\|swipeWeekDelta\|week-slide" src tests` finds nothing.
  - Commit.

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: no dependencies.
- **Phase 2 (Foundational)**: depends on T001. It blocks every story.
- **Phase 3 (US1)**: depends on Phase 2. It's the MVP.
- **Phase 4 (US2)**: depends on US1, because it extends the same adapter (`useWeekTrackGesture.ts`) and test file.
- **Phase 5 (US3)**: depends on US1. It can run alongside US2, except where both edit `useWeekTrackGesture.ts` (T024 touches it only if a gap is found) and `week-page.test.tsx`.
- **Phase 6 (Polish)**: T026 and T027 can start any time after US1. T028 and T029 come after all stories.

### Within phases

- T002 → T005. T003 → T006. T004 → T007, and T007 also needs T005.
- T010 is written before T011–T014. T011 → T012 → T013. T014 is independent.
- T016 → T017 → T018 → T019 → T020 (same file, in order).
- T022 → T023 and T024.

### Parallel opportunities

- Phase 2: T002, T003, T004, T008 and T009 together, then T005 and T006 together, then T007.
- US1: T011 and T014 alongside each other once T010 is written.
- US3: T023 (CSS) alongside US2's adapter tasks.
- Polish: T026 and T027 together.

## Parallel Example: Phase 2

```bash
# Tests and test infrastructure together (different files):
Task: "T002 mealsInRange tests in tests/domain/week.test.ts"
Task: "T003 gesture rule tests in tests/ui/week-track-vm.test.ts"
Task: "T004 Week face and canCopy tests in tests/ui/week-vm.test.ts"
Task: "T008 pointer-capture and reduced-motion stand-ins in tests/setup.ts"
Task: "T009 PointerEvent helpers in tests/ui/pointer.ts"

# Then the two independent implementations:
Task: "T005 mealsInRange in src/domain/week.ts"
Task: "T006 WEEK_TRACK and pure functions in src/ui/view-models/week-track.ts"
```

## Parallel Example: User Story 1

```bash
# After T010 (the failing tests):
Task: "T011 WeekTrack component in src/ui/components/WeekTrack.tsx"
Task: "T014 track CSS in src/ui/styles/app.css"
```

---

## Implementation Strategy

### MVP first (US1)

1. Phase 1, then Phase 2 (pure core and stand-ins).
2. Phase 3: the track, the adapter and the page wiring.
3. **Stop and validate**: T1–T4, T12, T15, then quickstart M1, M2 and M6 on an iPhone.
4. Deploy to `preview` (`npm run deploy:preview`) for a real-device try-out.

### Incremental delivery

1. Add US2: coexistence and interruptions. This is P1 too, and the feature shouldn't merge without it, because the card sits on the most-used screen.
2. Add US3: desktop overlay, reduced motion and screen-reader checks.
3. Polish: SPEC.md, the research outcome note, the full device run and tuning, the final gate.

### Notes

- If the device run (T028) can't make the hand-rolled track feel right, `WeekTrack`'s props are the seam for swapping the engine (plan.md, "Fallback"). Raise that with the user before changing approach.
- Don't push or open a PR without asking (project memory).
