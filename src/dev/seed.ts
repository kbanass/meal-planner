// Fixtures for the performance spot checks in quickstart.md (SC-002, SC-003). main.tsx
// imports this module only in development or in the `npm run deploy:seed` test build
// (VITE_SEED=true), so normal production builds never contain it. Everything here is deterministic: names, units and colours
// come from counters, never from randomness.
import { f7, f7ready } from 'framework7-react';
import type { Deps } from '../app/deps';
import { nameKey } from '../domain/names';
import type { Dish, Product, Unit } from '../domain/types';
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

async function replaceData(deps: Deps, products: Product[], dishes: Dish[]): Promise<void> {
  await deps.db.transaction('rw', deps.db.products, deps.db.dishes, async () => {
    await deps.db.products.clear();
    await deps.db.dishes.clear();
    await deps.db.products.bulkPut(products.map((p) => ({ ...p, nameKey: nameKey(p.name) })));
    await deps.db.dishes.bulkPut(dishes);
  });
}

async function seedDishes(deps: Deps, count: number, photoCount: number): Promise<void> {
  const nextId = counterIds();
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
}

/** Reads `?seed=products-N` or `?seed=dishes-N-photos-M` and replaces local data. */
export async function seedFromUrl(deps: Deps): Promise<void> {
  const url = new URL(window.location.href);
  const seed = url.searchParams.get('seed');
  if (!seed) return;

  const products = /^products-(\d+)$/.exec(seed);
  const dishes = /^dishes-(\d+)-photos-(\d+)$/.exec(seed);
  if (products || dishes) await clearPhotos(deps);
  if (products) {
    await replaceData(deps, seedProducts(Number(products[1]), counterIds()), []);
  } else if (dishes) {
    await seedDishes(deps, Number(dishes[1]), Number(dishes[2]));
  } else {
    console.warn(`Unknown seed "${seed}". Use products-N or dishes-N-photos-M.`);
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
