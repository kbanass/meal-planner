# Feature Specification: Week Planning

**Feature Branch**: `002-week-planning`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Feature 2 from docs/SPEC.md: Week planning — Week view (Mon–Sun, ← / → navigation), Slots with per-day \"dodaj kolejny\", Meals added from Dishes with servings scaling, Linked/Detached Meals with \"przywróć z Dania\", and \"Skopiuj do następnego tygodnia\". Use terms from GLOSSARY.md."

Domain terms in **bold** are defined in [GLOSSARY.md](../../GLOSSARY.md). The product contract is [docs/SPEC.md](../../docs/SPEC.md). This feature builds on [feature 001](../001-shell-products-dishes/spec.md) (app shell, Products, Dishes).

## Revisions

### 2026-11-04: Week view redesign

The user shared a reference screenshot from another meal app and asked for the Week view to look more like it, without being limited to Framework7's standard components. The screen becomes one designed page instead of two Framework7 lists:

- **Week card** at the top: a white rounded card with the viewed Week's month and year (e.g. "Listopad 2026") and round ← / → buttons.
- **Day strip** inside the card: seven columns, Monday to Sunday, each with a short day name ("Pn" … "Nd"), the day of the month and the day's Planned kcal. The selected day is a filled pill in the accent colour, and today is marked in the accent colour when it is not selected.
- **The selected day's plan** below the card, on the same screen: a heading with the day ("Czwartek, 5 lis") and its summary ("2 posiłki · 875 kcal"), then its Slots, with each Meal shown as a card with the Dish photo or placeholder on the left. **Tapping a day selects it. There is no separate Day view any more.**
- **Look**: a warm off-white page background, white cards with large rounded corners and a soft shadow, and one accent colour.

Decided by the user later the same day:
- The screenshot is a reference for the general look, not a design to match exactly.
- The accent stays the app's green.
- The Day page is removed: tapping a day only shows its Meals, without switching page.

Changed requirements: US1, FR-001, FR-003, FR-004, FR-005, FR-007, FR-008 and FR-041. New: FR-042, FR-043. docs/SPEC.md's Tydzień screen description was updated to match. Nothing else about planning changes: Slots, the Dish picker, the Meal sheet, scaling, detaching and copying work as before.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Plan a Week from Dishes (Priority: P1)

The user opens the **Tydzień** tab and sees the current **Week**, Monday to Sunday, as a strip of seven days with today selected, and that day's numbered **Slots** below. They tap another day in the strip to plan it, tap an empty Slot and pick a **Dish** from a horizontally scrolling picker. The Dish lands in the Slot as a **Meal** with 1 **Serving**. They repeat this until the Week is planned, and can put several Meals in one Slot (e.g. a main dish and a side).

**Why this priority**: Placing Meals in a Week is the core of the app. The Shopping List and the Goal summaries in later features are both computed from the planned Week.

**Independent Test**: With a few Dishes in the library, plan Monday to Sunday with at least one Meal per day and two Meals in one Slot, close and reopen the app, and confirm every Meal is still in its day and Slot.

**Acceptance Scenarios**:

1. **Given** today is Wednesday 2026-11-04, **When** the user opens the Tydzień tab, **Then** the Week card reads "Listopad 2026", the strip shows Pn 2 to Nd 8 in order, Wednesday 4 is selected, and below it "Środa, 4 lis" shows that day's Slots.
2. **Given** the Week view, **When** the user taps Thursday 5 in the strip, **Then** Thursday becomes the selected day, and below the card "Czwartek, 5 lis" shows the default number of Slots, labelled 1, 2, 3…, followed by a "dodaj kolejny" placeholder. The screen does not change.
3. **Given** an empty Slot 2 on Thursday, **When** the user taps it, **Then** a horizontally scrolling picker of all non-archived Dishes appears at the bottom of the screen, each shown with its photo or placeholder and name.
4. **Given** the picker is open for Thursday Slot 2, **When** the user taps "Owsianka", **Then** a Meal "Owsianka" with 1 Serving appears in Thursday Slot 2 and the picker closes.
5. **Given** Thursday Slot 2 already holds "Owsianka", **When** the user adds another Meal to that Slot and picks "Banan", **Then** Slot 2 shows both Meals, in the order they were added.
6. **Given** a Meal in Thursday Slot 2, **When** the user opens it and chooses to remove it from the Slot and confirms, **Then** the Meal disappears and Slot 2 is empty again.
7. **Given** Thursday is selected, **When** a Meal is added to or removed from it, **Then** Thursday's kcal in the strip and the "posiłki · kcal" summary above its Slots update at once.

