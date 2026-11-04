import type { DishRepository } from '../data/dish-repository';
import { validateDishDraft, type DishDraft, type DishFieldErrors } from '../domain/dishes';
import type { IdGenerator } from '../domain/ports';
import type { Dish, Product } from '../domain/types';

export type PhotoChange = { kind: 'keep' } | { kind: 'remove' } | { kind: 'set'; file: Blob };

export type SaveDishResult =
  | { kind: 'saved'; id: string; photoError?: 'decode' | 'quota' }
  | { kind: 'invalid'; errors: DishFieldErrors };

export async function saveDish(
  deps: { dishes: DishRepository; ids: IdGenerator },
  input: {
    id?: string;
    draft: DishDraft;
    productsById: ReadonlyMap<string, Product>;
    photoChange: PhotoChange;
  },
): Promise<SaveDishResult> {
  const validation = validateDishDraft(input.draft, input.productsById);
  if (!validation.ok) return { kind: 'invalid', errors: validation.errors };

  const stored = input.id === undefined ? undefined : await deps.dishes.get(input.id);
  const dish: Dish = {
    id: input.id ?? deps.ids.next(),
    ...validation.value,
    photo: stored?.photo ?? null,
    archived: stored?.archived ?? false,
  };
  await deps.dishes.put(dish);
  return { kind: 'saved', id: dish.id };
}
