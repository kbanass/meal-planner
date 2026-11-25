import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Deps } from '../../src/app/deps';
import type { Dish, Product, Unit } from '../../src/domain/types';
import { ShoppingListPage } from '../../src/ui/pages/ShoppingListPage';
import { atHomeTitle, emptyMessage, extraAmountPlaceholder, extraPlaceholder, shareFailedMessage } from '../../src/ui/view-models/shopping';
import { dish } from '../fakes/dishes';
import { RecordingTextSharer } from '../fakes/recording-text-sharer';
import { drag, setTrackWidth } from './pointer';
import { createTestDeps, renderWithApp } from './render';

const WEEK = '2026-11-02';

async function product(deps: Deps, name: string, unit: Unit = 'g'): Promise<Product> {
  const result = await deps.products.createFromName(name, unit);
  if (result.kind !== 'created') throw new Error(`could not create ${name}`);
  return result.product;
}

async function dishOf(deps: Deps, id: string, ingredients: [Product, number][], servingsYield = 1): Promise<Dish> {
  const value = dish({
    id,
    name: id,
    servingsYield,
    ingredients: ingredients.map(([p, amount]) => ({ productId: p.id, amount })),
  });
  await deps.dishes.put(value);
  return value;
}

async function plan(deps: Deps, dishId: string, date = '2026-11-04', servings = 1): Promise<void> {
  const added = await deps.week.addMeal({ date, slot: 1, dishId });
  if (servings !== 1) await deps.week.putMeal({ ...added, servings });
}

/** The US1-1/2/3 Week: Owsianka at 1 and 3 Servings, Kakao, and 2,5 eggs → 3 szt. */
async function seedUs1(deps: Deps) {
  const platki = await product(deps, 'płatki owsiane');
  const mleko = await product(deps, 'mleko', 'ml');
  const jajka = await product(deps, 'jajka', 'pcs');
  await dishOf(deps, 'owsianka', [[platki, 100], [mleko, 300]], 2);
  await dishOf(deps, 'kakao', [[mleko, 500]]);
  await dishOf(deps, 'jajecznica', [[jajka, 2.5]]);
  await plan(deps, 'owsianka');
  await plan(deps, 'owsianka', '2026-11-05', 3);
  await plan(deps, 'kakao');
  await plan(deps, 'jajecznica');
  return { platki, mleko, jajka };
}

/** "ryż" 400 g and "cebula" 100 g in this Week. */
async function seedRice(deps: Deps) {
  const ryz = await product(deps, 'ryż');
  const cebula = await product(deps, 'cebula');
  await dishOf(deps, 'risotto', [[ryz, 400], [cebula, 100]]);
  await plan(deps, 'risotto');
  return { ryz, cebula };
}

function toBuyList(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.shopping-list:not(.is-at-home-list)');
}

function atHomeList(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.shopping-list.is-at-home-list');
}

async function tick(name: string): Promise<void> {
  await userEvent.click((await findRow(name)).querySelector('.icon-checkbox')!);
}

/** The edit sheet's toggle for "Kupione" or "Mam w domu". */
function sheetToggle(sheet: HTMLElement, title: string): HTMLInputElement {
  return within(sheet).getByText(title).closest('li')!.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
}

/** Text without icons: icon fonts render the icon name as ligature text. */
function textOf(el: Element | null): string | undefined {
  if (!el) return undefined;
  const copy = el.cloneNode(true) as Element;
  copy.querySelectorAll('.icon').forEach((icon) => icon.remove());
  return copy.textContent ?? '';
}

/** "jajka 3 szt." for each row of a part, in order. */
function rowTexts(list: HTMLElement | null): string[] {
  return [...(list?.querySelectorAll('.shopping-row') ?? [])].map((row) =>
    [row.querySelector('.shopping-name')?.textContent, textOf(row.querySelector('.shopping-amount-text'))]
      .filter(Boolean)
      .join(' '),
  );
}

function row(name: string): HTMLElement {
  const found = [...document.querySelectorAll<HTMLElement>('.shopping-row')].find(
    (r) => r.querySelector('.shopping-name')?.textContent === name,
  );
  if (!found) throw new Error(`No row ${name}`);
  return found;
}

function findRow(name: string): Promise<HTMLElement> {
  return waitFor(() => row(name));
}

