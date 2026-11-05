import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DishLibraryPage } from '../../src/ui/pages/DishLibraryPage';
import { dish, owsianka } from '../fakes/dishes';
import { createTestDeps, renderWithApp } from './render';

describe('DishLibraryPage', () => {
  it('shows each Dish as a card with one Serving and its notes (FR-046)', async () => {
    const deps = createTestDeps();
    await deps.dishes.put({ ...owsianka, notes: 'Zalać mlekiem i gotować 5 minut.' });
    await deps.dishes.put(dish({ id: 'd-old', name: 'Stare danie', archived: true }));
    renderWithApp(<DishLibraryPage />, deps);

    const name = await screen.findByText('Owsianka', { selector: '.dish-card-name' });
    const card = name.closest('a.dish-card') as HTMLElement;
    expect(card).toHaveAttribute('href', `/dishes/${owsianka.id}/`);
    expect(within(card).getByText('2 porcje · 2 składniki')).toBeInTheDocument();
    expect(within(card).getByText('na porcję')).toBeInTheDocument();
    expect(within(card).getByLabelText('Kalorie: 350 kcal')).toBeInTheDocument();
    expect(within(card).getByLabelText('Białko: 12,5 g')).toBeInTheDocument();
    expect(within(card).getByText('Zalać mlekiem i gotować 5 minut.')).toBeInTheDocument();
    expect(screen.queryByText('Stare danie')).not.toBeInTheDocument();
  });

  it('explains an empty library', async () => {
    renderWithApp(<DishLibraryPage />);

    expect(
      await screen.findByText('Nie masz jeszcze żadnych dań. Dodaj pierwsze przyciskiem +.'),
    ).toBeInTheDocument();
  });
});
