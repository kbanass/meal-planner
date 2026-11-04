import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { WeekPage } from '../../src/ui/pages/WeekPage';
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
  // Today (FixedClock 2026-11-04) is selected when the Week page opens.
  await deps.week.addMeal({ date: '2026-11-04', slot: 1, dishId: dish.id });
  const result = renderWithApp(<WeekPage />, deps);
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

function input(sheet: HTMLElement, path: string): HTMLInputElement {
  return sheet.querySelector<HTMLInputElement>(`#meal-${path}`)!;
}

/** Taps the OK button of Framework7's standard confirm dialog. */
async function confirmDialog() {
  const ok = await waitFor(() => {
    const button = [...document.querySelectorAll<HTMLElement>('.dialog.modal-in .dialog-button')].at(-1);
    if (!button) throw new Error('No dialog open');
    return button;
  });
  await userEvent.click(ok);
}

describe('MealSheet', () => {
  it('scales the Meal with its Servings and keeps it linked (US2-1–US2-3)', async () => {
    const { container, deps } = await renderDayWithMeal();
    const sheet = await openSheet(container);
    // Products load live, so wait for the Ingredient names before typing.
    expect(await within(sheet).findByText('płatki owsiane')).toBeInTheDocument();
    expect(input(sheet, 'ingredients-0-amount')).toHaveValue('50');
    expect(input(sheet, 'macros-kcal')).toHaveValue('350');

    await userEvent.clear(input(sheet, 'servings'));
    await userEvent.type(input(sheet, 'servings'), '1,5');

    expect(input(sheet, 'ingredients-0-amount')).toHaveValue('75');
    expect(input(sheet, 'ingredients-1-amount')).toHaveValue('225');
    expect(input(sheet, 'macros-kcal')).toHaveValue('525');
    // Inputs keep 2 decimals: a rounded "18,8" would count as a change and detach the Meal.
    expect(input(sheet, 'macros-protein')).toHaveValue('18,75');
    await userEvent.click(within(sheet).getByText('Zapisz'));

    expect(await within(slot1(container)).findByText('1,5 porcji · 525 kcal')).toBeInTheDocument();
    expect(within(slot1(container)).queryByText('zmieniony')).not.toBeInTheDocument();
    const [stored] = await deps.week.listMeals({ start: '2026-11-04', end: '2026-11-04' });
    expect(stored).toMatchObject({ servings: 1.5, detached: null });
  });

  it('blocks saving 0 Servings and keeps the sheet open (US2-4)', async () => {
    const { container, deps } = await renderDayWithMeal();
    const sheet = await openSheet(container);

    await userEvent.clear(input(sheet, 'servings'));
    await userEvent.type(input(sheet, 'servings'), '0');
    await userEvent.click(within(sheet).getByText('Zapisz'));

    expect(await within(sheet).findByText('Wartość musi być większa od zera.')).toBeInTheDocument();
    await waitFor(() => expect(sheet).toHaveClass('modal-in'));
    const [stored] = await deps.week.listMeals({ start: '2026-11-04', end: '2026-11-04' });
    expect(stored?.servings).toBe(1);
  });

  it('detaches an edited Meal, then restores it from its Dish (US3-1, US3-5, US3-6)', async () => {
    const { container, deps } = await renderDayWithMeal();
    let sheet = await openSheet(container);
    expect(within(sheet).queryByText('Przywróć z dania')).not.toBeInTheDocument();
    await within(sheet).findByText('płatki owsiane');

    await userEvent.clear(input(sheet, 'ingredients-0-amount'));
    await userEvent.type(input(sheet, 'ingredients-0-amount'), '80');
    await userEvent.click(within(sheet).getByText('Zapisz'));

    expect(await within(slot1(container)).findByText('zmieniony')).toBeInTheDocument();
    expect(
      await screen.findByText('Posiłek zmieniony – nie będzie już śledził zmian w daniu.'),
    ).toBeInTheDocument();
    const [detached] = await deps.week.listMeals({ start: '2026-11-04', end: '2026-11-04' });
    expect(detached?.detached?.ingredients[0]?.amount).toBe(160);
    await waitFor(() => expect(sheet).not.toHaveClass('modal-in'));

    sheet = await openSheet(container);
    expect(within(sheet).getByText('Posiłek zmieniony – zmiany w daniu go nie dotyczą.')).toBeInTheDocument();
    await userEvent.click(within(sheet).getByText('Przywróć z dania'));
    await confirmDialog();

    await waitFor(() =>
      expect(within(slot1(container)).queryByText('zmieniony')).not.toBeInTheDocument(),
    );
    const [restored] = await deps.week.listMeals({ start: '2026-11-04', end: '2026-11-04' });
    expect(restored?.detached).toBeNull();
  });

  it('creates a new Product from inside the Meal sheet and keeps the sheet open', async () => {
    const { container, deps } = await renderDayWithMeal();
    const sheet = await openSheet(container);
    await within(sheet).findByText('płatki owsiane');

    await userEvent.type(within(sheet).getByPlaceholderText('Dodaj składnik…'), 'jogurt grecki');
    await userEvent.click(await within(sheet).findByText('Dodaj „jogurt grecki”'));
    const productSheet = await waitFor(() => {
      const open = document.querySelector<HTMLElement>('.product-sheet.modal-in');
      if (!open) throw new Error('Nowy produkt sheet not open');
      return open;
    });
    await userEvent.click(within(productSheet).getByRole('button', { name: 'Dodaj' }));

    expect(await within(sheet).findByText('jogurt grecki')).toBeInTheDocument();
    expect(input(sheet, 'ingredients-2-amount')).toHaveValue('');
    expect(sheet).toHaveClass('modal-in');
    expect((await deps.products.list()).map((p) => p.name)).toContain('jogurt grecki');
  });
});
