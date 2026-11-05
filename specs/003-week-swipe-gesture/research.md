# Research: Week Swipe Gesture

Phase 0 of [plan.md](plan.md). This builds on [docs/research/week-swipe-gesture.md](../../docs/research/week-swipe-gesture.md), which compared Swiper, Embla, Motion and a hand-rolled track, and recommended Swiper with the hand-rolled track as the fallback. The clarifications on 2026-11-05 added FR-017 (catch the card mid-settle, so two quick flicks move two Weeks) after that research was written. R1 re-checks the recommendation against it.

Every decision lists what was chosen, why, and what was rejected.

## R1. Gesture engine: hand-rolled Pointer Events track, not Swiper

**Decision**: Build the track ourselves: Pointer Events, a transform written through a ref, and a `requestAnimationFrame` tween. All decisions go through pure functions (R3–R7). Swiper isn't used.

**Rationale**: Swiper can't meet FR-017 and FR-009 as clarified. Both points were read in the installed `node_modules/swiper/shared/swiper-core.mjs` (12.2.0) on 2026-11-05:

1. **Release rule.** `onTouchEnd` finds `stopIndex`, the slide band the track is currently in, and a short swipe goes to `stopIndex + 1`. Say the user grabs the card while it's settling from slide 1 to slide 2, at position 1.7, and flicks left. Swiper settles on slide 2, which is where the first flick was already going, so the second flick is lost. FR-009 counts from the Week that was settling (slide 2), so the flick must go to slide 3. The rule is in core and isn't a parameter.
2. **Re-centring.** The research's plan re-centres the three slides on `swiperslidechangetransitionend`. On the first `touchmove` during an animation, Swiper dispatches a synthetic `transitionend` (`detail.bySwiperTouchMove`), after it has already captured `startTranslate`. Re-centring at that moment would move the track one slide width under the finger, which is a visible jump (FR-008). Skipping re-centring while touched means a chained flick runs out of slides after one Week with three slides.

Working around both would mean overriding Swiper's release decision and translate state from outside, which fights the library. The hand-rolled track was the research's stated fallback (§1, §5). It also gives us these benefits:
- The release rule becomes exactly the kind of pure function Principle IV asks for (`releaseTarget`, R4).
- Neighbour dimming can follow drag progress (FR-004) without Swiper's `creative` effect.
- Finger drags can be tested in jsdom with real `PointerEvent`s, because the adapter reads one width and no layout otherwise (R10). Swiper drags couldn't be tested there at all.
- 0 bytes and no new stack element. Swiper stays bundled only because Framework7 registers it.

**Alternatives considered**:
- *Swiper with five slides* (two neighbours on each side) and re-centring only when the track settles untouched. It supports one chained flick but still loses the second because of point 1, and it adds DOM for no visible benefit.
- *Swiper `virtual.renderExternal` with a huge index range*, so no re-centring is ever needed. This was unverified in the research (§6) with Swiper Element and React-owned slides. It still has point 1, and it needs translate values in the millions of pixels on iOS.
- *Relax FR-017* (ignore touches until the settle ends) and keep Swiper. This was rejected because the user chose FR-017 in clarification.
- *Motion `drag`*: it hands us offset and velocity, so our rule could decide. But it costs about 40 kB gzipped (research §3.3) and needs an ADR for a new stack element. The hand-rolled track covers the same ground in about 150 lines.

## R2. Track model: one continuous position, five faces, rebase only at rest or on a catch

**Decision**: The track state is one number, `position`, in Weeks relative to the viewed Week. 0 means the viewed Week is centred, +1 the next Week, −1 the previous. The track always renders **five** Week faces, for offsets −2 to +2 around the viewed Week. The rail is translated by `-position × pitch`, so the faces themselves never move in the DOM. The viewed Week (the React state from feature 002) changes only in these cases:
- **A settle ends** on a non-zero integer `n`. Commit `7n` days, then `position -= n`, in the same task.
- **A touch catches a running settle.** Its target becomes the viewed Week right away, and `position -= target` (spec FR-017).

