import { readSettings } from '../domain/settings';
import type { Settings } from '../domain/types';
import type { PlannerDb } from './db';

const SETTINGS_ID = 'app';

export interface SettingsRepository {
  get(): Promise<Settings>;
}

export function createSettingsRepository(db: PlannerDb): SettingsRepository {
  return {
    async get() {
      return readSettings(await db.settings.get(SETTINGS_ID));
    },
  };
}
