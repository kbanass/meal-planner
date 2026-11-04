import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SettingsPage } from '../../src/ui/pages/SettingsPage';
import { renderWithApp } from './render';

function stepper(container: HTMLElement) {
  const root = container.querySelector<HTMLElement>('.stepper')!;
  return {
    value: () => root.querySelector<HTMLInputElement>('input')?.value ?? root.querySelector('.stepper-value')?.textContent,
    plus: root.querySelector<HTMLElement>('.stepper-button-plus')!,
    minus: root.querySelector<HTMLElement>('.stepper-button-minus')!,
  };
}

describe('SettingsPage', () => {
  it('changes the number of Slots per day and saves it at once (FR-011)', async () => {
    const { container, deps } = renderWithApp(<SettingsPage />);
    expect(await screen.findByText('Liczba slotów')).toBeInTheDocument();
    await waitFor(() => expect(stepper(container).value()).toBe('4'));

    await userEvent.click(stepper(container).plus);

    await waitFor(async () => expect(await deps.settings.get()).toEqual({ slotsPerDay: 5 }));
    expect(stepper(container).value()).toBe('5');
  });

  // Framework7's Stepper clamps at min and max rather than marking its buttons disabled.
  it('stays within 1–10', async () => {
    const { container, deps } = renderWithApp(<SettingsPage />);
    await deps.settings.setSlotsPerDay(1);
    await waitFor(() => expect(stepper(container).value()).toBe('1'));
    await userEvent.click(stepper(container).minus);
    expect(await deps.settings.get()).toEqual({ slotsPerDay: 1 });

    await deps.settings.setSlotsPerDay(10);
    await waitFor(() => expect(stepper(container).value()).toBe('10'));
    await userEvent.click(stepper(container).plus);
    expect(stepper(container).value()).toBe('10');
    expect(await deps.settings.get()).toEqual({ slotsPerDay: 10 });
  });
});
