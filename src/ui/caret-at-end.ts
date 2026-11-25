// Text fields open with the caret after their value, never before it. iOS Safari sometimes puts
// the caret at the start when a field is focused, most often one filled as a sheet opens.
// Only the focus moment is touched: a tap inside a field that is already focused still places
// the caret where the finger is.

/** Input types that support setSelectionRange. */
const TEXT_TYPES = new Set(['text', 'search', 'url', 'tel', 'password']);

function isTextField(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (el instanceof HTMLTextAreaElement) return true;
  return el instanceof HTMLInputElement && TEXT_TYPES.has(el.type);
}

/** Moves the caret to the end of `field` unless the user has selected text in it. */
export function moveCaretToEnd(field: HTMLInputElement | HTMLTextAreaElement): void {
  if (field.selectionStart !== field.selectionEnd) return;
  const end = field.value.length;
  field.setSelectionRange(end, end);
}

/**
 * Installs the rule on `doc`. The move waits one frame, because the browser places its own
 * caret after the focus event; returns the uninstaller.
 */
export function installCaretAtEnd(doc: Document = document): () => void {
  const onFocusIn = (event: FocusEvent) => {
    const field = event.target;
    if (!isTextField(field)) return;
    requestAnimationFrame(() => {
      if (doc.activeElement === field) moveCaretToEnd(field);
    });
  };
  doc.addEventListener('focusin', onFocusIn);
  return () => doc.removeEventListener('focusin', onFocusIn);
}
