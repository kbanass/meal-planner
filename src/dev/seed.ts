// Fixtures for the performance spot checks in quickstart.md (SC-002, SC-003). main.tsx
// imports this module only in development or in the `npm run deploy:seed` test build
// (VITE_SEED=true), so normal production builds never contain it. Everything here is deterministic: names, units and colours
// come from counters, never from randomness.
import { f7, f7ready } from 'framework7-react';
import type { Deps } from '../app/deps';
import { addDays, weekDates, weekStartOf } from '../domain/dates';
import { nameKey } from '../domain/names';
import type { Dish, Meal, Product, Unit } from '../domain/types';
import { UNITS } from '../domain/units';

const INGREDIENTS_PER_DISH = 5;
const SEED_PRODUCTS_FOR_DISHES = 50;

function counterIds() {
  let n = 0;
  return () => {
    n += 1;
    return `00000000-0000-4000-9000-${String(n).padStart(12, '0')}`;
  };
}

function pad(n: number): string {
  return String(n).padStart(3, '0');
}

function seedProducts(count: number, nextId: () => string): Product[] {
  return Array.from({ length: count }, (_, i) => ({
    id: nextId(),
    name: `Produkt ${pad(i + 1)}`,
    unit: UNITS[i % UNITS.length] as Unit,
  }));
}

function solidColourPhoto(index: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 900;
  const context = canvas.getContext('2d')!;
  context.fillStyle = `hsl(${(index * 47) % 360} 60% 50%)`;
  context.fillRect(0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png'),
  );
}

async function clearPhotos(deps: Deps): Promise<void> {
  for (const id of await deps.photos.listIds()) {
    await deps.photos.delete({ id, mimeType: 'image/webp' });
    await deps.photos.delete({ id, mimeType: 'image/jpeg' });
  }
}

/** Replaces all local data. Meals and Added Slots go too, so none point at a missing Dish. */
async function replaceData(deps: Deps, products: Product[], dishes: Dish[]): Promise<void> {
  const { db } = deps;
  await db.transaction('rw', [db.products, db.dishes, db.meals, db.daySlots], async () => {
    await db.meals.clear();
    await db.daySlots.clear();
    await db.products.clear();
    await db.dishes.clear();
    await deps.db.products.bulkPut(products.map((p) => ({ ...p, nameKey: nameKey(p.name) })));
    await deps.db.dishes.bulkPut(dishes);
  });
}

async function seedDishes(
  deps: Deps,
  count: number,
  photoCount: number,
  nextId = counterIds(),
): Promise<Dish[]> {
  const products = seedProducts(SEED_PRODUCTS_FOR_DISHES, nextId);
  const dishes: Dish[] = [];
  for (let i = 0; i < count; i += 1) {
    let photo: Dish['photo'] = null;
    if (i < photoCount) {
      const { blob, mimeType } = await deps.compressor.compress(await solidColourPhoto(i), 800);
      photo = { id: nextId(), mimeType };
      await deps.photos.write(photo, blob);
    }
    dishes.push({
      id: nextId(),
      name: `Danie ${pad(i + 1)}`,
      servingsYield: 2,
      ingredients: Array.from({ length: INGREDIENTS_PER_DISH }, (_, k) => ({
        productId: products[(i * INGREDIENTS_PER_DISH + k) % products.length]!.id,
        amount: 100,
      })),
      macros: { kcal: 500, protein: 20, fat: 15, carbs: 60 },
      notes: '',
      photo,
      archived: false,
    });
  }
  await replaceData(deps, products, dishes);
  return dishes;
}

const SEED_DISHES_FOR_WEEKS = 20;
const SEED_SLOTS_PER_DAY = 5;

/**
 * The current Week and `pastWeeks` Weeks before it, each with 5 Meals a day in Slots 1–5
 * (35 a Week). Every fifth Meal is a Detached Meal with a copy of its Dish. For the SC-005 and
 * SC-006 spot checks in quickstart.md.
 */
async function seedWeeks(deps: Deps, pastWeeks: number): Promise<void> {
  const nextId = counterIds();
  const dishes = await seedDishes(deps, SEED_DISHES_FOR_WEEKS, 0, nextId);
  const currentWeek = weekStartOf(deps.clock.today());
  const meals: Meal[] = [];
  for (let week = 0; week <= pastWeeks; week += 1) {
    weekDates(addDays(currentWeek, -7 * week)).forEach((date, day) => {
      for (let slot = 1; slot <= SEED_SLOTS_PER_DAY; slot += 1) {
        const n = meals.length;
        const dish = dishes[(week * 7 + day + slot) % dishes.length]!;
        const { name, servingsYield, ingredients, macros } = dish;
        meals.push({
          id: nextId(),
          date,
          slot,
          position: 0,
          dishId: dish.id,
          servings: 1,
          detached: n % 5 === 4 ? { name: `${name} (zmienione)`, servingsYield, ingredients, macros } : null,
        });
      }
    });
  }
  await deps.db.meals.bulkAdd(meals);
}

/** Reads `?seed=products-N`, `?seed=dishes-N-photos-M` or `?seed=weeks-N` and replaces local data. */
export async function seedFromUrl(deps: Deps): Promise<void> {
  const url = new URL(window.location.href);
  const seed = url.searchParams.get('seed');
  if (!seed) return;

  const products = /^products-(\d+)$/.exec(seed);
  const dishes = /^dishes-(\d+)-photos-(\d+)$/.exec(seed);
  const weeks = /^weeks-(\d+)$/.exec(seed);
  if (products || dishes || weeks) await clearPhotos(deps);
  if (products) {
    await replaceData(deps, seedProducts(Number(products[1]), counterIds()), []);
  } else if (dishes) {
    await seedDishes(deps, Number(dishes[1]), Number(dishes[2]));
  } else if (weeks) {
    await seedWeeks(deps, Number(weeks[1]));
  } else {
    console.warn(`Unknown seed "${seed}". Use products-N, dishes-N-photos-M or weeks-N.`);
    return;
  }

  // Drop the parameter so a reload does not seed again.
  url.searchParams.delete('seed');
  window.history.replaceState(null, '', url);
  console.info(`Seeded "${seed}".`);
  f7ready(() =>
    f7.toast.show({ text: `Dane testowe wczytane: ${seed}`, closeTimeout: 4000, position: 'center' }),
  );
}
