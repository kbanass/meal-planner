# Quickstart: Week Planning validation

How to prove that feature 002 works. Design details live in [data-model.md](data-model.md) and [contracts/](contracts/). Setup is the same as in [feature 001's quickstart](../001-shell-products-dishes/quickstart.md).

## Prerequisites

- Node 24, then `npm ci`.
- For the manual checks: a phone (iPhone at least) on the same network, or the `preview` / `seed` Cloudflare Pages deploys.

## Automated checks

```sh
npm run lint        # includes the domain boundary rules
npm run typecheck
npm run coverage    # 100% on src/domain/** or the run fails
```

Expected results:
- All tests pass, including feature 001's tests, which are unchanged apart from the ones covering `deleteDish` and the merge result.
- The coverage summary lists `dates.ts`, `meals.ts`, `slots.ts`, `week.ts`, `settings.ts` and `nutrition.ts` at 100%.
- Lint passes. `src/domain/` stays free of clock, randomness and implicit-locale calls, and `dates.ts` uses no `Date` at all (research R1).

## Manual scenarios

Use a fresh install with the Dishes from feature 001's US1:
- "Owsianka": yields 2; 100 g płatki owsiane, 300 ml mleko; 700 / 25 / 15 / 110
- plus two more Dishes

| # | Steps | Expected | Covers |
|---|---|---|---|
| 1 | Open the app on a Wednesday | The Week card reads "Listopad 2026"; the strip shows Pn 2 … Nd 8 with Wednesday as the green pill; below, "Środa, 4 lis · brak posiłków" and Slots 1–4 as dashed "Dodaj posiłek" cards | US1-1, FR-001–FR-005 |
| 2 | Tap "Cz 5" in the strip, then Slot 2 "Dodaj posiłek", then "Owsianka" | The screen stays; Thursday becomes the pill and its Slots show. Slot 2 shows an "Owsianka" card, "1 porcja · 350 kcal"; the strip shows "350" under Cz 5 and the heading "1 posiłek · 350 kcal" | US1-2–US1-4, US1-7, FR-007 |
| 3 | In Slot 2 tap "+ Dodaj posiłek" and pick "Banan" | Both Meal cards listed, in that order; the heading counts "2 posiłki" | US1-5 |
| 4 | Open "Owsianka", set Porcje 1,5 | The sheet's inputs show 75 g, 225 ml, kcal 525, protein 18,75 (inputs keep 2 decimals, so an untouched save never counts as a change). Save: the row reads "1,5 porcji · 525 kcal", no "zmieniony" badge | US2-1–US2-3 |
| 5 | Enter Porcje 0, then "abc" | Save blocked, field marked | US2-4 |
| 6 | Add "Owsianka" to Friday Slot 1 as well. In the Thursday one set płatki 75 → 120 g (at 1,5 Servings) and save | The badge "zmieniony" appears. kcal stays 525. A toast explains detaching | US3-1, US3-4 |
| 7 | Edit the Dish "Owsianka" in Dania to 800 kcal | The Friday Meal shows 400 kcal. Thursday is unchanged at 525 | US3-3, SC-003 |
| 8 | Thursday "Owsianka" → "Przywróć z dania", confirm | Badge gone, 1,5 porcji · 600 kcal | US3-5, SC-004 |
| 9 | With Thursday selected, swipe the Week card left twice, then right three times (desktop: → twice, ← three times) | The month label follows ("Listopad 2026", "Październik – listopad 2026" …), Thursday stays selected, each Week shows only its own Meals | US4-1–US4-3, FR-007 |
| 10 | Close the app on another Week and reopen | Opens on the current Week | US4-4, FR-002 |
| 11 | Select Saturday, tap "dodaj kolejny" | Saturday shows Slots 1–5, other days 1–4. Reopen the app and select Saturday: still 5 | US5-1–US5-3 |
| 12 | Ustawienia: tap "Liczba slotów", pick 3 in the sheet, then 6 | Friday shows 3 Slots (or more if used), Saturday 5. With 6, every day shows ≥ 6 | US5-4, US5-5, FR-011 |
| 13 | Detach one Meal, then "Skopiuj do następnego tygodnia" with the next Week empty | No question. Toast. → next Week matches, including the badge and Saturday's Slot 5 | US6-1, US6-2, US6-7 |
| 14 | Change a Meal in this Week and copy again | Confirmation asked. Cancel: nothing changes. Confirm: the next Week matches exactly | US6-3, US6-4 |
| 15 | Edit the copied Detached Meal in the next Week | The original is unchanged | US6-5 |
| 16 | Go to an empty past Week | The copy button is disabled | FR-036 |
| 17 | Delete the Dish "Owsianka" in Dania | It disappears from the library and picker. Its Meals still show it | US3-7, FR-030 |
| 18 | Produkty: "płatki owsiane" | The usage hint mentions dishes and posiłki (after step 6). Delete and unit change are disabled | FR-030, analysis L2 |
| 19 | Airplane mode, restart the app, repeat steps 2, 4 and 13 | Everything works | SC-007, FR-039 |
| 20 | Desktop browser ≥ 1024 px | The same one-screen Week page in a centred column, title aligned with the cards. No grid | FR-041 |

## Performance spot checks

The `seed` deploy (`npm run deploy:seed`) has a fixture `?seed=weeks-52`: the current Week plus 52 past Weeks × 35 Meals, every fifth one Detached, all deterministic (`src/dev/seed.ts`). It replaces all local data.

- **SC-006**: tapping ← or → shows the Week in under 300 ms. Check in Safari Web Inspector's timeline on the reference iPhone.
- **SC-005**: copying a 35-Meal Week finishes, toast included, in under 1 s.
- **SC-001**: plan 28 Meals from the library in under 5 minutes, timed by hand.

## Results

### 2026-11-04: automated checks and headless spot checks (by the assistant)

- `npm run lint`, `npm run typecheck`, `npm run coverage` (100% on `src/domain/**`) and `npm run build` pass.
- The production build contains no seed code.
- **Spot checks:** headless Chrome 390×844 with an iOS user agent and the CPU throttled 4×, against a `VITE_SEED=true` production build (`vite preview`) with `?seed=weeks-52` (53 Weeks, 1855 Meals):
  - **SC-006**: changing the Week took 46–66 ms per step over 6 steps (target < 300 ms).
  - **SC-005**: copying a 35-Meal Week to an empty next Week took 31 ms, toast included (target < 1 s).
- **Screens:** the Week page, the Dish picker, the Meal sheet (including the nested "Nowy produkt" sheet), Dania, the Dish form and Ustawienia with its slots sheet were checked at 390×844, and the Week page at 1280 px, from screenshots.

### 2026-11-05: manual run by the user

- Rows 1–16 pass. Row 4 asked for clarification: the sheet's inputs keep 2 decimals ("18,75"), while the Slot card shows display rounding ("18,8"), as intended.
- Feedback from the run, both fixed: the Dish delete button had a different corner radius from the other buttons of its kind, and the protein and carbs icons did not look like protein and carbs.

- Later the same day: rows 17–20 pass too (row 19 in airplane mode, row 20 on a desktop browser). All 20 manual rows pass.

### Not yet reported

- SC-001 timed by hand, and how the swipe on the Week card feels, were not reported separately.
- SC-001 timed by hand.
- Swipe feel on the Week card.
- Android stays deferred, as in feature 001.
