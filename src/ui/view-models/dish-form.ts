import type { PhotoChange, PhotoError } from '../../app/dishes';
import type { DishFieldError, DishFieldErrors } from '../../domain/dishes';
import { normalizeName } from '../../domain/names';
import type { DishPhotoRef, Product, Unit } from '../../domain/types';

const MESSAGES: Record<DishFieldError, string> = {
  required: 'To pole jest wymagane.',
  notANumber: 'Wpisz liczbę, np. 1,5.',
  notPositive: 'Wartość musi być większa od zera.',
  negative: 'Wartość nie może być ujemna.',
  duplicateProduct: 'Ten produkt jest już w daniu.',
  unknownProduct: 'Nieznany produkt.',
};

const UNIT_LABELS: Record<Unit, string> = { g: 'g', ml: 'ml', pcs: 'szt.' };

const MACRO_ORDER = ['kcal', 'protein', 'fat', 'carbs'];

export function errorMessage(code: DishFieldError): string {
  return MESSAGES[code];
}

export function unitLabel(unit: Unit): string {
  return UNIT_LABELS[unit];
}

/** Position of a field path in the form, top to bottom. */
function formPosition(path: string): number[] {
  if (path === 'name') return [0];
  if (path === 'servingsYield') return [1];
  const ingredient = /^ingredients\[(\d+)\]\.(productId|amount)$/.exec(path);
  if (ingredient) return [2, Number(ingredient[1]), ingredient[2] === 'productId' ? 0 : 1];
  const macro = /^macros\.(\w+)$/.exec(path);
  if (macro) return [3, MACRO_ORDER.indexOf(macro[1] ?? '')];
  return [4];
}

function comparePositions(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? -1) - (b[i] ?? -1);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** The invalid field nearest the top of the form, to scroll into view. */
export function firstInvalidField(errors: DishFieldErrors): string | null {
  const paths = Object.keys(errors).sort((a, b) => comparePositions(formPosition(a), formPosition(b)));
  return paths[0] ?? null;
}

/** DOM id for a field path, e.g. `ingredients[1].amount` → `dish-ingredients-1-amount`. */
export function fieldDomId(path: string): string {
  return `dish-${path.replace(/[^a-zA-Z0-9]+/g, '-').replace(/-$/, '')}`;
}

export function indexProducts(products: readonly Product[]): ReadonlyMap<string, Product> {
  return new Map(products.map((product) => [product.id, product]));
}

export function createProductLabel(query: string): string {
  return `Dodaj „${normalizeName(query)}”`;
}

const PHOTO_ERROR_MESSAGES: Record<PhotoError, string> = {
  decode: 'Nie udało się wczytać zdjęcia. Spróbuj innego pliku.',
  quota: 'Brak miejsca na urządzeniu. Danie zapisano bez nowego zdjęcia.',
};

export function photoErrorMessage(error: PhotoError): string {
  return PHOTO_ERROR_MESSAGES[error];
}

/** What the form's photo section shows for the stored photo and the unsaved change. */
export function photoSection(
  stored: DishPhotoRef | null,
  change: PhotoChange,
): { shows: 'stored' | 'pending' | 'none'; pickLabel: string; canRemove: boolean } {
  const shows =
    change.kind === 'set' ? 'pending' : change.kind === 'keep' && stored ? 'stored' : 'none';
  return {
    shows,
    pickLabel: shows === 'none' ? 'Dodaj zdjęcie' : 'Zmień zdjęcie',
    canRemove: shows !== 'none',
  };
}

export function deleteDishConfirmMessage(name: string): string {
  return `Usunąć danie „${name}”?`;
}
