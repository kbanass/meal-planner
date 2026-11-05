# Research: the drag-to-change-Week gesture on the Week card

Status: research only, nothing built. Date: 2026-11-05. Versions were checked against the npm
registry that day. The planned behaviour is described in `docs/SPEC.md` (Tydzień, "Planned (later)").

## 1. Summary and recommendation

Use **Swiper, which Framework7 already ships**, through its Swiper Element web component
(`<swiper-container>`). Render a three-slide track (previous, current and next Week), and re-centre
it after every settled move. Framework7 9.3 bundles Swiper 12 and registers the element globally,
so the app's built bundle already contains it. That means **0 extra bytes** and no new stack
element [2][3][8]. Swiper handles finger-follow, the angle-based scroll lock, `touch-action: pan-y`,
iOS edge-swipe release, resistance, click suppression and the release animation [4][7]. Our code
keeps the parts that matter: pure functions for "which three Weeks" and "slide index to ±7 days",
and the React state. The fallback is a hand-rolled 3-panel Pointer Events track if Swiper's
built-in release rule can't be tuned to feel right on a real iPhone. Motion and Embla work, but
each adds a dependency (and an ADR) without solving anything Swiper doesn't.

## 2. Requirements

From the user, including the later change that adds neighbour peeking:

- **R1 Follow.** Touch and drag the Week card horizontally, and the content follows the finger.
- **R2 Peek.** While dragging, the previous and next Weeks are visible beside the current one,
  with real content: the month label and the 7-day strip with kcal. Dragging left reveals the next
  Week from the right. Dragging right reveals the previous one.
- **R3 Commit or spring back.** On release, a long enough drag or a quick flick settles the
  neighbour into place. Anything else springs back.
- **R4 Quick.** Settle and spring-back animations take about 150–250 ms. This is the app's primary
  interaction.
- **R5 Coexist.** Vertical page scrolling keeps working. The gesture doesn't fight iOS Safari's
  edge swipe-back or Framework7's swipe-back.
- **R6 Desktop.** At ≥ 1024 px the ← / → buttons stay. Mouse drag is optional.
- **R7 State model.** `view = { weekStart, selected }` changes by ±7 days. Weeks are infinite in
  both directions. Today one Week is rendered. With R2 it becomes three.
- **R8 Constitution.** Principle IV: the decision logic and view models are pure and unit-tested,
  components are thin, and gesture code is an isolated adapter. Principle V: added complexity is
  justified, and "changing a stack element requires an ADR".
  (`.specify/memory/constitution.md`)
- **R9 Accessibility.** `prefers-reduced-motion` is respected. The off-screen neighbours must not
  be focusable or read out. Buttons stay keyboard-operable.
- **R10 Offline.** Everything is bundled and precached by `vite-plugin-pwa`, with no CDN.

### What changed with the peek requirement

The first brief asked for "slide or fade out, then the new Week fades in". With neighbours visible
during the drag, the next Week is already physically beside the current one, so the natural
release motion is a **slide that continues the finger's motion** into place. A full fade-out and
fade-in would contradict that spatial model: the Week you were pulling in would disappear and
reappear. A *subtle* fade still fits, with neighbours slightly dimmed (for example 0.5 opacity)
and brightening as they reach the centre, tied to drag progress. Swiper's `creative` effect can do
that per slide, because it computes opacity from each slide's progress [7]. Plain CSS dimming of
non-active slides is the simpler option. Fade is now decoration, not the transition itself.

### Current code, briefly

- `src/ui/pages/WeekPage.tsx` uses `onTouchStart` and `onTouchEnd` on `<section class="week-card">`.
  On release, `swipeWeekDelta(dx, dy)` decides, then `moveWeek(±7)` runs. A `key={weekStart}` div
  re-mounts with a 220 ms slide-in CSS class. There's no finger-follow and no neighbours.
- `src/ui/view-models/week.ts` has `swipeWeekDelta`, which commits at ≥ 50 px and when the swipe is
  mostly horizontal (`|dx| > 1.5·|dy|`).
- `weekPage()` builds the strip through `selectWeekDays(weekStart, …, meals, …)`, which filters
  `meals` by date itself (`src/domain/week.ts`). A wider Meal array is harmless, so one query
  can feed three Weeks.
- The Meals query is `listMeals(weekRange(weekStart))`, a Dexie indexed `between` on `date`
  (`src/data/week-repository.ts`).
