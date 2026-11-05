# Contract: Week card track (UI and adapter)

This changes [feature 002's Week page contract](../../002-week-planning/contracts/ui.md). Everything not listed here stays as in feature 002: routes, sheets, Slot cards, the copy dialog and Polish strings. No new user-facing strings are added.

## Week card structure

```text
<section class="week-card">                         (touch-action: pan-y, as today)
  <div class="week-track">                          WeekTrack: overflow hidden, gesture listeners
    <div class="week-track-rail">                   transform written by the adapter
      <div class="week-face" ×5                     key = face.weekStart
           style="transform: translateX(calc(offset * (100% + 12px)))"
           inert / aria-hidden="true" unless isViewed>
        <h2 class="week-card-month">{monthLabel}</h2>
        <DayStrip cells={strip} onSelect=…/>        unchanged component
      </div>
    </div>
    <div class="week-card-nav">                     fixed, top right, outside the rail
      <button aria-label="Poprzedni tydzień">       moved here from the face header
      <button aria-label="Następny tydzień">
    </div>
  </div>
  <div class="week-card-totals">…</div>             fixed (FR-003), unchanged
  <button class="week-card-copy">…</button>         fixed (FR-003), unchanged
</section>
```

- **Stacking**: the faces share one grid cell (`grid-area: 1 / 1`), so the rail takes the height of one face, and all faces sit at the same top.
- **The month row**: the face's `h2` leaves room on the right for `.week-card-nav` on screens ≥ 1024 px. Below that width, the nav stays visually hidden but readable by screen readers (feature 002 FR-005, unchanged).
- **Neighbour faces**: `inert` and `aria-hidden="true"`. `inert` takes them out of focus and the accessibility tree (FR-015). `aria-hidden` makes the same rule visible to Testing Library's role queries.
- **Day taps**: `onSelect` is passed to every face. Only the viewed face can be tapped, because the others are inert.
- **The ← / → buttons**: a `pointerdown` whose target is inside `.week-card-nav` is ignored by the gesture ([data-model.md](../data-model.md), rule 5). The buttons act only through `click`, so on a wide touch screen a drag can't start on them.

## `WeekTrack` component (`src/ui/components/WeekTrack.tsx`)

```ts
interface WeekTrackProps {
  faces: WeekFace[];                 // weekTrackFaces(…), five, offsets −2…2
  onMove(days: number): void;        // commit: ±7·n, called inside flushSync
  onSelect(date: IsoDate): void;     // day tap, unchanged
}
```

- **Render.** It renders the structure above from `faces`, with no logic.
- **Gestures.** `useWeekTrackGesture(trackRef, railRef, faceRefs, { onMove })` in `src/ui/hooks/useWeekTrackGesture.ts` is the isolated adapter (Principle IV). It returns `step(direction: 1 | -1)` for the two buttons. It holds the [gesture state](../data-model.md#gesture-state-adapter-useweektrackgesture-refs-only) in refs, attaches the pointer listeners in an effect, runs the `requestAnimationFrame` tween, and writes `trackFrame` output to `style.transform` and `style.opacity`.
- **Platform APIs.** The adapter is the only code that touches:
  - `PointerEvent`
  - `setPointerCapture`
  - `requestAnimationFrame` and `cancelAnimationFrame`
  - `matchMedia('(prefers-reduced-motion: reduce)')`
  - `clientWidth`
  - `visibilitychange`
- **After a commit.** The faces re-render with new keys, so the adapter writes the frame again in the same task, after `flushSync` returns.

## `WeekPage` changes

- Remove:
  - `slide` state
  - `touchStart` ref
  - `onTouchStart` and `onTouchEnd`
  - the `key={weekStart}` `.week-slide` wrapper
- `moveWeek(days)` keeps its body without `setSlide`: `addDays` and `sameWeekday`. It's passed as `onMove`.
- The Meals query uses `trackMealsRange(weekStart)`. The `daySlots` query stays `weekRange(weekStart)`.
- Render `<WeekTrack faces={weekTrackFaces(…)} onMove={moveWeek} onSelect={setSelected} />` in place of the old header and `DayStrip`.

## CSS (`src/ui/styles/app.css`)

- Remove `.week-slide-next`, `.week-slide-previous`, both `@keyframes week-slide-*` and their reduced-motion block (FR-006).
- Add (as built; changed during implementation from a shared grid cell and `overflow: hidden` on the track):
  - `.week-card { overflow: clip; }` (with an `overflow: hidden` fallback), so the rail never widens the page.
  - `.week-track { position: relative; clip-path: inset(-20px -12px -24px); }`. The clip reaches the 12 px gap past the sides, so a neighbour stays hidden at rest, and the selected pill's shadow isn't cut.
  - `.week-track-rail { position: relative; display: flex; flex-direction: column; justify-content: flex-end; height: 100%; will-change: transform; }`
  - `.week-face { position: absolute; bottom: 0; left: 0; width: 100%; }`, and `.week-face-viewed { position: relative; }`. Only the viewed face takes up height. With a shared grid cell, a neighbour's two-line month label ("Październik – listopad 2026" wraps at 375 pt) left a gap under nearly every Week's strip. The faces align at the bottom, so the day pills slide in one row.
  - While a gesture or settle runs, the adapter sets the track's `height` from `trackHeight` (contracts/view-models.md), so the totals slide instead of jumping when the month label's line count changes.
- `.week-card-nav`: on ≥ 1024 px, position it absolutely at the top right of `.week-track`. The phone rule (visually hidden) is unchanged.
- Keep `.week-card { touch-action: pan-y; }`.
- Add no transition on the rail or the faces. The adapter owns all motion.

## Behaviour checks (component tests, `tests/ui/week-page.test.tsx`)

These replace the TouchEvent swipe test. Five faces put the same month label, and today's pill, in more than one face. So every text query and every `.day-pill*` selector in this file, old tests included, is scoped to the viewed face (`.week-face:not([inert])`). They drive `PointerEvent`s with `pointerType: 'touch'` and fixed `timeStamp`s, and the track's `clientWidth` is defined as 360 ([research.md](../research.md) R10). Settles are instant through the reduced-motion `matchMedia` stand-in.

| # | Gesture | Expected | Covers |
|---|---|---|---|
| T1 | A slow drag 140 px left (more than a third) | After the moves and before `pointerup`: heading still "Środa, 4 lis". After `pointerup`: heading "Środa, 11 lis", the viewed face reads "Listopad 2026" and Wed 11 is pressed | US1/AC3, FR-003, FR-005, FR-007 |
| T2 | A slow drag 140 px right, twice | Heading "Środa, 28 paź" after the first, "Środa, 21 paź" after the second | US1/AC2, FR-007 |
| T3 | A slow drag 60 px left | Week unchanged | US1/AC4 |
| T4 | A quick 30 px flick left (two samples 50 ms apart) | Next Week | US1/AC5 |
| T5 | A movement 40 px right and 120 px down | Week unchanged, and no click is swallowed afterwards | US2/AC1, FR-010 |
| T6 | `pointerdown` at `clientX` 10 (edge zone), then a drag left | Week unchanged | FR-011 |
| T7 | `pointerType: 'mouse'` drag | Week unchanged | FR-013 |
| T8 | A drag of 140 px starting on the "Czwartek, 5 lis" pill, then the click that follows | Week changes. Thursday is not selected by the drag | US2/AC4, FR-012 |
| T9 | Tap a pill (down and up, no move) | That day is selected | US2/AC3 |
| T10 | `pointercancel` mid-drag | Week unchanged | FR-009 |
| T11 | Neighbour faces | Four `.week-face` elements are `inert`. `getAllByRole('heading', { level: 2 })` has one element | FR-015, US3/AC3 |
| T12 | The neighbour shows its own kcal (a Meal on Wed 11) before any move | `350` in the next face's strip | FR-002 |
| T13 | ← / → buttons | As in feature 002's test. They still change the Week and keep the weekday | FR-013, US3/AC1 |
| T14 | "Skopiuj…" on an empty Week with Meals only next Week | Disabled | R9 |
| T15 | Motion on (`matchMedia` overridden to not match), Vitest fake timers for `requestAnimationFrame`. Flick left, advance 60 ms, flick left again, run all frames | Heading "Środa, 18 lis" (two Weeks). The heading read "Środa, 11 lis" from the moment of the second `pointerdown` | FR-017, FR-009 |
| T16 | The T15 setup. Flick left, advance 60 ms, then **tap** the card (down and up, no move), and run all frames | Heading "Środa, 11 lis". The rail's transform is `railTransform(0)`, so the face ended centred | FR-009, data-model rule 4 |
| T17 | The T15 setup. Flick left, advance 60 ms. Then a `pointerdown` in the edge zone (`clientX` 10), a `pointerdown` with `pointerType: 'mouse'`, and a `pointerdown` on "Następny tydzień". Run all frames | Each is ignored, and the first settle finishes untouched: heading "Środa, 11 lis", rail at `railTransform(0)` | FR-011, FR-013, data-model rule 5 |
| T18 | A slow 140 px drag left, then `pointerup`, then `lostpointercapture` for the same pointer | Heading "Środa, 11 lis". The late `lostpointercapture` doesn't spring it back | FR-009, data-model "Event order" |

Not testable in jsdom, and checked on a device instead ([quickstart.md](../quickstart.md)):
- finger-follow smoothness
- the animation curve and its feel
- dimming
- the iOS edge gesture
- VoiceOver
