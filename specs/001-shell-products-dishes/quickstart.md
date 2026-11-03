# Quickstart: validate App Shell, Products and Dishes

How to prove the feature works end to end. Behaviour details are in [spec.md](spec.md), [data-model.md](data-model.md) and [contracts/](contracts/).

## Prerequisites

- Node 24 LTS and npm
- For the manual checks: an iPhone with current iOS Safari and an Android phone with Chrome, on the same network as the dev machine or using a deployed preview URL. PWA install and the photo storage API need HTTPS or `localhost`.

## Automated checks

```sh
npm ci
npm run lint          # includes the domain import and global restrictions (research R2)
npm run typecheck
npm test              # Vitest: domain, repositories (fake-indexeddb), use cases, key components
npm run coverage      # fails unless src/domain/** is at 100% lines/branches/functions/statements
npm run build         # production build + service worker + manifest
```

Expected: every command exits 0. `build` writes `dist/` containing `sw.js` and `manifest.webmanifest`.

## Manual checks

Run `npm run build && npm run preview` (or open the deployed preview), then follow each scenario.

| # | Scenario | Steps | Expected |
|---|---|---|---|
| 1 | Shell (US5) | Open the app | The Tydzień tab is active, with four tabs in order. Tydzień, Lista zakupów and Ustawienia show "Ten ekran pojawi się w kolejnej wersji." |
| 2 | Create a Dish (US1-1) | Dania → + → enter the "Owsianka" example from the spec, adding both Products through "Dodaj „…”" | The Dish is listed. Reopening it shows the exact values, with the units "g" and "ml" |
| 3 | Autocomplete (US1-2/3) | In a new Dish, type "MLE", then "ml", then "losos" with "łosoś" existing | "mleko" is suggested for both "MLE" and "ml". "łosoś" is not suggested for "losos" |
| 4 | Validation (US1-6) | Clear the name, set Liczba porcji to 0, then press Zapisz | Nothing is saved, and both fields show their messages |
| 5 | Photo (US2) | Add a large (≥ 3000 px) phone photo, save, reopen | The photo is shown. In DevTools → Application → Storage → File System, `photos/` holds one file of at most 800 px on its longest edge. On iOS the file is `.jpg`, on Chrome `.webp` |
| 6 | Placeholder (US2-4/5) | Create "Leczo z kiełbasą" without a photo, then rename another Dish to the same name | Both show the same colour and "LZ". Renaming to "Kasza jaglana" shows "KJ" |
| 7 | Merge (US3-1/2) | Set up the "pomidor"/"pomidory" example from the spec, then Produkty → pomidory → Scal z innym produktem… → pomidor | "pomidory" is gone, "pomidor" shows "używany: 3", and the Dish that had both shows 300 g |
| 8 | Rules for used Products (US3-5/6) | Rename "pomidory" to "Pomidor". Open the actions for a used Product | The rename is rejected and a merge is offered. Zmień jednostkę and Usuń are disabled with an explanation |
| 9 | Delete a Dish (US4-1) | Delete a Dish that has a photo | The Dish disappears, its photo file is removed, and its Products remain with lower usage |
| 10 | Install (US5-2) | iOS: Share → Do ekranu początkowego. Android: Zainstaluj aplikację | The app has the icon "Planer" and opens without browser controls |
| 11 | Offline (US5-1, SC-004) | After scenario 10, enable airplane mode, force-close the app and start it from the home screen. Create and edit a Dish with a photo | Everything works. DevTools (Android, remote debugging) shows no network requests |
| 12 | Desktop (US5-5) | Open in a desktop browser window ≥ 1024 px wide | The tabbar is at the top, the library is a card grid, and forms are centred. All actions work |
| 13 | Persistence (FR-011) | Reboot the phone and open the app | All Dishes, Products and photos are still there |

The archive path (US4-2) cannot be reached manually in this feature, because there are no Meals. It is covered by the `deleteDish` use-case test with `countMealsUsingDish` faked to return 1 (see [contracts/persistence-and-ports.md](contracts/persistence-and-ports.md)).

## Performance spot checks

Seeding is a dev-only module (`src/dev/seed.ts`). It loads only when `import.meta.env.DEV` is true, so production builds never include it. It replaces local data with fixed fixtures generated from a seeded counter, not randomness.

- **SC-002**: Run `npm run dev`, open `/?seed=products-500`, then type in the ProductPicker. Suggestions keep up with typing, and the Performance panel shows each input task under 100 ms.
- **SC-003**: Open `/?seed=dishes-200-photos-100` on a mid-range phone, then open Dania. The list shows within 1 s and scrolls smoothly. Photos load as their rows scroll into view.
