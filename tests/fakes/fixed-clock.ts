import type { Clock } from '../../src/domain/ports';
import type { IsoDate } from '../../src/domain/types';

/** A Clock that returns the date it was given, until `set` moves it. */
export class FixedClock implements Clock {
  constructor(private current: IsoDate) {}

  today(): IsoDate {
    return this.current;
  }

  set(date: IsoDate): void {
    this.current = date;
  }
}
