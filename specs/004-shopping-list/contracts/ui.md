# Contract: Screens, routes and user-facing text

The rules from features [001](../../001-shell-products-dishes/contracts/ui.md) and [002](../../002-week-planning/contracts/ui.md) still apply:
- Text we write is Polish and inline. Framework7's own default labels ("OK", "Cancel") stay as shipped.
- Alerts use `f7.dialog.alert` and toasts `f7.toast.show`.
- Components render view-model output and compute nothing themselves.
- Standard parts (navbar, lists, checkboxes, swipeout, sheet, inputs) are Framework7's, in the app's look: warm page background, white inset cards, green accent (project memory: Framework7 native patterns).
- Check every story at iPhone size (375 pt) before calling it done.

## Shell change

| Tab | Before | Now |
|---|---|---|
| Lista zakupów | Placeholder | Shopping List page |

`shoppingRoutes` becomes `[{ path: '/', component: ShoppingListPage }]`. The placeholder component stays for nothing else and is deleted if unused.

## Shopping List page (`src/ui/pages/ShoppingListPage.tsx`)

Inside `<div className="page-wide">` like every other page, so desktop uses the shared column (FR-034). Top to bottom:

1. **Navbar**: `Navbar title="Lista zakupów"`, like Ustawienia and Produkty.
2. **Week header card** (`.list-week-card`, the Week card's look):
   - **Row**: a round 44 px ← button (`arrow_left`, `aria-label` "Poprzedni tydzień"), the label `weekRangeLabel(weekStart)` centred ("16–22 lis 2026", 20 px, weight 700), and a → button (`arrow_right`, "Następny tydzień"). The buttons are visible on every screen size (FR-002).
   - **Swipe**: the whole card has `touch-action: pan-y` and the pointer handlers of research R6.
   - **"Udostępnij listę"**: a full-width text button under the row (`square_arrow_up` icon and the label), styled like "Skopiuj do następnego tygodnia". It is rendered only when the top part has lines (FR-025).
3. **Empty state**, when `isListEmpty`: `Block` with "Na ten tydzień nie ma nic do kupienia." (FR-010).
4. **To buy**: an inset list (`List strong inset dividersIos`, `.shopping-list`) of the `toBuy` rows. It is omitted when empty.
5. **Add Extra**: an inset list with one row, a `<form>` holding an outlined text input (placeholder "Dodaj coś spoza planu…", `enterkeyhint="done"`) and a "Dodaj" button. Enter or the button submits. After a successful add, the input is cleared and keeps focus, so several Extras can be typed in a row (FR-022). Shown in the empty state too.
6. **Done**: a second inset list (`.shopping-list.is-done`) of the `done` rows, with no title. It is omitted when empty.

### Rows (research R7)

**Product row** (`li.shopping-row`):

| Part | Element | Content | Behaviour |
|---|---|---|---|
| Tick | `<label class="item-checkbox shopping-tick">` holding a hidden `<input type="checkbox">`, Framework7's `icon-checkbox` and the name | Product name, wraps | one tap ticks or unticks (FR-011) |
| Amount | `<button class="shopping-amount">` | line 1: the Amount to buy ("500 g"). With an Adjustment: an `arrow_up` / `arrow_down` icon after it and the class `is-more` / `is-less`. Line 2, only with an Adjustment: "plan: 400 g", 12 px, muted | opens the amount sheet (FR-017) |
| At Home | `<button class="shopping-at-home" aria-pressed>`, 44 × 44 px | `house` icon, `house_fill` when pressed. No visible text | one tap toggles At Home (FR-014) |

Accessible names:
- Amount: "{name}: {amount}, zmień ilość". With an Adjustment: "{name}: {amount}, więcej niż w planie ({planned}), zmień ilość" or "mniej niż w planie".
- At Home: "Mam w domu: {name}".

**Extra row**: the same tick label with the Extra's text, no amount and no At Home button. It is wrapped in Framework7's `swipeout`, with one right-side `SwipeoutButton delete` labelled "Usuń" and no `confirmText` (FR-023).

**Looks** (CSS in `src/ui/styles/app.css`, tokens on `:root` like the existing ones):

| State | Style |
|---|---|
| ticked (`.is-ticked`) | checked box, name and amount at `--planner-muted` colour and 0.55 opacity. **Not** crossed out (FR-012) |
| At Home (`.is-at-home`) | name and amount `text-decoration: line-through`, same dimming, house filled in the accent colour (FR-015) |
| both | both of the above |
| `is-more` | amount and arrow in `--planner-accent` |
| `is-less` | amount and arrow in `--planner-adjust-less`, a dark amber of at least 4.5:1 on white |

## Amount sheet (`src/ui/components/AmountSheet.tsx`)

A Framework7 `Sheet` (`backdrop`, `swipeToClose`, `height: auto`), rendered once per page with the target line in state, like the Week page's sheets.

- **Toolbar**: left "Anuluj" (`sheetClose`), title the Product name, right "Zapisz".
- **Content**:
  - "W planie: {formatListAmount(planned)}"
  - an outlined `ListInput` labelled "Ilość do kupienia", `inputmode="decimal"`, filled with `adjustmentFieldText(amount)`, with the unit label after it ("g", "ml", "szt.")
  - a footer: "Zostaw puste, aby wrócić do ilości z planu."
- **Save**: calls `saveAdjustment`. `invalid` keeps the sheet open, with the field marked "Wpisz liczbę większą od zera." (FR-019). Any other result closes the sheet.
- The line's `planned` value is read from the live model at save time, so a plan change while the sheet is open is respected.

## View model (`src/ui/view-models/shopping.ts`)

```ts
shoppingPage(weekStart: IsoDate, data: {
  products?: Product[]; meals?: Meal[]; dishes?: Dish[];
  states?: ProductListState[]; extras?: Extra[];
}): ShoppingPageModel | null        // null until every query has resolved (research R8)

interface ShoppingPageModel {
  weekLabel: string;                // weekRangeLabel
  empty: boolean;
  toBuy: ShoppingRow[];
  done: ShoppingRow[];
  shareText: string | null;         // null when toBuy is empty
}

type ShoppingRow =
  | { kind: 'product'; key: string; productId: string; name: string; ticked: boolean; atHome: boolean;
      amountText: string; plannedText: string | null; direction: 'more' | 'less' | null;
      amountLabel: string; atHomeLabel: string;
      planned: number; fieldText: string; unitLabel: string }
  | { kind: 'extra'; key: string; id: string; name: string; ticked: boolean }

shareText(weekStart: IsoDate, toBuy: readonly ShoppingLine[]): string
  // "Lista zakupów 16–22 lis 2026\nmleko 1,1 l\npapier toaletowy\nryż 500 g"

headerSwipeDelta(dx: number, dy: number): -7 | 0 | 7
  // |dx| ≥ 50 and |dx| > 1.5·|dy|; dx < 0 → +7 (next Week). Feature 002's rule (research R6)
```

Strings, exported as constants: `emptyMessage`, `extraPlaceholder`, `copiedToast` ("Skopiowano listę do schowka."), `shareFailedMessage` ("Nie udało się udostępnić listy."), `amountErrorMessage`, `amountFooter`.

## Page behaviour

| Event | Result | Spec |
|---|---|---|
| mount | `weekStart = weekStartOf(deps.clock.today())` | FR-003 |
| ← / →, header swipe | `weekStart ± 7`, no other change | FR-002 |
| tick a Product | `deps.shopping.updateProductState(weekStart, id, { ticked })` | FR-011 |
| tick an Extra | `deps.shopping.setExtraTicked(id, ticked)` | FR-011 |
| house | `updateProductState(weekStart, id, { atHome: !atHome })` | FR-014 |
| amount | opens the amount sheet for that row | FR-017 |
| Extra submit | `addExtra(deps, weekStart, text)`; on `'added'` clear the input | FR-022 |
| swipeout "Usuń" | `deps.shopping.deleteExtra(id)` | FR-023 |
| "Udostępnij listę" | `shareList(deps, model.shareText)` called synchronously in the click handler. `'copied'` → toast. `'cancelled'` / `'shared'` → nothing. Throws → alert | FR-027, research R5 |

## Component tests (`tests/ui/shopping-page.test.tsx`, jsdom)

The fixed clock is 2026-11-04 (Week 2–8 lis 2026). Data is seeded through the repositories.

| # | Scenario | Asserts |
|---|---|---|
| S1 | US1-1/2/3 Week | rows "mleko 1,1 l", "płatki owsiane 200 g", "jajka 3 szt." in order |
| S2 | tick "cebula" | it moves to `.is-done`, has `.is-ticked` and no line-through class. Untick → back in the top part |
| S3 | house on "ryż" | `aria-pressed="true"`, row in `.is-done` with `.is-at-home`. The share text no longer has "ryż" |
| S4 | amount 400 → 500 | the sheet shows "W planie: 400 g" and the field "400". After saving: "500 g", `.is-more`, "plan: 400 g" |
| S5 | amount "abc" | the error text is shown, the sheet stays open, nothing is stored |
| S6 | add a Meal using rice while the page is open | the row shows the new Planned amount, no `.is-more`, no "plan:" line |
| S7 | Extra "kawa" by Enter, then "Usuń" | the row appears in order and the input is empty. After "Usuń" it is gone |
| S8 | → button, then a header swipe right | the label reads "9–15 lis 2026", then "2–8 lis 2026". Each Week shows only its own rows |
| S9 | share: sharer returns `'copied'` | the sharer got the text from US6. The toast is shown |
| S10 | share: `'cancelled'`, then `'fail'` | nothing for cancelled. An alert with `shareFailedMessage` on failure |
| S11 | empty Week | `emptyMessage`, no "Udostępnij listę", the Extra field present |

`tests/ui/app-shell.test.tsx` changes on purpose: the Lista zakupów tab shows the Week header ("2–8 lis 2026") instead of the placeholder notice.

View-model tests (`tests/ui/shopping-vm.test.ts`): `shareText` (heading, order, typed amount, Extras, no ticked or At Home lines), `headerSwipeDelta` (49 px → 0, 50 px left → +7, right → −7, diagonal → 0), accessible names for `more` / `less`, and `null` while any query is `undefined`.
