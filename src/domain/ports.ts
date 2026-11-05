import type { IsoDate } from './types';

export interface IdGenerator {
  next(): string;
}

/** The user's current local calendar day. The only source of "today" (research R2). */
export interface Clock {
  today(): IsoDate;
}
