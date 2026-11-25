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
| 1 | Open Lista zakupów | Header shows this Week's dates. Rows: cebula 1 szt., jajka 3 szt., mleko 1,1 l, płatki owsiane 200 g, ryż 400 g. Names read left to right; square checkboxes | US1-1–US1-3, US1-7, FR-008 |
| 2 | In Tydzień swipe to next Week, return to Lista zakupów | The list still shows this Week | US1-11, FR-003 |
| 3 | Tap → and ←, then swipe the header left and right, slowly and with a flick | The dates slide like the Week card's month (follow the finger, settle on a Week) while ← / → stay put. The next Week is empty: "Na ten tydzień nie ma nic do kupienia." and "Udostępnij listę" grey and disabled | US1-10, FR-002, FR-010, FR-025 |
| 4 | Tap the checkbox of "cebula", then again | First tap: ticked and dimmed (not crossed out), and it stays in its place; no grey box flashes under it. Second tap: unticked | US2-1, US2-2, FR-009, FR-012 |
| 5 | Tap the house on "ryż" | Dimmed, filled house, moved into a "Mam w domu" card (with a house in the heading) at the bottom. Tap again: back in the list; the card disappears | US3-1, US3-2, FR-015 |
| 6 | Tap the name "ryż" | The caret sits after "400" when the field is tapped. The edit sheet opens: "W planie: 400 g", "Ilość do kupienia (g)" filled with 400, "Kupione" and "Mam w domu" toggles off. The row is not ticked | FR-011, FR-017 |
| 7 | In the sheet type 500, Zapisz | Shows "500 g" in green with ↑ and "plan: 400 g" below | US4-1, US4-2 |
| 8 | Same, type 250 | "250 g" in amber with ↓ | US4-3 |
| 9 | Same, type 0, then "abc" | Saving blocked, field marked "Wpisz liczbę większą od zera.", sheet stays open | US4-7 |
| 10 | Open "mleko", turn on "Kupione" and "Mam w domu", tap Anuluj; open it again, turn both on, Zapisz | After Anuluj: nothing changed. After Zapisz: mleko ticked and in "Mam w domu" | FR-017 |
| 11 | In Tydzień set Tuesday's rice to 3 Servings, come back | ryż shows "600 g" with no styling and no plan line | US4-4, FR-020 |
| 12 | In "Coś spoza planu…" type "kawa", Enter, type "2 opak.", Enter. Then "papier toaletowy", Enter, Enter | Focus jumps to the amount after the first Enter. Rows "kawa 2 opak." and "papier toaletowy" in alphabetical place; both fields cleared, focus back on the name. "Dodaj" is dimmed while the name is empty | US5-1, FR-022 |
| 13 | Tap the name "kawa"; change it to "kawa ziarnista", the amount to "1 kg", turn on "Kupione", Zapisz | Row "kawa ziarnista 1 kg", ticked, in place. Clearing the name and saving shows "Wpisz nazwę." and keeps the sheet open | FR-022 |
| 14 | Swipe "papier toaletowy" left, tap Usuń. Open another Extra, tap the red Usuń in its sheet | Gone at once, no question, both ways. The row swipe doesn't scroll the page sideways | US5-4, FR-023 |
| 15 | Tick and mark items, close the app fully, turn on airplane mode, reopen | Same ticks, At Home marks, typed amounts and Extras with their amounts | US2-4, SC-007, FR-032 |
| 16 | Tap "Udostępnij listę" on the iPhone, pick Notatki | The note starts "Lista zakupów {dates}" and holds the unticked lines with typed amounts and Extra amounts ("kawa 2 opak."), then the At Home items as "ryż 300 g (mam w domu)" | US6-1–US6-3, FR-026 |
| 17 | Close the share sheet without picking | Nothing happens | US6-5 |
| 18 | Desktop Firefox: "Udostępnij listę" | Toast "Skopiowano listę do schowka." and the text is in the clipboard | US6-4 |
| 19 | Produkty: merge a duplicate Product into "mleko" in a Week where only mleko was ticked and both planned | mleko unticked, with one summed amount | FR-028 |
| 20 | "Skopiuj do następnego tygodnia", then open the next Week's list | Extras, ticks and At Home marks of the next Week unchanged | FR-031 |
| 21 | Desktop browser ≥ 1024 px | The page sits in the centred column. Both edit sheets line up with it | FR-034 |
| 22 | From the Zakupy tab, swipe from the left screen edge | The system back swipe works and does not change the Week | research R6 |

## Performance spot check

`?seed=weeks-52` (the `seed` deploy) gives the current Week 35 Meals over 100 distinct Products, plus 52 past Weeks with state records and Extras ([plan.md](plan.md), dev seed).

- **SC-002**: switch to Lista zakupów and tap ← / →. Each list appears in under 300 ms (Safari Web Inspector timeline on the reference iPhone).

## Results

_Filled in during `/speckit-implement`._

**Automated (2026-11-22)**: `npm run lint`, `npm run typecheck`, `npm run coverage` (50 files, 738 tests, 100% on `src/domain/**`) and `npm run build` pass. No new dependencies. The component tests cover S1–S11 in jsdom.

**Manual: not run yet.** No iPhone or browser was available in the implementation session, so these stay open:
- T060: every story at 375 pt with an iOS user agent and at ≥ 1024 px (shared column, amount sheet alignment, wrapping, tap targets).
- T061: rows 1–22 on an iPhone (installed PWA and Safari tab), the SC-002 spot check with `?seed=weeks-52`, a row swipe not scrolling sideways, and the system back swipe.

**Deviation to check on the device**: the Extra row's "Usuń" is a red `SwipeoutButton` with `close` that calls `deleteExtra`, not Framework7's `delete` button. Framework7's delete removes the `<li>` from the DOM itself, which conflicts with React's rendering. It looks the same, but there's no collapse animation.
