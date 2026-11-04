import type { PhotoStore } from '../../src/data/ports';
import type { DishPhotoRef } from '../../src/domain/types';

export class InMemoryPhotoStore implements PhotoStore {
  /** The next `write` throws this error instead of storing, then the option clears. */
  failNextWriteWith?: Error;

  private readonly files = new Map<string, Blob>();

  async write(ref: DishPhotoRef, blob: Blob): Promise<void> {
    const error = this.failNextWriteWith;
    if (error) {
      this.failNextWriteWith = undefined;
      throw error;
    }
    this.files.set(ref.id, blob);
  }

  async read(ref: DishPhotoRef): Promise<Blob | null> {
    return this.files.get(ref.id) ?? null;
  }

  async delete(ref: DishPhotoRef): Promise<void> {
    this.files.delete(ref.id);
  }

  async listIds(): Promise<string[]> {
    return this.ids();
  }

  /** Stored photo ids, for assertions. */
  ids(): string[] {
    return [...this.files.keys()];
  }
}
