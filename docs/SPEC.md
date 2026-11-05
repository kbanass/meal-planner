# Meal Planner — MVP Specification

Terms in **bold** are defined in [GLOSSARY.md](../GLOSSARY.md).

## Purpose

Help one person plan a full **Week** of meals ahead so that:

1. Shopping can happen once a week and buys exactly what is needed: nothing thrown away, no extra trips.
2. The plan can be checked against nutrition goals, mainly at **Week** level. A 4000 kcal day followed by a 2000 kcal day is fine if the week adds up.

## Scope principles

- **Single-user, local-only.** One install = one person. Two people use two separate installs with separate data. No accounts, backend or sync.
- **Planning only.** No logging of what was actually eaten. Tracking stays in Fitatu.
- **No nutrition database.** **Products** carry no nutrition data. **Dish** **Macros** are entered by hand, as totals for the whole recipe (the user calculates them in Fitatu).
- **UI language: Polish only**, with strings inline (no i18n library). **All code, identifiers and comments in English.**

## Stack

- TypeScript, React, Framework7 (mobile-first UI), Vite
- `vite-plugin-pwa`: installable, works offline
- Dexie + `dexie-react-hooks` (`useLiveQuery`) for storage and reactive UI. No separate state library.
- OPFS for Dish photos
- dnd-kit for desktop drag and drop
- Vitest for domain logic (scaling, shopping list aggregation, summaries)
- Hosting: Cloudflare Pages (static)
- Ids: UUIDs, not auto-increment, so sync can be added later without migration

## Domain model

### Product
- `name`, `unit`: one of `g`, `ml`, `pcs` (UI: g / ml / szt.)
- Matched case-insensitively by substring for autocomplete. Created on the fly when typing a name that does not exist.

### Dish
- `name`
- `photo` (optional): stored in OPFS, compressed before saving (~800 px longest edge, WebP, or JPEG where the browser cannot encode WebP, e.g. iOS Safari). Without a photo, show a deterministic placeholder: a color derived from a hash of the name, plus initials.
  - HEIC/HEIF (the iPhone camera default) works today only where the browser can decode it (Safari). Elsewhere, e.g. Chrome or Firefox on a desktop, the preview stays empty and saving reports that the photo could not be read. Support for those browsers comes later (see Out of scope).
- `servingsYield`: how many servings the recipe makes
- `ingredients`: list of { product, amount } in the product's unit
- `macros`: kcal, protein, fat, carbs **for the whole recipe**
- `notes` (optional): free text, e.g. method or a link
- `archived`: deleting a Dish that any **Meal** references archives it instead (hidden from the library and picker). A Dish no Meal references is deleted for real.

### Meal
- Belongs to a date + **Slot** number
- `servings` (default 1)
- **Linked** by default: reads name, ingredients and macros from its Dish live.
- **Detached** on the first edit to anything other than `servings`. It then holds its own copy of name, `servingsYield`, ingredients and macros, and Dish edits no longer affect it. The UI shows a small "modified" marker.
- Action **"przywróć z Dania"**: drops the copy and links the Meal again.

