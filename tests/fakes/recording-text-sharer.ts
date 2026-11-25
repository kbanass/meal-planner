import type { TextSharer } from '../../src/data/ports';

type ShareResult = Awaited<ReturnType<TextSharer['share']>>;

/** Records each shared text and answers with the result it was built with, or throws on 'fail'. */
export class RecordingTextSharer implements TextSharer {
  readonly texts: string[] = [];

  constructor(private readonly result: ShareResult | 'fail' = 'shared') {}

  share(text: string): Promise<ShareResult> {
    this.texts.push(text);
    if (this.result === 'fail') return Promise.reject(new Error('Share failed'));
    return Promise.resolve(this.result);
  }
}