---

### User Story 2 - Scale a Meal by Servings (Priority: P1)

The user changes how many **Servings** a Meal represents, e.g. 1.5 Servings of a Dish because they are hungrier that day. The Meal's **Macros** and **Ingredient** amounts follow the Servings automatically, and the Meal still mirrors its Dish.

**Why this priority**: Without Servings scaling every Meal would equal the Dish's per-Serving amounts, which makes both nutrition totals and later shopping amounts wrong for most real days.

**Independent Test**: Add a Meal from a Dish with known totals, set its Servings to several values (including a decimal), and confirm the shown Macros and Ingredient amounts equal the Dish totals divided by the Dish's Servings yield and multiplied by the Meal's Servings.

**Acceptance Scenarios**:

1. **Given** Dish "Owsianka" yields 2 Servings with 100 g "płatki owsiane", 300 ml "mleko" and 700 kcal / 25 g protein / 15 g fat / 110 g carbs, **When** it is added to a Slot, **Then** the Meal shows 1 Serving, 50 g "płatki owsiane", 150 ml "mleko" and 350 kcal / 12.5 g protein / 7.5 g fat / 55 g carbs.
2. **Given** that Meal, **When** the user sets Servings to 1,5, **Then** it shows 75 g "płatki owsiane", 225 ml "mleko" and 525 kcal / 18.8 g protein / 11.3 g fat / 82.5 g carbs.
3. **Given** that Meal at 1.5 Servings, **When** the user looks at it, **Then** it is still a **Linked Meal** and shows no "modified" marker.
4. **Given** the Meal edit sheet, **When** the user enters 0, a negative number or text as Servings, **Then** saving is blocked and the field is pointed out.

---

### User Story 3 - Adjust one Meal without touching its Dish (Priority: P2)

The user edits a single Meal: renames it, changes an Ingredient amount, adds or removes an Ingredient, or corrects its Macros. The Meal becomes a **Detached Meal**: it keeps the user's changes, shows a small "modified" marker, and is no longer affected when the Dish is edited. Meals that were not edited stay **Linked Meals** and follow the Dish. If the user changes their mind, "przywróć z Dania" throws the changes away and links the Meal to its Dish again.

**Why this priority**: Per-Meal changes make the plan match what will really be cooked, while live linking means a fix to a Dish reaches all untouched Meals at once. The plan is still usable without this, as long as Dishes are accurate.

**Independent Test**: Plan the same Dish in two Slots, edit an Ingredient amount in one of them, then edit the Dish's Macros and confirm only the untouched Meal changes. Then restore the edited Meal and confirm it matches the Dish again.

**Acceptance Scenarios**:

1. **Given** a Linked Meal "Owsianka" at 1 Serving, **When** the user changes "płatki owsiane" from 50 g to 80 g and saves, **Then** the Meal shows 80 g "płatki owsiane", shows the "modified" marker, and its Macros stay at 350 kcal / 12.5 g / 7.5 g / 55 g (no recalculation, no warning).
2. **Given** that Detached Meal at 1 Serving, **When** the user sets Servings to 2, **Then** it shows 160 g "płatki owsiane", 300 ml "mleko" and 700 kcal, and it stays detached.
3. **Given** a Detached Meal and a Linked Meal, both from "Owsianka", **When** the user edits the Dish "Owsianka" to 800 kcal, **Then** the Linked Meal shows the new value and the Detached Meal is unchanged.
4. **Given** a Linked Meal, **When** the user renames it, adds an Ingredient, removes an Ingredient or changes any of its Macros and saves, **Then** it becomes a Detached Meal.
5. **Given** a Detached Meal at 2 Servings, **When** the user chooses "przywróć z Dania" and confirms, **Then** the Meal is linked again, shows the Dish's current name, Ingredients and Macros scaled to 2 Servings, and the "modified" marker disappears.
6. **Given** a Linked Meal, **When** the user opens its edit sheet, **Then** "przywróć z Dania" is not offered.
7. **Given** a Linked Meal whose Dish was later deleted and became an **Archived Dish**, **When** the user views the Meal, **Then** it still shows the Archived Dish's name, Ingredients and Macros.

