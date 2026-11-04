# Contract: Screens, routes and user-facing text

The rules of [feature 001's UI contract](../../001-shell-products-dishes/contracts/ui.md) still apply:
- Text we write is Polish and inline.
- Framework7's own default labels ("OK", "Cancel", "Back") stay as shipped.
- Confirmations use the standard `f7.dialog.confirm` and `f7.dialog.alert`.
- Components render view-model output and compute nothing themselves.

Framework7 structure follows research R11.

## Shell changes

| Tab | Before | Now |
|---|---|---|
| Tydzień | Placeholder | Week page: Week card with day strip, then the selected day's Slots |
| Ustawienia | Placeholder | Settings page with "Liczba slotów". The rest of the screen comes in later features |

Lista zakupów stays a placeholder.

## Tydzień routes

| Route | Screen |
|---|---|
| `/` | Week page (the only page of the Tydzień tab since the 2026-11-04 redesign) |

The `/day/:date/` Day page from the first build is removed. Its Slots now show on the Week page (spec Revisions, FR-007).

## Week page (redesigned 2026-11-04)

The layout follows the reference screenshot in spec.md Revisions. It is built from custom components (`WeekCard`, `DayStrip`, `MealCard`) inside a Framework7 `Page`. The tabbar, sheets, dialogs and inputs stay Framework7's (research R14).

**Look** (CSS variables in `src/ui/styles/app.css`, scoped to the Tydzień tab):

| Token | Value | Use |
|---|---|---|
| `--planner-page-bg` | warm off-white, about `#F5F1EC` | page background |
| `--planner-card-bg` | `#FFFFFF` | Week card and Meal cards |
| `--planner-card-radius` | `24px` | cards. Day pill `16px` |
| `--planner-card-shadow` | `0 8px 24px rgba(60, 30, 20, 0.08)` | cards |
| `--planner-accent` | `#2f6f4f`, the app's green | selected-day pill, today's mark, primary actions |
| `--planner-muted` | `#8E8A86` | short day names, secondary text |

Headings use the system font at weight 700, with a larger size than Framework7's defaults: about 28 px for the month, 22 px for the day heading.

**Accent colour (decided by the user, 2026-11-04): the app's green `#2f6f4f`**, the colour of the app icon and manifest. It applies inside the Tydzień tab: the custom tokens, and `--f7-theme-color` within `#view-week`, so that tab's Framework7 parts match. The rest of the app, the tabbar included, keeps Framework7's default iOS blue for now.

The screenshot is a reference for the general look only, not a design to match exactly (the user, 2026-11-04).

**Structure, top to bottom:**

1. **Page title**: "Tydzień" in Framework7's large navbar (`Navbar large transparent`). It handles the safe area and collapses on scroll as on iOS. Its background is the page colour, and on desktop the title lines up with the 640 px column. (As built: Framework7's own large title replaced the hand-made one planned here.)
2. **Week card** (`WeekCard`):
   - **Top row**: the month label on the left, `weekMonthLabel`: "Listopad 2026", "Listopad – grudzień 2026", "Grudzień 2026 – styczeń 2027". On the right, two round 44 px buttons with `arrow_left` / `arrow_right` icons, `aria-label` "Poprzedni tydzień" / "Następny tydzień".
   - **Day strip** (`DayStrip`): 7 equal columns, each a `button` with `aria-pressed` for the selected day:

     | Line | Content | Style |
     |---|---|---|
     | 1 | short name: Pn, Wt, Śr, Cz, Pt, So, Nd | muted, 15 px. Today: accent colour |
     | 2 | day of the month | 20 px, weight 700 |
     | 3 | Planned kcal, e.g. "1850", empty when no Meals | 11 px, muted |

     The selected day is a filled accent pill (radius 16 px, white text, a soft accent shadow).
   - **Bottom row**: a text button with a `doc_on_doc` icon, "Skopiuj do następnego tygodnia", in the accent colour. Disabled (muted) when the viewed Week has no plan (FR-036).
