import 'framework7/css/bundle';
import 'framework7-icons/css/framework7-icons.css';
import './ui/styles/app.css';

import Framework7 from 'framework7/lite-bundle';
import Framework7React from 'framework7-react';
import { createRoot } from 'react-dom/client';
import { requestPersistentStorage } from './adapters/persist-storage';
import { createDeps } from './app/deps';
import { sweepOrphanPhotos } from './app/photos';
import { AppShell } from './ui/App';
import { DepsProvider } from './ui/hooks/useDeps';

// eslint-disable-next-line react-hooks/rules-of-hooks -- Framework7 plugin registration, not a React hook
Framework7.use(Framework7React);

void requestPersistentStorage();

const deps = createDeps();

createRoot(document.getElementById('app')!).render(
  <DepsProvider value={deps}>
    <AppShell />
  </DepsProvider>,
);

// In development, seed first: the sweep would otherwise race the seed and could delete
// freshly written photos before their Dishes are saved.
const seeded = import.meta.env.DEV
  ? import('./dev/seed').then(({ seedFromUrl }) => seedFromUrl(deps))
  : Promise.resolve();
void seeded.then(() => sweepOrphanPhotos(deps));
