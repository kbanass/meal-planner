# Dish is a template, Meal detaches on first edit, Products carry no nutrition

Products have only a name and a unit. Dish Macros are entered by hand as totals for the whole recipe, because the user already builds recipes in Fitatu and will not re-enter nutrition data per product. Ingredient amounts are still stored, since the Shopping List needs them. A Meal placed in a Slot mirrors its Dish live, so fixing a Dish fixes every linked Meal. The first edit to anything other than servings detaches the Meal into an independent copy, so deliberate per-meal changes survive later Dish edits.

## Considered Options

- **Copy on add** (a Meal never follows its Dish): rejected, because fixing a mistake in a Dish would not reach meals already planned.
- **Reference plus per-field overrides**: rejected as too complex and confusing.
- **Nutrition per Product, Macros computed from Ingredients**: rejected, because it requires per-product data entry the user won't do.

## Consequences

- Editing Ingredient amounts on a Meal does not recalculate its Macros. Keeping the two consistent is the user's job, and the app shows no warning.
- Deleting a Dish that Meals reference archives it instead, so linked Meals still resolve.
