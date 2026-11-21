# Quickstart: Shopping List validation

How to prove that feature 004 works. Design details live in [data-model.md](data-model.md) and [contracts/](contracts/). Setup is the same as in [feature 001's quickstart](../001-shell-products-dishes/quickstart.md).

## Prerequisites

- Node 24, then `npm ci`.
- For the manual checks: an iPhone on the same network (`npm run dev -- --host`), or the `preview` / `seed` Cloudflare Pages deploys. Check both the installed app and a Safari tab (spec Assumptions).

## Automated checks

```sh
npm run lint
npm run typecheck
npm run coverage    # 100% on src/domain/** or the run fails
```

Expected results:
- All tests pass. The only earlier test changed on purpose is the Lista zakupów case in `tests/ui/app-shell.test.tsx` ([contracts/ui.md](contracts/ui.md)).
- The coverage summary lists `shopping.ts` and `units.ts` at 100%.
- Lint passes. `src/domain/shopping.ts` uses no clock, randomness or implicit locale.

## Manual scenarios

Use a fresh install with these Dishes:
- "Owsianka": yields 2; 100 g płatki owsiane, 300 ml mleko
- "Ryż z warzywami": yields 2; 400 g ryż, 1 pcs cebula, 500 ml mleko
- "Jajecznica": yields 1; 2,5 pcs jajka

In Tydzień, plan this Week: "Owsianka" Monday 1 Serving and Wednesday 3 Servings, "Ryż z warzywami" Tuesday 2 Servings, "Jajecznica" Thursday 1 Serving.

| # | Steps | Expected | Covers |
|---|---|---|---|
| 1 | Open Lista zakupów | Header shows this Week's dates. Rows: cebula 1 szt., jajka 3 szt., mleko 1,1 l, płatki owsiane 200 g, ryż 400 g | US1-1–US1-3, US1-7, FR-008 |
| 2 | In Tydzień swipe to next Week, return to Lista zakupów | The list still shows this Week | US1-11, FR-003 |
| 3 | Tap → and ←, then swipe the header left and right | The label changes Week by Week. The next Week is empty: "Na ten tydzień nie ma nic do kupienia." and no share button | US1-10, FR-002, FR-010 |
| 4 | Tap the tick of "cebula", then its name | First tap: ticked, dimmed (not crossed out), moved to the lower list. Second tap: back on top | US2-1, US2-2, FR-012 |
| 5 | Tap the house on "ryż" | Crossed out, dimmed, lower list, filled house. Tap again: back | US3-1, US3-2 |
| 6 | Tap "400 g" on ryż, type 500, Zapisz | Shows "500 g" in green with ↑ and "plan: 400 g" below | US4-1, US4-2 |
| 7 | Same, type 250 | "250 g" in amber with ↓ | US4-3 |
| 8 | Same, type 0, then "abc" | Saving blocked, field marked | US4-7 |
| 9 | In Tydzień set Tuesday's rice to 3 Servings, come back | ryż shows "600 g" with no styling and no plan line | US4-4, FR-020 |
| 10 | Add Extras "papier toaletowy" and "kawa" with Enter | Both appear in alphabetical place, input cleared and focused | US5-1 |
| 11 | Swipe "kawa" left, tap Usuń | Gone at once, no question | US5-4 |
| 12 | Tick and mark items, close the app fully, turn on airplane mode, reopen | Same ticks, At Home marks, typed amounts and Extras | US2-4, SC-007, FR-032 |
| 13 | Tap "Udostępnij listę" on the iPhone, pick Notatki | The note starts "Lista zakupów {dates}" and holds only unticked, not-at-home lines, with the typed amount | US6-1–US6-3, FR-026 |
| 14 | Close the share sheet without picking | Nothing happens | US6-5 |
| 15 | Desktop Firefox: "Udostępnij listę" | Toast "Skopiowano listę do schowka." and the text is in the clipboard | US6-4 |
| 16 | Produkty: merge a duplicate Product into "mleko" in a Week where only mleko was ticked and both planned | mleko unticked, with one summed amount | FR-028 |
| 17 | "Skopiuj do następnego tygodnia", then open the next Week's list | Extras, ticks and At Home marks of the next Week unchanged | FR-031 |
| 18 | Desktop browser ≥ 1024 px | The page sits in the centred column. The amount sheet lines up with it | FR-034 |

## Performance spot check

`?seed=weeks-52` (the `seed` deploy) gives the current Week 35 Meals over 100 distinct Products, plus 52 past Weeks with state records and Extras ([plan.md](plan.md), dev seed).

- **SC-002**: switch to Lista zakupów and tap ← / →. Each list appears in under 300 ms (Safari Web Inspector timeline on the reference iPhone).

## Results

_Filled in during `/speckit-implement`._
