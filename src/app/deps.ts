import { cryptoIdGenerator } from '../adapters/crypto-id-generator';
import { createDb, type PlannerDb } from '../data/db';
import type { IdGenerator } from '../domain/ports';

export interface Deps {
  db: PlannerDb;
  ids: IdGenerator;
}

export function createDeps(): Deps {
  return {
    db: createDb(),
    ids: cryptoIdGenerator,
  };
}
