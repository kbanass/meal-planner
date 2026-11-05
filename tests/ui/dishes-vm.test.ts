import { describe, expect, it } from 'vitest';
import { dishCard } from '../../src/ui/view-models/dishes';
import { macroTotals } from '../../src/ui/view-models/week';
import { dish, owsianka } from '../fakes/dishes';

describe('dishCard', () => {
  it('shows the yield, Ingredient count and one Serving (FR-046)', () => {
    expect(dishCard({ ...owsianka, notes: '  Zalać mlekiem\n  i gotować. ' })).toEqual({
      id: owsianka.id,
      name: 'Owsianka',
      photo: null,
      meta: '2 porcje · 2 składniki',
      totals: macroTotals({ kcal: 350, protein: 12.5, fat: 7.5, carbs: 55 }),
      notes: 'Zalać mlekiem i gotować.',
    });
  });

  it.each([
    [1, 1, '1 porcja · 1 składnik'],
    [1.5, 5, '1,5 porcji · 5 składników'],
    [4, 0, '4 porcje · 0 składników'],
  ])('words %d Servings and %d Ingredients', (servingsYield, count, meta) => {
    const ingredients = Array.from({ length: count }, (_, i) => ({ productId: `p-${i}`, amount: 1 }));
    expect(dishCard(dish({ id: 'd', name: 'D', servingsYield, ingredients })).meta).toBe(meta);
  });

  it('shortens long notes and leaves out empty ones', () => {
    const long = 'Słowo '.repeat(40);
    expect(dishCard(dish({ id: 'd', name: 'D', notes: long })).notes).toMatch(/^Słowo( Słowo)+…$/);
    expect(dishCard(dish({ id: 'd', name: 'D', notes: long })).notes!.length).toBeLessThanOrEqual(121);
    expect(dishCard(dish({ id: 'd', name: 'D', notes: '   ' })).notes).toBeNull();
  });
});
