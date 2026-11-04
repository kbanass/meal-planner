import { PhotoQuotaError, type PhotoStore } from '../data/ports';
import type { DishPhotoRef } from '../domain/types';

const EXTENSIONS: Record<DishPhotoRef['mimeType'], string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
};

function fileName(ref: DishPhotoRef): string {
  return `${ref.id}.${EXTENSIONS[ref.mimeType]}`;
}

function isDomError(error: unknown, name: string): boolean {
  return error instanceof DOMException && error.name === name;
}

async function photosDirectory(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle('photos', { create: true });
}

/** Dish photos as files in the origin private file system, under `photos/` (research R6). */
export function createOpfsPhotoStore(): PhotoStore {
  return {
    async write(ref, blob) {
      const directory = await photosDirectory();
      try {
        const handle = await directory.getFileHandle(fileName(ref), { create: true });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } catch (error) {
        // Best effort: leave no empty file behind. The startup sweep is the backstop.
        await directory.removeEntry(fileName(ref)).catch(() => {});
        if (isDomError(error, 'QuotaExceededError')) throw new PhotoQuotaError(undefined, { cause: error });
        throw error;
      }
    },

    async read(ref) {
      try {
        const handle = await (await photosDirectory()).getFileHandle(fileName(ref));
        return await handle.getFile();
      } catch (error) {
        if (isDomError(error, 'NotFoundError')) return null;
        throw error;
      }
    },

    async delete(ref) {
      try {
        await (await photosDirectory()).removeEntry(fileName(ref));
      } catch (error) {
        if (!isDomError(error, 'NotFoundError')) throw error;
      }
    },

    async listIds() {
      const ids: string[] = [];
      for await (const name of (await photosDirectory()).keys()) {
        ids.push(name.replace(/\.[^.]+$/, ''));
      }
      return ids;
    },
  };
}
