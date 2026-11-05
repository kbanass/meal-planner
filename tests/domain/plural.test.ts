import { describe, expect, it } from 'vitest';
import { pluralForm } from '../../src/domain/plural';

describe('pluralForm', () => {
  it.each([
    [1, 'one'],
    [2, 'few'],
    [4, 'few'],
    [5, 'many'],
    [12, 'many'],
    [14, 'many'],
    [22, 'few'],
    [0, 'many'],
    [1.5, 'many'],
  ])('%d → %s', (n, form) => {
    expect(pluralForm(n)).toBe(form);
  });
});