Scaling (linked or detached, using the Meal's source of truth):

```
mealMacros            = macros            / servingsYield * servings
mealIngredientAmount  = ingredient.amount / servingsYield * servings
```

Editing a Meal:
- `servings` scales macros and ingredients automatically. It does not detach.
- Name, ingredients (change amount, add, remove) and macros are edited by hand and independently. Changing ingredient amounts does **not** recalculate macros, and no warning is shown.
- Remove from slot.

### Slots
- The default number of Slots per day is a global setting: a whole number from 1 to 10, initially 4.
- Each Slot can hold several Meals.
- Below the last Slot of a day sits a placeholder, "dodaj kolejny", which adds one Slot **to that day only**. The day keeps the raised Slot count ("added Slots") even while those Slots are empty.
- A day shows `max(setting, highest Slot in use, that day's raised Slot count)` Slots.
- In the UI, Slots are labelled with numbers only.

### Goals
- A global **Daily Goal** for kcal, protein, fat and carbs. **Weekly Goal** = Daily Goal × 7.
- Changing the goals also changes how past weeks are summarised (no goal history in the MVP).

### Week
- Always Monday–Sunday.
- Past weeks are kept. On phones, navigate by swiping the Week card; on desktop with ← / → buttons.
  - Planned (later): the swipe gets proper microinteractions. While a finger holds and drags the Week card, the card follows it. On release, a long enough drag or a quick flick makes the content fade or slide away and the new Week fade gently in; a short drag springs back. Animations stay short (roughly 150–250 ms), because this is the app's primary interaction. Vertical scrolling and the system back swipe keep working. Today the Week changes on release, with a short slide-in. The approach is being researched in `docs/research/week-swipe-gesture.md`.
- **"Skopiuj do następnego tygodnia"** copies all Meals (with servings and their linked/detached state) and per-day added Slots from the viewed Week into the next one, **replacing** the next Week's Meals and added Slots. If the next Week is not empty, ask for confirmation first. The next Week's Shopping List layer (Adjustments, Extras, checks) is left as it is.

## Summaries

- Bars fill in proportion to **Planned** / Goal, in a single color with no tolerance bands. A bar over its goal stays full.
- Each bar has a small label with the difference, e.g. `+120` / `−340`.
- **Day summary:** kcal, protein, fat, carbs for that day vs the Daily Goal.
- **Week summary:** only week totals vs the Weekly Goal, with no per-day breakdown.

## Shopping List

- **Live**, never regenerated by hand: the sum over all Meals of the Week of `mealIngredientAmount`, grouped by Product.
- A per-Week layer on top:
  - **Adjustments**: tap an item → enter an amount to add or subtract (e.g. −500 g).
  - **Extras**: free-text items with no amount or unit.
  - Checked state for each item.
- Plan changes update the sums immediately, and Adjustments, Extras and checks are kept.
- Display:
  - Sorted alphabetically, checked items move to the bottom.
  - g ≥ 1000 shown as kg, ml ≥ 1000 shown as l.
  - `pcs` rounded **up** to whole numbers, after applying the Adjustment.
  - An item whose total is ≤ 0 after its Adjustment is shown struck through (not removed, so the Adjustment can be undone).
- **"Udostępnij listę"**: shares the list as plain text through the Web Share API, or copies it to the clipboard where Web Share is not available. This is how two people merge their lists by hand.

## Screens

Tabs: **Tydzień**, **Dania**, **Lista zakupów**, **Ustawienia**.

### Mobile
- **Tydzień:** one screen.
  - At the top, with no page title, a Week card holds the month and year, a strip of 7 days (short name, date, kcal), the selected day's kcal, protein, fat and carbs (each with an icon; bars once goals exist), and "skopiuj do następnego tygodnia". Swipe the card to change Weeks. Today is selected when the app opens, and tapping a day selects it.
  - Then the Week summary.
  - Then the selected day: its Slots as cards, each with its own kcal and macro totals and its Meals inside (Dish photo on the left), and, set apart below them, the "dodaj kolejny" placeholder.
  - Look (all tabs): warm off-white background, white rounded cards with a soft shadow, the app's green as the accent everywhere, input borders with good contrast. Standard parts (tabbar, sheets, dialogs, inputs) stay Framework7's.
  - Tapping an empty Slot card opens a horizontally scrolling dish picker at the bottom of the screen: small cards with photo, name, and kcal and macros for one serving. Tapping a Dish adds a Meal (1 serving). Filters come later.
  - Tapping a Meal opens a bottom sheet for editing (servings, fields, restore, remove).
- **Dania:** Dish library (create, edit, archive) as cards: photo, name, servings yield, number of ingredients, kcal and macros per serving, start of the notes. A separate **Produkty** section.
- Editing a Dish (Dania) and editing a Meal (Tydzień) share one form look: white card sections, outlined inputs, the same ingredient rows and macro fields.
- **Produkty:** list with usage count. Rename, **merge** duplicates (all Dishes and Meals switch to the kept Product), delete only unused Products, change the unit only on unused Products.
- **Lista zakupów:** as described above.
- **Ustawienia:** number of Slots, Daily Goal, backup export/import.

### Desktop (≥ ~1024 px)
- Navigation is a vertical bar on the left. Every screen shows its content in one column of the same maximum width (960 px), centred in the space next to it, and sheets line up with that column. Components use the iOS style, as on iPhones.
- **Tydzień** becomes one screen:
  - a 7-column grid (Mon–Sun) × Slots, with day summary bars under each column,
  - the Week summary as a column on the right of the Week page, next to the selected day (Summaries feature),
  - a side panel with the Dish library and search.
- Drag and drop (dnd-kit):
  - Dish from the library onto a Slot adds a Meal (1 serving).
  - Meal onto another Slot or day moves it.
- Meal editing in a popover or modal.
- The other tabs reuse the mobile screens in a wider layout.

## Data safety

- Call `navigator.storage.persist()` on startup.
- **Export/import**: a single JSON file with all data, including photos (base64). Data exists only on the device, and iOS Safari may evict storage of sites not added to the home screen.

## Out of scope (later)

Sync between devices, nutrition import (Open Food Facts), prices and cost, pantry or inventory, per-day goals (training days), goal history, copying a single day or Meal, Dish tags and filters, package sizes on the shopping list, marking Meals as eaten, HEIC/HEIF Dish photos in browsers that cannot decode them (e.g. desktop Chrome, Firefox): decode them offline in the app, convert to WebP/JPEG like any other photo, and show a working preview before saving.

## Decisions

See [docs/adr/](adr/).
