import type { DishPhotoRef } from '../domain/types';

export interface PhotoStore {
  /** Throws `PhotoQuotaError` when the device is out of space. */
  write(ref: DishPhotoRef, blob: Blob): Promise<void>;
  read(ref: DishPhotoRef): Promise<Blob | null>;
  /** No-op when the file is missing. */
  delete(ref: DishPhotoRef): Promise<void>;
  listIds(): Promise<string[]>;
}

export interface ImageCompressor {
  /** Throws `PhotoDecodeError` when the file cannot be decoded. */
  compress(file: Blob, maxEdge: number): Promise<{ blob: Blob; mimeType: DishPhotoRef['mimeType'] }>;
}

export type RequestPersistentStorage = () => Promise<boolean>;

export class PhotoDecodeError extends Error {
  override name = 'PhotoDecodeError';
}

export class PhotoQuotaError extends Error {
  override name = 'PhotoQuotaError';
}