3. **Day heading row**: "Czwartek, 5 lis" on the left (22 px, 700). The summary on the right, muted: "2 posiłki · 875 kcal", "1 posiłek · 350 kcal", "5 posiłków · …", or "brak posiłków".
4. **Slots**: for each Slot, a small muted label with just its number, then:
   - **Meal cards** (`MealCard`), in the order added. Each is a white card, about 112 px tall:
     - On the left, a square photo or placeholder filling the card height (`DishAvatar shape="square"`, 104 px).
     - On the right, the name (17 px, 700, at most 2 lines) and "1,5 porcji · 525 kcal" (muted).
     - At the bottom, a "zmieniony" chip for a Detached Meal: rounded, light accent background.
     - In the top-right corner, a `pencil` icon.

     Tapping the card opens the Meal sheet.
   - **Empty Slot**: one outlined card, dashed 1.5 px border in the muted colour, with a `plus` icon and "Dodaj posiłek". Tapping it opens the Dish picker for that Slot.
   - **Slot with Meals**: below its cards, a small text action "+ Dodaj posiłek" that opens the same picker.
5. **"dodaj kolejny"**: a dashed outlined card like the empty Slot, labelled "dodaj kolejny" (FR-010).

**Refinements as built (later 2026-11-04, tasks T098–T105):**
- **No title.** The page has no navbar, and the Week card starts below the safe area.
- **Week card:**
  - Month label.
  - ← / → round buttons: visible at 1024 px and up, visually hidden but kept for screen readers below that.
  - Day strip.
  - The selected day's totals (`MacroTotals`): `flame_fill` kcal, `cube_fill` białko, `drop_fill` tłuszcz, `hexagon_fill` węglowodany, each with an `aria-label` such as "Białko: 12,5 g".
  - Copy action.
- **Swipe.** A horizontal swipe on the Week card (`swipeWeekDelta`: at least 50 px, and mostly horizontal) moves the Week, with a 220 ms slide-in. Reduced motion turns the slide off.
- **Slot cards.** Each Slot is a `SlotCard`:
  - a green number badge and compact totals
  - Meals as rows (64 px rounded photo, name, "1 porcja · 350 kcal", "zmieniony" chip, pencil)
  - "Dodaj posiłek", a dashed box when the Slot is empty
- **"dodaj kolejny"** is a centred pill button, below a dashed divider, after the Slot cards.
- **Day heading.** The summary is the Meal count only ("2 posiłki"). The kcal moved to the totals.
- **Dish picker.** Tiles are 132 px white cards: a 96 px photo, the name, and compact totals for one Serving.
- **App-wide:**
  - `<App colors={{ primary: '#2f6f4f' }}>` makes Framework7's links, icons, tabbar and dialogs green.
  - The tokens, the warm page and navbar background, and `--f7-input-outline-border-color: #7a746e` (about 4.6:1 on white) are set on `.framework7-root`.
- **Ustawienia.** "Liczba slotów" is a link row showing the value. It opens the `slots-sheet` with radio rows 1–10, and picking one saves it and closes the sheet. The inline Stepper is gone.

**As built (2026-11-04):**
- `WeekCard` is markup inside `WeekPage.tsx` rather than its own component.
- `DayStrip` and `MealCard`/`SlotAddCard` live in `src/ui/components/`.
- The ← / → and copy controls are plain `button`s styled as round buttons and a text button.
- The tokens are set on `#view-week`, and so is `--f7-theme-color` (green). The navbar background matches the page.

**Behaviour:**
- `weekStart` and the selected date are React state of the Week page.
- On open, the selected date is today (FR-002, FR-007).
- ← / → move `weekStart` by 7 days and keep the selected weekday.
- Resuming after midnight moves the today mark only (research R2).
- The copy flow, confirm text, toast and failure alert are unchanged.

## Day page

Removed in the 2026-11-04 redesign. The day title ("Czwartek, 5 lis"), the Slots and the "dodaj kolejny" action moved to the Week page (above). The picker and the Meal sheet are rendered once on the Week page.