- The Week page is the **root page** of the `#view-week` tab view (`src/ui/App.tsx`). Framework7's
  swipe-back only starts when there is a `.page-previous` to reveal (`swipe-back.js` looks it up
  before it can proceed) [8]. So R5's Framework7 half is already satisfied on this page. The iOS
  system gesture is the real concern (see §3.4).

## 3. Options

### 3.1 Swiper (Framework7's built-in Swiper Element)

**What Framework7 ships.** `framework7/lite-bundle`, which `src/main.tsx` imports, registers the
`Swiper` component. That component's module imports `swiper/bundle` and calls
`register()` from `swiper/element/bundle` at import time (`node_modules/framework7/components/swiper/swiper.js`)
[8]. Framework7 9.3.0 depends on `swiper ^12.1.2`, and 12.2.0 is installed [2]. Framework7's React
docs say: "Swiper React components are not included in Framework7 in favor of Swiper Element", and
"Swiper library already integrated into Framework7 and you don't have to install it separately"
[3]. I confirmed locally that a production build (`vite build` into a scratch folder) already
contains Swiper Element code: the `swiper-container` and `slidesPerView` strings are in the main
chunk. Framework7's own Swiper hooks only auto-initialise `swiper-container.tabs`, so a plain
`<swiper-container>` is left to us [8].

**How it would work.**

- Render `<swiper-container init="false">` with three `<swiper-slide>` children keyed by
  *position* (`prev`, `current`, `next`), not by date. React then reuses the DOM nodes and only
  their content changes.
- Set the params as properties, then call `initialize()`. Swiper Element's documented React path is
  a ref plus `addEventListener` in `useEffect` [5].
- The params are `initialSlide: 1`, `speed: 200`, `spaceBetween: 12`, `edgeSwipeDetection: true`,
  `simulateTouch: false` (no mouse drag), `a11y: false` and `resistanceRatio`.
- Listen to `swiperslidechangetransitionend`. Events are native DOM events, lower-case, with the
  `swiper` prefix [5].
- **Re-centring.** When `activeIndex` is 0 or 2, call
  `flushSync(() => setView(move(±7)))` and then `swiper.slideTo(1, 0, false)` in the same task.
  React re-renders the three slides synchronously (`flushSync`) [30]. The new middle slide shows
  exactly what slide 2 showed, and the zero-speed jump back to index 1 happens before the browser
  paints, so there's no visible jump. `runCallbacks = false` stops the jump from firing
  `slideChange` again [4].
- **Alternative: virtual slides.** Use a huge index range, where the index is derived from
  `weekStart`, with `virtual.renderExternal` so React renders only the visible three. Re-centring
  is then unnecessary. Swiper documents `renderExternal` "for external rendering, such as with
  React.js" [4], but I haven't verified that combination with *Swiper Element* plus React-owned
  slides. Swiper's Virtual option 2 removes DOM slides and caches them, which would fight React [5].
  Don't use `loop`: Swiper 11+ loop mode moves slide elements in the DOM (`loopFix`) [7], and
  React owns those nodes.

**Edge cases Swiper already handles (verified in Swiper 12.2.0 source [7]).**

- **Pointer events.** Swiper listens to `pointerdown`, `pointermove`, `pointerup` and
  `pointercancel`, plus touch events only for edge detection. `pointercancel` and `contextmenu`
  end the gesture, with Safari and WebView special-cased [7].
- **Scroll lock.** The first movement of ≥ 5 px is classified by angle. Above `touchAngle` (45°)
  it counts as scrolling, and Swiper lets go [4][7].
- **`touch-action`.** Horizontal Swiper CSS sets `touch-action: pan-y` [7]. `preventDefault` is
  only called on `pointermove` once Swiper owns the gesture [7].
- **iOS edge swipe.** In the source, next to the edge check: "Do NOT start if iOS edge swipe is
  detected. Otherwise iOS app cannot swipe-to-go-back anymore". With `edgeSwipeDetection: true`,
  touches starting within `edgeSwipeThreshold` (20 px) of either screen edge are ignored [4][7].
- **Rubber-banding.** `resistance` and `resistanceRatio` (0.85) handle pulling past the first or
  last slide [4]. With three slides and re-centring this rarely shows. It matters for a second
  flick during a transition.
