// A fix for Framework7 9's iOS tabbar bubble ("tab-link-highlight") on a tap.
//
// A tap writes the bubble's transform twice in quick succession: the touch handler moves it to
// `translateX(N * 100%)` on release, then the tab change calls `app.toolbar.setHighlight`, which
// writes the same position as `translate3d(N * 100%, 0, 0)` a frame later. The two values differ
// as written, so the browser restarts the 300 ms transition from mid-flight, and the bubble
// stalls and speeds up again: a visible flick. Here `setHighlight` is skipped when the touch
// handler has already put the bubble on the active tab. The touch handler triggers the tab
// change before it writes that place, so the check waits a microtask. Every other call (start-up, a tab change
// from code, a resize) goes through unchanged.

interface ToolbarModule {
  setHighlight(tabbarEl: unknown): void;
}

function element(target: unknown): HTMLElement | null {
  if (target instanceof HTMLElement) return target;
  // Framework7 passes a Dom7 collection: its first item is the element.
  const first = (target as { [index: number]: unknown } | null)?.[0];
  return first instanceof HTMLElement ? first : null;
}

/** True when the bubble already sits on the active tab, as the touch handler leaves it. */
export function highlightAlreadyPlaced(tabbarEl: HTMLElement): boolean {
  const highlight = tabbarEl.querySelector<HTMLElement>('.tab-link-highlight');
  if (!highlight) return false;
  const links = [...tabbarEl.querySelectorAll('.tab-link')];
  const active = links.findIndex((link) => link.classList.contains('tab-link-active'));
  return active >= 0 && highlight.style.transform === `translateX(${active * 100}%)`;
}

/** Wraps `app.toolbar.setHighlight` once; returns the function that undoes it. */
export function fixTabbarHighlight(app: { toolbar: ToolbarModule }): () => void {
  const original = app.toolbar.setHighlight;
  app.toolbar.setHighlight = (tabbarEl: unknown) => {
    const el = element(tabbarEl);
    if (!el) {
      original(tabbarEl);
      return;
    }
    // The touch handler changes the tab first and writes the bubble's place right after, in the
    // same task: decide once it has.
    queueMicrotask(() => {
      if (!highlightAlreadyPlaced(el)) original(tabbarEl);
    });
  };
  return () => {
    app.toolbar.setHighlight = original;
  };
}
