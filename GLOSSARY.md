# Meal Planner

A personal, single-user weekly meal planner. It turns a week of planned meals into an accurate shopping list and shows how the plan compares to nutrition goals.

## Library

**Product**:
A named shopping item with a fixed unit (g, ml or pcs). It has no nutrition data. UI: "Produkt".
_Avoid_: Item, food, grocery

**Ingredient**:
A Product together with an amount, as used in a Dish or a Meal. UI: "Składnik".
_Avoid_: Component, line item

**Dish**:
A reusable template: a name, Ingredients, a number of servings it yields, and the total calories and macros of the whole recipe. UI: "Danie".
_Avoid_: Recipe, przepis, template

**Archived Dish**:
A Dish that was deleted while still used by Meals. It is hidden from the library but kept so those Meals still resolve.
_Avoid_: Deleted dish, hidden dish

## Plan

**Week**:
Seven consecutive days, Monday to Sunday. It is the unit of planning, summaries and shopping.
_Avoid_: Plan period, cycle

**Slot**:
A numbered position within a day (1, 2, 3…) that holds zero or more Meals. UI: just the number.
_Avoid_: Meal (for the slot itself), posiłek, pora, time of day

**Added Slot**:
A Slot given to one day only with "dodaj kolejny", on top of the Slots every day has. It stays while empty.
_Avoid_: Extra Slot (an Extra is a Shopping List entry)

**Meal**:
One instance of a Dish placed in a Slot, with its own number of servings. UI: "Posiłek".
_Avoid_: Entry, plan item, dish (for the placed instance)

**Linked Meal**:
A Meal that mirrors its source Dish: edits to the Dish show up in the Meal.

**Detached Meal**:
A Meal that was edited (anything other than servings) and is now an independent copy, no longer affected by its source Dish.
_Avoid_: Custom meal, overridden meal

**Servings**:
How many portions of a Dish a Meal represents. Calories, macros and Ingredient amounts scale with it.
_Avoid_: Quantity, multiplier, portions count

## Nutrition

**Macros**:
Calories (kcal), protein, fat and carbohydrates.
_Avoid_: Nutrients, nutrition values

**Daily Goal**:
The target Macros for one day. Global, the same for every day.

**Weekly Goal**:
The Daily Goal multiplied by seven.

**Planned**:
The sum of Macros of Meals in a day or Week, compared against the matching Goal.
_Avoid_: Consumed, eaten, actual

## Shopping

**Shopping List**:
The Week's Ingredients summed across all Meals and recalculated live from the plan, with that Week's Adjustments and Extras applied on top. UI: "Lista zakupów".
_Avoid_: Grocery list, cart

**Adjustment**:
A manual plus or minus amount applied to one Product on a Week's Shopping List, e.g. −500 g because some is already at home.
_Avoid_: Correction, override, pantry

**Extra**:
A free-text Shopping List entry that does not come from the plan, e.g. "papier toaletowy".
_Avoid_: Custom item, manual item
