import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import type { Deps } from '../../src/app/deps';
import { WeekPage } from '../../src/ui/pages/WeekPage';
import { owsianka } from '../fakes/dishes';
import { FixedClock } from '../fakes/fixed-clock';
import { createTestDeps, renderWithApp } from './render';

function depsWithClock(): { deps: Deps; clock: FixedClock } {
  const clock = new FixedClock('2026-11-04');
  return { deps: { ...createTestDeps(), clock }, clock };
}

function copyButton(): HTMLElement {
  return screen.getByText('Skopiuj do następnego tygodnia').closest('.button') as HTMLElement;
}

function todayRow(container: HTMLElement): string {
  return container.querySelector('.day-today .item-title')?.textContent ?? '';
}

afterEach(() => {
  Reflect.deleteProperty(document, 'visibilityState');
});

describe('WeekPage', () => {
  it('opens on the current Week with today marked', async () => {
    const { deps } = depsWithClock();
    const { container } = renderWithApp(<WeekPage />, deps);

    expect(await screen.findByText('2–8 lis 2026')).toBeInTheDocument();
    expect(todayRow(container)).toBe('Środa');
  });

  it('moves to the next and previous Weeks without limit (US4-1, US4-2)', async () => {
    const { deps } = depsWithClock();
    await deps.dishes.put(owsianka);
    await deps.week.addMeal({ date: '2026-11-10', slot: 1, dishId: owsianka.id });
    const { container } = renderWithApp(<WeekPage />, deps);
    await screen.findByText('2–8 lis 2026');

    await userEvent.click(screen.getByLabelText('Następny tydzień'));
    expect(await screen.findByText('9–15 lis 2026')).toBeInTheDocument();
    expect(await within(container).findByText('350 kcal')).toBeInTheDocument();
    expect(todayRow(container)).toBe('');

    await userEvent.click(screen.getByLabelText('Poprzedni tydzień'));
    await userEvent.click(screen.getByLabelText('Poprzedni tydzień'));
    expect(await screen.findByText('26 paź – 1 lis 2026')).toBeInTheDocument();
    expect(within(container).queryByText('350 kcal')).not.toBeInTheDocument();
  });

  it('moves the today mark when the app comes back after midnight, keeping the Week', async () => {
    const { deps, clock } = depsWithClock();
    const { container } = renderWithApp(<WeekPage />, deps);
    await screen.findByText('2–8 lis 2026');

    clock.set('2026-11-05');
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(todayRow(container)).toBe('Czwartek'));
    expect(screen.getByText('2–8 lis 2026')).toBeInTheDocument();
  });

  it('offers no copy for an empty Week (FR-036)', async () => {
    const { deps } = depsWithClock();
    renderWithApp(<WeekPage />, deps);
    await screen.findByText('2–8 lis 2026');

    expect(copyButton()).toHaveClass('disabled');
  });

  it('copies at once when the next Week is empty, and stays on this Week (US6-1, US6-7)', async () => {
    const { deps } = depsWithClock();
    await deps.dishes.put(owsianka);
    await deps.week.addMeal({ date: '2026-11-02', slot: 1, dishId: owsianka.id });
    renderWithApp(<WeekPage />, deps);
    await screen.findByText('350 kcal');

    await userEvent.click(copyButton());

    expect(await screen.findByText('Skopiowano do następnego tygodnia.')).toBeInTheDocument();
    expect(document.querySelector('.dialog.modal-in')).toBeNull();
    expect(screen.getByText('2–8 lis 2026')).toBeInTheDocument();
    expect(await deps.week.listMeals({ start: '2026-11-09', end: '2026-11-15' })).toHaveLength(1);
  });

  it('asks before replacing a planned next Week, and cancelling changes nothing (US6-3)', async () => {
    const { deps } = depsWithClock();
    await deps.dishes.put(owsianka);
    await deps.week.addMeal({ date: '2026-11-02', slot: 1, dishId: owsianka.id });
    const kept = await deps.week.addMeal({ date: '2026-11-11', slot: 2, dishId: owsianka.id });
    renderWithApp(<WeekPage />, deps);
    await screen.findByText('350 kcal');

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
