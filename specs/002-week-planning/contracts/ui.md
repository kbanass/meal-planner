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
| Tydzień | Placeholder | Week page, then the Day page |
| Ustawienia | Placeholder | Settings page with "Liczba slotów". The rest of the screen comes in later features |

Lista zakupów stays a placeholder.

## Tydzień routes

| Route | Screen |
|---|---|
| `/` | Week page |
| `/day/:date/` | Day page. An invalid `date` (`isIsoDate` false) shows "Nie ma takiego dnia." with a back link |

## Week page

- **Navbar**:
  - `NavLeft`: link with icon `chevron_left`, `aria-label` "Poprzedni tydzień".
  - `NavTitle`: `weekRangeLabel`, e.g. "2–8 lis 2026".
  - `NavRight`: link with icon `chevron_right`, `aria-label` "Następny tydzień".
- **Copy action**: an outlined `Button` "Skopiuj do następnego tygodnia" in a `Block`, disabled when the viewed Week has no plan (FR-036).
- **Day list**: a `List` `mediaList` with 7 rows in order, each linking to `/day/:date/`:

  | Part | Content |
  |---|---|
  | title | day name, e.g. "Poniedziałek" |
  | subtitle | date, e.g. "2 lis" |
  | after | "1850 kcal", or "brak posiłków" when the day has no Meals |
  | today | the row gets class `day-today` (accent left border) and the subtitle "2 lis · dziś" |

- **Copy flow**:
  1. If the next Week has a plan, confirm with "Następny tydzień ma już plan. Zastąpić go planem z tego tygodnia?"
  2. On success, show the toast "Skopiowano do następnego tygodnia." and stay on the viewed Week (FR-037).
  3. On failure, show the alert "Nie udało się skopiować tygodnia. Następny tydzień nie został zmieniony."

## Day page

- **Navbar**: back link, title "{dayName}, {dateText}", e.g. "Czwartek, 5 lis".
- **Each Slot**, in order:
  - A `BlockTitle` with just the number, e.g. "1".
  - A `List` `mediaList` with one row per Meal, in the order added:

    | Part | Content |
    |---|---|
    | media | `DishAvatar` (40 px): the Dish photo, or the placeholder for the Meal's displayed name |
    | title | Meal name, or "Nieznane danie" when the Dish is missing |
    | subtitle | "{servings} {porcja/porcje/porcji} · {kcal} kcal", e.g. "1 porcja · 350 kcal", "1,5 porcji · 525 kcal" |
    | after | a small `Badge` "zmieniony" for a Detached Meal |
    | tap | opens the Meal sheet |

  - The last row of the list is "Dodaj posiłek" (plus icon) and opens the Dish picker for that Slot. In an empty Slot it is the only row (FR-013).
- **Below the last Slot**: a `List` with one list button "dodaj kolejny" (FR-010).

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

- The Week, Day and Settings pages use the existing `.page-wide` column (at most 640 px, centred) (FR-041).
- The sheets keep Framework7's default sheet behaviour.
- No grid, side panel or drag and drop (spec Assumptions).
