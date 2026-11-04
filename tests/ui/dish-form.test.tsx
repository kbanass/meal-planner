import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Router } from 'framework7/types';
import { describe, expect, it, vi } from 'vitest';
import { DishFormPage } from '../../src/ui/pages/DishFormPage';
import { renderWithApp } from './render';

describe('DishFormPage', () => {
  it('blocks saving and shows per-field messages for an invalid Dish', async () => {
    const router = { back: vi.fn() };
    const { deps, container } = renderWithApp(
      <DishFormPage
        f7route={{ params: {} } as unknown as Router.Route}
        f7router={router as unknown as Router.Router}
      />,
    );
    // Framework7's ListInput does not link its label to the input, so find fields by id.
    await screen.findByText('Nazwa');
    const name = container.querySelector<HTMLInputElement>('#dish-name')!;
    const servings = container.querySelector<HTMLInputElement>('#dish-servingsYield')!;

    await userEvent.type(name, 'Owsianka');
    await userEvent.clear(name);
    await userEvent.clear(servings);
    await userEvent.type(servings, '0');
    await userEvent.click(screen.getByText('Zapisz'));

    expect(await screen.findAllByText('To pole jest wymagane.')).not.toHaveLength(0);
    expect(screen.getByText('Wartość musi być większa od zera.')).toBeInTheDocument();
    expect(name.closest('.item-input')).toHaveClass('item-input-invalid');
    expect(await deps.db.dishes.count()).toBe(0);
    expect(router.back).not.toHaveBeenCalled();
  });
});
