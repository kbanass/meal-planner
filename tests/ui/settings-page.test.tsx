import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SettingsPage } from '../../src/ui/pages/SettingsPage';
import { renderWithApp } from './render';

function row(container: HTMLElement): HTMLElement {
  return within(container)
    .getByText('Liczba slotów', { selector: '.item-title' })
    .closest('.item-link') as HTMLElement;
}

async function openSheet(): Promise<HTMLElement> {
  // Framework7 keeps closed sheets of earlier tests in the app root, so pick the open one.
  return waitFor(() => {
    const open = document.querySelector<HTMLElement>('.slots-sheet.modal-in');
    if (!open) throw new Error('Slots sheet not open');
    return open;
  });
}

describe('SettingsPage', () => {
  it('shows the number of Slots and picks a new one in a sheet (FR-011)', async () => {
    const { container, deps } = renderWithApp(<SettingsPage />);
    await waitFor(() => expect(row(container)).toHaveTextContent('4'));

    await userEvent.click(row(container));
    const sheet = await openSheet();
    expect(within(sheet).getAllByRole('radio')).toHaveLength(10);
    expect(within(sheet).getByRole('radio', { name: '4' })).toBeChecked();
    await userEvent.click(within(sheet).getByText('6'));

    await waitFor(async () => expect(await deps.settings.get()).toEqual({ slotsPerDay: 6 }));
    await waitFor(() => expect(row(container)).toHaveTextContent('6'));
    await waitFor(() => expect(sheet).not.toHaveClass('modal-in'));
  });

  it('offers exactly 1 to 10', async () => {
    const { container } = renderWithApp(<SettingsPage />);
    await screen.findByText('Liczba slotów', { selector: '.item-title' });

    await userEvent.click(row(container));
    const sheet = await openSheet();

    expect(within(sheet).getAllByRole('radio').map((r) => (r as HTMLInputElement).value)).toEqual(
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    );
  });
});
