# Data Model: Week Swipe Gesture

**No stored data changes.** No Dexie version bump, no new tables or fields, and nothing new in export or import. The feature reads **Meals** as feature 002 does, over a wider date range ([research.md](research.md) R9). This document describes the page state and the gesture state that the adapter keeps.

## Page state (React, `WeekPage`)

These are unchanged from feature 002, apart from the slide-in state.

| Field | Type | Meaning | Changes when |
|---|---|---|---|
| `view.weekStart` | `IsoDate` (a Monday) | The viewed Week | A settle ends on ±n, or a catch rebases (below). Changes by `7n` days |
| `view.selected` | `IsoDate` | The selected day, always inside the viewed Week | A day tap, or with `weekStart`, via `sameWeekday` (FR-007) |
| `today` | `IsoDate` | Today's mark | On mount and when the page becomes visible (feature 002) |
| ~~`slide`~~ | — | **Removed.** The CSS slide-in animation it drove is gone (FR-006) | — |

Derived each render, all pure:
- `meals` = `listMeals(trackMealsRange(weekStart))`, 35 days.
- `model` = `weekPage(...)`, as in feature 002. Its strip now comes from `weekFace`, and `canCopy` comes from the viewed Week's Meals only.
- `faces` = `weekTrackFaces(weekStart, today, selected, meals, dishes)`, five faces.

## Week face (view model, pure)

One per offset −2…+2. Built by `weekFace` ([contracts/view-models.md](contracts/view-models.md)).

| Field | Type | Rule |
|---|---|---|
| `weekStart` | `IsoDate` | `addDays(viewed weekStart, 7 × offset)`. It's also the React key |
| `offset` | `-2 \| -1 \| 0 \| 1 \| 2` | The face's place on the rail |
| `isViewed` | `boolean` | `offset === 0`. Only this face is focusable and exposed to screen readers (FR-015) |
| `monthLabel` | `string` | `weekMonthLabel(weekStart)`, for example "Październik – listopad 2026" |
| `strip` | `StripCell[]` | As in feature 002. `isSelected` marks `selected`, in the viewed face only. In a neighbour, the same weekday is `isPending` instead: a filled copy of its pill fades in, from `selectionFades`, while a settle heads to that Week (spec edge case, changed after the device run). `isToday` marks today in any face |

## Gesture state (adapter, `useWeekTrackGesture`, refs only)

This state is never in React state. React only learns about a gesture through `onMove(days)`, which commits a Week change.

| Field | Type | Meaning |
|---|---|---|
| `position` | `number` (Weeks) | Rail position relative to the viewed Week. 0 = centred |
| `anchor` | `number` (integer) | The Week the current gesture is measured from. It's 0 after every rebase |
| `pointerId` | `number \| null` | The tracked finger |
| `start` | `{ x, y, position }` | Where the tracked finger went down, and the position at that moment |
| `samples` | `{ t, x }[]` | `pointermove` samples for `releaseVelocity`, trimmed to the last 100 ms |
| `pitch` | `number` (px) | Track `clientWidth` + `GAP_PX`, read at `pointerdown` |
| `tween` | `{ from, to, startT, duration, frame } \| null` | The running settle |
| `swallowClick` | `boolean` | Set when a gesture locks horizontal. Cleared by the next click |

### States and transitions

```text
                 pointerdown (touch/pen, not in edge zone, not on ← / →, no tracked finger)
     ┌──────┐ ─────────────────────────────────────────────▶ ┌─────────┐
     │ idle │                                                 │ pressed │
     └──────┘ ◀── pointerup / cancel (no move past slop): ─── └─────────┘
                  settle to anchor if position ≠ anchor (rule 4)
        ▲                                                       │ moved ≥ SLOP_PX
        │                                     classifyDrag      │
        │                         vertical ◀────────────────────┤
        │                     (ignored until up/cancel)         │ horizontal
        │                                                       ▼
        │          settle done: commit 7·target           ┌──────────┐
        │◀───────────────────────────── ┌──────────┐ ◀────│ dragging │
        │                               │ settling │ up   └──────────┘
        │                               └──────────┘ (releaseTarget)
        │                                     │  ▲            ▲
        │                                     │  └── cancel, lost capture,
        │                                     │      hidden → settle to anchor
        │   pointerdown or ← / → during settle (catch):
        │   stop tween, commit 7·target, position −= target, anchor = 0
        └───────────────────────────────────────▶ pressed (or a new settle for a button)
```

Rules the transitions keep. Each has a test in [contracts/view-models.md](contracts/view-models.md) or [contracts/ui.md](contracts/ui.md).

1. **One commit path.** A Week change only ever happens through `commit(n)`: `flushSync(() => onMove(7n))`, then `position -= n`, then the frame is written. All three run in one task, before paint (FR-008).
2. **At most one Week per gesture.** `releaseTarget` returns `anchor + {−1, 0, +1}` (FR-009).
3. **A catch finishes the settle.** A `pointerdown`, or a button press, during `settling` commits the tween's target first (spec FR-017). So `anchor` is 0 whenever a gesture starts.
4. **Always ends on one Week.** Every exit from `pressed` or `dragging` other than a release after a horizontal drag settles to `anchor` when `position ≠ anchor` (FR-009). That covers:
   - a tap, which is a `pointerup` from `pressed`
   - a vertical gesture
   - `pointercancel`
   - `lostpointercapture` while the tracked pointer is still active (it isn't preceded by its `pointerup`)
   - the page being hidden

   This matters after a catch, when a gesture can start at a position like −0.3.
5. **Filtered starts never leave `idle`, and never catch** (FR-011, FR-013). The filters run before the catch in rule 3. These pointers are ignored, and a running tween carries on untouched:
   - a mouse pointer
   - a start in the edge zone
   - a start on the ← / → buttons (they act through `click`)
   - a second pointer while one is tracked
6. **Reduced motion.** A settle with duration 0 commits synchronously (FR-014).

## Validation of inputs from the platform

- `pitch ≤ 0` (hidden tab, jsdom without a width): the gesture is ignored. `dragPosition` returns `start.position`.
- Non-finite or out-of-order timestamps: `releaseVelocity` returns 0, so the release is decided by distance only.
- A second pointer: it's ignored while one is tracked (rule 5). If the system cancels the tracked one, rule 4 applies.
- Event order: browsers fire `lostpointercapture` *after* `pointerup`. So the adapter clears the tracked pointer on `pointerup`, and treats a later `lostpointercapture` for a pointer it no longer tracks as a no-op.
