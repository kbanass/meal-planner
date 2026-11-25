import type { TextSharer } from '../data/ports';

/**
 * Web Share where the browser has it (iOS Safari, installed PWAs), otherwise the clipboard
 * (research R5). Call it straight from the click handler: sharing needs the user's tap.
 */
export const webTextSharer: TextSharer = {
  async share(text) {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text });
        return 'shared';
      } catch (error) {
        // The user closed the share sheet.
        if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
        throw error;
      }
    }
    await navigator.clipboard.writeText(text);
    return 'copied';
  },
};
