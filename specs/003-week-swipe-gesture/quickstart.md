# Quickstart: Week Swipe Gesture validation

How to prove that feature 003 works. The design is in [research.md](research.md), [data-model.md](data-model.md) and [contracts/](contracts/). Setup is the same as in [feature 002's quickstart](../002-week-planning/quickstart.md).

## Prerequisites

- Node 24, then `npm ci`.
- An iPhone, for the manual checks. Use both the installed PWA and a Safari tab: the `preview` Cloudflare Pages deploy (`npm run deploy:preview`), or `npm run dev -- --host` on the same network. The Android check stays deferred (project memory).
- A plan: Meals in at least three consecutive Weeks, for example with `npm run deploy:seed`, or by hand: one Meal on Wednesday of the previous, current and next Week.

## Automated checks

```sh
npm run lint
npm run typecheck
npm run coverage    # 100% on src/domain/** or the run fails
```

Expected results:
- All tests pass, including feature 001 and 002 tests. Two changes are on purpose:
  - The TouchEvent swipe test in `tests/ui/week-page.test.tsx` is replaced by T1–T18 ([contracts/ui.md](contracts/ui.md)).
  - The `swipeWeekDelta` tests are removed with the function.
- `tests/ui/week-track-vm.test.ts` covers every row of [contracts/view-models.md](contracts/view-models.md).
- `src/domain/week.ts` is at 100% with `mealsInRange`.
- `npm run build` succeeds, and the build adds no new dependencies (`package.json` is unchanged).

## Manual scenarios (iPhone)

Run each one as the installed PWA. Run M1, M4 and M5 in a Safari tab as well.

| # | Steps | Expected | Covers |
|---|---|---|---|
| M1 | Drag the Week card slowly left, hold, then right, hold | The month label and day strip follow the finger exactly. The next or previous Week is beside them with a small gap, with its own month label and kcal. The neighbours are dimmed and brighten as they come in. Totals, "Skopiuj…", heading and Slots don't move | US1/AC1–2, FR-001–004, SC-006 |
| M2 | Release past a third of the width; then release a short slow drag | The first settles in about 200 ms, continuing the motion, and then the heading and Slots show the same weekday. The second springs back. Neither fades | US1/AC3–4, FR-005–007, SC-002 |
| M3 | Quick short flicks left and right; then tap days with a slightly moving finger | Flicks change the Week. Taps select the day and never change the Week. If either feels wrong, tune `WEEK_TRACK` (`FLICK_*`, `COMMIT_RATIO`, `SLOP_PX`) and repeat | US1/AC5, FR-005, SC-005 |
| M4 | 20 scrolls up and down starting on the card, including diagonal starts | The page scrolls and the strip never moves. During a horizontal drag, drifting up or down doesn't scroll the page | US2/AC1–2, FR-010, SC-003 |
| M5 | 10 back swipes from the left screen edge (installed PWA) | The system gesture runs, and the strip doesn't move with it | US2/AC5, FR-011, SC-004 |
| M6 | 10 quick swipes in a row, some started while the previous one is still settling; then two quick flicks left | Each ends on the right Week, with no jump, flash or blank strip. Two quick flicks move two Weeks | FR-008, FR-009, FR-017, SC-001 |
| M7 | Start a drag on a day pill and swipe | The Week changes, and that pill isn't selected | US2/AC4, FR-012 |
| M8 | Mid-drag: lock the phone, or put a second finger down, or receive a notification banner | The strip ends centred on one Week | FR-009, spec edge cases |
| M9 | Rotate during and after a drag. Switch tabs and come back | Faces stay centred and correctly sized | spec edge cases |
| M10 | Settings → Accessibility → Motion → Reduce Motion on, then swipe | The drag follows. The Week changes or springs back instantly on release | US3/AC2, FR-014, SC-008 |
| M11 | VoiceOver on: swipe through the Week card, then activate "Następny tydzień" | Only the viewed Week's month and days are read. The button changes the Week | US3/AC3–4, FR-015, SC-007 |
| M12 | Desktop browser ≥ 1024 px: click → and ← repeatedly, including during a slide | The same slide as a swipe. Clicks during a slide chain. No mouse drag. The buttons don't cover the month label | US3/AC1, FR-013 |
| M13 | Airplane mode, then reopen the installed app and swipe | Works the same | FR-016 |
| M14 | 120 Hz iPhone (ProMotion): repeat M2 | The settle still feels like about 200 ms and stays smooth | SC-002 |

Record the final `WEEK_TRACK` values, and anything tuned in M3, in the PR description.
