import type { ImageCompressor, PhotoDecodeError } from '../../src/data/ports';

export class FakeImageCompressor implements ImageCompressor {
  constructor(private readonly failWith?: PhotoDecodeError) {}

  async compress(): Promise<{ blob: Blob; mimeType: 'image/webp' }> {
    if (this.failWith) throw this.failWith;
    return { blob: new Blob(['x'], { type: 'image/webp' }), mimeType: 'image/webp' };
  }
}
