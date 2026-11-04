import { waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Router } from 'framework7/types';
import { describe, expect, it } from 'vitest';
import { DayPage } from '../../src/ui/pages/DayPage';
import { owsianka } from '../fakes/dishes';
import { createTestDeps, renderWithApp } from './render';

async function renderDayWithMeal() {
  const deps = createTestDeps();
  await deps.products.createFromName('płatki owsiane', 'g');
  await deps.products.createFromName('mleko', 'ml');
  const [platki, mleko] = await deps.products.list().then((list) =>
    ['płatki owsiane', 'mleko'].map((name) => list.find((p) => p.name === name)!),
  );
  const dish = {
    ...owsianka,
    ingredients: [
      { productId: platki!.id, amount: 100 },
      { productId: mleko!.id, amount: 300 },
    ],
  };
  await deps.dishes.put(dish);
  await deps.week.addMeal({ date: '2026-11-05', slot: 1, dishId: dish.id });
  const result = renderWithApp(
    <DayPage f7route={{ params: { date: '2026-11-05' } } as unknown as Router.Route} />,
    deps,
  );
  return { ...result, deps };
}

function slot1(container: HTMLElement): HTMLElement {
  return container.querySelector<HTMLElement>('[data-slot="1"]')!;
}

async function openSheet(container: HTMLElement): Promise<HTMLElement> {
  await userEvent.click(await within(slot1(container)).findByText('Owsianka'));
  // Framework7 keeps closed sheets of earlier tests in the app root, so pick the open one.
  const sheet = await waitFor(() => {
    const open = document.querySelector<HTMLElement>('.meal-sheet.modal-in');
    if (!open) throw new Error('Meal sheet not open');
    return open;
  });
  await within(sheet).findByText('Składniki (w tym posiłku)');
  return sheet;
}

describe('MealSheet', () => {
  it('scales the Meal with its Servings and keeps it linked (US2-1–US2-3)', async () => {
    const { container, deps } = await renderDayWithMeal();
    const sheet = await openSheet(container);
    const servings = sheet.querySelector<HTMLInputElement>('#meal-servings')!;

    // Products load live, so wait for the unit labels before typing.
    expect(await within(sheet).findByText('50 g')).toBeInTheDocument();
    expect(within(sheet).getByText('350')).toBeInTheDocument();
    await userEvent.clear(servings);
    await userEvent.type(servings, '1,5');

    expect(await within(sheet).findByText('75 g')).toBeInTheDocument();
    expect(within(sheet).getByText('225 ml')).toBeInTheDocument();
    expect(within(sheet).getByText('525')).toBeInTheDocument();
    expect(within(sheet).getByText('18,8')).toBeInTheDocument();
    await userEvent.click(within(sheet).getByText('Zapisz'));

    expect(await within(slot1(container)).findByText('1,5 porcji · 525 kcal')).toBeInTheDocument();
    expect(within(slot1(container)).queryByText('zmieniony')).not.toBeInTheDocument();
    const [stored] = await deps.week.listMeals({ start: '2026-11-05', end: '2026-11-05' });
    expect(stored).toMatchObject({ servings: 1.5, detached: null });
  });

  it('blocks saving 0 Servings and keeps the sheet open (US2-4)', async () => {
    const { container, deps } = await renderDayWithMeal();
    const sheet = await openSheet(container);
    const servings = sheet.querySelector<HTMLInputElement>('#meal-servings')!;

    await userEvent.clear(servings);
    await userEvent.type(servings, '0');
    await userEvent.click(within(sheet).getByText('Zapisz'));

    expect(await within(sheet).findByText('Wartość musi być większa od zera.')).toBeInTheDocument();
    await waitFor(() => expect(sheet).toHaveClass('modal-in'));
    const [stored] = await deps.week.listMeals({ start: '2026-11-05', end: '2026-11-05' });
    expect(stored?.servings).toBe(1);
  });
});