- **Click suppression.** `preventClicks` cancels the click after a swipe [4][7]. For touch,
  browsers don't fire clicks after a swipe anyway, as Embla's docs note for touch [10].
- **Interrupted animations.** `preventInteractionOnTransition` (default `false`) decides whether a
  new touch can grab the track mid-transition [7].
- **Release rule.** It is fixed but configurable. A release within `longSwipesMs` (300 ms) is a
  "short swipe" and commits in the swipe direction. A slower one commits only past
  `longSwipesRatio` (0.5) of the slide width [4][7]. That is duration-based flick detection, not
  velocity.

**Pros**

- 0 extra bytes. The precached code is already there.
- It is Framework7's documented component for this pattern, which matches the project memory note.
- 41.9k GitHub stars, MIT, and actively released: 14.4.0 came out on 2026-10-30 [1][26].
- Native support for 3 slides, peek (`spaceBetween`) and a progress-driven fade (`creative` effect).

**Cons and risks**

- **The release decision belongs to Swiper.** We can't plug a pure `swipeWeekDelta` into it,
  only its parameters. Principle IV is still met by testing the pure parts around it (§5), but
  "commit after 50 px" becomes "commit after a sub-300 ms flick, or past N % of the width".
  Tune it on a device.
- **Integration friction.**
  - It's a web component, so we need a ref and `addEventListener` [5].
  - TypeScript needs a JSX declaration for `swiper-container`. `swiper-element.d.ts` only augments
    `HTMLElementTagNameMap`.
  - Importing types from `swiper/element` relies on the transitive dependency. Pin `"swiper":
    "12.2.0"` (the version Framework7 resolves), or keep the types local.
- **Version coupling.** We get Swiper 12.x through Framework7, not the current 14.x [1][2].
- **The bundled a11y module is on by default.** It adds `aria-live` and "1 / 3" labels [7], which
  would be wrong here, so set `a11y: false` and handle labels and `inert` ourselves.
- **A focused button blocks Swiper.** If the touch starts on the *currently focused* button,
  Swiper doesn't move (`e.target === document.activeElement` and it matches
  `focusableElements`, which include `button`) [7]. The day pills are buttons. This mainly
  matters for mouse drag, where clicked buttons get focus. It's another reason to keep
  `simulateTouch: false`. Check it on iOS, because a tapped pill may or may not keep focus.
- **`transitionend` dependency.** Swiper waits for `transitionend` on the wrapper to finish a
  `slideTo` [7]. jsdom never fires it, so tests must use speed 0 (§5).
- **No `prefers-reduced-motion` support.** The Swiper bundles contain no such handling (searched
  the 12.2.0 bundles), so set `speed: 0` ourselves.

**Size.** bundlephobia lists swiper@12.2.0 (main entry) at 68.3 kB minified and 20.6 kB gzipped
[9]. For this app the marginal cost is 0, because Framework7 already bundles it (verified by build).

### 3.2 Embla Carousel (`embla-carousel-react`)

**How it would work.**

- Use the viewport, container and three slides with `startIndex: 1`.
- On the `settle` event, `flushSync(setView(±7))` and then `emblaApi.scrollTo(1, true)` (jump).
- Embla positions slides with transforms and doesn't move DOM nodes, so React-owned slides are
  safe. Its `loop` option also exists, and Embla "automatically falls back to `false`" when slides
  can't loop cleanly [10].
- The `embla-carousel-fade` plugin (8.6.0) gives a cross-fade instead of a slide [1].

**Edge cases.**

- Embla 8 uses **touch and mouse events, not pointer events**. `touchmove` is non-passive. On the
  first move it compares main-axis and cross-axis distance and releases the gesture if the movement
  is mostly vertical (`preventScroll = diffScroll > diffCross`) [11].
- The commit rule is force-based: drag velocity times a boost, against an internal, hard-coded
  `goToNextThreshold = 20 % of the view, clamped to 50–225 px` [11][12].
- The docs' base CSS uses `touch-action: pan-y pinch-zoom` on the container [13].
- `dragThreshold` only affects click firing, and only for mouse, "because browsers don't fire
  clicks after accidental touch swipes" [10].

**Pros**

- Small (react wrapper with core: 18.0 kB min / 7.3 kB gz [9]).
- React-friendly, MIT, and active: the repo was pushed 2026-11-01 [26].

**Cons**