## Dish picker (Sheet)

- **Title row**: "Wybierz danie", with a "Zamknij" link.
- **Contents**: a horizontally scrolling strip of tiles, alphabetical (`selectLibrary`). Each tile is a 72 px avatar plus a name, at most 2 lines.
- **Tapping a tile** adds the Meal and closes the sheet.
- **Empty library**: "Nie masz jeszcze żadnych dań. Dodaj je w zakładce Dania." (FR-016).

## Meal sheet

- **Toolbar**: "Anuluj" (left), the Meal name (title), "Zapisz" (right).
- **Fields**, top to bottom:

  | Field | Label | Input |
  |---|---|---|
  | Servings | Porcje | Decimal (`inputmode="decimal"`). A valid change rescales the fields below (research R7) |
  | Name | Nazwa | Text |
  | Ingredients | Składniki (w tym posiłku) | `IngredientRow`s plus `ProductPicker`, as in the Dish form |
  | Macros | Makro (ten posiłek) | kcal, Białko (g), Tłuszcz (g), Węglowodany (g) |

- **Detached Meal note**: above the fields, "Posiłek zmieniony – zmiany w daniu go nie dotyczą."
- **Buttons at the bottom**:
  - "Przywróć z dania" (Detached Meals only). Confirm: "Przywrócić „{nazwa dania}” z dania? Zmiany w tym posiłku zostaną utracone."
  - "Usuń posiłek" (red). Confirm: "Usunąć posiłek „{nazwa}”?"
- **Saving**:
  - On `invalid`, mark the fields with the feature 001 messages. `duplicateProduct` reads "Ten produkt jest już w posiłku." in this sheet.
  - On `saved` with `detachedNow`, show the toast "Posiłek zmieniony – nie będzie już śledził zmian w daniu."
  - On `gone`, show the alert "Ten posiłek już nie istnieje." and close the sheet.
- **Cancel or swipe-to-close** discards the draft (FR-018).

## Settings page

- **Navbar**: "Ustawienia".
- **Slots**: a `List` with the item "Liczba slotów" and the footer "Domyślna liczba slotów w każdym dniu. Dzień może mieć ich więcej." The item's `after` is a `Stepper` (min 1, max 10, step 1, `small`, `round`), and each change saves at once.
- **Placeholder**: a `Block` "Cele i kopia zapasowa pojawią się w kolejnej wersji."

## Produkty hints (change to feature 001)

| Case | Text |
|---|---|
| Dishes only | unchanged: "Produkt jest używany w 2 daniach – nie można go usunąć." |
| Meals only | "Produkt jest używany w 1 posiłku – nie można go usunąć." |
| Both | "Produkt jest używany w 2 daniach i 3 posiłkach – nie można go usunąć." |

- The unit-change hint follows the same pattern ("– jednostki nie można zmienić.").
- Phrases: `dishCountPhrase`, plus the new `mealCountPhrase` ("1 posiłku", "N posiłkach").
- The row's "używany: N" shows the total.

## Desktop (≥ 1024 px)

- The Week and Settings pages use the existing `.page-wide` column (at most 640 px, centred) (FR-041). The Week card and Meal cards keep their mobile proportions inside it.
- The sheets keep Framework7's default sheet behaviour.
- No grid, side panel or drag and drop (spec Assumptions).

## Strings written beyond this contract (as built)

| Where | Text |
|---|---|
| Day strip group (`aria-label`) | "Dni tygodnia" |
| Day pill (`aria-label`) | "{dayName}, {dateText}", e.g. "Czwartek, 5 lis" |
| Macro totals (`aria-label` and `title`) | "Kalorie: 350 kcal", "Białko: 12,5 g", "Tłuszcz: 7,5 g", "Węglowodany: 55 g" |
| Slots sheet in Ustawienia | title "Liczba slotów", link "Zamknij" |
| Dev seed toast | "Dane testowe wczytane: {seed}" (development and `deploy:seed` builds only) |
