import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Deps } from '../../src/app/deps';
import { WeekPage } from '../../src/ui/pages/WeekPage';
import { railTransform } from '../../src/ui/view-models/week-track';
import { dish, owsianka } from '../fakes/dishes';
import { FixedClock } from '../fakes/fixed-clock';
import { drag, pointer, setTrackWidth, tap } from './pointer';
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

/** The Week face being viewed: the neighbours are inert, and repeat month labels and today. */
function viewedFace(): HTMLElement {
  const face = document.querySelector<HTMLElement>('.week-face:not([inert])');
  if (!face) throw new Error('No viewed Week face');
  return face;
}

/** Waits until the viewed face shows this month label, e.g. "Listopad 2026". */
function findMonth(label: string): Promise<HTMLElement> {
  return waitFor(() => within(viewedFace()).getByText(label));
}

function track(): HTMLElement {
  return document.querySelector<HTMLElement>('.week-track')!;
}

function rail(): HTMLElement {
  return document.querySelector<HTMLElement>('.week-track-rail')!;
}

/** Renders the Week page and gives the track the 360 px width jsdom can't lay out. */
async function renderTrack(deps: Deps): Promise<HTMLElement> {
  renderWithApp(<WeekPage />, deps);
  await findMonth('Listopad 2026');
  setTrackWidth(track(), 360);
  return track();
}

/** A slow drag (under the flick speed): only the distance decides. */
function slowDrag(el: Element, dx: number, startT = 0, fromX = 200): void {
  drag(el, { from: [fromX, 40], to: [fromX + dx, 40], steps: 10, durationMs: 600, startT });
}

/** A quick 30 px flick in 50 ms. */
function flick(el: Element, dx: number, startT = 0, fromX = 200): void {
  drag(el, { from: [fromX, 40], to: [fromX + dx, 40], steps: 2, durationMs: 50, startT });
}