- **Duration isn't in milliseconds.** "Duration is **not** in milliseconds because Embla uses an
  attraction physics simulation" (default 25, recommended 20–60) [10]. R4 (150–250 ms) can't be
  set directly, and `settle` waits for the physics tail.
- No iOS edge-swipe handling that I could find in the docs or the drag handler [10][11].
- No reduced-motion option.
- Stable 8.6.0 dates from 2025-04-04, and v9 has been in release candidates since early 2026
  (9.0.0-rc04 on 2026-10-08) [1]. Adopting it now means an upcoming major version.
- A new dependency, so a new stack element and an ADR.

### 3.3 Motion (`motion/react`), or `@use-gesture/react` with react-spring

**Motion: how it would work.**

- Make a three-panel track a `motion.div` with `drag="x"`, `dragConstraints={{ left: 0, right: 0 }}`,
  `dragElastic={1}` (follow the finger fully) and `dragMomentum={false}`.
- In `onDragEnd(_, info)`, pass `info.offset.x` and `info.velocity.x` [14] to *our own* pure rule.
- Then `animate(x, ±(width + gap), { duration: 0.2 })`, `flushSync(setView)` and `x.jump(0)`.
- `dragDirectionLock` locks to the first axis dragged [14].
- Motion sets `touch-action: pan-y` automatically for `drag="x"`. I checked the
  `use-props` source in framer-motion 14.9.1: `touchAction = drag === true ? "none" : "pan-" + (drag === "x" ? "y" : "x")` [16].
- `MotionConfig reducedMotion="user"` disables transform animations when the OS asks [17].
- `AnimatePresence` is now unnecessary, because the peek model doesn't fade one Week out.

**Pros**

- The best fit for Principle IV's "pure decision rule". Offset and velocity are handed to us.
- Precise millisecond control.
- MIT and very active (14.9.1 on 2026-11-04, repo pushed 2026-11-05, 5 open issues) [1][26].

**Cons**

- **Size.** Motion's docs give `motion` component ≈ 43 kB, or `m` + `LazyMotion` ≈ 5 kB, plus
  `domMax` +38 kB, and drag needs `domMax` [15]. The page doesn't say whether those numbers are
  gzipped. bundlephobia lists the whole `motion@14.9.1` package at 175.8 kB min / 59.3 kB gz [9].
  So it adds roughly 40 kB or more for one gesture.
- No iOS edge-swipe exclusion is documented [14], so we'd write it ourselves.
- Whether children's clicks are suppressed after a drag isn't documented [14].
- A new stack element, so an ADR.

**@use-gesture/react with react-spring.**

- `@use-gesture/react` 10.3.1 is its latest release, from **2024-03-21**. The repo was last pushed
  2024-07-15 and has 57 open issues [1][26]. It isn't archived, but it is effectively dormant.
- react-spring 10.1.2 (2026-06-24) is active, with v11 in beta [1].
- Sizes: 28.6 kB min / 8.9 kB gz plus 51.3 kB min / 20.3 kB gz [9].
- Two dependencies, one of them stale, for what Motion or Swiper do alone. Not recommended.

### 3.4 Hand-rolled: Pointer Events, a 3-panel track and WAAPI or CSS transitions

**How it would work.**

- A track `div` holds three panels at −100 %, 0 and +100 % (plus a gap), with `touch-action: pan-y`.
- `pointerdown` records the start and calls `setPointerCapture`.
- `pointermove` sets `transform: translateX(dx)` through a ref, with no React re-render per frame,
  and samples velocity.
- `pointerup` asks a pure `weekSwipeOutcome({ dx, dy, vx, width })` for −7, 0 or +7.
- Then `track.animate(...)` (WAAPI) to ±width or 0 in about 200 ms. On `finished`,
  `flushSync(setView)` and reset the transform to 0. That is the same re-centring as Swiper.
- `pointercancel` springs back. MDN: `pointercancel` fires when the pointer "is then used to
  manipulate the viewport by panning, zooming, or scrolling", or when "the `touch-action` CSS
  property prevents the input from continuing" [20].

**Platform support.**

- Pointer Events and `touch-action: pan-x`/`pan-y` are in Safari and iOS Safari from 13 [22].
- `touch-action` decisions are made at gesture start: "After a gesture starts, changes to
  `touch-action` will not have any impact" [21].

**Pros**

- 0 bytes and full control. The decision rule stays exactly the kind of pure function the
  constitution wants.
