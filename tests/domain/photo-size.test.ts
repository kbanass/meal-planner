import { describe, expect, it } from 'vitest';
import { fitWithin } from '../../src/domain/photo-size';

describe('fitWithin', () => {
  it.each([
    [4000, 3000, { width: 800, height: 600 }],
    [3000, 4000, { width: 600, height: 800 }],
    [1000, 1000, { width: 800, height: 800 }],
    [640, 480, { width: 640, height: 480 }],
    [8000, 1, { width: 800, height: 1 }],
  ])('fits %dx%d within 800 px as %o', (width, height, expected) => {
    expect(fitWithin(width, height, 800)).toEqual(expected);
  });
});
