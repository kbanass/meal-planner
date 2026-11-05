import type { Clock } from '../domain/ports';

const pad = (value: number) => String(value).padStart(2, '0');

/** Today in the device's local time zone: the user's own calendar day (research R2). */
export const systemClock: Clock = {
  today() {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  },
};