**Rationale**:
- During a gesture, `position` stays between `anchor − 1` and `anchor + 1`, plus a rubber-band overshoot (R4), with `anchor` = 0 after any rebase. So offsets −2 to +2 always cover what can be on screen. That includes the far side of a neighbour while its own neighbour peeks in.
- A rebase changes the viewed Week and `position` by the same amount. Faces are keyed by date, so every visible face keeps its DOM node and its pixel position. `flushSync` commits React's re-render and the adapter writes the new transform before the browser paints, so nothing jumps (FR-008).
- Five faces of seven buttons each is a small DOM. Rendering all five all the time means no window state to keep in sync.

**Alternatives considered**:
- *Three faces with re-centring after every settle* (the research sketch). This breaks on a catch mid-settle, because the next-but-one Week isn't rendered (R1, point 2).
- *A windowed face set that follows `position`*. It's correct, but it needs extra state and re-renders while dragging, for no gain over five fixed faces.
- *Commit the Week on release* instead of at settle end. It's simpler, but it updates the totals and Slots about 200 ms before the face arrives, against FR-003.

## R3. Pointer handling and coexistence

**Decision**: Listeners go on the track element (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`, `lostpointercapture`). They're added in an effect, not through React props, so `pointermove` never re-renders. Rules:
- **Only touch and pen.** `pointerType === 'mouse'` is ignored (FR-013: desktop uses the buttons).
- **One finger.** The first `pointerId` is tracked. Further pointers are ignored until it ends. If the system cancels the tracked pointer (for example, a pinch starts), the face springs back.
- **Edge zone (FR-011).** A `pointerdown` within `EDGE_ZONE_PX` (24 px) of either viewport edge is ignored for the whole gesture. Swiper uses 20 px for iOS, and Framework7's own iOS swipe-back area is 30 px (research §3.1, ref [8]). 24 px sits between them. The card sits inside a 16 px page gutter, so only the card's outer 8 px are affected.
- **Axis lock (FR-010).** Nothing moves until the finger has travelled `SLOP_PX` (8 px). Then `classifyDrag` decides: horizontal if `|dx| > |dy|`, otherwise vertical. A vertical gesture is released for the rest of its life. A horizontal one calls `setPointerCapture`, and from then on the face follows the finger.
- **Touch action.** Keep `touch-action: pan-y` on the card (already in `app.css`), so the browser scrolls vertically and never scrolls for a horizontal drag. If the browser takes the gesture for a scroll, it sends `pointercancel` (MDN, research ref [20]), and the face springs back.
- **Clicks after a drag (FR-012).** Once a gesture locks horizontal, the adapter swallows the next `click` on the track in the capture phase, so a drag that starts on a day pill doesn't select it. A tap never locks horizontal, so its click passes through.
- **Interruptions (FR-009).** `pointercancel`, `lostpointercapture` without `pointerup`, and `visibilitychange` to hidden all settle to the anchor. When hidden, the settle is instant.

**Rationale**: These are the edge cases the research listed as "ours" for the hand-rolled option (§3.4). Each one is a small rule, and the numeric ones are pure functions (R4).

**Alternatives considered**:
- *Touch Events*: Swiper and Pointer Events both cover iOS 13+ (research ref [22]). Pointer Events also give pen support and `setPointerCapture`.
- *`preventDefault` on `touchmove`*: it isn't needed with `touch-action: pan-y`, and it would need a non-passive listener. Add it only if the device check shows the page scrolling during a horizontal drag (quickstart step M4).

## R4. Release rule and its numbers

**Decision**: These live in `releaseTarget(anchor, position, velocity, movedPx)` in `src/ui/view-models/week-track.ts`, which is pure:
- A **flick** counts when `|velocity| ≥ FLICK_VELOCITY` (0.3 px/ms), with `|movedPx| ≥ FLICK_MIN_PX` (20 px) in the same direction. The target is then `anchor ± 1` in the flick's direction. It's checked first: after a catch the card can rest past a third the other way (for example at −0.4), and a flick left from there must still show the next Week (FR-017). *Changed during implementation: the first draft checked distance first, which sent the second of two quick flicks back a Week.*
- Otherwise, `d = position − anchor`. If `d ≥ COMMIT_RATIO` (1/3), go to `anchor + 1`. If `d ≤ −COMMIT_RATIO`, go to `anchor − 1`.
- Otherwise, go back to `anchor` (spring back).
- The result is always within `anchor ± 1` (FR-009).

`velocity` comes from `releaseVelocity(samples)`: the finger's speed over the last `VELOCITY_WINDOW_MS` (100 ms) of `pointermove` samples, with timestamps from `event.timeStamp`. While dragging, `dragPosition(start, dxPx, pitchPx, anchor)` applies a rubber band past `anchor ± 1`. The overshoot is multiplied by `RESISTANCE` (0.35).

**Rationale**:
- One third of the width matches the spec (FR-005).
- 0.3 px/ms with at least 20 px separates a deliberate flick from the 8–15 px wobble of a tap. Swiper's equivalent is any release within 300 ms (research §3.1), which is looser and would trip on small flicks.
- The values are constants in one exported object (`WEEK_TRACK`), so tuning them on a device is a one-line change, and tests can read them (quickstart M3).

**Alternatives considered**:
- *Distance only, the current `swipeWeekDelta` with 50 px*: no flick, against FR-005 and US1/AC5.
- *Momentum projection* (project the position from velocity and round): more physical, but harder to reason about, and it can't promise "at most one Week" without the same clamp.

## R5. Settle animation: `requestAnimationFrame` tween with a pure curve

**Decision**: A settle tweens `position` from its current value to the target with `easeOutCubic`. Its duration is `settleDuration(distance) = 150 + 100 × min(1, |distance|)` ms, so a full-width settle takes 250 ms and a short spring-back 150 ms (FR-006). Each frame calls the pure `tweenPosition(from, to, elapsedMs, durationMs)` and writes the frame (R6). A new touch or a button press cancels the frame loop and reads `position`, which is always known exactly (FR-017).

**Rationale**:
- With a JS-owned position, catching mid-settle is a variable read. With CSS transitions or WAAPI, we'd have to parse the computed transform matrix, and WAAPI's `Element.animate` isn't in jsdom (research ref [28]).
- The tween runs for at most 250 ms on a page that is otherwise idle, so main-thread frames are not a risk.
- `easeOutCubic` starts fast, so the settle feels like it continues the finger's motion.

**Alternatives considered**:
- *CSS transition on the rail*: the browser runs it, but catching it needs `getComputedStyle`, and the duration and easing would be split between CSS and TS.
- *WAAPI*: the same catch problem, and missing from jsdom.
- *A fixed 200 ms for every settle*: a 20 px spring-back would crawl.

## R6. Neighbour dimming and frames

**Decision**: `trackFrame(position)` (pure) returns the rail offset and one opacity per face offset −2…2: `opacity = 1 − (1 − DIM_OPACITY) × min(1, |offset − position|)`, with `DIM_OPACITY` = 0.5. The adapter writes these values to the rail's and the faces' `style` through refs on every drag move and tween frame, without React. The face's horizontal position is a static style from React: `translateX(calc(offset × (100% + GAP)))`. The rail's transform is `translateX(calc(−position × (100% + GAP)))`, which is resolution-independent, so a resize or rotation needs no work (spec edge case). The pixel `pitch` is read from the track's `clientWidth` only at `pointerdown`, to turn finger pixels into Weeks.

**Rationale**:
- FR-004 asks for neighbours that reach full strength as they arrive, which means opacity tied to progress, not a class toggle.
- Percent-based transforms mean the layout doesn't depend on JS.

**Alternatives considered**:
- *A static `.week-face:not(.viewed) { opacity: .5 }`*: it jumps at commit instead of brightening on arrival.
- *A React re-render per frame*: it works, but it's wasteful, and it puts React on the hot path of the primary interaction.

## R7. Reduced motion

**Decision**: The adapter checks `matchMedia('(prefers-reduced-motion: reduce)')` each time a settle starts. When it matches, the settle duration is 0: the frame is written and the Week committed synchronously (FR-014). Dragging still follows the finger. `tests/setup.ts`'s `matchMedia` stand-in now matches that one query, so jsdom tests settle instantly without timers (R10).

**Rationale**: Reading it at each settle picks up a change in system settings without a listener. Swiper had no reduced-motion handling either (research §3.1), so this costs nothing extra.

## R8. Desktop buttons and the screen-reader buttons

**Decision**: The ← / → buttons move out of the sliding month header into a fixed `.week-card-nav` overlay at the card's top right, outside the track. A click calls the same settle path as a flick: catch any running settle, rebase, then settle to ±1 (FR-013). Rapid clicks therefore chain like rapid flicks. On phones they stay visually hidden and available to screen readers, as in feature 002.

**Rationale**: One commit path for buttons and swipes, so they can't drift apart (FR-007, US3/AC1).

## R9. Data: one Meals query for the five faces

**Decision**: The Week page's Meals query becomes `listMeals(trackMealsRange(weekStart))`, a 35-day window from `weekStart − 14` to `weekStart + 20`. It's still one indexed Dexie `between` (research §5, "Data"). The view model narrows to the viewed Week where it matters:
- `selectWeekDays` and `selectDay` already filter by date.
- `weekHasPlan` doesn't: it counts every Meal it's given. `weekPage` must pass it only the viewed Week's Meals, through a new domain helper `mealsInRange(meals, range)` (100% coverage). Otherwise "Skopiuj do następnego tygodnia" would be enabled for an empty Week whose neighbours have Meals.
- `daySlots` stays viewed-Week only. Neighbour faces show only kcal, so they never need Slots.

`useLiveQuery` keeps the previous result while the next query runs (research ref [27]). After a rebase of one Week, the old 35-day window still covers offsets −1…+1 of the new Week, and the new far face loads off-screen (spec edge case "Neighbour Meals still loading").

**Alternatives considered**:
- *Three separate queries*: three subscriptions with three loading states, for one table.
- *A 21-day window* (the research sketch): it doesn't cover the ±2 faces that a rebase on a catch can bring into view.

## R10. Testing the adapter in jsdom

**Decision**: Component tests drive the real adapter with `PointerEvent`s. jsdom 29 has the constructor (research ref [28]). Test stand-ins in `tests/setup.ts`, added only where the API is missing:
- `Element.prototype.setPointerCapture`, `releasePointerCapture` and `hasPointerCapture` as no-ops.
- `matchMedia` matches only `(prefers-reduced-motion: reduce)`, so settles are synchronous.

Per test, a helper:
- defines the track's `clientWidth` (for example 360) with `Object.defineProperty`, because jsdom has no layout
- dispatches `pointerdown`, `pointermove` and `pointerup` with `pointerType: 'touch'`, `clientX` and `clientY`, and a fixed `timeStamp` set on the event object, so velocity is deterministic and no real time is read

**Rationale**: Principle IV (no real timers, deterministic tests). Unlike Swiper, this lets jsdom check the commit rule end to end: a long drag, a short drag, a flick, a vertical drag, an edge start and a drag that starts on a pill. The visual feel stays a device check (quickstart).

**Alternatives considered**:
- *Fake timers with real animation*: possible, but the tween already has pure tests (R5). Instant settles keep component tests about behaviour.

## R11. No ADR

**Decision**: No ADR. The stack doesn't change, because Pointer Events and `requestAnimationFrame` are platform APIs. The decision isn't hard to reverse: the adapter sits behind one component interface (`WeekTrack`), so Swiper or Motion could replace it without touching the page or the view models. The reasoning lives here and in the plan's Complexity Tracking (Principle V).
