import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

// Test-only stand-ins for browser APIs that jsdom lacks. Applied only in the
// jsdom environment, and only when the API is missing.
if (typeof window !== 'undefined') {
  if (typeof window.IntersectionObserver !== 'function') {
    // Never calls back, so lazily loaded photos stay on their placeholder.
    class NoopIntersectionObserver {
      readonly root = null;
      readonly rootMargin = '';
      readonly thresholds: readonly number[] = [];
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }
    window.IntersectionObserver =
      NoopIntersectionObserver as unknown as typeof IntersectionObserver;
  }

  if (typeof window.matchMedia !== 'function') {
    // Never matches, so tests render the mobile layout.
    window.matchMedia = (media: string) =>
      ({
        matches: false,
        media,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }

  if (typeof URL.createObjectURL !== 'function') {
    URL.createObjectURL = () => 'blob:test';
  }
  if (typeof URL.revokeObjectURL !== 'function') {
    URL.revokeObjectURL = () => {};
  }
}
