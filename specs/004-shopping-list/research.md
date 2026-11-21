# Research: Shopping List

Phase 0 for [plan.md](plan.md). Each decision resolves an open point of the Technical Context or a design choice the spec leaves to the plan. Section numbers (R1…) are referenced from the plan, the data model and the contracts.

## R1. Storage shape: one state record per Week and Product, Extras in their own table

**Decision**: Dexie version 3 adds two tables:

- `productListStates`, primary key the compound `[weekStart+productId]`, indexes `weekStart` and `productId`. One record holds everything the user set for one Product on one Week's list: `ticked`, `atHome` and `adjustment`. A record exists only while at least one of them is set. Clearing the last one deletes it.
- `extras`, primary key `id` (UUID from `IdGenerator`), index `weekStart`.

**Rationale**:
- Ticks, At Home marks and Adjustments share the same key (Week, Product) and the same lifecycle. One record means one read per list, one write per tap, and one place for the merge, delete and unit-change rules (R4).
- The compound key makes "at most one Adjustment per Product per Week" (FR-021) a storage fact, not a check.
- `weekStart` is the Week's Monday as an `IsoDate`, the same identity feature 002 uses for Weeks. A natural key that is stable across devices satisfies Principle III, as `daySlots` (`date`) already does. Its `productId` part is the Product's UUID.
- Extras have their own identity, since duplicates are allowed (spec Edge Cases), so they get UUIDs.
- The `productId` index serves the Product maintenance rules, which touch every Week of one Product.

**Alternatives considered**:
- Three tables (ticks, At Home marks, Adjustments): three reads and three places to clean up, for no gain.
- One document per Week holding all its marks: every tap rewrites the whole Week, and Product maintenance has to scan every Week document.
- Product ticks inside the `extras` table as a union type: mixes two identities under one key.

## R2. An Adjustment records the Planned amount it was typed against

**Decision**: An Adjustment is `{ amount, plannedAmount }`, both rounded to 2 decimals. It applies only while `roundTo2(current Planned amount) === plannedAmount` (FR-020). The check runs when the list is built. Nothing is cleaned up when the plan changes.

**Rationale**:
- The rule "any change to the Product's Planned amount discards the typed amount" (clarification 2026-11-17) can't be enforced by writes. The Planned amount changes through Meals, Servings, detaching, restoring, Dish edits, Product merges and Week copies, all in different repositories. Hooking every one of them would spread Shopping List logic across feature 001 and 002 code, and one missed path would leave a wrong amount on the list.
- A stale record is harmless: it never shows. It is overwritten by the next typed amount for that Product and Week (FR-021).
- The one visible side effect is that a plan which returns to exactly the same Planned amount brings the typed amount back. The spec accepts this (Edge Cases, "Plan changes back").

**Alternatives considered**:
- Store a delta (`+100 g`): rejected by the user's clarification (reset, not follow).
- Delete Adjustments in every plan-changing write path: many call sites, cross-feature coupling, easy to miss.
- Compare unrounded floats: sums of scaled amounts can differ in the last bits depending on order (R3), which would drop Adjustments at random.

## R3. Planned amounts, rounding and display

**Decision**:
- `plannedAmounts(meals, dishesById)` sums `scaleMeal(mealSource(meal), meal.servings).ingredients`, keyed by `productId`, unrounded. Meals are processed in `compareIds` order, so the float sum is the same whatever order IndexedDB returns them in. Meals whose source is missing (`mealSource` returns `null`) are skipped, as the Week page does.
- Display rounding happens once, in `displayQuantity(amount, unit)`, in the Product's base unit:
  - g, ml: `roundTo(amount, 0)`, and at least 1 when `amount > 0` (spec "Tiny amounts").
  - pcs: `Math.ceil(roundTo2(amount))`. Rounding to 2 decimals first stops float noise such as `2.0000000004` from turning into 3.
- `formatListAmount(amount, unit)` builds the text from that quantity: from 1000 g or ml it divides by 1000 and shows up to 2 decimals as kg or l ("1,25 kg"), using the rounded quantity, so 999,6 g shows "1 kg" (FR-008). The labels are "g", "kg", "ml", "l" and "szt.".
- The amount field is filled with `displayQuantity` as text (FR-017), so the value the user sees and the value in the field always agree.

**Rationale**: Principle IV requires rounding at defined points in the domain. Summing first and rounding once keeps a Product used by many Meals exact (SC-001). The existing `formatAmount` (feature 002) keeps its own rules for the Meal sheet.

**Alternatives considered**: rounding each Meal's amount before summing, which accumulates error over 35 Meals; `Intl.NumberFormat`, which the domain can't use without a fixed locale and which `formatDecimal` already covers.