/** Motion on, with fake animation frames, for the settle-catching tests (T15–T17). */
function withMotion(): void {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (media: string) =>
      ({
        matches: false,
        media,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
}

function advanceFrames(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function runAllFrames(): void {
  act(() => {
    vi.runAllTimers();
  });
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
  Reflect.deleteProperty(window, 'innerWidth');
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('WeekPage', () => {
  it('opens on the current Week with today selected (US1-1, FR-002)', async () => {
    const { deps } = depsWithClock();
    renderWithApp(<WeekPage />, deps);

    expect(await findMonth('Listopad 2026')).toBeInTheDocument();
    expect(pill('Środa, 4 lis')).toHaveAttribute('aria-pressed', 'true');
    expect(pill('Poniedziałek, 2 lis')).toHaveAttribute('aria-pressed', 'false');
    expect(heading()).toBe('Środa, 4 lis');
    expect(screen.getByText('brak posiłków')).toBeInTheDocument();
  });

  it("shows a tapped day's Slots on the same screen (US1-2, FR-007)", async () => {
    const { deps } = depsWithClock();
    const { container } = renderWithApp(<WeekPage />, deps);
    await findMonth('Listopad 2026');

    await userEvent.click(pill('Czwartek, 5 lis'));

    expect(pill('Czwartek, 5 lis')).toHaveAttribute('aria-pressed', 'true');
    expect(pill('Środa, 4 lis')).toHaveClass('day-pill-today');
    expect(heading()).toBe('Czwartek, 5 lis');
    expect([...container.querySelectorAll('.slot-number')].map((l) => l.textContent)).toEqual([
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
    await findMonth('Listopad 2026');
    await userEvent.click(pill('Czwartek, 5 lis'));

    await userEvent.click(screen.getByLabelText('Następny tydzień'));
    await waitFor(() => expect(heading()).toBe('Czwartek, 12 lis'));
    expect(await within(slot(container, 1)).findByText('Owsianka')).toBeInTheDocument();
    expect(within(pill('Czwartek, 12 lis')).getByText('350')).toBeInTheDocument();
    expect(screen.getByText('1 posiłek')).toBeInTheDocument();
    expect(viewedFace().querySelector('.day-pill-today')).toBeNull();

    await userEvent.click(screen.getByLabelText('Poprzedni tydzień'));
    await userEvent.click(screen.getByLabelText('Poprzedni tydzień'));
    expect(await findMonth('Październik – listopad 2026')).toBeInTheDocument();
    expect(heading()).toBe('Czwartek, 29 paź');
  });

  it('has no page title (FR-005)', async () => {
    const { deps } = depsWithClock();
    const { container } = renderWithApp(<WeekPage />, deps);
    await findMonth('Listopad 2026');

    expect(container.querySelector('.navbar')).toBeNull();
    expect(screen.queryByText('Tydzień')).not.toBeInTheDocument();
  });

  it('moves the today mark when the app comes back after midnight, keeping the selection', async () => {
    const { deps, clock } = depsWithClock();
    renderWithApp(<WeekPage />, deps);
    await findMonth('Listopad 2026');

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
    await findMonth('Listopad 2026');

    const sheet = await openPicker(container, 2);
    expect(within(sheet).getByText('Wybierz danie')).toBeInTheDocument();
    // One Serving of "Owsianka" (yields 2): 350 kcal, 12,5 g protein (FR-045).
    expect(within(sheet).getByLabelText('Kalorie: 350 kcal')).toBeInTheDocument();
    expect(within(sheet).getByLabelText('Białko: 12,5 g')).toBeInTheDocument();
    expect(within(sheet).queryByText('Stare danie')).not.toBeInTheDocument();
    await userEvent.click(within(sheet).getByText('Owsianka'));

    expect(await within(slot(container, 2)).findByText('Owsianka')).toBeInTheDocument();
    expect(within(slot(container, 2)).getByText('1 porcja · 350 kcal')).toBeInTheDocument();
    expect(within(slot(container, 2)).getByText('Dodaj posiłek')).toBeInTheDocument();
    expect(screen.getByText('1 posiłek')).toBeInTheDocument();
    // The Slot card and the day totals both show the Meal's kcal and macros (FR-004, FR-044).
    expect(within(slot(container, 2)).getByLabelText('Kalorie: 350 kcal')).toBeInTheDocument();
    expect(within(slot(container, 2)).getByLabelText('Białko: 12,5 g')).toBeInTheDocument();
    const dayTotals = container.querySelector<HTMLElement>('.week-card-totals')!;
    expect(within(dayTotals).getByLabelText('Kalorie: 350 kcal')).toBeInTheDocument();
    expect(within(dayTotals).getByLabelText('Węglowodany: 55 g')).toBeInTheDocument();
    expect(within(pill('Środa, 4 lis')).getByText('350')).toBeInTheDocument();
    await waitFor(() => expect(sheet).not.toHaveClass('modal-in'));
    expect(await deps.week.listMeals({ start: '2026-11-04', end: '2026-11-04' })).toHaveLength(1);
  });

  it('adds a Slot to the selected day with "dodaj kolejny" (US5-1)', async () => {
    const { deps } = depsWithClock();
    const { container } = renderWithApp(<WeekPage />, deps);
    await findMonth('Listopad 2026');

    await userEvent.click(screen.getByText('dodaj kolejny'));

    await waitFor(() => expect(slot(container, 5)).not.toBeNull());
    expect(await deps.week.listDaySlots({ start: '2026-11-04', end: '2026-11-04' })).toEqual([
      { date: '2026-11-04', slotCount: 5 },
    ]);
  });

  it('offers no copy for an empty Week (FR-036)', async () => {
    const { deps } = depsWithClock();
    renderWithApp(<WeekPage />, deps);
    await findMonth('Listopad 2026');

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

describe('WeekPage track: drag to another Week (feature 003, US1)', () => {
  it('T1: a slow drag past a third changes the Week on release, keeping the weekday', async () => {
    const { deps } = depsWithClock();
    const el = await renderTrack(deps);

    pointer(el, 'pointerdown', { x: 200, y: 40, t: 0 });
    for (let i = 1; i <= 10; i++) pointer(el, 'pointermove', { x: 200 - 14 * i, y: 40, t: 60 * i });
    expect(heading()).toBe('Środa, 4 lis');
    pointer(el, 'pointerup', { x: 60, y: 40, t: 600 });

    expect(heading()).toBe('Środa, 11 lis');
    expect(within(viewedFace()).getByText('Listopad 2026')).toBeInTheDocument();
    expect(pill('Środa, 11 lis')).toHaveAttribute('aria-pressed', 'true');
    expect(rail().style.transform).toBe(railTransform(0));
  });

  it('T2: two slow drags right go back two Weeks', async () => {
    const { deps } = depsWithClock();
    const el = await renderTrack(deps);

    slowDrag(el, 140, 0, 100);
    expect(heading()).toBe('Środa, 28 paź');
    slowDrag(el, 140, 1000, 100);

    expect(heading()).toBe('Środa, 21 paź');
    expect(within(viewedFace()).getByText('Październik 2026')).toBeInTheDocument();
  });

  it('T3: a short slow drag springs back', async () => {
    const { deps } = depsWithClock();
    const el = await renderTrack(deps);

    slowDrag(el, -60);

    expect(heading()).toBe('Środa, 4 lis');
    expect(rail().style.transform).toBe(railTransform(0));
  });

  it('T4: a quick 30 px flick moves to the next Week', async () => {
    const { deps } = depsWithClock();
    const el = await renderTrack(deps);

    flick(el, -30);

    expect(heading()).toBe('Środa, 11 lis');
  });

  it("T12: the next face shows its own kcal before any move", async () => {
    const { deps } = depsWithClock();
    await deps.dishes.put(owsianka);
    await deps.week.addMeal({ date: '2026-11-11', slot: 1, dishId: owsianka.id });
    renderWithApp(<WeekPage />, deps);
    await findMonth('Listopad 2026');

    const next = await waitFor(() => {
      const face = document.querySelectorAll<HTMLElement>('.week-face')[3]!;
      expect(within(face).getByText('350')).toBeInTheDocument();
      return face;
    });
    expect(next).toHaveAttribute('inert');
    expect(within(viewedFace()).queryByText('350')).not.toBeInTheDocument();
  });

  it('T15: a touch during a settle catches it, so two flicks move two Weeks', async () => {
    const { deps } = depsWithClock();
    const el = await renderTrack(deps);
    withMotion();

    flick(el, -30);
    expect(heading()).toBe('Środa, 4 lis');
    advanceFrames(60);
    pointer(el, 'pointerdown', { x: 200, y: 40, t: 1000 });
    expect(heading()).toBe('Środa, 11 lis');
    pointer(el, 'pointermove', { x: 185, y: 40, t: 1025 });
    pointer(el, 'pointermove', { x: 170, y: 40, t: 1050 });
    pointer(el, 'pointerup', { x: 170, y: 40, t: 1050 });
    runAllFrames();

    expect(heading()).toBe('Środa, 18 lis');
    expect(rail().style.transform).toBe(railTransform(0));
  });

  it('T16: a tap during a settle catches it and ends centred on one Week', async () => {
    const { deps } = depsWithClock();
    const el = await renderTrack(deps);
    withMotion();

    flick(el, -30);
    advanceFrames(60);
    tap(el, { t: 1000 });
    runAllFrames();

    expect(heading()).toBe('Środa, 11 lis');
    expect(rail().style.transform).toBe(railTransform(0));
  });
});

describe('WeekPage track: no fight with scrolling, taps or the system (feature 003, US2)', () => {
  /** A phone-wide viewport, so the edge zone sits where it would on an iPhone. */
  function phoneViewport(): void {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  }

  it('T5: a mostly vertical move scrolls, and a later tap still selects', async () => {
    const { deps } = depsWithClock();
    const el = await renderTrack(deps);

    drag(el, { from: [200, 40], to: [240, 160], steps: 10, durationMs: 300 });
    expect(heading()).toBe('Środa, 4 lis');
    expect(rail().style.transform).toBe(railTransform(0));

    tap(pill('Czwartek, 5 lis'), { t: 1000 });
    expect(heading()).toBe('Czwartek, 5 lis');
  });

  it('T6: a drag that starts in the screen edge zone is left to the system', async () => {
    const { deps } = depsWithClock();
    const el = await renderTrack(deps);
    phoneViewport();

    drag(el, { from: [10, 40], to: [-130, 40], steps: 10, durationMs: 600 });
    drag(el, { from: [10, 40], to: [150, 40], steps: 10, durationMs: 600, startT: 1000 });
    drag(el, { from: [385, 40], to: [245, 40], steps: 10, durationMs: 600, startT: 2000 });

    expect(heading()).toBe('Środa, 4 lis');
  });

  it('T7: a mouse drag does nothing: desktop uses the buttons', async () => {
    const { deps } = depsWithClock();
    const el = await renderTrack(deps);

    drag(el, { from: [200, 40], to: [60, 40], steps: 10, durationMs: 600, pointerType: 'mouse' });

    expect(heading()).toBe('Środa, 4 lis');
  });

  it('T8: a drag that starts on a day changes the Week without selecting that day', async () => {
    const { deps } = depsWithClock();
    await renderTrack(deps);
    const thursday = pill('Czwartek, 5 lis');

    slowDrag(thursday, -140);
    act(() => {
      thursday.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(heading()).toBe('Środa, 11 lis');
    expect(pill('Środa, 11 lis')).toHaveAttribute('aria-pressed', 'true');
  });

  it('a tap after a drag that got no click still selects', async () => {
    const { deps } = depsWithClock();
    const el = await renderTrack(deps);

    slowDrag(el, -140);
    tap(pill('Piątek, 13 lis'), { t: 1000 });

    expect(heading()).toBe('Piątek, 13 lis');
  });

  it('a tap that catches a settle does not select a day', async () => {
    const { deps } = depsWithClock();
    const el = await renderTrack(deps);
    withMotion();

    flick(el, -30);
    advanceFrames(60);
    tap(pill('Piątek, 6 lis'), { t: 1000 });
    runAllFrames();

    expect(heading()).toBe('Środa, 11 lis');
  });

  it('T9: a tap on a day selects it', async () => {
    const { deps } = depsWithClock();
    await renderTrack(deps);

    tap(pill('Czwartek, 5 lis'));

    expect(heading()).toBe('Czwartek, 5 lis');
  });

  it('T10: a cancelled drag springs back', async () => {
    const { deps } = depsWithClock();
    const el = await renderTrack(deps);

    pointer(el, 'pointerdown', { x: 200, y: 40, t: 0 });
    for (let i = 1; i <= 10; i++) pointer(el, 'pointermove', { x: 200 - 14 * i, y: 40, t: 60 * i });
    pointer(el, 'pointercancel', { x: 60, y: 40, t: 600 });

    expect(heading()).toBe('Środa, 4 lis');
    expect(rail().style.transform).toBe(railTransform(0));
  });

  it('T17: filtered pointers never catch a running settle', async () => {
    const { deps } = depsWithClock();
    const el = await renderTrack(deps);
    phoneViewport();
    withMotion();

    flick(el, -30);
    advanceFrames(60);
    pointer(el, 'pointerdown', { x: 10, y: 40, t: 1000 });
    pointer(el, 'pointerup', { x: 10, y: 40, t: 1040 });
    pointer(el, 'pointerdown', { x: 200, y: 40, t: 1100, pointerType: 'mouse' });
    pointer(el, 'pointerup', { x: 200, y: 40, t: 1140, pointerType: 'mouse' });
    const next = screen.getByLabelText('Następny tydzień');
    pointer(next, 'pointerdown', { x: 300, y: 20, t: 1200 });
    pointer(next, 'pointerup', { x: 300, y: 20, t: 1240 });
    expect(heading()).toBe('Środa, 4 lis');
    runAllFrames();

    expect(heading()).toBe('Środa, 11 lis');
    expect(rail().style.transform).toBe(railTransform(0));
  });

  it('T18: the lostpointercapture after a release changes nothing', async () => {
    const { deps } = depsWithClock();
    const el = await renderTrack(deps);

    slowDrag(el, -140);
    pointer(el, 'lostpointercapture', { x: 60, y: 40, t: 700 });

    expect(heading()).toBe('Środa, 11 lis');
    expect(rail().style.transform).toBe(railTransform(0));
  });

  it('a lost capture mid-drag springs back', async () => {
    const { deps } = depsWithClock();
    const el = await renderTrack(deps);

    pointer(el, 'pointerdown', { x: 200, y: 40, t: 0 });
    for (let i = 1; i <= 10; i++) pointer(el, 'pointermove', { x: 200 - 14 * i, y: 40, t: 60 * i });
    pointer(el, 'lostpointercapture', { x: 60, y: 40, t: 600 });
    pointer(el, 'pointerup', { x: 60, y: 40, t: 650 });

    expect(heading()).toBe('Środa, 4 lis');
    expect(rail().style.transform).toBe(railTransform(0));
  });

  it("a day pill losing the browser's implicit capture doesn't stop the drag", async () => {
    const { deps } = depsWithClock();
    await renderTrack(deps);
    const thursday = pill('Czwartek, 5 lis');

    pointer(thursday, 'pointerdown', { x: 200, y: 40, t: 0 });
    pointer(thursday, 'pointermove', { x: 186, y: 40, t: 60 });
    pointer(thursday, 'lostpointercapture', { x: 186, y: 40, t: 61 });
    for (let i = 2; i <= 10; i++) {
      pointer(thursday, 'pointermove', { x: 200 - 14 * i, y: 40, t: 60 * i });
    }
    pointer(thursday, 'pointerup', { x: 60, y: 40, t: 600 });

    expect(heading()).toBe('Środa, 11 lis');
  });

  it('hiding the page mid-settle ends on the target Week, centred', async () => {
    const { deps } = depsWithClock();
    const el = await renderTrack(deps);
    withMotion();

    flick(el, -30);
    advanceFrames(60);
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(heading()).toBe('Środa, 11 lis');
    expect(rail().style.transform).toBe(railTransform(0));
  });

  it('hiding the page mid-drag springs back at once', async () => {
    const { deps } = depsWithClock();
    const el = await renderTrack(deps);
    withMotion();

    pointer(el, 'pointerdown', { x: 200, y: 40, t: 0 });
    for (let i = 1; i <= 10; i++) pointer(el, 'pointermove', { x: 200 - 14 * i, y: 40, t: 60 * i });
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    pointer(el, 'pointerup', { x: 60, y: 40, t: 650 });

    expect(heading()).toBe('Środa, 4 lis');
    expect(rail().style.transform).toBe(railTransform(0));
  });

  it('a vertical gesture that caught a settle springs back', async () => {
    const { deps } = depsWithClock();
    const el = await renderTrack(deps);
    withMotion();

    flick(el, -30);
    advanceFrames(60);
    drag(el, { from: [200, 40], to: [205, 160], steps: 5, durationMs: 200, startT: 1000 });
    runAllFrames();

    expect(heading()).toBe('Środa, 11 lis');
    expect(rail().style.transform).toBe(railTransform(0));
  });
});

describe('WeekPage track: buttons, reduced motion and screen readers (feature 003, US3)', () => {
  it('T11: only the viewed Week is exposed to screen readers', async () => {
    const { deps } = depsWithClock();
    renderWithApp(<WeekPage />, deps);
    await findMonth('Listopad 2026');

    expect(document.querySelectorAll('.week-face[inert]')).toHaveLength(4);
    expect(document.querySelectorAll('.week-face')).toHaveLength(5);
    const months = screen.getAllByRole('heading', { level: 2 });
    expect(months).toHaveLength(1);
    expect(months[0]).toHaveTextContent('Listopad 2026');
  });

  it('T13: two quick clicks on "Następny tydzień" move two Weeks', async () => {
    const { deps } = depsWithClock();
    renderWithApp(<WeekPage />, deps);
    await findMonth('Listopad 2026');

    await userEvent.click(screen.getByLabelText('Następny tydzień'));
    await userEvent.click(screen.getByLabelText('Następny tydzień'));

    expect(heading()).toBe('Środa, 18 lis');
    expect(pill('Środa, 18 lis')).toHaveAttribute('aria-pressed', 'true');
  });

  it('T13: with motion on, a click during a settle chains like a flick', async () => {
    const { deps } = depsWithClock();
    await renderTrack(deps);
    withMotion();
    const next = screen.getByLabelText('Następny tydzień');

    act(() => next.click());
    advanceFrames(60);
    expect(heading()).toBe('Środa, 4 lis');
    act(() => next.click());
    expect(heading()).toBe('Środa, 11 lis');
    runAllFrames();

    expect(heading()).toBe('Środa, 18 lis');
    expect(rail().style.transform).toBe(railTransform(0));
  });

  it('T14: "Skopiuj…" is off for an empty Week whose next Week has Meals', async () => {
    const { deps } = depsWithClock();
    await deps.dishes.put(owsianka);
    await deps.week.addMeal({ date: '2026-11-11', slot: 1, dishId: owsianka.id });
    renderWithApp(<WeekPage />, deps);
    await waitFor(() => {
      const face = document.querySelectorAll<HTMLElement>('.week-face')[3]!;
      expect(within(face).getByText('350')).toBeInTheDocument();
    });

    expect(copyButton()).toBeDisabled();
  });
});

describe('WeekPage track: motion blur', () => {
  it('blurs the rail while it moves fast, and is sharp again at rest', async () => {
    const { deps } = depsWithClock();
    const el = await renderTrack(deps);
    withMotion();

    pointer(el, 'pointerdown', { x: 300, y: 40, t: 0 });
    pointer(el, 'pointermove', { x: 270, y: 40, t: 8 });
    pointer(el, 'pointermove', { x: 240, y: 40, t: 16 });
    advanceFrames(16);
    expect(rail().style.filter).toMatch(/^blur\(/);

    pointer(el, 'pointerup', { x: 240, y: 40, t: 16 });
    runAllFrames();
    expect(heading()).toBe('Środa, 11 lis');
    expect(rail().style.filter).toBe('');
  });

  it('sharpens while the finger holds still', async () => {
    const { deps } = depsWithClock();
    const el = await renderTrack(deps);
    withMotion();

    pointer(el, 'pointerdown', { x: 300, y: 40, t: 0 });
    pointer(el, 'pointermove', { x: 240, y: 40, t: 16 });
    advanceFrames(16);
    expect(rail().style.filter).toMatch(/^blur\(/);
    advanceFrames(300);

    expect(rail().style.filter).toBe('');
  });

  it('never blurs with Reduce Motion', async () => {
    const { deps } = depsWithClock();
    const el = await renderTrack(deps);

    pointer(el, 'pointerdown', { x: 300, y: 40, t: 0 });
    pointer(el, 'pointermove', { x: 200, y: 40, t: 16 });
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(rail().style.filter).toBe('');
  });
});

