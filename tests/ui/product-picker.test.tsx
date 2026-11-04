import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProductPicker } from '../../src/ui/components/ProductPicker';
import { createTestDeps, renderWithApp } from './render';

async function renderPicker() {
  const deps = createTestDeps();
  await deps.products.createFromName('mleko', 'ml');
  const onPick = vi.fn();
  renderWithApp(<ProductPicker onPick={onPick} />, deps);
  await userEvent.click(screen.getByRole('button', { name: 'Dodaj składnik' }));
  const input = screen.getByPlaceholderText('Szukaj produktu…');
  return { deps, onPick, input };
}

describe('ProductPicker', () => {
  it('is a button until tapped, and Anuluj closes the search', async () => {
    const { input } = await renderPicker();

    expect(input).toHaveFocus();
    await userEvent.click(screen.getByText('Anuluj', { selector: '.product-picker-cancel *' }));

    expect(screen.queryByPlaceholderText('Szukaj produktu…')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dodaj składnik' })).toBeInTheDocument();
  });

  it('suggests a Product ignoring case', async () => {
    const { input } = await renderPicker();

    await userEvent.type(input, 'MLE');

    expect(await screen.findByText('mleko')).toBeInTheDocument();
  });

  it('creates a new Product in grams by default', async () => {
    const { input, onPick, deps } = await renderPicker();

    await userEvent.type(input, 'jogurt grecki');
    await userEvent.click(await screen.findByText('Dodaj „jogurt grecki”'));

    expect(screen.getByText('Nowy produkt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'g' })).toHaveClass('button-active');
    await userEvent.click(screen.getByRole('button', { name: 'Dodaj' }));

    await waitFor(() =>
      expect(onPick).toHaveBeenCalledWith({
        id: expect.any(String),
        name: 'jogurt grecki',
        unit: 'g',
      }),
    );
    expect(await deps.products.list()).toHaveLength(2);
    // After picking, the search closes back into the button.
    expect(input).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dodaj składnik' })).toBeInTheDocument();
  });

  it('does not offer to create an existing name', async () => {
    const { input } = await renderPicker();

    await userEvent.type(input, 'Mleko');

    expect(await screen.findByText('mleko')).toBeInTheDocument();
    expect(screen.queryByText(/^Dodaj „/)).not.toBeInTheDocument();
  });
});
