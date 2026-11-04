import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import type { Deps } from '../../src/app/deps';
import { AppShell } from '../../src/ui/App';
import { DepsProvider } from '../../src/ui/hooks/useDeps';
import { WeekPage } from '../../src/ui/pages/WeekPage';
import { owsianka } from '../fakes/dishes';
import { FixedClock } from '../fakes/fixed-clock';
import { createTestDeps, renderWithApp } from './render';

function depsWithClock(): { deps: Deps; clock: FixedClock } {
  const clock = new FixedClock('2026-11-04');
  return { deps: { ...createTestDeps(), clock }, clock };
}

function title(): string {
  return document.querySelector('.page-current .navbar .title, .navbar .title')?.textContent ?? '';
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

  it('comes back from a day to the same Week (FR-007)', async () => {
    const { deps } = depsWithClock();
    render(
      <DepsProvider value={deps}>
        <AppShell />
      </DepsProvider>,
    );
    const week = document.getElementById('view-week')!;
    await within(week).findByText('2–8 lis 2026');

    await userEvent.click(within(week).getByLabelText('Następny tydzień'));
    await within(week).findByText('9–15 lis 2026');
    await userEvent.click(within(week).getByText('Czwartek'));
    expect(await within(week).findByText('Czwartek, 12 lis')).toBeInTheDocument();

    await userEvent.click(week.querySelector<HTMLElement>('.page-current .navbar .back')!);
    await waitFor(() => expect(title()).not.toBe('Czwartek, 12 lis'));
    expect(await within(week).findByText('9–15 lis 2026')).toBeInTheDocument();
  });
});
