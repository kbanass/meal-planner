import { beforeEach, describe, expect, it } from 'vitest';
import type { PlannerDb } from '../../src/data/db';
import {
  createSettingsRepository,
  type SettingsRepository,
} from '../../src/data/settings-repository';
import { createTestDb } from '../fakes/test-db';

let db: PlannerDb;
let settings: SettingsRepository;

beforeEach(() => {
  db = createTestDb();
  settings = createSettingsRepository(db);
});

describe('SettingsRepository', () => {
  it('returns the defaults on a fresh install', async () => {
    expect(await settings.get()).toEqual({ slotsPerDay: 4 });
  });

  it('falls back to the defaults for an invalid stored value', async () => {
    await db.settings.put({ id: 'app', slotsPerDay: 99 });

    expect(await settings.get()).toEqual({ slotsPerDay: 4 });
  });
});
