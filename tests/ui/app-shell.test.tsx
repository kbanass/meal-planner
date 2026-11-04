import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AppShell } from '../../src/ui/App';
import { DepsProvider } from '../../src/ui/hooks/useDeps';
import { createTestDeps } from './render';

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

  it('opens on Tydzień with the placeholder notice', async () => {
    renderShell();

    expect(screen.getByText('Tydzień', { selector: '.tab-link *' }).closest('.tab-link')).toHaveClass(
      'tab-link-active',
    );
    const week = document.getElementById('view-week')!;
    expect(week).toHaveClass('tab-active');
    expect(await within(week).findByText(NOTICE)).toBeInTheDocument();
  });

  it('switches to Lista zakupów when its tab is tapped', async () => {
    renderShell();
    const shopping = document.getElementById('view-shopping')!;

    await userEvent.click(screen.getByText('Lista zakupów', { selector: '.tab-link *' }));

    expect(shopping).toHaveClass('tab-active');
    expect(document.getElementById('view-week')).not.toHaveClass('tab-active');
    expect(await within(shopping).findByText(NOTICE)).toBeInTheDocument();
  });
});
