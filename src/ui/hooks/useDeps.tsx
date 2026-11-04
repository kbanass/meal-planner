import { createContext, useContext, type ReactNode } from 'react';
import type { Deps } from '../../app/deps';

const DepsContext = createContext<Deps | null>(null);

export function DepsProvider({ value, children }: { value: Deps; children: ReactNode }) {
  return <DepsContext.Provider value={value}>{children}</DepsContext.Provider>;
}

export function useDeps(): Deps {
  const deps = useContext(DepsContext);
  if (!deps) throw new Error('useDeps must be used inside <DepsProvider>.');
  return deps;
}
