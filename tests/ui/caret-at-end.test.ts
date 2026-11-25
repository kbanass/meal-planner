import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installCaretAtEnd, moveCaretToEnd } from '../../src/ui/caret-at-end';

let uninstall: () => void;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame'] });
  uninstall = installCaretAtEnd(document);
});

afterEach(() => {
  uninstall();
  document.body.innerHTML = '';
  vi.useRealTimers();
});

function field(html: string): HTMLInputElement | HTMLTextAreaElement {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLInputElement | HTMLTextAreaElement;
}

describe('installCaretAtEnd', () => {
  it('puts the caret after the value when a text field gains focus', () => {
    const input = field('<input type="text" value="400">') as HTMLInputElement;
    input.setSelectionRange(0, 0);
    input.focus();
    input.setSelectionRange(0, 0); // the browser's own placement, after the focus event
    vi.advanceTimersToNextFrame();
    expect([input.selectionStart, input.selectionEnd]).toEqual([3, 3]);
  });

  it('works for a textarea', () => {
    const area = field('<textarea>notatka</textarea>');
    area.focus();
    area.setSelectionRange(0, 0);
    vi.advanceTimersToNextFrame();
    expect(area.selectionStart).toBe(7);
  });

  it('keeps a selection the user made', () => {
    const input = field('<input type="text" value="kawa">') as HTMLInputElement;
    input.focus();
    input.setSelectionRange(0, 2);
    vi.advanceTimersToNextFrame();
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 2]);
  });

  it('leaves a field that lost focus before the frame, and other input types', () => {
    const input = field('<input type="text" value="kawa">') as HTMLInputElement;
    input.focus();
    input.setSelectionRange(0, 0);
    input.blur();
    vi.advanceTimersToNextFrame();
    expect(input.selectionStart).toBe(0);

    const box = field('<input type="checkbox">');
    expect(() => {
      box.focus();
      vi.advanceTimersToNextFrame();
    }).not.toThrow();
  });

  it('stops after uninstalling', () => {
    uninstall();
    const input = field('<input type="text" value="kawa">') as HTMLInputElement;
    input.focus();
    input.setSelectionRange(0, 0);
    vi.advanceTimersToNextFrame();
    expect(input.selectionStart).toBe(0);
    uninstall = () => {};
  });
});

describe('moveCaretToEnd', () => {
  it('moves a collapsed caret to the end', () => {
    const input = field('<input type="text" value="abc">') as HTMLInputElement;
    input.setSelectionRange(1, 1);
    moveCaretToEnd(input);
    expect(input.selectionStart).toBe(3);
  });
});