---

### User Story 4 - Move between Weeks (Priority: P2)

The user taps → to plan next Week and ← to look back at earlier Weeks. Past Weeks keep their Meals.

**Why this priority**: Planning normally happens for the coming Week, before it starts, so reaching next Week is needed soon after planning works at all. Looking back is useful but less frequent.

**Independent Test**: Plan Meals in the current Week, move → to next Week and plan different Meals, move ← twice to the Week before the current one, then back, and confirm each Week shows only its own Meals.

**Acceptance Scenarios**:

1. **Given** the Week of 2026-11-02 to 2026-11-08, **When** the user taps →, **Then** the Week of 2026-11-09 to 2026-11-15 is shown, labelled with its date range.
2. **Given** the Week of 2026-11-02 to 2026-11-08, **When** the user taps ←, **Then** the Week of 2026-10-26 to 2026-11-01 is shown with whatever Meals it holds.
3. **Given** Meals were planned in a past Week, **When** the user returns to that Week months later, **Then** the Meals are still there.
4. **Given** the user is viewing a Week other than the current one, **When** the app is closed and opened again, **Then** it opens on the current Week.

---

### User Story 5 - Add a Slot to one day (Priority: P3)

On a day that needs more Meals than usual, the user taps "dodaj kolejny" under the last Slot. One more Slot appears on that day only. Other days keep the usual number of Slots.

**Why this priority**: Most days fit the default number of Slots. Extra Slots on single days matter only occasionally, e.g. for a training day or a party.

**Independent Test**: Tap "dodaj kolejny" twice on Saturday, confirm Saturday has two Slots more than Friday, and that both are still there after reopening the app, even while empty.

**Acceptance Scenarios**:

1. **Given** the default is 4 Slots and Saturday shows Slots 1–4, **When** the user taps "dodaj kolejny", **Then** Saturday shows Slots 1–5 and every other day still shows Slots 1–4.
2. **Given** Saturday has an added Slot 5 with no Meals, **When** the user leaves and reopens the app, **Then** Saturday still shows Slot 5.
3. **Given** Saturday shows Slots 1–5, **When** the user adds a Meal to Slot 5, **Then** it is stored in Slot 5 and "dodaj kolejny" sits below Slot 5.
4. **Given** "Liczba slotów" is 4 and Saturday has an added Slot 5, **When** the user sets "Liczba slotów" to 3 in Ustawienia, **Then** Friday shows Slots 1–3 (or more, if a higher Slot holds a Meal) and Saturday still shows Slots 1–5.
5. **Given** "Liczba slotów" is 4, **When** the user sets it to 6, **Then** every day of every Week shows at least Slots 1–6.

---

### User Story 6 - Copy a Week to the next one (Priority: P3)

When the coming Week should look much like this one, the user taps "Skopiuj do następnego tygodnia". Every Meal of the viewed Week, with its Servings and its linked or detached state, and every day's added Slots, are copied into the same days and Slots of the next Week. If the next Week already has a plan, the user confirms that it will be replaced.

**Why this priority**: It saves re-planning a similar Week Meal by Meal, but planning works without it.

**Independent Test**: Plan a Week with Linked and Detached Meals and an added Slot, copy it, move → and confirm the next Week matches. Then change the original and copy again, and confirm the replacement is asked about and the next Week ends up matching the new original exactly.

**Acceptance Scenarios**:

1. **Given** the Week of 2026-11-02 has "Owsianka" ×1.5 in Monday Slot 1 and a Detached "Leczo" in Friday Slot 3, and the Week of 2026-11-09 is empty, **When** the user taps "Skopiuj do następnego tygodnia", **Then** without asking, Monday 2026-11-09 Slot 1 holds a Linked "Owsianka" ×1.5 and Friday 2026-11-13 Slot 3 holds a Detached "Leczo" with the same edited values and the "modified" marker.
2. **Given** Saturday 2026-11-07 has an added Slot 5, **When** the Week is copied, **Then** Saturday 2026-11-14 also shows Slot 5, and other days of that Week show the default number of Slots.
3. **Given** the Week of 2026-11-09 already holds Meals, **When** the user taps "Skopiuj do następnego tygodnia", **Then** they are asked to confirm that the next Week's plan will be replaced, and cancelling leaves both Weeks unchanged.
4. **Given** the user confirms the replacement, **When** the copy finishes, **Then** the Week of 2026-11-09 holds exactly the copied Meals and added Slots, and none of its previous Meals or added Slots remain.
5. **Given** a Detached Meal was copied, **When** the user edits the copy in the next Week, **Then** the original in the viewed Week is unchanged, and vice versa.
6. **Given** a Linked Meal was copied, **When** the user edits its Dish, **Then** both the original and the copy show the change.
7. **Given** the copy has finished, **When** the user looks at the screen, **Then** they are still on the viewed Week and see a short confirmation in Polish.