- jsdom has `PointerEvent` (verified in jsdom 29.1.1), so most of it is testable.

**Cons: all the edge cases are ours.**

- Edge-swipe exclusion.
- Click suppression after a mouse drag.
- Grabbing mid-animation: read the current transform, then `animation.cancel()`.
- Rapid repeat flicks.
- Multi-touch.
- Resize during a drag.
- Velocity smoothing.
- Reduced motion.

That's roughly 100–150 lines of adapter (my estimate) that Swiper already has, with years of
iOS bug fixes behind it. jsdom lacks `setPointerCapture`, `Element.animate` and `ResizeObserver`
(verified), so those need stubs.

**View Transitions API.** It's not a fit for the drag. Same-document view transitions are in
Safari and iOS Safari 18.0+ [23], but they animate between two DOM snapshots. A finger can't scrub
them, so R1 and R2 can't be met. React's `<ViewTransition>` docs show `startTransition` with
`addTransitionType`, not gestures. Most examples pin a 19.3 canary, so I couldn't confirm its
stable status from that page [24].

### iOS Safari edge swipe-back (applies to every option)

- Installed web apps on iOS keep the system swipe-back gesture, and authors can't turn it off.
  The w3c/manifest feature request #1041 says the platform gesture "causes the JS-driven swipe
  gesture to be triggered as well, resulting in an awkward UX" [25].
- I found no official WebKit documentation of the exact edge width. A community claim that
  `preventDefault()` on `touchstart` blocks it since iOS 13.4 is **unverified**.
- The robust approach is to *not start* the drag near the screen edges, which is what Swiper's
  `edgeSwipeDetection` does [7].
- The Week card sits inside the page gutter, so only its outermost few pixels fall in a 20 px
  edge zone.

## 4. Comparison

| | Swiper Element (via Framework7) | Embla 8 | Motion (`drag`) | Hand-rolled Pointer Events |
|---|---|---|---|---|
| Extra bundle (gz) | **0** (already shipped) | ≈ 7.3 kB (+1.3 kB fade) [9] | ≈ 40 kB+ for drag [15] | 0 |
| Three-panel peek | Native (slides with `spaceBetween`) | Native | Build the track ourselves | Build it ourselves |
| Re-centre after a move | `flushSync`, then `slideTo(1, 0, false)` | `flushSync`, then `scrollTo(1, true)` | `flushSync`, then `x.jump(0)` | `flushSync`, then reset the transform |
| Release rule | Swiper's: < 300 ms flick, or 50 % ratio (params) | Internal force with a 20 % threshold, not configurable [12] | **Ours** (offset and velocity) | **Ours** |
| Animation time in ms | Yes (`speed`) | No (physics units) [10] | Yes | Yes |
| Vertical scroll lock | Angle test plus `pan-y` [7] | Axis test plus `pan-y` [11][13] | `pan-y` plus `dragDirectionLock` [14][16] | `pan-y` plus `pointercancel` [20] |
| iOS edge swipe | Built in (`edgeSwipeDetection`) [7] | Not found | Not documented | Ours |
| Reduced motion | Ours (`speed: 0`) | Ours | `MotionConfig` [17] | Ours (CSS or JS) |
| React fit | Web component: ref and listeners [5] | Hook | Components | Hooks and a ref |
| jsdom tests | Initialises; `slideTo(…, 0)` events fire (verified); no layout | Not tried | Not tried | `PointerEvent` yes; stub capture and animate |
| New stack element or ADR | No (part of Framework7) | Yes | Yes | No |
| Latest, licence | 12.2.0 via Framework7 (14.4.0 upstream, 2026-10-30), MIT | 8.6.0 (2025-04-04), MIT | 14.9.1 (2026-11-04), MIT | n/a |

## 5. Recommendation and integration sketch

**Recommendation: Framework7's built-in Swiper (Swiper Element) with three position-keyed slides
and synchronous re-centring.** It meets R1–R5 with code that is already precached. It's the
component Framework7 documents for this pattern, and it carries the hardest edge cases for us:
edge swipe, angle lock, `pointercancel` on Safari, and click suppression. It doesn't change the
stack, so no ADR is strictly required. Still, record the choice and the tuned parameters in the
feature plan's complexity notes (Principle V). If we add a direct, pinned `swiper` dependency for
types, mention it there too. **Fallback:** if on-device tuning of the release rule fails, use §3.4
behind the same component interface. Then the pure `weekSwipeOutcome` rule becomes the decider.

