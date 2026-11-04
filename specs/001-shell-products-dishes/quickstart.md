# Quickstart: validate App Shell, Products and Dishes

How to prove the feature works end to end. Behaviour details are in [spec.md](spec.md), [data-model.md](data-model.md) and [contracts/](contracts/).

## Prerequisites

- Node 24 LTS and npm
- For the manual checks: an iPhone with current iOS Safari and an Android phone with Chrome, opening the HTTPS preview from `npm run deploy:preview` (Cloudflare Pages, see T027). Phones need HTTPS for the service worker, installing and photo storage. Plain `npm run preview` over the local network is HTTP and will not work there. Fallback without Cloudflare access: `npm run preview -- --host` plus `cloudflared tunnel --url http://localhost:4173`.
- HTTPS preview URL: <https://preview.planner-4ft.pages.dev>. This alias always points at the latest `npm run deploy:preview`. Each deployment also gets its own URL; the first was <https://f95a50f0.planner-4ft.pages.dev> (2026-11-04).

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

On desktop, run `npm run build && npm run preview` (localhost counts as secure). On phones, open the HTTPS preview URL. Then follow each scenario.

| # | Scenario | Steps | Expected |
|---|---|---|---|
| 1 | Shell (US5) | Open the app | The Tydzień tab is active, with four tabs in order. Tydzień, Lista zakupów and Ustawienia show "Ten ekran pojawi się w kolejnej wersji." |
| 2 | Create a Dish (US1-1) | Dania → + → enter the "Owsianka" example from the spec, adding both Products through "Dodaj „…”" | The Dish is listed. Reopening it shows the exact values, with the units "g" and "ml" |
| 3 | Autocomplete (US1-2/3) | In a new Dish, type "MLE", then "ml", then "losos" with "łosoś" existing | "mleko" is suggested for both "MLE" and "ml". "łosoś" is not suggested for "losos" |
| 4 | Validation (US1-6) | Clear the name, set Liczba porcji to 0, then press Zapisz | Nothing is saved, and both fields show their messages |
| 5 | Photo (US2) | Add a large (≥ 3000 px) phone photo, save, reopen | The photo is shown. In DevTools → Application → Storage → File System, `photos/` holds one file of at most 800 px on its longest edge. On iOS the file is `.jpg`, on Chrome `.webp`. Compare its size with the original: it must be under 10% of the original file size (SC-007) |
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

Seeding (`src/dev/seed.ts`) replaces all local data with fixed fixtures generated from a counter, not randomness. A toast "Dane testowe wczytane: …" confirms it.

Seeding is only available in two places:

- `npm run dev`, at <http://localhost:5173/?seed=…> on the desktop.
- The seeded test deploy, for phones. Run `npm run deploy:seed`, which builds with `VITE_SEED=true` and deploys to the `seed` branch, then open <https://seed.planner-4ft.pages.dev/?seed=…>. It is a separate site with its own data, so testing there never touches the data in the app installed from the preview URL.

The preview URL and normal production builds contain no seed code, so `?seed=` does nothing there.

- **SC-002**: Open `?seed=products-500`, then go to Dania → + and type in "Dodaj składnik…". Products appear under Produkty, not on the Dania screen. Suggestions keep up with typing, and the Performance panel (desktop) shows each input task under 100 ms.
- **SC-003**: On the reference phones, open `https://seed.planner-4ft.pages.dev/?seed=dishes-200-photos-100`, wait for the toast, then open Dania. The list shows within 1 s and scrolls smoothly. Photos load as their rows scroll into view.

## Results

### 2026-11-04: iPhone (iOS Safari, installed from the preview URL) and desktop

Passed: install (10), offline (11), creating and editing Dishes (2), autocomplete (3), validation (4), photo and compression (5, a 250 kB photo stored at about 120 kB), placeholder colours (6), merge (7), rules for used Products (8), deleting a Dish (9), desktop functions (12).

UI defects found and fixed afterwards (re-checked in Chrome with an iPhone user agent at 375 pt, and at 1440 px):

- "Lista zakupów" was clipped in the tabbar. Phone tabbar labels are now 10 px, with less side padding.
- The "Dania" navbar title was pushed off the left edge, because the Produkty link rendered after the title. The navbar parts are now in explicit order.
- Input fields had no visible box. Inputs are now outlined.
- Double-tap zoomed the page. Zoom is disabled with `touch-action: manipulation` and `maximum-scale=1`.
- A field error stayed after the field was corrected, and the Ingredient error overlapped the amount. Errors now clear on edit and sit below the row.
- The desktop layout spread over the whole window. It is now a centred 960 px column, with forms at most 640 px wide.

Still to check: Android (Chrome), the performance spot checks on the reference devices, persistence after a reboot (13), and that the photo above was saved as `.jpg` on iOS. Re-check the phone UI after the next `npm run deploy:preview`.

### 2026-11-04 (later): re-check after the fixes

- iPhone: the UI fixes and the Tabbar Icons (`ToolbarPane`) tabbar look right.
- Desktop Chrome in dev mode: looks right.
- Persistence after a reboot (13): passed.
- Photo format on iOS: assumed `.jpg`, not checked directly.
- Seeding did not work on the first try. It runs only in `npm run dev`, and the preview is a production build. Fixed with the seeded test deploy described under Performance spot checks.

Still open: Android (Chrome), and the SC-002/SC-003 spot checks on the reference phones through `npm run deploy:seed`.