---

### Edge Cases

- **Week boundaries**: A Week always runs Monday to Sunday, whatever day it is opened on. On a Sunday the current Week is the one that ends that day.
- **Week label across months and years**: The date range names both months when a Week spans two (e.g. "30 lis – 6 gru 2026"), and both years when it spans two (e.g. "28 gru 2026 – 3 sty 2027").
- **Daylight saving time**: Weeks that include a clock change still have exactly seven days, and every Meal stays on the date it was planned for.
- **No navigation limit**: The user can move any number of Weeks back or forward. Weeks that were never planned show empty days with the default number of Slots.
- **Empty Dish library**: When there are no non-archived Dishes, the picker shows a message in Polish pointing the user to the Dania tab instead of an empty strip.
- **Same Dish twice in one Slot**: Allowed. Each is its own Meal with its own Servings.
- **Decimal Servings**: Servings accept decimals with a comma or a dot (e.g. 0,5 or 1.5). They must be greater than 0.
- **Displayed precision**: kcal is shown rounded to whole numbers. Protein, fat and carbs are shown with at most one decimal place (12,5 g, 55 g). Halves round up. Amounts in g and ml are shown rounded to whole numbers, and amounts in pcs to at most two decimal places. Only the display is rounded. Totals are always computed from unrounded values.
- **Edit that changes nothing**: Opening a Linked Meal's edit sheet and saving without a real change to its name, Ingredients or Macros keeps it linked. Typing a value and changing it back counts as no change.
- **Servings and another field edited together**: The Meal is detached and the new Servings applies to it.
- **Same Product twice in a Detached Meal**: Not possible, as in a Dish. Picking a Product already in the Meal moves the user to that Ingredient.
- **Detached Meal with no Ingredients**: Allowed. It keeps its Macros.
- **Restoring from an Archived Dish**: "przywróć z Dania" still works and links the Meal to the Archived Dish's current values.
- **Dish deleted while Meals use it**: The Dish becomes an Archived Dish, as specified in feature 001. Every Meal using it, linked or detached, keeps working, and the Dish no longer appears in the picker.
- **Photo of a Meal**: A Meal shows its source Dish's photo. Without a photo it shows the placeholder for the name the Meal displays, so a renamed Detached Meal gets the placeholder of its new name.
- **Product renamed or merged**: Ingredients of Detached Meals show the new Product name, and a merge moves them to the kept Product, as specified in feature 001.
- **Slots beyond the default after removing Meals**: Removing every Meal from an added Slot keeps that Slot. A day never shows fewer Slots than its highest Slot that holds a Meal.
- **Default number of Slots changes**: A day shows the larger of the default and its own Slot count. Raising the default above a day's added Slots makes them part of the default. Lowering it never hides a Slot that holds a Meal or that the user added to that day. "dodaj kolejny" always adds one Slot after the last one shown.
- **Copying an empty Week**: When the viewed Week has no Meals and no added Slots, "Skopiuj do następnego tygodnia" is unavailable, so it cannot wipe the next Week by accident.
- **Copying again**: Copying the same Week twice in a row asks for confirmation the second time (the next Week is no longer empty) and leaves the same result as one copy.
- **Next Week holds only added Slots**: It counts as not empty, so the replacement is confirmed first.

## Requirements *(mandatory)*

### Functional Requirements

**Week view**