### Pure code (`src/ui/view-models/week.ts`, unit-tested)

```ts
/** The three Weeks the card track shows, oldest first. */
export function weekTrack(weekStart: IsoDate): [IsoDate, IsoDate, IsoDate] {
  return [addDays(weekStart, -7), weekStart, addDays(weekStart, 7)];
}
/** Days to move when the track settles on a slide: 0 → −7, 1 → 0, 2 → +7. */
export function slideDelta(activeIndex: number): number {
  return (activeIndex - 1) * 7;
}
/** Swiper parameters, so the tuned release rule is reviewed and tested as data. */
export function weekSwiperParams(reducedMotion: boolean) {
  return {
    initialSlide: 1, speed: reducedMotion ? 0 : 200, spaceBetween: 12,
    threshold: 8, longSwipesRatio: 0.3, edgeSwipeDetection: true,
    simulateTouch: false, a11y: false, runCallbacksOnInit: false,
  } as const;
}
```

Also add a `weekCard(weekStart, today, selected, data)` model: month label and strip only. The
neighbours use it, and `weekPage()` reuses it. Neighbour strips highlight
`sameWeekday(selected, neighbourStart)`, so nothing changes visually when a neighbour becomes
current. `swipeWeekDelta` retires, or stays as the fallback rule.

### Data

Widen the Meals query to 21 days:
`listMeals({ start: addDays(weekStart, -7), end: addDays(weekStart, 13) })`. It's one indexed
Dexie range. `selectWeekDays` already filters by date. `useLiveQuery` keeps the previous result
while the new query runs, because its monitor ref persists across dependency changes [27]. Right
after a re-centre, the old 21-day window still covers the new previous and current Weeks, and only
the off-screen new "next" is briefly blank. So there's no visible flash. `daySlots` can stay
current-Week only.

### Component (`WeekPage`, thin)

```tsx
const ref = useRef<SwiperContainer>(null);
useEffect(() => {
  const el = ref.current!;
  Object.assign(el, weekSwiperParams(prefersReducedMotion()));
  el.initialize();
  const onSettled = () => {
    const days = slideDelta(el.swiper.activeIndex);
    if (days === 0) return;
    flushSync(() => moveWeek(days));    // React re-renders the 3 slides now
    el.swiper.slideTo(1, 0, false);     // jump back to the middle before paint
  };
  el.addEventListener('swiperslidechangetransitionend', onSettled);
  return () => el.removeEventListener('swiperslidechangetransitionend', onSettled);
}, []);

<swiper-container ref={ref} init="false" class="week-track">
  {weekTrack(weekStart).map((start, i) => (
    <swiper-slide key={['prev', 'current', 'next'][i]} inert={i !== 1}>
      <WeekCardFace model={i === 1 ? model : neighbourModel(start)} />
    </swiper-slide>
  ))}
</swiper-container>
```

- The desktop ← / → buttons move outside the track, for example in the card header overlay, and
  call `el.swiper.slidePrev()` or `slideNext()`. Buttons and swipes then share one animation and
  one commit path.
- `inert` keeps neighbours out of the tab order and the accessibility tree.
- Whether totals and the copy button sit inside each slide or stay fixed under the track is a
  design decision (§6).
- `moveWeek` drops `setSlide`. The CSS keyframes are no longer needed.

### CSS (`app.css`)

- Remove `.week-slide-*` and the keyframes.
- Swiper Element's shadow CSS has `.swiper-horizontal { touch-action: pan-y }` [7]. To be safe,
  keep an explicit `touch-action: pan-y` on `swiper-container.week-track` in `app.css`. It costs
  nothing, and it doesn't depend on how the shadow-DOM class is resolved.
- Keep `.week-card` styling on each slide's face, so the peeking neighbour looks like a card.
- Optional subtle fade: `swiper-slide:not(.swiper-slide-active) { opacity: .5 }`, or the
  `creative` effect for progress-tied opacity [7].
- Under `prefers-reduced-motion: reduce`, `speed` is 0. The drag still follows the finger, because
  that motion is user-driven.

### Tests

- **Unit (node env):** `weekTrack`, `slideDelta`, `weekSwiperParams` (reduced-motion speed 0 and
  the tuned thresholds), and `weekCard` for the neighbour strips.
