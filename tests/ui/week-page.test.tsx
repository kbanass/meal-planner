import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import type { Deps } from '../../src/app/deps';
import { WeekPage } from '../../src/ui/pages/WeekPage';
import { dish, owsianka } from '../fakes/dishes';
import { FixedClock } from '../fakes/fixed-clock';
import { createTestDeps, renderWithApp } from './render';

function depsWithClock(): { deps: Deps; clock: FixedClock } {
  const clock = new FixedClock('2026-11-04');
  return { deps: { ...createTestDeps(), clock }, clock };
}

/** A day in the strip, by its accessible name, e.g. "Czwartek, 5 lis". */
function pill(name: string): HTMLElement {
  return screen.getByRole('button', { name });
}

function heading(): string {
  return document.querySelector('.day-heading h3')?.textContent ?? '';
}

function copyButton(): HTMLElement {
  return screen.getByRole('button', { name: /Skopiuj do następnego tygodnia/ });
}

function slot(container: HTMLElement, number: number): HTMLElement {
  return container.querySelector<HTMLElement>(`[data-slot="${number}"]`)!;
}

async function openPicker(container: HTMLElement, number: number): Promise<HTMLElement> {
  await userEvent.click(within(slot(container, number)).getByText('Dodaj posiłek'));
  // Framework7 keeps closed sheets of earlier tests in the app root, so pick the open one.
  return waitFor(() => {
    const open = document.querySelector<HTMLElement>('.dish-picker-sheet.modal-in');
    if (!open) throw new Error('Dish picker not open');
    return open;
  });
}

afterEach(() => {
  Reflect.deleteProperty(document, 'visibilityState');
});