## R4. Product merge, delete and unit change inside the existing transactions

**Decision**: `ProductRepository` adds `productListStates` to the transactions of `merge`, `delete` and `changeUnit`:

- **delete**: removes every state record of the Product (FR-029).
- **changeUnit**: sets `adjustment` to `null` on every state record of the Product, and deletes records left empty (FR-030).
- **merge**, before the Dish and Meal Ingredients are rewritten:
  1. Read the state records of both Products through the `productId` index.
  2. For each Week those records belong to, read that Week's Meals and compute both Planned amounts from the pre-merge Dishes (`plannedAmounts`).
  3. Apply the pure `mergeProductListStates` to each Week. It drops both Adjustments. It keeps the tick (or At Home mark) only if every one of the two Products with a Planned amount above zero in that Week had it. When neither has one, both records count.
  4. Delete both Products' records for those Weeks, and put the merged record under the kept Product.

**Rationale**: The merge already runs in one `rw` transaction over `products`, `dishes` and `meals` (feature 002). Adding the new table keeps the merge atomic. Pre-merge Planned amounts are needed, because after the rewrite only the kept Product has Ingredients. Only Weeks that have state records are read: in practice a handful.

**Alternatives considered**: a separate cleanup after the merge, which can leave a half-merged state on failure; dropping all marks on merge, which loses ticks the spec wants kept.

## R5. Sharing: Web Share with a clipboard fallback, behind a port

**Decision**: A new port `TextSharer { share(text): Promise<'shared' | 'copied' | 'cancelled'> }` in `src/data/ports.ts`. Its adapter `src/adapters/web-text-sharer.ts`:

1. If `navigator.share` exists: `await navigator.share({ text })` → `'shared'`. A rejection named `AbortError` (the user closed the sheet) → `'cancelled'`. Any other error is rethrown.
2. Otherwise `await navigator.clipboard.writeText(text)` → `'copied'`. An error is rethrown.

The page builds the text from the model it already rendered and calls `share` directly in the click handler, with no awaited work before it.

**Rationale**:
- Principle IV puts sharing and the clipboard behind an interface with a fake. Tests use a recording fake.
- `navigator.share` needs transient user activation. Safari and Chrome reject it if an `await` such as a database read comes first. The share text is a pure function of the rendered model, so nothing needs awaiting.
- iOS Safari and installed iOS PWAs support `navigator.share` with text. Desktop Firefox has no `navigator.share`, so it gets the clipboard. Both need a secure context, which Cloudflare Pages and `localhost` provide.
- Sharing works offline. The share sheet hands the text to local apps (FR-027, spec Edge Cases).
- Only `text` is passed. A `title` is ignored by many targets, and the first line of the text already names the list and the Week.

**Alternatives considered**: `navigator.canShare` (needed only for files); a `mailto:` or SMS link (one target only); a custom "copied" dialog (a Framework7 toast is enough, matching "Skopiuj do następnego tygodnia").

## R6. The list's Week navigation and header swipe

**Decision**:
- The Shopping List page keeps its own `weekStart` in React state, initialised once from `clock.today()` on mount (FR-003). Framework7 keeps tab views mounted, so the Week survives tab switches. It resets only when the app starts.
- The header is a card like the Week card: ← "16–22 lis 2026" →, with the buttons visible on every screen size (FR-002). The label is the existing `weekRangeLabel`.
- The swipe is release-based. Pointer down records the start, ignoring starts in `inEdgeZone` (feature 003) so the system back swipe keeps working. Pointer up passes `(dx, dy)` to a pure `headerSwipeDelta`, which returns +7, −7 or 0 days. It brings back feature 002's `swipeWeekDelta` rule: at least 50 px, and more than 1,5 × as horizontal as vertical. The header has `touch-action: pan-y`, so vertical scrolling stays native.

**Rationale**: The spec asks for a simple swipe applied on release (Assumptions). The rule and its numbers were already tuned in feature 002 and shipped before feature 003 replaced them on the Week card. Reusing `inEdgeZone` keeps one definition of the edge zone.

**Alternatives considered**: reusing feature 003's `WeekTrack` (follow-the-finger), which the spec rules out; Framework7's Swiper, which feature 003 ruled out (its research R1); sharing the Week with Tydzień, which the user rejected.

## R7. Row layout and tap targets with Framework7 lists

**Decision**: Each row is a Framework7 inset list item built from Framework7's own classes, with three controls:

1. **Tick**: a `<label class="item-checkbox">` with a real checkbox input and Framework7's `icon-checkbox`. The label also covers the name, so tapping the name ticks too. That gives a large one-handed target in the shop (SC-004).
2. **Amount** (Product items only): a `<button>` outside the label, showing the Amount to buy, with the Planned amount below it when an Adjustment applies. It opens the amount sheet.
3. **At Home** (Product items only): a 44 × 44 px `<button aria-pressed>` with the `house` / `house_fill` Framework7 icon, outside the label.

