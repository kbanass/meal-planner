import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixTabbarHighlight, highlightAlreadyPlaced } from '../../src/ui/tabbar-highlight';

/** A tabbar with four links, the third active, and the bubble at `transform`. */
function tabbar(transform: string): HTMLElement {
  document.body.innerHTML = `
    <div class="toolbar tabbar"><div class="toolbar-inner"><div class="toolbar-pane">
      <a class="tab-link"></a><a class="tab-link"></a><a class="tab-link tab-link-active"></a><a class="tab-link"></a>
      <span class="tab-link-highlight" style="width: 25%; transform: ${transform};"></span>
    </div></div></div>`;
  return document.querySelector<HTMLElement>('.tabbar')!;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('highlightAlreadyPlaced', () => {
  it('is true when the touch handler left the bubble on the active tab', () => {
    expect(highlightAlreadyPlaced(tabbar('translateX(200%)'))).toBe(true);
  });

  it('is false anywhere else, or written another way', () => {
    expect(highlightAlreadyPlaced(tabbar('translateX(100%)'))).toBe(false);
    expect(highlightAlreadyPlaced(tabbar('translateX(171px)'))).toBe(false);
    expect(highlightAlreadyPlaced(tabbar('translate3d(200%, 0px, 0px)'))).toBe(false);
  });

  it('is false with no bubble or no active tab', () => {
    document.body.innerHTML = '<div class="tabbar"><a class="tab-link tab-link-active"></a></div>';
    expect(highlightAlreadyPlaced(document.querySelector<HTMLElement>('.tabbar')!)).toBe(false);
    const el = tabbar('translateX(0%)');
    el.querySelector('.tab-link-active')!.classList.remove('tab-link-active');
    expect(highlightAlreadyPlaced(el)).toBe(false);
  });
});

describe('fixTabbarHighlight', () => {
  function install() {
    const original = vi.fn();
    const app = { toolbar: { setHighlight: original } };
    const undo = fixTabbarHighlight(app);
    return { app, original, undo };
  }

  it('skips the write when the touch handler places the bubble in the same task', async () => {
    const { app, original } = install();
    const el = tabbar('translateX(171px)');
    // Framework7 passes a Dom7 collection; the touch handler writes the place right after.
    app.toolbar.setHighlight({ 0: el, length: 1 });
    el.querySelector<HTMLElement>('.tab-link-highlight')!.style.transform = 'translateX(200%)';
    await Promise.resolve();
    expect(original).not.toHaveBeenCalled();
  });

  it('positions the bubble when nothing else has, as on start-up or a mouse click', async () => {
    const { app, original } = install();
    const el = tabbar('translateX(0%)');
    app.toolbar.setHighlight(el);
    await Promise.resolve();
    expect(original).toHaveBeenCalledWith(el);
  });

  it('passes anything that is not an element straight through, and can be undone', () => {
    const { app, original, undo } = install();
    app.toolbar.setHighlight(null);
    expect(original).toHaveBeenCalledWith(null);
    undo();
    expect(app.toolbar.setHighlight).toBe(original);
  });
});
