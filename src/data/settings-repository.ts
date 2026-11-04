import { isValidSlotsPerDay, readSettings } from '../domain/settings';
import type { Settings } from '../domain/types';
import type { PlannerDb } from './db';

const SETTINGS_ID = 'app';

export interface SettingsRepository {
  get(): Promise<Settings>;
  setSlotsPerDay(n: number): Promise<{ kind: 'saved' } | { kind: 'invalid' }>;
}

export function createSettingsRepository(db: PlannerDb): SettingsRepository {
  return {
    async get() {
      return readSettings(await db.settings.get(SETTINGS_ID));
    },
    async setSlotsPerDay(n) {
      // A value that is not a valid Slot count never reaches storage, even from untyped data.
      if (!isValidSlotsPerDay(n)) return { kind: 'invalid' };
      await db.settings.put({ ...(await this.get()), id: SETTINGS_ID, slotsPerDay: n });
      return { kind: 'saved' };
    },
  };
}
