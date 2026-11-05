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
    // Matches only the reduced-motion query, so Week settles finish at once without timers
    // (feature 003, research R10). Every other query is false, so tests render the mobile layout.
    window.matchMedia = (media: string) =>
      ({
        matches: media.includes('prefers-reduced-motion: reduce'),
        media,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }

  // Pointer capture for the Week track's gesture adapter: no-ops in jsdom.
  if (typeof Element.prototype.setPointerCapture !== 'function') {
    Element.prototype.setPointerCapture = () => {};
  }
  if (typeof Element.prototype.releasePointerCapture !== 'function') {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (typeof Element.prototype.hasPointerCapture !== 'function') {
    Element.prototype.hasPointerCapture = () => false;
  }

  if (typeof Element.prototype.scrollIntoView !== 'function') {
    Element.prototype.scrollIntoView = () => {};
  }

  if (typeof URL.createObjectURL !== 'function') {
    URL.createObjectURL = () => 'blob:test';
  }
  if (typeof URL.revokeObjectURL !== 'function') {
    URL.revokeObjectURL = () => {};
  }
}
