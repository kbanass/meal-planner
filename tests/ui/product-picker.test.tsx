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
  const input = screen.getByPlaceholderText('Dodaj składnik…');
  return { deps, onPick, input };
}

describe('ProductPicker', () => {
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
    expect(input).toHaveValue('');
  });

  it('does not offer to create an existing name', async () => {
    const { input } = await renderPicker();

    await userEvent.type(input, 'Mleko');

    expect(await screen.findByText('mleko')).toBeInTheDocument();
    expect(screen.queryByText(/^Dodaj „/)).not.toBeInTheDocument();
  });
});
