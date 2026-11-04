import type { IdGenerator } from '../../src/domain/ports';

/** Deterministic UUIDs: 00000000-0000-4000-8000-000000000001, …0002, … */
export class FixedIdGenerator implements IdGenerator {
  private counter = 0;

  next(): string {
    this.counter += 1;
    return `00000000-0000-4000-8000-${String(this.counter).padStart(12, '0')}`;
  }
}