/** The viewed face's dates; the carousel also renders the two Weeks on each side. */
function weekLabel(): string {
  return document.querySelector('.week-face-viewed .list-week-label')?.textContent ?? '';
}

async function openSheet(label: string): Promise<HTMLElement> {
  await userEvent.click(await screen.findByRole('button', { name: label }));
  const sheet = await waitFor(() => {
    const open = document.querySelector<HTMLElement>('.amount-sheet.modal-in');
    if (!open) throw new Error('Amount sheet not open');
    return open;
  });
  return sheet;
}

function amountInput(sheet: HTMLElement): HTMLInputElement {
  return sheet.querySelector<HTMLInputElement>('#amount-to-buy')!;
}

describe('ShoppingListPage', () => {
  it('lists the Week in alphabetical order with shop amounts (S1)', async () => {
    const deps = createTestDeps();
    await seedUs1(deps);
    renderWithApp(<ShoppingListPage />, deps);

    await waitFor(() => expect(rowTexts(toBuyList())).toEqual(['jajka 3 szt.', 'mleko 1,1 l', 'płatki owsiane 200 g']));
    expect(weekLabel()).toBe('2–8 lis 2026');
  });

  it('follows the plan and Product names live (FR-006, SC-008)', async () => {
    const deps = createTestDeps();
    const { mleko } = await seedUs1(deps);
    renderWithApp(<ShoppingListPage />, deps);
    await findRow('mleko');

    await plan(deps, 'kakao', '2026-11-06');
    await waitFor(() => expect(rowTexts(toBuyList())).toContain('mleko 1,6 l'));

    await deps.products.rename(mleko.id, 'mleko 2%');
    await waitFor(() => expect(rowTexts(toBuyList())).toContain('mleko 2% 1,6 l'));
  });

  it('moves between Weeks with the buttons and a header swipe (S8)', async () => {
    const deps = createTestDeps();
    await seedRice(deps);
    const next = await dishOf(deps, 'makaron', [[await product(deps, 'makaron'), 250]]);
    await plan(deps, next.id, '2026-11-10');
    renderWithApp(<ShoppingListPage />, deps);
    await findRow('ryż');

    await userEvent.click(screen.getByRole('button', { name: 'Następny tydzień' }));
    await waitFor(() => expect(weekLabel()).toBe('9–15 lis 2026'));
    await waitFor(() => expect(rowTexts(toBuyList())).toEqual(['makaron 250 g']));

    // The Week card's carousel: jsdom can't lay out, so give the track its width.
    const track = document.querySelector('.list-week-card .week-track')!;
    setTrackWidth(track, 360);
    // A start in the edge zone belongs to the system back swipe.
    drag(track, { from: [10, 40], to: [200, 40], steps: 10, durationMs: 600 });
    expect(weekLabel()).toBe('9–15 lis 2026');

    drag(track, { from: [100, 40], to: [300, 40], steps: 10, durationMs: 600 });
    await waitFor(() => expect(weekLabel()).toBe('2–8 lis 2026'));
    await waitFor(() => expect(rowTexts(toBuyList())).toEqual(['cebula 100 g', 'ryż 400 g']));
  });

  it('shows the empty state with the Extra field and a dimmed share button (S11)', async () => {
    renderWithApp(<ShoppingListPage />);

    expect(await screen.findByText(emptyMessage)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(extraPlaceholder)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Udostępnij listę' })).toBeDisabled();
    expect(toBuyList()).toBeNull();
  });

  describe('ticks (US2)', () => {
    it('ticks and unticks by the box, and the row stays in place (S2)', async () => {
      const deps = createTestDeps();
      await seedRice(deps);
      renderWithApp(<ShoppingListPage />, deps);

      await tick('cebula');

      await waitFor(() => expect(row('cebula')).toHaveClass('is-ticked'));
      expect(rowTexts(toBuyList())).toEqual(['cebula 100 g', 'ryż 400 g']);
      expect(row('cebula')).not.toHaveClass('is-at-home');
      expect(row('cebula').querySelector('input')).toBeChecked();
      expect(atHomeList()).toBeNull();

      await tick('cebula');
      await waitFor(() => expect(row('cebula')).not.toHaveClass('is-ticked'));
    });

    it('opens the edit sheet, not the tick, when the name is tapped', async () => {
      const deps = createTestDeps();
      await seedRice(deps);
      renderWithApp(<ShoppingListPage />, deps);

      await userEvent.click(within(await findRow('ryż')).getByText('ryż'));

      await waitFor(() => expect(document.querySelector('.amount-sheet.modal-in')).not.toBeNull());
      expect(row('ryż')).not.toHaveClass('is-ticked');
    });

    it('keeps the tick when the plan changes, only in its Week (US2-5, US2-6)', async () => {
      const deps = createTestDeps();
      await seedRice(deps);
      await plan(deps, 'risotto', '2026-11-11');
      renderWithApp(<ShoppingListPage />, deps);

      await tick('ryż');
      await waitFor(() => expect(row('ryż')).toHaveClass('is-ticked'));
      await plan(deps, 'risotto', '2026-11-06');
      await waitFor(() => expect(rowTexts(toBuyList())).toContain('ryż 800 g'));
      expect(row('ryż')).toHaveClass('is-ticked');

      await userEvent.click(screen.getByRole('button', { name: 'Następny tydzień' }));
      await waitFor(() => expect(weekLabel()).toBe('9–15 lis 2026'));
      await waitFor(() => expect(rowTexts(toBuyList())).toContain('ryż 400 g'));
      expect(row('ryż')).not.toHaveClass('is-ticked');
    });

    it('ticks an Extra by its box, in place', async () => {
      const deps = createTestDeps();
      await deps.shopping.addExtra(WEEK, 'kawa');
      renderWithApp(<ShoppingListPage />, deps);

      await tick('kawa');

      await waitFor(() => expect(row('kawa')).toHaveClass('is-ticked'));
      expect(rowTexts(toBuyList())).toEqual(['kawa']);
    });
  });

  describe('At Home (US3)', () => {
    it('marks and unmarks with the house button (S3)', async () => {
      const deps = createTestDeps();
      await seedRice(deps);
      renderWithApp(<ShoppingListPage />, deps);

      const house = await screen.findByRole('button', { name: 'Mam w domu: ryż' });
      expect(house).toHaveAttribute('aria-pressed', 'false');
      await userEvent.click(house);

      await waitFor(() => expect(rowTexts(atHomeList())).toEqual(['ryż 400 g']));
      expect(rowTexts(toBuyList())).toEqual(['cebula 100 g']);
      expect(screen.getByText(atHomeTitle)).toBeInTheDocument();
      expect(row('ryż')).toHaveClass('is-at-home');
      expect(screen.getByRole('button', { name: 'Mam w domu: ryż' })).toHaveAttribute('aria-pressed', 'true');

      await userEvent.click(screen.getByRole('button', { name: 'Mam w domu: ryż' }));
      await waitFor(() => expect(rowTexts(toBuyList())).toEqual(['cebula 100 g', 'ryż 400 g']));
      expect(atHomeList()).toBeNull();
      expect(screen.queryByText(atHomeTitle)).toBeNull();
      expect(screen.getByRole('button', { name: 'Mam w domu: ryż' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('can be ticked as well, and follows the plan (US3-3, US3-6)', async () => {
      const deps = createTestDeps();
      await seedRice(deps);
      renderWithApp(<ShoppingListPage />, deps);

      await userEvent.click(await screen.findByRole('button', { name: 'Mam w domu: ryż' }));
      await waitFor(() => expect(row('ryż')).toHaveClass('is-at-home'));
      await plan(deps, 'risotto', '2026-11-06');
      await waitFor(() => expect(rowTexts(atHomeList())).toEqual(['ryż 800 g']));
      expect(row('ryż')).toHaveClass('is-at-home');

      await tick('ryż');
      await waitFor(() => expect(row('ryż')).toHaveClass('is-ticked'));
      expect(row('ryż')).toHaveClass('is-at-home');
    });

    it('has no house button on an Extra (US3-5)', async () => {
      const deps = createTestDeps();
      await deps.shopping.addExtra(WEEK, 'kawa');
      renderWithApp(<ShoppingListPage />, deps);

      expect(within(await findRow('kawa')).queryByRole('button', { name: /Mam w domu/ })).toBeNull();
    });
  });

  describe('typed amounts (US4)', () => {
    it('saves a larger amount and shows the plan below (S4)', async () => {
      const deps = createTestDeps();
      await seedRice(deps);
      renderWithApp(<ShoppingListPage />, deps);

      const sheet = await openSheet('ryż: 400 g, edytuj');
      expect(within(sheet).getByText('W planie: 400 g')).toBeInTheDocument();
      expect(amountInput(sheet)).toHaveValue('400');

      await userEvent.clear(amountInput(sheet));
      await userEvent.type(amountInput(sheet), '500');
      await userEvent.click(within(sheet).getByText('Zapisz'));

      await waitFor(() => expect(textOf(row('ryż').querySelector('.shopping-amount-text'))).toBe('500 g'));
      expect(row('ryż').querySelector('.shopping-amount')).toHaveClass('is-more');
      expect(within(row('ryż')).getByText('plan: 400 g')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ryż: 500 g, więcej niż w planie (400 g), edytuj' })).toBeInTheDocument();
    });

    it('keeps the sheet open on text that is not a number (S5)', async () => {
      const deps = createTestDeps();
      await seedRice(deps);
      renderWithApp(<ShoppingListPage />, deps);

      const sheet = await openSheet('ryż: 400 g, edytuj');
      await userEvent.clear(amountInput(sheet));
      await userEvent.type(amountInput(sheet), 'abc');
      await userEvent.click(within(sheet).getByText('Zapisz'));

      expect(await within(sheet).findByText('Wpisz liczbę większą od zera.')).toBeInTheDocument();
      expect(sheet).toHaveClass('modal-in');
      expect(await deps.shopping.listProductStates(WEEK)).toEqual([]);
    });

    it('drops the typed amount when the plan changes (S6), and keeps it when ticked (US4-9)', async () => {
      const deps = createTestDeps();
      const { ryz } = await seedRice(deps);
      await deps.shopping.updateProductState(WEEK, ryz.id, { adjustment: { amount: 500, plannedAmount: 400 } });
      renderWithApp(<ShoppingListPage />, deps);

      await waitFor(() => expect(rowTexts(toBuyList())).toContain('ryż 500 g'));
      await tick('ryż');
      await waitFor(() => expect(row('ryż')).toHaveClass('is-ticked'));

      await plan(deps, 'risotto', '2026-11-06');
      await waitFor(() => expect(rowTexts(toBuyList())).toContain('ryż 800 g'));
      expect(row('ryż').querySelector('.shopping-amount')).not.toHaveClass('is-more');
      expect(within(row('ryż')).queryByText(/^plan:/)).toBeNull();
    });
  });

  describe('edit sheet', () => {
    it('marks At Home and ticks from the sheet on "Zapisz"', async () => {
      const deps = createTestDeps();
      await seedRice(deps);
      renderWithApp(<ShoppingListPage />, deps);

      const sheet = await openSheet('ryż: 400 g, edytuj');
      expect(sheetToggle(sheet, 'Kupione')).not.toBeChecked();
      expect(sheetToggle(sheet, 'Mam w domu')).not.toBeChecked();
      await userEvent.click(sheetToggle(sheet, 'Kupione'));
      await userEvent.click(sheetToggle(sheet, 'Mam w domu'));
      expect(sheetToggle(sheet, 'Kupione')).toBeChecked();
      expect(sheetToggle(sheet, 'Mam w domu')).toBeChecked();
      // Nothing is written before "Zapisz".
      expect(await deps.shopping.listProductStates(WEEK)).toEqual([]);
      await userEvent.click(within(sheet).getByText('Zapisz'));

      await waitFor(() => expect(rowTexts(atHomeList())).toEqual(['ryż 400 g']));
      expect(row('ryż')).toHaveClass('is-ticked');
    });

    it('starts from the row as shown and writes nothing on "Anuluj"', async () => {
      const deps = createTestDeps();
      const { ryz } = await seedRice(deps);
      await deps.shopping.updateProductState(WEEK, ryz.id, { atHome: true });
      renderWithApp(<ShoppingListPage />, deps);

      const sheet = await openSheet('ryż: 400 g, edytuj');
      expect(sheetToggle(sheet, 'Mam w domu')).toBeChecked();
      await userEvent.click(sheetToggle(sheet, 'Mam w domu'));
      await userEvent.click(within(sheet).getByText('Anuluj'));

      await waitFor(() => expect(sheet).not.toHaveClass('modal-in'));
      expect(rowTexts(atHomeList())).toEqual(['ryż 400 g']);
    });
  });

  describe('Extra edit sheet', () => {
    function extraSheet(): Promise<HTMLElement> {
      return waitFor(() => {
        const open = document.querySelector<HTMLElement>('.extra-sheet.modal-in');
        if (!open) throw new Error('Extra sheet not open');
        return open;
      });
    }

    it('opens from the name and saves name, amount and tick on "Zapisz"', async () => {
      const deps = createTestDeps();
      await deps.shopping.addExtra(WEEK, 'kawa', '1');
      renderWithApp(<ShoppingListPage />, deps);

      await userEvent.click(await screen.findByRole('button', { name: 'kawa: 1, edytuj' }));
      const sheet = await extraSheet();
      const name = sheet.querySelector<HTMLInputElement>('#extra-name')!;
      const amount = sheet.querySelector<HTMLInputElement>('#extra-amount')!;
      expect(name).toHaveValue('kawa');
      expect(amount).toHaveValue('1');
      expect(row('kawa')).not.toHaveClass('is-ticked');

      await userEvent.clear(name);
      await userEvent.type(name, 'kawa ziarnista');
      await userEvent.clear(amount);
      await userEvent.type(amount, '2 opak.');
      await userEvent.click(sheetToggle(sheet, 'Kupione'));
      expect(await deps.shopping.listExtras(WEEK)).toMatchObject([{ text: 'kawa', amount: '1', ticked: false }]);
      await userEvent.click(within(sheet).getByText('Zapisz'));

      await waitFor(() => expect(rowTexts(toBuyList())).toEqual(['kawa ziarnista 2 opak.']));
      expect(row('kawa ziarnista')).toHaveClass('is-ticked');
      await waitFor(() => expect(sheet).not.toHaveClass('modal-in'));
    });

    it('keeps the sheet open on a blank name', async () => {
      const deps = createTestDeps();
      await deps.shopping.addExtra(WEEK, 'kawa');
      renderWithApp(<ShoppingListPage />, deps);

      await userEvent.click(await screen.findByRole('button', { name: 'kawa, edytuj' }));
      const sheet = await extraSheet();
      await userEvent.clear(sheet.querySelector<HTMLInputElement>('#extra-name')!);
      await userEvent.click(within(sheet).getByText('Zapisz'));

      expect(await within(sheet).findByText('Wpisz nazwę.')).toBeInTheDocument();
      expect(sheet).toHaveClass('modal-in');
      expect(await deps.shopping.listExtras(WEEK)).toMatchObject([{ text: 'kawa' }]);
    });

    it('deletes with "Usuń" in the sheet', async () => {
      const deps = createTestDeps();
      await deps.shopping.addExtra(WEEK, 'kawa');
      renderWithApp(<ShoppingListPage />, deps);

      await userEvent.click(await screen.findByRole('button', { name: 'kawa, edytuj' }));
      const sheet = await extraSheet();
      await userEvent.click(within(sheet).getByText('Usuń'));

      await waitFor(() => expect(toBuyList()).toBeNull());
      expect(await deps.shopping.listExtras(WEEK)).toEqual([]);
    });
  });

  describe('Extras (US5)', () => {
    it('adds by Enter in alphabetical place and deletes with "Usuń" (S7)', async () => {
      const deps = createTestDeps();
      await seedRice(deps);
      renderWithApp(<ShoppingListPage />, deps);
      await findRow('ryż');

      const input = screen.getByPlaceholderText(extraPlaceholder);
      const amount = screen.getByPlaceholderText(extraAmountPlaceholder);
      // Enter on the name moves to the amount; Enter there adds.
      await userEvent.type(input, 'kawa{Enter}');
      expect(amount).toHaveFocus();
      await userEvent.type(amount, '{Enter}');

      await waitFor(() => expect(rowTexts(toBuyList())).toEqual(['cebula 100 g', 'kawa', 'ryż 400 g']));
      expect(input).toHaveValue('');
      expect(input).toHaveFocus();

      await userEvent.click(within(row('kawa')).getByText('Usuń'));
      await waitFor(() => expect(rowTexts(toBuyList())).toEqual(['cebula 100 g', 'ryż 400 g']));
      expect(document.querySelector('.dialog.modal-in')).toBeNull();
    });

    it('adds an Extra with an amount, shown on the row and shared', async () => {
      const sharer = new RecordingTextSharer();
      const deps = createTestDeps({ sharer });
      renderWithApp(<ShoppingListPage />, deps);

      await userEvent.type(await screen.findByPlaceholderText(extraPlaceholder), 'kawa');
      await userEvent.type(screen.getByPlaceholderText(extraAmountPlaceholder), '2 opak.');
      await userEvent.click(screen.getByRole('button', { name: 'Dodaj' }));

      await waitFor(() => expect(rowTexts(toBuyList())).toEqual(['kawa 2 opak.']));
      expect(screen.getByPlaceholderText(extraAmountPlaceholder)).toHaveValue('');
      expect(await deps.shopping.listExtras(WEEK)).toMatchObject([{ text: 'kawa', amount: '2 opak.' }]);

      await userEvent.click(screen.getByText('Udostępnij listę'));
      expect(sharer.texts).toEqual(['Lista zakupów 2–8 lis 2026\nkawa 2 opak.']);
    });

    it('keeps "Dodaj" off until a name is typed', async () => {
      renderWithApp(<ShoppingListPage />);
      expect(await screen.findByRole('button', { name: 'Dodaj' })).toBeDisabled();
      await userEvent.type(screen.getByPlaceholderText(extraPlaceholder), 'kawa');
      expect(screen.getByRole('button', { name: 'Dodaj' })).toBeEnabled();
    });

    it('adds nothing for blank text (US5-2)', async () => {
      const deps = createTestDeps();
      renderWithApp(<ShoppingListPage />, deps);

      const input = await screen.findByPlaceholderText(extraPlaceholder);
      await userEvent.type(input, '   {Enter}');
      await userEvent.click(screen.getByRole('button', { name: 'Dodaj' }));

      expect(await deps.shopping.listExtras(WEEK)).toEqual([]);
      expect(screen.getByText(emptyMessage)).toBeInTheDocument();
    });
  });

  describe('sharing (US6)', () => {
    async function renderShare(sharer: RecordingTextSharer) {
      const deps = createTestDeps({ sharer });
      const { ryz } = await seedRice(deps);
      await deps.shopping.addExtra(WEEK, 'kawa');
      renderWithApp(<ShoppingListPage />, deps);
      await findRow('ryż');
      return { deps, ryz };
    }

    it('copies the list and shows the toast (S9)', async () => {
      const sharer = new RecordingTextSharer('copied');
      await renderShare(sharer);

      await userEvent.click(screen.getByText('Udostępnij listę'));

      expect(sharer.texts).toEqual(['Lista zakupów 2–8 lis 2026\ncebula 100 g\nkawa\nryż 400 g']);
      expect(await screen.findByText('Skopiowano listę do schowka.')).toBeInTheDocument();
    });

    it('leaves out what is ticked', async () => {
      const sharer = new RecordingTextSharer();
      await renderShare(sharer);

      await tick('cebula');
      await waitFor(() => expect(row('cebula')).toHaveClass('is-ticked'));
      await userEvent.click(screen.getByText('Udostępnij listę'));

      expect(sharer.texts).toEqual(['Lista zakupów 2–8 lis 2026\nkawa\nryż 400 g']);
    });

    it('lists what is At Home last, marked "(mam w domu)" (S3, share part)', async () => {
      const sharer = new RecordingTextSharer();
      await renderShare(sharer);

      await userEvent.click(screen.getByRole('button', { name: 'Mam w domu: ryż' }));
      await waitFor(() => expect(row('ryż')).toHaveClass('is-at-home'));
      await userEvent.click(screen.getByText('Udostępnij listę'));

      expect(sharer.texts).toEqual(['Lista zakupów 2–8 lis 2026\ncebula 100 g\nkawa\nryż 400 g (mam w domu)']);
    });

    it('does nothing when cancelled (S10)', async () => {
      const sharer = new RecordingTextSharer('cancelled');
      await renderShare(sharer);

      await userEvent.click(screen.getByText('Udostępnij listę'));

      expect(sharer.texts).toHaveLength(1);
      expect(document.querySelector('.toast')).toBeNull();
      expect(document.querySelector('.dialog.modal-in')).toBeNull();
    });

    it('shows an alert when sharing fails (S10)', async () => {
      await renderShare(new RecordingTextSharer('fail'));

      await userEvent.click(screen.getByText('Udostępnij listę'));

      const dialog = await waitFor(() => {
        const open = document.querySelector<HTMLElement>('.dialog.modal-in');
        if (!open) throw new Error('No dialog');
        return open;
      });
      expect(dialog).toHaveTextContent(shareFailedMessage);
    });
  });
});