Extras use the same tick label, wrapped in Framework7's `swipeout` with one delete button (FR-023).

**Rationale**:
- Buttons inside a `<label>` would toggle the checkbox, so they sit beside it.
- Framework7's `ListItem checkbox` renders the whole row as one label, which can't hold the other two controls. The same classes keep the iOS look and the green accent (project memory: Framework7 native patterns).
- Making the name part of the tick target follows the platform's checklist behaviour. The spec only requires that the tick takes one tap (FR-011).

**Alternatives considered**: `ListItem checkbox` with `after` content (the buttons would be inside the label); tapping the name to mark At Home (rejected by the user in favour of a separate button); a swipe action for At Home (rejected by the user).

## R8. Live updates and performance

**Decision**: The page reads five live queries: the Shown Week's Meals (`listMeals(weekRange)`), all Dishes, all Products, the Week's state records and the Week's Extras. The view model calls `buildShoppingList` on every render. Until every query has resolved, the page shows nothing rather than an empty list.

**Rationale**:
- Dexie's `liveQuery` re-runs when a table it read changes. A plan change in Tydzień, a Dish edit or a Product rename therefore updates the list with no extra wiring (FR-006, SC-003).
- Building the list is linear: 35 Meals × about 10 Ingredients, grouped into at most a few hundred Products, plus one sort. It is well under a millisecond, far inside SC-002's 300 ms. Reading all Dishes and Products is what the Week page and the Produkty page already do.
- Not showing the empty state while loading avoids a flash of "nothing to buy".

**Alternatives considered**: a stored, precomputed list (forbidden: the list is never stored, docs/SPEC.md); a single combined query in a repository (less reuse, and the same tables are read anyway).

## R9. Sorting and the two parts

**Decision**: `buildShoppingList` returns `{ toBuy, done }`. `done` holds ticked items and At Home Product items. Each part is sorted with `compareNames` on the text shown (Product name or Extra text), with `compareIds` breaking ties. Extras and Product items are mixed (FR-009).

**Rationale**: `compareNames` is the app's Polish collation (`Intl.Collator('pl')`, base sensitivity, numeric runs), already used by the Product list and the picker. That gives the spec's "Awokado, cebula, łosoś, ziemniaki" order. The id tie-break keeps duplicate Extras in a stable order. Two arrays make the "top part" a value the page and the share text both read, so they can't disagree.

**Alternatives considered**: one array with a sort key (the page would need to find the boundary again); sorting in the view model (aggregation rules belong to the domain, Principle IV).

## R10. Extra text

**Decision**: `normalizeName` (NFC, trimmed, inner whitespace runs collapsed) is applied to typed Extra text. An empty result adds nothing (FR-022). There is no length limit, and long text wraps (spec Edge Cases).

**Rationale**: It is the same normalisation as Product and Dish names. Collapsing inner whitespace has no visible downside, and it stops "kawa" and "kawa " from looking like different Extras.

**Alternatives considered**: `trim()` only, which is equivalent for every realistic input but keeps a second normalisation rule.

## R11. Testing strategy

**Decision**:
- **Domain** (`tests/domain/shopping.test.ts`, `units.test.ts`): every function in [contracts/domain-api.md](contracts/domain-api.md) with the spec's examples as cases, at 100% coverage.
- **Data** (`fake-indexeddb`): `ShoppingRepository` (patch and normalise, Extras), and the `ProductRepository` merge, delete and unit-change rules across two Weeks.
- **App**: `saveAdjustment` and `addExtra` against a test database.
- **UI** (jsdom): the page's key interactions, each in one test: amounts shown, tick moves a row, At Home crosses it out, the amount sheet saves and shows the styling, Extras add and delete, Week navigation by button and by swipe, and share with the recording sharer (shared, copied with toast, cancelled).
- **Adapter**: `web-text-sharer.ts` with stubbed `navigator.share` and `navigator.clipboard` (AbortError → cancelled, missing share → clipboard).
- **Manual**: [quickstart.md](quickstart.md) on an iPhone, as the installed app and in Safari.

**Rationale**: As in features 001–003: pure rules at full coverage, storage on a real IndexedDB fake, and only key interactions in jsdom.

## R12. No new dependencies

**Decision**: Nothing new is installed. Framework7 already ships checkboxes, swipeout, sheets, toasts and the `house` icons. Dexie handles compound keys. Web Share and the Clipboard API are browser built-ins.

**Rationale**: Principle V and the technology constraints.
