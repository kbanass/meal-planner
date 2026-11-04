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
