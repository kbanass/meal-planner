import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { createDb, type PlannerDb } from '../../src/data/db';

let n = 0;

/** A fresh, isolated database for each call. */
export function createTestDb(): PlannerDb {
  n += 1;
  return createDb(`test-${n}`, { indexedDB: new IDBFactory(), IDBKeyRange });
}
