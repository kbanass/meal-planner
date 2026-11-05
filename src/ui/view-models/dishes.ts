import { perServing, servingsWord } from '../../domain/meals';
import { formatServings } from '../../domain/nutrition';
import { pluralForm } from '../../domain/plural';
import type { Dish, DishPhotoRef } from '../../domain/types';
import { macroTotals, type MacroTotal } from './week';

/** Longest notes excerpt on a Dania card. */
const NOTES_EXCERPT = 120;

const INGREDIENT_WORDS = { one: 'składnik', few: 'składniki', many: 'składników' } as const;

export interface DishCardModel {
  id: string;
  name: string;
  photo: DishPhotoRef | null;
  /** "2 porcje · 5 składników". */
  meta: string;
  /** kcal and macros of one Serving. */
  totals: MacroTotal[];
  /** The start of the notes, or null when there are none. */
  notes: string | null;
}

function excerpt(notes: string): string | null {
  const text = notes.replace(/\s+/g, ' ').trim();
  if (text === '') return null;
  return text.length > NOTES_EXCERPT ? `${text.slice(0, NOTES_EXCERPT).trimEnd()}…` : text;
}

/** One Dish in Dania (FR-046). */
export function dishCard(dish: Dish): DishCardModel {
  const ingredients = dish.ingredients.length;
  const servings = `${formatServings(dish.servingsYield)} ${servingsWord(dish.servingsYield)}`;
  return {
    id: dish.id,
    name: dish.name,
    photo: dish.photo,
    meta: `${servings} · ${ingredients} ${INGREDIENT_WORDS[pluralForm(ingredients)]}`,
    totals: macroTotals(perServing(dish)),
    notes: excerpt(dish.notes),
  };
}
