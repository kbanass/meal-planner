export type Unit = 'g' | 'ml' | 'pcs';

export interface Product {
  id: string; // UUID
  name: string; // normalizeName(input), display form
  unit: Unit;
}

export interface Ingredient {
  productId: string; // → Product.id
  amount: number; // > 0, rounded to 2 decimals, in the Product's unit
}

export interface Macros {
  kcal: number; // ≥ 0, rounded to 2 decimals, whole Dish
  protein: number; // grams, same rules
  fat: number;
  carbs: number;
}

export interface Dish {
  id: string; // UUID
  name: string; // normalizeName(input), non-empty
  servingsYield: number; // > 0, rounded to 2 decimals
  ingredients: Ingredient[]; // ordered as entered, unique by productId
  macros: Macros;
  notes: string; // '' when none
  photo: DishPhotoRef | null;
  archived: boolean;
}

export interface DishPhotoRef {
  id: string; // UUID, new on every photo change
  mimeType: 'image/webp' | 'image/jpeg';
}

/** A local calendar date, 'YYYY-MM-DD'. Never a Date object (Principle IV). */
export type IsoDate = string;

/** What a Meal's numbers are computed from: its Dish, or a Detached Meal's own copy. */
export type MealSource = Pick<Dish, 'name' | 'servingsYield' | 'ingredients' | 'macros'>;

export interface Meal {
  id: string; // UUID
  date: IsoDate;
  slot: number; // 1, 2, 3…
  position: number; // order within (date, slot), 0-based, ascending = order added
  dishId: string; // → Dish.id, kept when detached (restore, archive rule)
  servings: number; // > 0, rounded to 2 decimals, default 1
  detached: MealSource | null; // null = Linked Meal; otherwise whole-recipe values
}

/** The Slot count a day was raised to with "dodaj kolejny" (its Added Slots). */
export interface DaySlots {
  date: IsoDate;
  slotCount: number; // ≥ 1, whole number
}

export interface Settings {
  slotsPerDay: number; // whole number, 1–10, default 4
}