- **FR-001**: The Tydzień tab MUST show one Week at a time as a strip of seven days, Monday to Sunday, each with a short Polish day name ("Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd") and the day of the month.
- **FR-002**: The Tydzień tab MUST open on the Week that contains today, every time the app starts.
- **FR-003**: In the strip, the selected day MUST be shown as selected, and today MUST be visibly marked when it is not the selected day.
- **FR-004**: Each day in the strip MUST show that day's Planned kcal as a number, and nothing when the day has no Meals. Above the selected day's Slots, a summary MUST give its number of Meals and Planned kcal ("2 posiłki · 875 kcal"), or "brak posiłków" when it has none.
- **FR-005**: A Week card at the top of the Tydzień tab MUST show the viewed Week's month and year in Polish ("Listopad 2026", or "Listopad – grudzień 2026" when the Week spans two months, with both years when it spans two years), a ← control that shows the previous Week, a → control that shows the next Week, the day strip, and the "Skopiuj do następnego tygodnia" action.
- **FR-006**: Users MUST be able to move to any earlier or later Week without limit. Meals of every Week MUST be kept until the user removes them.
- **FR-007**: Tapping a day in the strip MUST select it and show its Slots below the Week card, on the same screen. The app MUST open with today selected. Moving to another Week MUST keep the same weekday selected (Thursday stays Thursday).

**Selected day and Slots**

- **FR-008**: Below the Week card, the selected day's Slots MUST be shown in order, labelled only with their numbers (1, 2, 3…), each listing its Meals in the order they were added, followed by a "dodaj kolejny" placeholder below the last Slot.
- **FR-009**: Each day MUST show as many Slots as the largest of: the default number of Slots, the highest Slot number holding a Meal that day, and the Slot count the day was raised to with "dodaj kolejny". Example: with a default of 4, one tap raises the day to 5 and two taps to 6. If the default is later set to 6, that day shows 6.
- **FR-010**: Tapping "dodaj kolejny" MUST add one Slot after the last shown Slot, to that day only, and the added Slot MUST be kept while empty.
- **FR-011**: The Ustawienia tab MUST offer a "Liczba slotów" setting for the default number of Slots per day: a whole number from 1 to 10, initially 4. A change MUST apply at once to every day of every Week, past ones included, following FR-009. The rest of the Ustawienia tab stays a placeholder until later features.
- **FR-012**: Each Meal in a Slot MUST show its name, the source Dish's photo or the placeholder for the Meal's name, its Servings, its kcal, and the "modified" marker when it is a Detached Meal.

**Adding Meals**

- **FR-013**: Tapping an empty Slot MUST open a horizontally scrolling Dish picker at the bottom of the screen. A Slot that already holds Meals MUST offer an action that opens the same picker.
- **FR-014**: The picker MUST list all Dishes except Archived Dishes, alphabetically, each with its photo or placeholder and its name. No filters or search are offered.
- **FR-015**: Tapping a Dish in the picker MUST add a Linked Meal for that Dish with 1 Serving to the chosen day and Slot, and close the picker.
- **FR-016**: When the library has no non-archived Dishes, the picker MUST show a message in Polish that points to the Dania tab.

**Editing Meals and Servings**

- **FR-017**: Tapping a Meal MUST open a bottom sheet where the user can change Servings, the name, Ingredients (change an amount, add one with the same Product autocomplete as in Dishes, remove one) and the four Macros, restore the Meal from its Dish, and remove the Meal from the Slot.
- **FR-018**: Changes in the sheet MUST take effect when the user saves. Closing the sheet without saving MUST leave the Meal unchanged.
- **FR-019**: Servings MUST default to 1 and MUST accept decimal values greater than 0, with a comma or a dot as separator. Invalid values MUST block saving and point out the field.
- **FR-020**: A Meal's Macros MUST equal its source's Macros ÷ the source's Servings yield × the Meal's Servings, and each Ingredient amount MUST equal the source amount ÷ the source's Servings yield × the Meal's Servings. The source is the Dish for a Linked Meal and the Meal's own copy for a Detached Meal.
- **FR-021**: The sheet MUST show and accept the name, Ingredient amounts and Macros as they apply to the Meal at its current Servings. After the user edits them, a later change of Servings MUST scale the edited values proportionally.
- **FR-022**: Changing an Ingredient amount MUST NOT change the Meal's Macros, and no warning MUST be shown.
- **FR-023**: Displayed values MUST be rounded as described under Edge Cases. Totals MUST be computed from unrounded values.
- **FR-024**: Removing a Meal from a Slot MUST ask for confirmation and then delete the Meal.

