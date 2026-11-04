import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ProductsPage } from '../../src/ui/pages/ProductsPage';
import { createTestDeps, renderWithApp } from './render';

describe('ProductsPage', () => {
  it('disables delete and unit change for a used Product and says why', async () => {
    const deps = createTestDeps();
    const created = await deps.products.createFromName('pomidor', 'g');
    if (created.kind !== 'created') throw new Error('setup failed');
    await deps.dishes.put({
      id: 'd-1',
      name: 'Sałatka',
      servingsYield: 1,
      ingredients: [{ productId: created.product.id, amount: 100 }],
      macros: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
      notes: '',
      photo: null,
      archived: false,
    });
    renderWithApp(<ProductsPage />, deps);

    expect(await screen.findByText('używany: 1')).toBeInTheDocument();
    await userEvent.click(screen.getByText('pomidor', { selector: '.item-title' }));

    const actionButton = (label: string) =>
      screen.getByText(label, { selector: '.actions-button *, .actions-button' }).closest('.actions-button');
    expect(actionButton('Usuń')).toHaveClass('disabled');
    expect(actionButton('Zmień jednostkę')).toHaveClass('disabled');
    expect(actionButton('Zmień nazwę')).not.toHaveClass('disabled');
    expect(
      screen.getByText('Produkt jest używany w 1 daniu – nie można go usunąć.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Produkt jest używany w 1 daniu – jednostki nie można zmienić.'),
    ).toBeInTheDocument();
  });
});
