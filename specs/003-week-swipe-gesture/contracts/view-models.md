# Contract: Pure functions (domain and view models)

Every function here is pure: no DOM, no clock, no randomness. Each has unit tests:
- the domain helper in `tests/domain/week.test.ts`
- the view models in `tests/ui/week-vm.test.ts` and the new `tests/ui/week-track-vm.test.ts`, which follow the existing view-model tests under `tests/ui/` The domain addition is covered by the 100% gate. The view-model files are outside the gate, but every case listed here is a required test (Principle IV).

## Domain: `src/domain/week.ts`

### `mealsInRange(meals: readonly Meal[], range: DateRange): Meal[]` (new)

The Meals whose `date` is within `range`, start and end inclusive, in input order.

The Week page now loads 35 days of Meals (research R9), and `weekHasPlan` counts every Meal it's given. Without this helper, "Skopiuj do następnego tygodnia" would be enabled for an empty Week whose neighbours have Meals.

Required tests:
- Keeps Meals on the first and last day of the range, and drops the days before and after.
- An empty input gives an empty result.
- Input order is kept.

## View model: `src/ui/view-models/week.ts` (changed)

### `trackMealsRange(weekStart: IsoDate): DateRange` (new)

`{ start: addDays(weekStart, -14), end: addDays(weekStart, 20) }`: the five faces' 35 days.

Tests:
- For `2026-11-02`: `2026-10-19` to `2026-11-22`.
- Across a year boundary, for `2026-12-28`: `2026-12-14` to `2027-01-17`.

### `weekFace(weekStart, offset, today, selected, meals, dishesById): WeekFace` (new)

```ts
interface WeekFace {
  weekStart: IsoDate;
  offset: -2 | -1 | 0 | 1 | 2;
  isViewed: boolean;          // offset === 0
  monthLabel: string;         // weekMonthLabel(weekStart)
  strip: StripCell[];         // as in feature 002
}
```

In `strip`:
- `isSelected` is `cell.date === sameWeekday(selected, weekStart)`.
- `kcal` is empty for a day without Meals.

`meals` may span more than this Week, because `selectWeekDays` filters by date.

Tests:
- The next face of Wed 4 Nov 2026 marks Wed 11 as selected.
- A face with today in it marks today.
- A face spanning two months gets "Październik – listopad 2026".
- A day in a neighbour with Meals shows its kcal. Meals outside the face are ignored.

### `weekTrackFaces(weekStart, today, selected, data): WeekFace[]` (new)

Returns the five faces, offsets −2…2 in order.

Tests:
- Five faces, `weekStart`s 7 days apart.
- Only offset 0 is `isViewed`.

### `weekPage(...)` (changed)

- `monthLabel` and `strip` come from `weekFace(weekStart, 0, …)`, so the viewed face and the page can't disagree.
- `canCopy` is `weekHasPlan(mealsInRange(meals, weekRange(weekStart)), daySlots)`.

Test: an empty viewed Week with Meals only in the next Week has `canCopy === false`, and the strip shows no kcal.

### `swipeWeekDelta` (removed)

Replaced by `releaseTarget`. Its tests in `tests/ui/week-vm.test.ts` are removed with it.

## View model: `src/ui/view-models/week-track.ts` (new)

### Constants

```ts
export const WEEK_TRACK = {
  GAP_PX: 12,               // space between faces (FR-002)
  EDGE_ZONE_PX: 24,         // ignore starts this close to a viewport edge (FR-011)
  SLOP_PX: 8,               // movement before the axis is decided (FR-005, FR-010)
  COMMIT_RATIO: 1 / 3,      // of the pitch (FR-005)
  FLICK_VELOCITY: 0.3,      // px/ms
  FLICK_MIN_PX: 20,
  VELOCITY_WINDOW_MS: 100,
  RESISTANCE: 0.35,         // rubber band past anchor ± 1
  DIM_OPACITY: 0.5,         // neighbour strength (FR-004)
  SETTLE_MIN_MS: 150,       // FR-006
  SETTLE_MAX_MS: 250,
} as const;
```

These are starting values. Tune them on a device (quickstart M3) and keep the tests pointing at the constants, not at literal numbers.

### Functions and required tests

| Function | Contract | Required tests |
|---|---|---|
| `inEdgeZone(x, viewportWidth)` | `x < EDGE_ZONE_PX \|\| x > viewportWidth − EDGE_ZONE_PX` | 0, 23 → true; 24 → false; `width − 24` → false; `width − 23` → true |
| `classifyDrag(dx, dy)` | `'pending'` while `max(\|dx\|, \|dy\|) < SLOP_PX`; then `'horizontal'` if `\|dx\| > \|dy\|`, else `'vertical'` | (5, 2) → pending; (9, 2) → horizontal; (−9, 2) → horizontal; (6, 9) → vertical; (9, 9) → vertical (a tie scrolls) |
| `dragPosition(startPosition, dxPx, pitchPx, anchor)` | `raw = startPosition − dxPx / pitchPx`. Past `anchor ± 1`, the excess is multiplied by `RESISTANCE`. `pitchPx ≤ 0` → `startPosition` | Drag left by half the pitch → +0.5; right → −0.5; left by 1.5 pitches → `1 + 0.5 × RESISTANCE`; from start −0.3 (after a catch) left by 0.2 pitch → −0.1; pitch 0 → unchanged |
| `releaseVelocity(samples, nowT)` | px/ms of `x` over the samples within `VELOCITY_WINDOW_MS` of `nowT`. Fewer than two, a zero time span or non-finite values → 0 | Steady 1 px/ms → 1; old samples are ignored; one sample → 0; equal timestamps → 0 |
| `releaseTarget({ anchor, position, velocity, movedPx })` | See research R4. Always within `anchor ± 1` | d = 0.34 → +1; d = 0.32 slow → anchor; d = −0.34 → −1; quick flick left (v = −0.4, moved −25) at d = 0.07 → +1; quick but moved only −15 → anchor; flick against the drag direction → anchor; d = 1.4 → +1 (never +2); the catch case: anchor 0, position −0.2, flick left → +1 |
| `settleDuration(distance)` | `SETTLE_MIN_MS + (SETTLE_MAX_MS − SETTLE_MIN_MS) × min(1, \|distance\|)` | 0 → 150; 0.5 → 200; 1 → 250; 1.3 → 250 |
| `easeOutCubic(t)` | `1 − (1 − t)³`, with `t` clamped to [0, 1] | 0 → 0; 1 → 1; 0.5 → 0.875; −1 → 0; 2 → 1 |
| `tweenPosition(from, to, elapsedMs, durationMs)` | `from + (to − from) × easeOutCubic(elapsed / duration)`. Duration 0 → `to` | Halfway is 87.5% of the way; past the duration → `to`; duration 0 → `to` |
| `trackFrame(position)` | `{ railShift: −position, opacities: Record<offset, number> }`, with `opacity = 1 − (1 − DIM_OPACITY) × min(1, \|offset − position\|)` | Position 0: offset 0 → 1, ±1 → 0.5, ±2 → 0.5; position 0.5: offsets 0 and 1 → 0.75 |
| `railTransform(shift)` / `faceTransform(offset)` | CSS strings: `translateX(calc(<n> * (100% + 12px)))` | The exact string for 0, 1 and −0.25 (no exponent notation) |

The adapter only wires these together. Every number it writes to the DOM comes from one of them.