**Linked and Detached Meals**

- **FR-025**: A new Meal MUST be a Linked Meal: its name, Servings yield, Ingredients and Macros come from its Dish, and edits to the Dish MUST show up in the Meal.
- **FR-026**: Saving a real change to a Linked Meal's name, Ingredients or Macros MUST turn it into a Detached Meal that holds its own copy of name, Servings yield, Ingredients and Macros, taken at that moment and with the change applied. Changing only Servings MUST NOT detach it.
- **FR-027**: Edits to a Dish MUST NOT change any of its Detached Meals.
- **FR-028**: A Detached Meal MUST show a small "modified" marker wherever the Meal is shown.
- **FR-029**: For a Detached Meal only, the sheet MUST offer "przywróć z Dania". After confirmation it MUST drop the Meal's copy, keep its Servings, and make it a Linked Meal of the same Dish again, even if that Dish is now an Archived Dish.
- **FR-030**: A Meal MUST keep a reference to its source Dish, linked or detached, so that the feature 001 rules apply: a Dish used by any Meal is archived instead of deleted, and Product usage, delete, unit-change and merge rules count the Ingredients of Detached Meals.

**Copy to next Week**

- **FR-031**: "Skopiuj do następnego tygodnia" MUST copy every Meal of the viewed Week to the same weekday and Slot number of the following Week, keeping its Servings, its order within the Slot, and its linked or detached state, including a Detached Meal's own values.
- **FR-032**: The copy MUST also give each day of the following Week the same number of added Slots as the matching day of the viewed Week.
- **FR-033**: The copy MUST replace all Meals and added Slots of the following Week. Nothing else about the following Week may change.
- **FR-034**: If the following Week holds any Meal or added Slot, the user MUST confirm the replacement first. Cancelling MUST change nothing.
- **FR-035**: Copied Meals MUST be independent Meals: changing or removing a copy MUST NOT affect its original, and the reverse.
- **FR-036**: The action MUST be unavailable when the viewed Week has no Meals and no added Slots.
- **FR-037**: After copying, the app MUST stay on the viewed Week and show a short confirmation in Polish.
- **FR-038**: The copy MUST be all or nothing: if it fails, the following Week MUST keep its previous plan and the user sees an error in Polish.

**General**

- **FR-039**: All functions of this feature MUST work offline and keep their data on the device, across app restarts.
- **FR-040**: All user-facing text MUST be in Polish. Day names, month abbreviations and decimal commas MUST follow Polish conventions.
- **FR-041**: On screens about 1024 px wide or wider, the Tydzień tab MUST use a wider layout with the same functions as on mobile.
- **FR-042**: Each Meal MUST be shown as a card: the Dish photo or placeholder filling its left side, the Meal name, "{Servings} {porcja/porcje/porcji} · {kcal} kcal", and the "zmieniony" marker as a small chip when it is a Detached Meal. Tapping the card opens the Meal sheet. An empty Slot MUST be shown as an outlined "Dodaj posiłek" card, and a Slot with Meals ends with a smaller "Dodaj posiłek" action.
- **FR-043**: The Tydzień tab MUST use the app's designed look: a warm off-white page background, white cards with large rounded corners and a soft shadow, and one accent colour for the selected day, today's mark and the primary actions. The standard parts (tabbar, sheets, dialogs, inputs) stay Framework7's.

### Key Entities