- **jsdom:** Swiper Element initialises in jsdom. I checked this with a standalone probe using
  this repo's jsdom 29 and Swiper 12.2.0. `swiper.slideTo(2, 0)` fires `swiperslidechange` and
  `swiperslidechangetransitionend` synchronously, and `initialSlide` also fires them on init unless
  `runCallbacksOnInit: false`. jsdom has no layout (Swiper's `width` was `undefined`), so **finger
  dragging can't be simulated meaningfully**. Replace the current TouchEvent test with these:
  1. Settle on slide 2 with `slideTo(2, 0)`, then expect the heading "Środa, 11 lis" and three
     slides with the right month labels.
  2. Settle on slide 0 and expect the previous Week.
  3. Expect neighbour slides to be `inert`.
  4. Clicking ← / → moves the Week. Speed must be 0 here, for example by stubbing `matchMedia` to
     match `prefers-reduced-motion`, because jsdom never fires `transitionend`.
- **Not testable in jsdom:** finger-follow, the angle lock, edge-swipe exclusion, flick feel and
  the no-jump re-centre. These go into the quickstart's manual run.

## 6. Open questions and real-device checks

**Open questions (design).**

- **Decided by the user, 2026-11-05:** the totals row and "Skopiuj do następnego tygodnia" stay
  fixed under the track. Only the month label and the day strip swipe, so each slide holds just
  those two.
- Should neighbours show their selected-weekday totals?
- Is the gap between peeking cards 12 px, and are neighbours dimmed?

**On a real iPhone (installed PWA and Safari tab):**

1. Re-centre: after a settle there's no one-frame jump or flash. Repeat 10 times quickly.
2. Two flicks within 200 ms. Is the second one lost, or does it rubber-band? Decide on
   `preventInteractionOnTransition` [7].
3. Tune the release rule (`threshold`, `longSwipesRatio`, and Swiper's fixed 300 ms short-swipe
   window [4][7]). A tiny fast flick must not change Weeks by accident.
4. Vertical scroll that starts on the card, including diagonal starts, never moves the track.
5. The system back swipe from the left edge (installed PWA) doesn't also drag the track [25].
   Check whether a drag starting on the card's left edge is ignored as intended.
6. Tapping a day pill selects it. A swipe that starts on a pill doesn't select it, and the
   focus quirk from §3.1 doesn't stall the drag.
7. After switching tabs away and back, the track still has the right width (Swiper resize
   observer).
8. Reduced Motion on: the settle is instant, and the drag still follows.
9. VoiceOver: only the current Week is read, and the ← / → buttons work.
10. Settle and spring-back feel like about 200 ms. Also check at 120 Hz ProMotion.

**Couldn't verify**

- Motion's doc sizes: min vs gzip isn't stated on the page.
- Swiper Element `virtual.renderExternal` with React-owned slides.
- Embla loop with only three full-width slides.
- The exact width of the iOS edge-gesture zone, and whether `touchstart.preventDefault` blocks it.
- Stable status of React `<ViewTransition>` in 19.3.
- Whether iOS Safari keeps focus on a tapped `<button>`, which matters for the Swiper focus quirk.

## 7. References

1. npm registry, queried 2026-11-05 with `npm view <pkg> version time license`:
   - swiper 14.4.0 (2026-10-30) and 12.2.0 (2026-05-27): https://www.npmjs.com/package/swiper
   - embla-carousel-react 8.6.0 (2025-04-04), next 9.0.0-rc04 (2026-10-08): https://www.npmjs.com/package/embla-carousel-react
   - embla-carousel-fade: https://www.npmjs.com/package/embla-carousel-fade
   - motion 14.9.1 (2026-11-04): https://www.npmjs.com/package/motion
   - @use-gesture/react 10.3.1 (2024-03-21): https://www.npmjs.com/package/@use-gesture/react
   - @react-spring/web 10.1.2 (2026-06-24): https://www.npmjs.com/package/@react-spring/web
   - All MIT.
2. framework7 9.3.0 dependencies (`swiper ^12.1.2`): https://www.npmjs.com/package/framework7.
   Also the local `node_modules/framework7/package.json`.
3. Framework7 React, Swiper: https://framework7.io/react/swiper
4. Swiper API, parameters, events and methods: https://swiperjs.com/swiper-api
5. Swiper Element (params, events, React notes, virtual): https://swiperjs.com/element
6. Swiper React: https://swiperjs.com/react
7. Swiper 12.2.0 source:
   - `shared/swiper-core.mjs`: onTouchStart, onTouchMove, onTouchEnd, events, loopFix and defaults.
   - `modules/effect-creative.mjs` and `modules/a11y.mjs`.
   - `swiper.css` (`touch-action: pan-y`).
   - Upstream: https://github.com/nolimits4web/swiper/tree/master/src
8. Framework7 9.3.0 source:
   - `framework7-lite-bundle.esm.js` and `components/swiper/swiper.js`.
   - `components/view/view.js` (`iosSwipeBackActiveArea: 30`) and `modules/router/swipe-back.js`.
   - Upstream: https://github.com/framework7io/framework7/tree/master/src/core
9. bundlephobia API, queried 2026-11-05:
   - https://bundlephobia.com/package/swiper@12.2.0
   - https://bundlephobia.com/package/embla-carousel-react@8.6.0
   - https://bundlephobia.com/package/embla-carousel-fade@8.6.0
   - https://bundlephobia.com/package/motion@14.9.1
   - https://bundlephobia.com/package/@use-gesture/react@10.3.1
   - https://bundlephobia.com/package/@react-spring/web@10.1.2
10. Embla v8 options (duration, dragThreshold, loop): https://www.embla-carousel.com/docs/v8/api/options
11. Embla 8.6.0 DragHandler: https://github.com/davidjerleke/embla-carousel/blob/v8.6.0/packages/embla-carousel/src/components/DragHandler.ts
12. Embla discussion #1353 (hard-coded commit threshold): https://github.com/davidjerleke/embla-carousel/discussions/1353
13. Embla required setup, base CSS: https://github.com/davidjerleke/embla-carousel/blob/master/docs/docs/guides/required-setup.txt
14. Motion, drag: https://motion.dev/docs/react-drag
15. Motion, reduce bundle size: https://motion.dev/docs/react-reduce-bundle-size
16. framer-motion 14.9.1 `dist/es/render/html/use-props.mjs`, from the npm tarball. Upstream:
    https://github.com/motiondivision/motion
17. Motion, MotionConfig `reducedMotion`: https://motion.dev/docs/react-motion-config
18. use-gesture repo: https://github.com/pmndrs/use-gesture
19. react-spring repo: https://github.com/pmndrs/react-spring
20. MDN, `pointercancel`: https://developer.mozilla.org/en-US/docs/Web/API/Element/pointercancel_event
21. MDN, `touch-action`: https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
22. MDN browser-compat-data:
    - `css/properties/touch-action.json`: https://github.com/mdn/browser-compat-data/blob/main/css/properties/touch-action.json
    - `api/PointerEvent.json`: https://github.com/mdn/browser-compat-data/blob/main/api/PointerEvent.json
    - Safari 13, with iOS mirroring Safari.
23. caniuse, View Transitions (single-document): https://caniuse.com/view-transitions
24. React, `<ViewTransition>`: https://react.dev/reference/react/ViewTransition
25. w3c/manifest #1041, "add option to disable built-in navigation gestures": https://github.com/w3c/manifest/issues/1041
26. GitHub repo metadata (`gh api repos/<owner>/<repo>`: pushed_at, archived, licence, stars), 2026-11-05:
    - nolimits4web/swiper
    - davidjerleke/embla-carousel
    - motiondivision/motion
    - pmndrs/use-gesture
    - pmndrs/react-spring
    - framework7io/framework7
27. dexie-react-hooks 4.4.0, `useObservable` (the monitor ref keeps the previous result on
    resubscribe): https://github.com/dexie/Dexie.js/tree/master/libs/dexie-react-hooks/src
28. Local verification in this repo, 2026-11-05:
    - `vite build` into a scratch folder: the main chunk contains Swiper Element. It is 1,199.74 kB
      minified and 332.97 kB gzipped.
    - A jsdom 29.1.1 probe of Swiper Element 12.2.0 (init, `slideTo` events, no layout).
    - jsdom API check: `PointerEvent` yes; `setPointerCapture`, `Element.animate`,
      `startViewTransition` and `ResizeObserver` no.
29. MDN, `setPointerCapture`: https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture
30. React, `flushSync`: https://react.dev/reference/react-dom/flushSync
