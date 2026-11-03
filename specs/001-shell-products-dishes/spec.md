# Feature Specification: App Shell, Products and Dishes

**Feature Branch**: `001-shell-products-dishes`

**Created**: 2026-11-03

**Status**: Draft

**Input**: User description: "Feature 1 from docs/SPEC.md: app shell (tabs, PWA), Products (catalog, autocomplete, rename/merge/delete, unit change rules) and Dishes (fields, photo + placeholder, archive). Use terms from GLOSSARY.md."

Domain terms in **bold** are defined in [GLOSSARY.md](../../GLOSSARY.md). The product contract is [docs/SPEC.md](../../docs/SPEC.md).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build the Dish library (Priority: P1)

The user opens the **Dania** tab and creates a **Dish**: a name, how many **Servings** it yields, its **Ingredients** (each a **Product** with an amount in that Product's unit) and the **Macros** for the whole Dish, copied from Fitatu. They can add optional notes. While adding an Ingredient they type part of a Product name and pick a match from the suggestions, or create a new Product right there by choosing its unit. Later they open the Dish to correct it.

**Why this priority**: Dishes are what every later feature (Week planning, summaries, Shopping List) is built from. Without a Dish library the app has nothing to plan with.

**Independent Test**: On a fresh install, create three Dishes with Ingredients (reusing at least one Product across them), close and reopen the app, and confirm all Dishes, Ingredients, Macros and notes are still there and editable.

**Acceptance Scenarios**:

1. **Given** an empty library, **When** the user creates a Dish named "Owsianka" yielding 2 Servings with Ingredients 100 g "płatki owsiane" and 300 ml "mleko" and Macros 700 kcal / 25 g protein / 15 g fat / 110 g carbs, **Then** "Owsianka" appears in the library and reopening it shows exactly those values.
2. **Given** a Product "mleko" exists, **When** the user types "MLE" in the Ingredient field, **Then** "mleko" is suggested (case-insensitive substring match).
3. **Given** a Product "mleko" exists, **When** the user types "ml" in the Ingredient field, **Then** "mleko" is suggested (match anywhere in the name, not only at the start).
4. **Given** no Product named "jogurt grecki" exists, **When** the user types "jogurt grecki", chooses to add it as a new Product and picks unit "g", **Then** the Product is created and added to the Dish as an Ingredient whose amount is entered in g.
5. **Given** a Dish with an Ingredient "mleko" (ml), **When** the user edits the Dish, **Then** the amount field for that Ingredient is labelled in ml and cannot be switched to another unit.
6. **Given** a Dish is open for editing, **When** the user clears the name or sets Servings yield to 0, **Then** saving is blocked and the invalid field is pointed out.

---

### User Story 2 - Recognise Dishes at a glance (Priority: P2)

The user adds a photo to a Dish from the device's camera or gallery so they can recognise it quickly in the library. Dishes without a photo show a coloured placeholder with the Dish's initials, so the library still looks tidy and each Dish is distinguishable.

**Why this priority**: Photos and placeholders make the library usable once it grows past a handful of Dishes, and the dish picker in later features depends on them. The library still works without them.

**Independent Test**: Add a photo to one Dish, leave another without one, reopen the app, and confirm the photo is shown for the first and a stable placeholder for the second.

**Acceptance Scenarios**:

1. **Given** a Dish without a photo, **When** the user picks a large photo from the device, **Then** the photo is shown for the Dish and is stored reduced to about 800 px on its longest edge.
2. **Given** a Dish with a photo, **When** the user removes the photo, **Then** the placeholder is shown instead.
3. **Given** a Dish with a photo, **When** the user replaces it with another photo, **Then** only the new photo is kept.
4. **Given** a Dish named "Leczo z kiełbasą" without a photo, **When** it is viewed in another session, after a reinstall, or a second Dish with the same name is created, **Then** each time the same placeholder colour and the initials "LZ" are shown.
5. **Given** a Dish without a photo named "Owsianka", **When** the user renames it to "Kasza jaglana", **Then** the placeholder changes to the colour and initials ("KJ") derived from the new name.

---

### User Story 3 - Keep the Product list clean (Priority: P2)

In the **Produkty** section the user sees every Product with its unit and how many places use it. They fix typos by renaming, merge duplicates such as "pomidor" and "pomidory" into one Product, delete Products they no longer use and correct the unit of a Product that is not used yet.

**Why this priority**: The Shopping List groups amounts by Product, so duplicates and wrong units later turn into a wrong shopping list. Cleaning up is needed soon after Dishes are entered, but not before.

**Independent Test**: Create Dishes that use two near-duplicate Products, merge them, and confirm every affected Dish now uses the kept Product, the other Product is gone, and the usage counts are correct.

**Acceptance Scenarios**:

1. **Given** Products "pomidor" (used by 2 Dishes) and "pomidory" (used by 1 Dish), both in g, **When** the user merges "pomidory" into "pomidor", **Then** all three Dishes use "pomidor", "pomidory" no longer exists, and "pomidor" shows a usage count of 3.
2. **Given** a Dish that has both "pomidor" 200 g and "pomidory" 100 g as Ingredients, **When** the user merges "pomidory" into "pomidor", **Then** that Dish has a single Ingredient "pomidor" 300 g.
3. **Given** Product "jajka" in pcs and "jajko" in g, **When** the user tries to merge them, **Then** the merge is not offered because the units differ.
4. **Given** Product "pomidr" used by 2 Dishes, **When** the user renames it to "pomidor" (no such Product exists), **Then** both Dishes show "pomidor".
5. **Given** Products "pomidor" and "pomidory", **When** the user tries to rename "pomidory" to "Pomidor", **Then** the rename is rejected because the name is already taken, and the user is offered a merge instead.
6. **Given** a Product used by at least one Dish, **When** the user tries to delete it or change its unit, **Then** the action is unavailable and the user is told it is in use and by how many Dishes and Detached Meals.
7. **Given** a Product with a usage count of 0, **When** the user deletes it after confirming, **Then** it disappears from the list and from autocomplete suggestions.
8. **Given** a Product with a usage count of 0 in g, **When** the user changes its unit to ml, **Then** the new unit is saved and used for future Ingredients.

---

### User Story 4 - Remove Dishes without breaking the plan (Priority: P3)

The user deletes a Dish they no longer cook. If no **Meal** uses it, it is removed for good. If any Meal still uses it, it becomes an **Archived Dish**: it disappears from the library and the dish picker, but the Meals that use it keep working.

**Why this priority**: Deleting is needed for upkeep, but in this feature no Meals exist yet, so the archive path matters only once Week planning arrives. The rule is defined now so the data stays consistent later.

**Independent Test**: Delete a Dish that no Meal uses and confirm it and its photo are gone. The archive path is tested with data in which a Meal references the Dish (for example, imported or seeded test data) and confirming the Dish is hidden from the library but still present for that Meal.

**Acceptance Scenarios**:

1. **Given** a Dish that no Meal uses, **When** the user deletes it and confirms, **Then** the Dish, its photo and its Ingredients are removed, and the Products it used remain in the Product list with reduced usage counts.
2. **Given** a Dish used by at least one Meal, **When** the user deletes it and confirms, **Then** it becomes an Archived Dish: it is no longer listed in the library or offered when choosing a Dish, and the Meals that use it still show its name, photo or placeholder, Ingredients and Macros.
3. **Given** the user starts deleting a Dish, **When** they cancel the confirmation, **Then** nothing changes.

---

### User Story 5 - Install and use the app offline (Priority: P1)

The user opens the app on their phone, adds it to the home screen and from then on starts it like a native app. The app has four tabs: **Tydzień**, **Dania**, **Lista zakupów** and **Ustawienia**. Everything in this feature works with no network connection. On a desktop-width screen the same tabs are shown in a wider layout.

**Why this priority**: The app shell is the frame every screen lives in, and offline installability is a core promise of the product (data lives only on the device). It is P1 together with Story 1 because neither delivers value alone.

**Independent Test**: Load the app once online, install it to the home screen, switch the device to airplane mode, start the app from the home screen, and create and edit a Dish.

**Acceptance Scenarios**:

1. **Given** the app has been opened once online, **When** the device is offline and the user starts the app, **Then** the app loads and all Dania and Produkty functions work.
2. **Given** the app is open in a supported mobile browser, **When** the user chooses to add it to the home screen, **Then** it installs with its own name and icon and opens full-screen without browser controls.
3. **Given** the app is open, **When** the user taps any of the four tabs, **Then** that tab's screen is shown and the active tab is highlighted.
4. **Given** the user is on the Tydzień, Lista zakupów or Ustawienia tab, **When** the tab opens, **Then** it shows a short Polish notice that the screen is coming in a later version.
5. **Given** a screen at least about 1024 px wide, **When** the user opens Dania or Produkty, **Then** the same screens are shown in a layout that uses the extra width, with no loss of function.

---

### Edge Cases

- **Name normalisation**: Product and Dish names are trimmed of leading and trailing spaces. An empty name after trimming is rejected.
- **Product name uniqueness**: Two Products cannot have names that differ only by letter case or surrounding spaces. Changing only the letter case of a Product's own name (e.g. "mleko" → "Mleko") is allowed.
- **Polish characters**: Autocomplete matching is case-insensitive for Polish letters too ("ŁOSOŚ" matches "łosoś"). Diacritics are not ignored: "losos" does not match "łosoś".
- **Exact match while typing**: If the typed text matches an existing Product name exactly (ignoring case), the "add new Product" option is not offered.
- **Same Product twice in a Dish**: A Dish cannot contain the same Product as two Ingredients. Picking a Product already in the Dish moves the user to that existing Ingredient instead of adding a second one.
- **Abandoned new Product**: A Product created from the Ingredient field stays in the Product list even if the user then cancels the Dish edit. It has a usage count of 0 and can be deleted.
- **Merging a Product into itself**: Not possible. The merge target list excludes the Product being merged.
- **Usage that comes only from Archived Dishes**: An Archived Dish still counts as using its Products, so such Products cannot be deleted or have their unit changed.
- **Dish with no Ingredients**: Allowed (e.g. a meal eaten out). It has Macros but adds nothing to the Shopping List later.
- **Decimal amounts**: Ingredient amounts and Servings yield accept decimal values (e.g. 0.5 pcs, 2.5 Servings), with either a comma or a dot as the decimal separator.
- **Unreadable or unsupported photo file**: The user sees an error in Polish, and the Dish keeps its previous photo or placeholder.
- **Device storage full when saving a photo**: The user sees an error in Polish, and the Dish's other changes can still be saved without the photo.
- **Names with one word or with symbols**: Placeholder initials use the first letter of the first two words that start with a letter or digit ("Owsianka" → "O", "Leczo z kiełbasą" → "LZ", "  2 jajka" → "2J"). A name with no letters or digits shows a neutral symbol instead of initials.
- **Archived Dish that no Meal uses anymore**: Stays archived (hidden). It is not brought back into the library automatically.

## Requirements *(mandatory)*

### Functional Requirements

**App shell**

- **FR-001**: The app MUST provide four tabs, in this order: Tydzień, Dania, Lista zakupów, Ustawienia.
- **FR-002**: The app MUST open on the Tydzień tab.
- **FR-003**: In this feature, the Tydzień, Lista zakupów and Ustawienia tabs MUST show a placeholder notice in Polish that the screen arrives in a later version.
- **FR-004**: The Dania tab MUST contain the Dish library and a separate Produkty section reachable from it.
- **FR-005**: The app MUST be installable to the home screen on iOS Safari and Android Chrome, with its own name and icon, and open full-screen when started from there.
- **FR-006**: After the first successful load, the app MUST start and provide all functions in this feature with no network connection.
- **FR-007**: The app MUST make no network requests while in use, other than loading or updating its own files.
- **FR-008**: On startup the app MUST ask the browser to keep its stored data persistently, so it is not cleared automatically when space runs low.
- **FR-009**: On screens about 1024 px wide or wider, the Dania and Produkty screens MUST use a wider layout with the same functions as on mobile.
- **FR-010**: All user-facing text MUST be in Polish. Units MUST be shown as "g", "ml" and "szt.".
- **FR-011**: All data MUST persist on the device across app restarts and device reboots.

**Products**

- **FR-012**: A Product MUST have a name and exactly one unit: g, ml or pcs.
- **FR-013**: Product names MUST be unique, compared case-insensitively after trimming surrounding spaces.
- **FR-014**: When the user types in an Ingredient's Product field, the app MUST suggest existing Products whose name contains the typed text anywhere, ignoring letter case, sorted alphabetically.
- **FR-015**: When no existing Product name equals the typed text (ignoring case and surrounding spaces), the app MUST offer to create a new Product with that name. Creating it MUST require choosing a unit, with g preselected.
- **FR-016**: The Produkty section MUST list all Products alphabetically, each showing its name, unit and usage count.
- **FR-017**: A Product's usage count MUST be the number of Dishes (including Archived Dishes) and Detached Meals that have it as an Ingredient. Linked Meals use the Dish's Ingredients and are not counted separately. In this feature Meals do not exist yet, so only Dishes contribute until Week planning is built.
- **FR-018**: Users MUST be able to rename a Product. The new name MUST satisfy FR-013. If it collides with another Product, the rename MUST be rejected and the user offered to merge into that Product instead.
- **FR-019**: A rename MUST be reflected immediately everywhere the Product is shown.
- **FR-020**: Users MUST be able to merge one Product into another Product that has the same unit, after confirming. Merging MUST be unavailable between Products with different units.
- **FR-021**: After a merge, every Dish and Detached Meal that used the merged Product MUST use the kept Product instead, with the same amounts, and the merged Product MUST no longer exist. The kept Product keeps its own name.
- **FR-022**: If a Dish or Detached Meal had both Products as Ingredients before a merge, it MUST end up with a single Ingredient of the kept Product whose amount is the sum of both.
- **FR-023**: Users MUST be able to delete a Product only when its usage count is 0, after confirming. For a used Product the delete action MUST be unavailable and the user told why.
- **FR-024**: Users MUST be able to change a Product's unit only when its usage count is 0. For a used Product the unit MUST be shown as fixed and the user told why.

**Dishes**

- **FR-025**: A Dish MUST have: a name (required), Servings yield (required, greater than 0, default 1), Ingredients (zero or more), Macros for the whole Dish (kcal, protein, fat and carbs, each required and 0 or greater), optional notes (free text, which may contain a link) and an optional photo.
- **FR-026**: Each Ingredient MUST consist of a Product and an amount greater than 0, entered and shown in the Product's unit.
- **FR-027**: A Dish MUST NOT contain the same Product as more than one Ingredient.
- **FR-028**: Users MUST be able to create, view and edit Dishes, and add, change the amount of, and remove Ingredients. Invalid input MUST block saving and identify the invalid field.
- **FR-029**: The Dish library MUST list all Dishes that are not archived, sorted alphabetically by name, each with its photo or placeholder and its name.
- **FR-030**: Users MUST be able to add a photo from the device camera or gallery, replace it and remove it.
- **FR-031**: A photo MUST be reduced before saving so its longest edge is at most about 800 px, keeping its aspect ratio. Photos already smaller MUST NOT be enlarged.
- **FR-032**: A Dish without a photo MUST show a placeholder: a background colour derived deterministically from the Dish name, so the same name always gives the same colour on any device and in any session, plus up to two uppercase initials (see Edge Cases).
- **FR-033**: Placeholder initials MUST be legible against the placeholder colour.
- **FR-034**: Users MUST be able to delete a Dish after confirming. If no Meal uses the Dish, it MUST be removed for good together with its photo. If any Meal uses it, it MUST become an Archived Dish instead.
- **FR-035**: An Archived Dish MUST be hidden from the Dish library and from any place where the user chooses a Dish, and MUST keep its name, Ingredients, Macros, Servings yield and photo so the Meals that use it still resolve.

### Key Entities

- **Product**: A named shopping item with a fixed unit (g, ml or pcs) and no nutrition data. Unique by name ignoring case. Referenced by Ingredients in Dishes and, later, in Meals.
- **Ingredient**: A Product with an amount in that Product's unit. Belongs to one Dish (or, later, one Detached Meal). At most one Ingredient per Product within a Dish.
- **Dish**: A reusable template with a name, Servings yield, Ingredients, Macros for the whole Dish, optional notes and an optional photo. Can be in the archived state.
- **Archived Dish**: A Dish deleted while Meals still used it. Hidden from the library and from choosing a Dish, but kept intact.
- **Dish photo**: An image belonging to one Dish, stored on the device in reduced size. Removed when its Dish is removed for good.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user who has the Macros ready can create a Dish with 5 Ingredients, all of them existing Products, in under 2 minutes on a phone.
- **SC-002**: With 500 Products in the list, autocomplete suggestions update within 100 ms of each keystroke as perceived by the user.
- **SC-003**: With 200 Dishes, half with photos, the Dish library opens in under 1 second on a mid-range phone and scrolls without visible stutter.
- **SC-004**: After one online load, 100% of this feature's functions work in airplane mode, including after the app is closed and restarted.
- **SC-005**: The same Dish name produces the same placeholder colour and initials in 100% of cases, across sessions, reinstalls and devices.
- **SC-006**: After any merge, 0 Dishes or Detached Meals still reference the merged Product, and the total amount of each affected Dish's Ingredients for that Product is unchanged.
- **SC-007**: No stored photo exceeds about 800 px on its longest edge, and a typical phone photo is stored at under 10% of its original file size.
- **SC-008**: Deleting a Dish never leaves a Meal that cannot show its Dish's name, Ingredients and Macros.

## Assumptions

- **Feature scope**: docs/SPEC.md does not number its features. "Feature 1" is taken to mean the app shell, Products and Dishes as listed in the input. Week planning, Meals, Slots, Goals, summaries, the Shopping List, settings and backup export/import come in later features.
- **Meals do not exist yet**: Rules that mention Meals (usage count, merge, archive) are specified now so that Meal data, once added, follows them without changing this feature's behaviour. In this feature every Dish deletion is a deletion for good.
- **Placeholder tabs**: Tydzień, Lista zakupów and Ustawienia exist as tabs with placeholder content. The app opens on Tydzień because that will be the main screen.
- **No standalone Product creation**: Products are created only from the Ingredient field, as docs/SPEC.md describes. The Produkty section manages existing Products and does not add new ones.
- **Merge requires equal units**: Converting between units (e.g. pcs to g) is not possible without extra data, so merging is limited to Products with the same unit.
- **No Dish name uniqueness**: Two Dishes may share a name. The app does not prevent it.
- **No restore for Archived Dishes**: docs/SPEC.md gives no way to unarchive or view Archived Dishes. This feature adds none.
- **No library search**: The Dish library on mobile is a plain alphabetical list. Search arrives with the desktop side panel and the dish picker in later features.
- **App updates**: A new version of the app is picked up automatically, at the latest on the next start. The user is not asked about it.
- **Photo source**: Photos come from the device's camera or photo library through the standard file picker. No in-app cropping or editing.
- **Supported platforms**: Current iOS Safari, Android Chrome, and current desktop Chrome, Edge, Firefox and Safari.
- **Glossary**: This spec introduces no new domain terms. "Usage count", "placeholder" and "Produkty section" are UI concepts, not domain concepts.