- **Week**: Seven days, Monday to Sunday, identified by the date of its Monday. Not stored on its own: a Week is the set of Meals and added Slots that fall on its dates.
- **Slot**: A numbered position (1, 2, 3…) in one day. Each day shows a number of Slots worked out by FR-009.
- **Added Slot**: A Slot given to one day only with "dodaj kolejny". For each date that has Added Slots, the Slot count the day was raised to is stored.
- **Meal**: A Dish placed on a date and Slot number, with Servings and its position among the Slot's Meals. Always references its source Dish. A **Linked Meal** has no copy of its own. A **Detached Meal** holds its own name, Servings yield, Ingredients and Macros for the whole recipe.
- **Dish** and **Archived Dish** (from feature 001): the source a Meal reads from or was copied from. Deleting a Dish used by a Meal archives it.
- **Ingredient** (from feature 001): in a Detached Meal, a Product with an amount, owned by that Meal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with the Dishes already in the library can plan a full Week of 28 Meals (4 per day) in under 5 minutes on a phone.
- **SC-002**: For every Meal, the shown Macros and Ingredient amounts match the scaling rule (FR-020) to the displayed precision in 100% of cases, including decimal Servings and Servings yields.
- **SC-003**: After a Dish is edited, 100% of its Linked Meals show the change the next time they are shown, and 0 of its Detached Meals change.
- **SC-004**: After "przywróć z Dania", the Meal matches a newly added Meal of the same Dish at the same Servings in 100% of cases.
- **SC-005**: Copying a Week of 35 Meals finishes in under 1 second as perceived by the user, and the next Week then matches the viewed Week in every Meal, Servings value, linked or detached state and added Slot.
- **SC-006**: Moving to the previous or next Week shows its Meals in under 300 ms as perceived by the user, with a year of planned Weeks stored.
- **SC-007**: After one online load, 100% of this feature's functions work in airplane mode, including after the app is closed and restarted.
- **SC-008**: No Meal is ever moved to a different date or Slot by navigation, copying, clock changes or app restarts.

## Assumptions

- **Feature scope**: "Feature 2" covers what the input lists: the Week view and navigation, the selected day's Slots with "dodaj kolejny", adding Meals from Dishes, Servings scaling, Linked and Detached Meals with "przywróć z Dania", and copying to the next Week.
- **Goals and summaries come later**: Daily and Weekly Goals, the Week summary, day summary bars and a kcal bar in the day strip belong to a later feature. Until then the strip shows Planned kcal as a plain number (FR-004), and the Day view has no summary bars.
- **Shopping List comes later**: When it arrives, it must be computed from the Meals defined here. "Nothing else about the following Week may change" (FR-033) already covers its future Adjustments, Extras and checks.
- **Reference screenshot (2026-11-04)**: The redesign follows the layout and look of a screenshot from another meal app that the user shared: the Week card, the day pill, and the Meal cards with a photo on the left. It does not copy that app's name, wordmark, icons, Meal times, hunger chips, emoji ratings or camera button, which have no counterpart in this app.
- **No floating add button**: Adding a Meal needs a Slot, so it stays a per-Slot action. A floating "+" would have to guess the Slot.
- **Desktop layout comes later**: The desktop Tydzień grid (7 columns × Slots with an 8th summary column), the side panel with the Dish library and search, drag and drop of Dishes and Meals, and Meal editing in a popover belong to a later feature (decided 2026-11-04). This feature shows the mobile screens in a wider layout (FR-041).
- **Only the Slot count setting in Ustawienia**: This feature adds the "Liczba slotów" setting (decided 2026-11-04). The 1–10 range and the initial value of 4 are defaults chosen here, since docs/SPEC.md gives neither. Daily Goal and backup export/import come in later features.
- **No moving Meals on mobile**: docs/SPEC.md moves Meals only by drag and drop on desktop. On mobile a Meal is moved by removing it and adding it again.
- **No removing added Slots**: docs/SPEC.md gives no way to remove a Slot added with "dodaj kolejny". This feature adds none. An empty added Slot is harmless.
- **Values in the Meal sheet are per Meal**: The sheet shows and edits amounts and Macros for the Meal at its current Servings, which is what the user sees in the plan. The Meal internally keeps whole-recipe values so Servings changes keep scaling (FR-021).
- **Servings yield of a Detached Meal is not editable**: docs/SPEC.md lists name, Ingredients and Macros as editable on a Meal. The copied Servings yield is kept only for scaling.
- **Confirmations**: Removing a Meal and "przywróć z Dania" ask for confirmation because both lose data with no undo. Adding a Meal and "dodaj kolejny" do not.
- **No jump to today**: There is no "back to current Week" control. The app opens on the current Week at each start (FR-002).
- **One screen**: Since the 2026-11-04 redesign the selected day's Slots show on the Week page itself, so moving between days is a tap in the strip.
- **Glossary**: This spec adds one domain term, **Added Slot** (added to GLOSSARY.md on 2026-11-04). docs/SPEC.md used to call these "extra Slots", but that clashes with **Extra**, a free-text Shopping List entry, so docs/SPEC.md now says "added Slots" too. The "modified" marker and the picker are UI concepts.
