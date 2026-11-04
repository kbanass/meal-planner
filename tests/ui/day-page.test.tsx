import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Router } from 'framework7/types';
import { describe, expect, it } from 'vitest';
import { DayPage } from '../../src/ui/pages/DayPage';
import { dish, owsianka } from '../fakes/dishes';
import { createTestDeps, renderWithApp } from './render';

async function renderDay(date = '2026-11-05') {
  const deps = createTestDeps();
  await deps.dishes.put(owsianka);
  await deps.dishes.put(dish({ id: 'd-old', name: 'Stare danie', archived: true }));
  const result = renderWithApp(
    <DayPage f7route={{ params: { date } } as unknown as Router.Route} />,
    deps,
  );
  return { ...result, deps };
}

function slotList(container: HTMLElement, number: number): HTMLElement {
  return container.querySelector<HTMLElement>(`[data-slot="${number}"]`)!;
}

describe('DayPage', () => {
  it('adds a Meal to a Slot from the Dish picker (US1-3, US1-4)', async () => {
    const { container, deps } = await renderDay();
    await screen.findByText('Czwartek, 5 lis');

    await userEvent.click(within(slotList(container, 2)).getByText('Dodaj posiłek'));
    // Framework7 keeps closed sheets of earlier tests in the app root, so pick the open one.
    const sheet = await waitFor(() => {
      const open = document.querySelector<HTMLElement>('.dish-picker-sheet.modal-in');
      if (!open) throw new Error('Dish picker not open');
      return open;
    });
    expect(within(sheet).getByText('Wybierz danie')).toBeInTheDocument();
    expect(within(sheet).queryByText('Stare danie')).not.toBeInTheDocument();
    await userEvent.click(within(sheet).getByText('Owsianka'));

    expect(await within(slotList(container, 2)).findByText('Owsianka')).toBeInTheDocument();
    expect(within(slotList(container, 2)).getByText('1 porcja · 350 kcal')).toBeInTheDocument();
    await waitFor(() => expect(sheet).not.toHaveClass('modal-in'));
    expect(await deps.week.listMeals({ start: '2026-11-05', end: '2026-11-05' })).toHaveLength(1);
  });

  it('shows the default 4 Slots', async () => {
    const { container } = await renderDay();
    await screen.findByText('Czwartek, 5 lis');

    expect([...container.querySelectorAll('.block-title')].map((t) => t.textContent)).toEqual([
      '1',
      '2',
      '3',
      '4',
    ]);
  });

  it('adds a Slot to this day with "dodaj kolejny" (US5-1)', async () => {
    const { container, deps } = await renderDay();
    await screen.findByText('Czwartek, 5 lis');

    await userEvent.click(screen.getByText('dodaj kolejny'));

    expect(await within(container).findByText('5', { selector: '.block-title' })).toBeInTheDocument();
    expect(await deps.week.listDaySlots({ start: '2026-11-05', end: '2026-11-05' })).toEqual([
      { date: '2026-11-05', slotCount: 5 },
    ]);
  });

  it('explains an invalid date', async () => {
    await renderDay('2026-02-30');

    expect(await screen.findByText('Nie ma takiego dnia.')).toBeInTheDocument();
  });
});
