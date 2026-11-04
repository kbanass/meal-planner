import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AppShell } from '../../src/ui/App';
import { DepsProvider } from '../../src/ui/hooks/useDeps';
import { createTestDeps } from './render';

// The whole shell creates its own Framework7 <App>, so tests that need it live in this file;
// a second <App> next to renderWithApp's would take over Framework7's dialogs and toasts.

const NOTICE = 'Ten ekran pojawi się w kolejnej wersji.';

function renderShell() {
  return render(
    <DepsProvider value={createTestDeps()}>
      <AppShell />
    </DepsProvider>,
  );
}

// Icon fonts render the icon name as ligature text, so read only the label.
function tabLabels(): string[] {
  return [...document.querySelectorAll('.toolbar.tabbar .tab-link .tabbar-label')].map(
    (label) => label.textContent ?? '',
  );
}

describe('AppShell', () => {
  it('shows the four tabs in order', () => {
    renderShell();

    expect(tabLabels()).toEqual([
      'Tydzień',
      'Dania',
      'Lista zakupów',
      'Ustawienia',
    ]);
  });

  it('opens on Tydzień with the current Week', async () => {
    renderShell();

    expect(screen.getByText('Tydzień', { selector: '.tab-link *' }).closest('.tab-link')).toHaveClass(
      'tab-link-active',
    );
    const week = document.getElementById('view-week')!;
    expect(week).toHaveClass('tab-active');
    // createTestDeps fixes today at Wednesday 2026-11-04.
    expect(await within(week).findByText('2–8 lis 2026')).toBeInTheDocument();
    expect(within(week).queryByText(NOTICE)).not.toBeInTheDocument();
  });

  it('shows the Slot setting on Ustawienia', async () => {
    renderShell();
    const settings = document.getElementById('view-settings')!;

    await userEvent.click(screen.getByText('Ustawienia', { selector: '.tab-link *' }));

    expect(await within(settings).findByText('Liczba slotów')).toBeInTheDocument();
    expect(within(settings).queryByText(NOTICE)).not.toBeInTheDocument();
  });

  it('switches to Lista zakupów when its tab is tapped', async () => {
    renderShell();
    const shopping = document.getElementById('view-shopping')!;

    await userEvent.click(screen.getByText('Lista zakupów', { selector: '.tab-link *' }));

    expect(shopping).toHaveClass('tab-active');
    expect(document.getElementById('view-week')).not.toHaveClass('tab-active');
    expect(await within(shopping).findByText(NOTICE)).toBeInTheDocument();
  });

  it('comes back from a day to the same Week (FR-007)', async () => {
    renderShell();
    const week = document.getElementById('view-week')!;
    await within(week).findByText('2–8 lis 2026');

    await userEvent.click(within(week).getByLabelText('Następny tydzień'));
    await within(week).findByText('9–15 lis 2026');
    await userEvent.click(within(week).getByText('Czwartek'));
    expect(await within(week).findByText('Czwartek, 12 lis')).toBeInTheDocument();

    await userEvent.click(week.querySelector<HTMLElement>('.page-current .navbar .back')!);
    await waitFor(() =>
      expect(week.querySelector('.page-current .navbar .title')).not.toHaveTextContent('Czwartek, 12 lis'),
    );
    expect(await within(week).findByText('9–15 lis 2026')).toBeInTheDocument();
  });
});
