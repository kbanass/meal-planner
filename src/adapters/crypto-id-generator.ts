import type { IdGenerator } from '../domain/ports';

export const cryptoIdGenerator: IdGenerator = {
  next: () => crypto.randomUUID(),
};
