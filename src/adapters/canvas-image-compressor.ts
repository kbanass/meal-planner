import { PhotoDecodeError, type ImageCompressor } from '../data/ports';
import { fitWithin } from '../domain/photo-size';

const QUALITY = 0.8;

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/**
 * Decodes, applies EXIF orientation, scales down and re-encodes (research R7).
 * Safari cannot encode WebP and silently returns PNG, so anything that is not
 * WebP is re-encoded as JPEG.
 */
export function createCanvasImageCompressor(): ImageCompressor {
  return {
    async compress(file, maxEdge) {
      let bitmap: ImageBitmap;
      try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch (error) {
        throw new PhotoDecodeError(undefined, { cause: error });
      }
      try {
        const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) throw new PhotoDecodeError('Canvas 2D context is unavailable.');
        context.drawImage(bitmap, 0, 0, width, height);

        const webp = await toBlob(canvas, 'image/webp');
        if (webp?.type === 'image/webp') return { blob: webp, mimeType: 'image/webp' };
        const jpeg = await toBlob(canvas, 'image/jpeg');
        if (!jpeg) throw new PhotoDecodeError('The photo could not be encoded.');
        return { blob: jpeg, mimeType: 'image/jpeg' };
      } finally {
        bitmap.close();
      }
    },
  };
}