describe('WeekPage', () => {
  it('opens on the current Week with today selected (US1-1, FR-002)', async () => {
    const { deps } = depsWithClock();
    renderWithApp(<WeekPage />, deps);

    expect(await screen.findByText('Listopad 2026')).toBeInTheDocument();
    expect(pill('Środa, 4 lis')).toHaveAttribute('aria-pressed', 'true');
    expect(pill('Poniedziałek, 2 lis')).toHaveAttribute('aria-pressed', 'false');
    expect(heading()).toBe('Środa, 4 lis');
    expect(screen.getByText('brak posiłków')).toBeInTheDocument();
  });

  it("shows a tapped day's Slots on the same screen (US1-2, FR-007)", async () => {
    const { deps } = depsWithClock();
    const { container } = renderWithApp(<WeekPage />, deps);
    await screen.findByText('Listopad 2026');

    await userEvent.click(pill('Czwartek, 5 lis'));

    expect(pill('Czwartek, 5 lis')).toHaveAttribute('aria-pressed', 'true');
    expect(pill('Środa, 4 lis')).toHaveClass('day-pill-today');
    expect(heading()).toBe('Czwartek, 5 lis');
    expect([...container.querySelectorAll('.slot-label')].map((l) => l.textContent)).toEqual([
      '1',
      '2',
      '3',
      '4',
    ]);
  });

  it('moves between Weeks keeping the weekday (US4-1, US4-2)', async () => {
    const { deps } = depsWithClock();
    await deps.dishes.put(owsianka);
    await deps.week.addMeal({ date: '2026-11-12', slot: 1, dishId: owsianka.id });
    const { container } = renderWithApp(<WeekPage />, deps);
    await screen.findByText('Listopad 2026');
    await userEvent.click(pill('Czwartek, 5 lis'));

    await userEvent.click(screen.getByLabelText('Następny tydzień'));
    await waitFor(() => expect(heading()).toBe('Czwartek, 12 lis'));
    expect(await within(slot(container, 1)).findByText('Owsianka')).toBeInTheDocument();
    expect(within(pill('Czwartek, 12 lis')).getByText('350')).toBeInTheDocument();
    expect(screen.getByText('1 posiłek · 350 kcal')).toBeInTheDocument();
    expect(container.querySelector('.day-pill-today')).toBeNull();

    await userEvent.click(screen.getByLabelText('Poprzedni tydzień'));
    await userEvent.click(screen.getByLabelText('Poprzedni tydzień'));
    expect(await screen.findByText('Październik – listopad 2026')).toBeInTheDocument();
    expect(heading()).toBe('Czwartek, 29 paź');
  });

  it('moves the today mark when the app comes back after midnight, keeping the selection', async () => {
    const { deps, clock } = depsWithClock();
    renderWithApp(<WeekPage />, deps);
    await screen.findByText('Listopad 2026');

    clock.set('2026-11-05');
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(pill('Czwartek, 5 lis')).toHaveClass('day-pill-today'));
    expect(pill('Środa, 4 lis')).toHaveAttribute('aria-pressed', 'true');
  });

  it('adds a Meal to a Slot from the Dish picker (US1-3, US1-4, US1-7)', async () => {
    const { deps } = depsWithClock();
    await deps.dishes.put(owsianka);
    await deps.dishes.put(dish({ id: 'd-old', name: 'Stare danie', archived: true }));
    const { container } = renderWithApp(<WeekPage />, deps);
    await screen.findByText('Listopad 2026');

    const sheet = await openPicker(container, 2);
    expect(within(sheet).getByText('Wybierz danie')).toBeInTheDocument();
    expect(within(sheet).queryByText('Stare danie')).not.toBeInTheDocument();
    await userEvent.click(within(sheet).getByText('Owsianka'));

    expect(await within(slot(container, 2)).findByText('Owsianka')).toBeInTheDocument();
    expect(within(slot(container, 2)).getByText('1 porcja · 350 kcal')).toBeInTheDocument();
    expect(within(slot(container, 2)).getByText('Dodaj posiłek')).toBeInTheDocument();
    expect(screen.getByText('1 posiłek · 350 kcal')).toBeInTheDocument();
    expect(within(pill('Środa, 4 lis')).getByText('350')).toBeInTheDocument();
    await waitFor(() => expect(sheet).not.toHaveClass('modal-in'));
    expect(await deps.week.listMeals({ start: '2026-11-04', end: '2026-11-04' })).toHaveLength(1);
  });

  it('adds a Slot to the selected day with "dodaj kolejny" (US5-1)', async () => {
    const { deps } = depsWithClock();
    const { container } = renderWithApp(<WeekPage />, deps);
    await screen.findByText('Listopad 2026');

    await userEvent.click(screen.getByText('dodaj kolejny'));

    await waitFor(() => expect(slot(container, 5)).not.toBeNull());
    expect(await deps.week.listDaySlots({ start: '2026-11-04', end: '2026-11-04' })).toEqual([
      { date: '2026-11-04', slotCount: 5 },
    ]);
  });

  it('offers no copy for an empty Week (FR-036)', async () => {
    const { deps } = depsWithClock();
    renderWithApp(<WeekPage />, deps);
    await screen.findByText('Listopad 2026');

    expect(copyButton()).toBeDisabled();
  });

  it('copies at once when the next Week is empty, and stays on this Week (US6-1, US6-7)', async () => {
    const { deps } = depsWithClock();
    await deps.dishes.put(owsianka);
    await deps.week.addMeal({ date: '2026-11-02', slot: 1, dishId: owsianka.id });
    renderWithApp(<WeekPage />, deps);
    await waitFor(() => expect(copyButton()).toBeEnabled());

    await userEvent.click(copyButton());

    expect(await screen.findByText('Skopiowano do następnego tygodnia.')).toBeInTheDocument();
    expect(document.querySelector('.dialog.modal-in')).toBeNull();
    expect(heading()).toBe('Środa, 4 lis');
    expect(await deps.week.listMeals({ start: '2026-11-09', end: '2026-11-15' })).toHaveLength(1);
  });

  it('asks before replacing a planned next Week, and cancelling changes nothing (US6-3)', async () => {
    const { deps } = depsWithClock();
    await deps.dishes.put(owsianka);
    await deps.week.addMeal({ date: '2026-11-02', slot: 1, dishId: owsianka.id });
    const kept = await deps.week.addMeal({ date: '2026-11-11', slot: 2, dishId: owsianka.id });
    renderWithApp(<WeekPage />, deps);
    await waitFor(() => expect(copyButton()).toBeEnabled());

    await userEvent.click(copyButton());

    const dialog = await waitFor(() => {
      const open = document.querySelector<HTMLElement>('.dialog.modal-in');
      if (!open) throw new Error('No dialog');
      return open;
    });
    expect(dialog).toHaveTextContent('Następny tydzień ma już plan. Zastąpić go planem z tego tygodnia?');
    await userEvent.click(dialog.querySelectorAll<HTMLElement>('.dialog-button')[0]!);

    expect(await deps.week.listMeals({ start: '2026-11-09', end: '2026-11-15' })).toEqual([kept]);
  });
});
