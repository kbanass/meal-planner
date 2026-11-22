import { afterEach, describe, expect, it, vi } from 'vitest';
import { webTextSharer } from '../../src/adapters/web-text-sharer';

// The config restores mocks, but not stubbed globals.
afterEach(() => {
  vi.unstubAllGlobals();
});

function namedError(name: string): Error {
  const error = new Error(name);
  error.name = name;
  return error;
}

describe('webTextSharer', () => {
  it('shares the text with Web Share', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share });

    expect(await webTextSharer.share('Lista')).toBe('shared');
    expect(share).toHaveBeenCalledWith({ text: 'Lista' });
  });

  it('reports a closed share sheet as cancelled', async () => {
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(namedError('AbortError')) });

    expect(await webTextSharer.share('Lista')).toBe('cancelled');
  });

  it('throws any other share failure', async () => {
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(namedError('NotAllowedError')) });

    await expect(webTextSharer.share('Lista')).rejects.toThrow('NotAllowedError');
  });

  it('copies to the clipboard without Web Share', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    expect(await webTextSharer.share('Lista')).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('Lista');
  });
});
