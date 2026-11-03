# Contract: Screens, routes and user-facing text

All user-facing text is Polish and written inline (Principle I). Components render view-model output and call use cases. They compute nothing themselves (Principle IV).

## Shell

| Tab (order) | Label | Icon (Framework7 Icons) | Content in this feature |
|---|---|---|---|
| 1 (default, FR-002) | Tydzień | `calendar` | Placeholder |
| 2 | Dania | `book` | Dish library, then Produkty |
| 3 | Lista zakupów | `cart` | Placeholder |
| 4 | Ustawienia | `gear` | Placeholder |

- Placeholder text (FR-003): title = the tab label, body = "Ten ekran pojawi się w kolejnej wersji."
- Mobile: bottom tabbar. At ≥ 1024 px the tabbar moves to the top, and content uses the wider layout (FR-009, research R10).
- Unit labels (FR-010): `g` → "g", `ml` → "ml", `pcs` → "szt.".

## Dania tab routes

| Route | Screen | Key elements |
|---|---|---|
| `/dishes/` | Dish library | Navbar "Dania", with a link "Produkty" to `/products/` and a "+" button to `/dishes/new/`. A list of Dishes (avatar 48 px plus name), which becomes a card grid at ≥ 1024 px. Empty state: "Nie masz jeszcze żadnych dań. Dodaj pierwsze przyciskiem +." |
| `/dishes/new/` | Dish form (create) | See the form below |
| `/dishes/:dishId/` | Dish form (edit) | Same form, plus "Usuń danie" at the bottom |
| `/products/` | Produkty | Rows: name, unit, "używany: N". Tapping a row opens the actions sheet |

## Dish form

Fields, top to bottom:

| Field | Label | Input |
|---|---|---|
| Photo | Zdjęcie | The avatar, or the photo at 160 px. Buttons "Dodaj zdjęcie" or "Zmień zdjęcie", and "Usuń zdjęcie". The file input uses `accept="image/*"` |
| Name | Nazwa | Text |
| Servings yield | Liczba porcji | Decimal (`inputmode="decimal"`) |
| Ingredients | Składniki | Rows of: Product name, an amount input, the unit label as a suffix, a remove button. Below them the ProductPicker, with placeholder "Dodaj składnik…" |
| Macros | Makro (całe danie) | kcal, Białko (g), Tłuszcz (g), Węglowodany (g), all decimal |
| Notes | Notatki | Textarea |

- Save button "Zapisz" in the navbar. On `invalid`: the first invalid field is scrolled into view, and each invalid field shows its message.
- Validation messages:

| Code | Message |
|---|---|
| `required` | "To pole jest wymagane." |
| `notANumber` | "Wpisz liczbę, np. 1,5." |
| `notPositive` | "Wartość musi być większa od zera." |
| `negative` | "Wartość nie może być ujemna." |
| `duplicateProduct` | "Ten produkt jest już w daniu." |
| `unknownProduct` | "Nieznany produkt." |

- Photo errors (the Dish is still saved, shown as a toast):
  - decode → "Nie udało się wczytać zdjęcia. Spróbuj innego pliku."
  - quota → "Brak miejsca na urządzeniu. Danie zapisano bez nowego zdjęcia."
- Delete confirmation: "Usunąć danie „{nazwa}”?" with the buttons "Usuń" and "Anuluj".

## ProductPicker

- Suggestions come from `suggestProducts`. Each row shows the name and the unit label.
- When `shouldOfferCreate` is true, the last row reads "Dodaj „{wpisana nazwa}”". Choosing it opens a sheet titled "Nowy produkt" with a segmented unit control (g preselected) and the buttons "Dodaj" and "Anuluj".
- Picking a Product already in the Dish focuses the existing amount field and shows a toast: "Ten produkt jest już w daniu."

## Produkty actions sheet

| Action | Label | Availability (from `productActions`, `canMerge`) | Disabled hint |
|---|---|---|---|
| Rename | Zmień nazwę | always | n/a |
| Change unit | Zmień jednostkę | usage = 0 | "Produkt jest używany w {N} daniach – jednostki nie można zmienić." |
| Merge | Scal z innym produktem… | at least one other Product with the same unit | "Brak innych produktów z tą samą jednostką." |
| Delete | Usuń | usage = 0 | "Produkt jest używany w {N} daniach – nie można go usunąć." |

The "{N} daniach" text is produced in a view-model with correct Polish plural forms: "1 daniu", "2 daniach", "5 daniach". A future Detached Meal count extends the same function.

- Rename conflict: "Produkt „{nazwa}” już istnieje." If merging is allowed, the button "Scal z „{nazwa}”" is added.
- Merge: a picker lists the other Products with the same unit. The confirmation reads "Scalić „{from}” z „{into}”? Wszystkie dania będą używać „{into}”." with the buttons "Scal" and "Anuluj".
- Delete confirmation: "Usunąć produkt „{nazwa}”?"

## PWA manifest (FR-005)

`name` "Planer posiłków", `short_name` "Planer", `lang` "pl", `display` "standalone", `start_url` "/", and icons at 192, 512 and 512-maskable, plus a 180 px `apple-touch-icon`.
