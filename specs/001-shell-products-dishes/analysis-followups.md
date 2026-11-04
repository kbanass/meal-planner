# Analysis follow-ups: App Shell, Products and Dishes

These are the open low-priority findings from `/speckit-analyze` (run on 2026-11-04). The CRITICAL, HIGH and top MEDIUM findings (C1, H1, M1–M4) were fixed in commit `d3409be`. None of the items below block implementation. Task T085 in [tasks.md](tasks.md) resolves them.

Mark each item `[x]` when it is resolved, and say how.

## Documentation consistency

- [x] **M5: functions missing from the domain contract.**
  - Where: tasks T007, T011, T012 vs [contracts/domain-api.md](contracts/domain-api.md) and the [plan.md](plan.md) Project Structure.
  - Problem: the tasks create `formatDecimal` in `numbers.ts` and a `units.ts` module (`UNITS`, `isUnit`), but neither the contract nor the plan's file layout lists them.
  - Fix: add a `units.ts` section and `formatDecimal(value: number): string` to the contract, and add `units.ts` to the plan's `src/domain/` tree.
  - Resolved in T085: `formatDecimal` and a `units.ts` section added to contracts/domain-api.md; `units.ts` added to the plan's `src/domain/` tree.
- [x] **L6: files missing from the plan's layout.**
  - Where: the [plan.md](plan.md) Project Structure.
  - Problem: the tasks create files that the layout doesn't show:
    - `src/ui/styles/app.css` (T022)
    - `pwa-assets.config.ts` (T026)
    - `public/_headers` (T027)
    - `tests/setup.ts` (T003)
    - `tests/fakes/test-db.ts` (T015)
  - Fix: add them to the source tree in plan.md.
  - Resolved in T085: all five files added to the plan's source tree.
- [x] **L7: photo reference id source not stated.**
  - Where: tasks T056 and [contracts/persistence-and-ports.md](contracts/persistence-and-ports.md), `saveDish`.
  - Problem: the new `DishPhotoRef` id must come from the injected `deps.ids.next()`, as Principle IV requires for ID generation, but neither place says so.
  - Fix: state it in the contract's "Order of operations" step 2. Make sure the implementation does it.

  - Resolved in T085: contract step 2 now names `deps.ids.next()`. The implementation already did this (`storePhoto` in `src/app/dishes.ts`).
## Spec wording

- [x] **L1: internal whitespace in names.**
  - Where: [spec.md](spec.md) Edge Cases ("Name normalisation", "Product name uniqueness") and FR-013.
  - Problem: the plan also collapses runs of spaces inside a name (research R3), so "pomidory  suszone" and "pomidory suszone" become the same Product. The spec only mentions spaces at the start and end.
  - Fix: add "Repeated spaces inside a name count as one" to the Name normalisation edge case.
  - Resolved in T085: the Name normalisation edge case now says repeated inner spaces count as one.
- [x] **L3: unmeasurable success criteria.**
  - Where: [spec.md](spec.md) SC-003, SC-007.
  - Problem: "mid-range phone", "without visible stutter" and "typical phone photo" can't be measured.
  - Fix: name a reference device (for example the oldest iPhone and Android phone the user actually owns) and a reference photo (for example "a 12 MP JPEG straight from the phone camera").
  - Resolved in T085: SC-003 names the oldest iPhone and Android phone the user owns as reference devices; SC-007 names a 12 MP camera JPEG as the reference photo.
- [x] **L4: storage-full wording.**
  - Where: [spec.md](spec.md) Edge Cases, "Device storage full when saving a photo".
  - Problem: the spec says the Dish is saved "without the photo". The contract keeps the previous photo, and the message says "bez nowego zdjęcia".
  - Fix: reword to "…can still be saved without the new photo; the previous photo, if any, is kept."
  - Resolved in T085: the edge case now says the Dish is saved without the new photo and the previous photo is kept.
- [x] **L5: "Dish photo" listed as an entity.**
  - Where: [spec.md](spec.md) Key Entities.
  - Problem: "Dish photo" is listed as an entity but isn't in GLOSSARY.md. Principle II requires new domain concepts to be added to the glossary first.
  - Fix: fold it into the Dish entry as an attribute ("…an optional photo, stored on the device in reduced size and removed when the Dish is removed for good") and remove the separate bullet.

  - Resolved in T085: the photo is folded into the Dish entity; the separate Dish photo bullet is removed.
## Carry-over to the Week planning feature

- [ ] **L2: usage messages mention only Dishes.**
  - Where: [spec.md](spec.md) US3-6 vs [contracts/ui.md](contracts/ui.md) Produkty hints.
  - Problem: the spec says the user is told how many "Dishes and Detached Meals" use a Product. The planned messages ("używany w N daniach") mention only Dishes. That is correct while no Meals exist.
  - Fix: no change in this feature. When Week planning adds Detached Meals, extend `dishCountPhrase` and the hints in `src/ui/view-models/products.ts` to count them too. Track this together with the other R13 handoff items in tasks.md, under "Handoff to the Week planning feature".

## Not actionable

- **D1**: FR-013 and FR-032 repeat rules that also appear in Edge Cases. This is intentional, because the edge cases add concrete examples. No change.
