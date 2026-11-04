import type { RequestPersistentStorage } from '../data/ports';

/** Asks the browser not to evict local data (research R9). Never rejects. */
export const requestPersistentStorage: RequestPersistentStorage = async () => {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
};
