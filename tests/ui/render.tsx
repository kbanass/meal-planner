import { act, cleanup } from '@testing-library/react';
import Framework7 from 'framework7/lite-bundle';
import Framework7React, { App } from 'framework7-react';
import { useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach } from 'vitest';
import type { Deps } from '../../src/app/deps';
import { createDishRepository } from '../../src/data/dish-repository';
import { createProductRepository } from '../../src/data/product-repository';
import { createSettingsRepository } from '../../src/data/settings-repository';
import { createWeekRepository } from '../../src/data/week-repository';
import { DepsProvider } from '../../src/ui/hooks/useDeps';
import { FakeImageCompressor } from '../fakes/fake-image-compressor';
import { FixedClock } from '../fakes/fixed-clock';
import { FixedIdGenerator } from '../fakes/fixed-id-generator';
import { InMemoryPhotoStore } from '../fakes/in-memory-photo-store';
import { createTestDb } from '../fakes/test-db';

// eslint-disable-next-line react-hooks/rules-of-hooks -- Framework7 plugin registration, not a React hook
Framework7.use(Framework7React);

export function createTestDeps(): Deps {
  const db = createTestDb();
  const ids = new FixedIdGenerator();
  return {
    db,
    ids,
    // The spec's example "today": Wednesday of the Week 2026-11-02 to 2026-11-08.
    clock: new FixedClock('2026-11-04'),
    products: createProductRepository(db, ids),
    dishes: createDishRepository(db),
    photos: new InMemoryPhotoStore(),
    compressor: new FakeImageCompressor(),
    week: createWeekRepository(db, ids),
    settings: createSettingsRepository(db),
  };
}

// framework7-react keeps one Framework7 instance per module graph, bound to the first <App>
// it sees. A second <App> in the same test file would reuse that instance, and its modals
// would open in the first, detached root. So each test file mounts one <App> and swaps each
// test's UI in and out of it.
let showInApp: ((ui: ReactNode) => void) | undefined;
let appRoot: HTMLElement | undefined;
let renderCount = 0;

function AppHost({ onReady }: { onReady(show: (ui: ReactNode) => void): void }) {
  const [ui, setUi] = useState<ReactNode>(null);
  onReady(setUi);
  return <App theme="ios">{ui}</App>;
}

function mountApp(): HTMLElement {
  if (!appRoot) {
    const host = document.createElement('div');
    document.body.append(host);
    act(() => {
      createRoot(host).render(<AppHost onReady={(show) => (showInApp = show)} />);
    });
    appRoot = host.querySelector<HTMLElement>('.framework7-root')!;
  }
  return appRoot;
}

afterEach(() => {
  // Plain Testing Library renders (outside the shared App) need their own cleanup,
  // because Vitest globals are off.
  cleanup();
  if (showInApp) act(() => showInApp?.(null));
  // Toasts and dialogs are created imperatively, outside React.
  appRoot?.querySelectorAll('.toast, .dialog, .dialog-backdrop').forEach((el) => el.remove());
});

/** Mounts `ui` the way `main.tsx` does: inside `<DepsProvider>` and the Framework7 `<App>`. */
export function renderWithApp(
  ui: ReactNode,
  deps: Deps = createTestDeps(),
): { container: HTMLElement; deps: Deps } {
  const container = mountApp();
  renderCount += 1;
  act(() => {
    showInApp?.(
      <DepsProvider key={renderCount} value={deps}>
        {ui}
      </DepsProvider>,
    );
  });
  return { container, deps };
}
