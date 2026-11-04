import { cleanup, render, type RenderResult } from '@testing-library/react';
import Framework7 from 'framework7/lite-bundle';
import Framework7React, { App } from 'framework7-react';
import type { ReactNode } from 'react';
import { afterEach } from 'vitest';
import type { Deps } from '../../src/app/deps';
import { DepsProvider } from '../../src/ui/hooks/useDeps';
import { FixedIdGenerator } from '../fakes/fixed-id-generator';
import { createTestDb } from '../fakes/test-db';

// eslint-disable-next-line react-hooks/rules-of-hooks -- Framework7 plugin registration, not a React hook
Framework7.use(Framework7React);

// Vitest globals are off, so Testing Library cannot register its own cleanup.
afterEach(cleanup);

export function createTestDeps(): Deps {
  return {
    db: createTestDb(),
    ids: new FixedIdGenerator(),
  };
}

/** Mounts `ui` the way `main.tsx` does: inside `<DepsProvider>` and a Framework7 `<App>`. */
export function renderWithApp(
  ui: ReactNode,
  deps: Deps = createTestDeps(),
): RenderResult & { deps: Deps } {
  const result = render(
    <DepsProvider value={deps}>
      <App theme="ios">{ui}</App>
    </DepsProvider>,
  );
  return { ...result, deps };
}
