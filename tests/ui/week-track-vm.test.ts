import { describe, expect, it } from 'vitest';
import {
  WEEK_TRACK,
  blurFilter,
  frameSpeed,
  motionBlur,
  smoothSpeed,
  classifyDrag,
  dragPosition,
  easeOutCubic,
  faceTransform,
  inEdgeZone,
  railTransform,
  releaseTarget,
  selectionFades,
  releaseVelocity,
  settleDuration,
  trackFrame,
  trackHeight,
  tweenPosition,
} from '../../src/ui/view-models/week-track';

describe('inEdgeZone', () => {
  const width = 390;
  const zone = WEEK_TRACK.EDGE_ZONE_PX;

  it.each([
    [0, true],
    [zone - 1, true],
    [zone, false],
    [width - zone, false],
    [width - zone + 1, true],
  ])('x %d of %d → %s', (x, expected) => {
    expect(inEdgeZone(x, width)).toBe(expected);
  });
});

describe('classifyDrag', () => {
  it.each([
    [5, 2, 'pending'],
    [9, 2, 'horizontal'],
    [-9, 2, 'horizontal'],
    [6, 9, 'vertical'],
    [9, 9, 'vertical'],
  ] as const)('(%d, %d) → %s', (dx, dy, expected) => {
    expect(classifyDrag(dx, dy)).toBe(expected);
  });

  it('stays pending just under the slop', () => {
    expect(classifyDrag(WEEK_TRACK.SLOP_PX - 0.5, 0)).toBe('pending');
  });
});

describe('dragPosition', () => {
  const pitch = 372;

  it('turns a drag left by half the pitch into +0.5, and right into −0.5', () => {
    expect(dragPosition(0, -pitch / 2, pitch, 0)).toBeCloseTo(0.5, 10);
    expect(dragPosition(0, pitch / 2, pitch, 0)).toBeCloseTo(-0.5, 10);
  });

  it('resists past anchor ± 1', () => {
    expect(dragPosition(0, -1.5 * pitch, pitch, 0)).toBeCloseTo(1 + 0.5 * WEEK_TRACK.RESISTANCE, 10);
    expect(dragPosition(0, 1.5 * pitch, pitch, 0)).toBeCloseTo(-1 - 0.5 * WEEK_TRACK.RESISTANCE, 10);
  });

  it('starts from the caught position', () => {
    expect(dragPosition(-0.3, -0.2 * pitch, pitch, 0)).toBeCloseTo(-0.1, 10);
  });

  it('leaves the position unchanged without a pitch', () => {
    expect(dragPosition(0.25, -100, 0, 0)).toBe(0.25);
  });
});

describe('releaseVelocity', () => {
  it('measures a steady 1 px/ms', () => {
    const samples = [0, 10, 20, 30].map((t) => ({ t, x: 100 + t }));
    expect(releaseVelocity(samples, 30)).toBeCloseTo(1, 10);
  });

  it('ignores samples older than the window', () => {
    const window = WEEK_TRACK.VELOCITY_WINDOW_MS;
    const samples = [
      { t: 0, x: 0 },
      { t: 500 - window - 1, x: 0 },
      { t: 500 - window / 2, x: 100 },
      { t: 500, x: 50 },
    ];
    expect(releaseVelocity(samples, 500)).toBeCloseTo(-50 / (window / 2), 10);
  });

  it('gives 0 for one sample', () => {
    expect(releaseVelocity([{ t: 10, x: 5 }], 10)).toBe(0);
  });

  it('gives 0 for equal timestamps', () => {
    expect(
      releaseVelocity(
        [
          { t: 10, x: 5 },
          { t: 10, x: 40 },
        ],
        10,
      ),
    ).toBe(0);
  });

  it('gives 0 for non-finite values', () => {
    expect(
      releaseVelocity(
        [
          { t: 0, x: 0 },
          { t: 10, x: Number.NaN },
        ],
        10,
      ),
    ).toBe(0);
  });
});

describe('releaseTarget', () => {
  const slow = { velocity: 0, movedPx: 0 };

  it('commits past a third of the pitch', () => {
    expect(releaseTarget({ anchor: 0, position: 0.34, ...slow })).toBe(1);
    expect(releaseTarget({ anchor: 0, position: -0.34, ...slow })).toBe(-1);
  });

  it('springs back under a third when slow', () => {
    expect(releaseTarget({ anchor: 0, position: 0.32, ...slow })).toBe(0);
  });

  it('commits a quick flick', () => {
    expect(releaseTarget({ anchor: 0, position: 0.07, velocity: -0.4, movedPx: -25 })).toBe(1);
    expect(releaseTarget({ anchor: 0, position: -0.07, velocity: 0.4, movedPx: 25 })).toBe(-1);
  });

  it('ignores a quick flick that moved too little', () => {
    expect(releaseTarget({ anchor: 0, position: 0.04, velocity: -0.4, movedPx: -15 })).toBe(0);
  });

  it('ignores a flick against the drag direction', () => {
    expect(releaseTarget({ anchor: 0, position: 0.07, velocity: -0.4, movedPx: 25 })).toBe(0);
  });

  it('never moves more than one Week', () => {
    expect(releaseTarget({ anchor: 0, position: 1.4, ...slow })).toBe(1);
    expect(releaseTarget({ anchor: 0, position: -1.4, ...slow })).toBe(-1);
  });

  it('commits a flick left after a catch at −0.2', () => {
    expect(releaseTarget({ anchor: 0, position: -0.2, velocity: -0.4, movedPx: -25 })).toBe(1);
  });

  it('lets a flick win over distance after a catch past a third', () => {
    expect(releaseTarget({ anchor: 0, position: -0.4, velocity: -0.4, movedPx: -25 })).toBe(1);
    expect(releaseTarget({ anchor: 0, position: 0.4, velocity: 0.4, movedPx: 25 })).toBe(-1);
  });
});

describe('settleDuration', () => {
  const { SETTLE_MIN_MS: min, SETTLE_MAX_MS: max } = WEEK_TRACK;

  it.each([
    [0, min],
    [0.5, (min + max) / 2],
    [-0.5, (min + max) / 2],
    [1, max],
    [1.3, max],
  ])('distance %d → %d ms', (distance, expected) => {
    expect(settleDuration(distance)).toBeCloseTo(expected, 10);
  });
});

describe('easeOutCubic', () => {
  it.each([
    [0, 0],
    [1, 1],
    [0.5, 0.875],
    [-1, 0],
    [2, 1],
  ])('%d → %d', (t, expected) => {
    expect(easeOutCubic(t)).toBeCloseTo(expected, 10);
  });
});

describe('tweenPosition', () => {
  it('is 87.5% of the way at half the duration', () => {
    expect(tweenPosition(0, 1, 100, 200)).toBeCloseTo(0.875, 10);
    expect(tweenPosition(0.4, 0, 100, 200)).toBeCloseTo(0.05, 10);
  });

  it('ends on the target past the duration', () => {
    expect(tweenPosition(0, 1, 300, 200)).toBe(1);
  });

  it('jumps to the target with no duration', () => {
    expect(tweenPosition(0.3, -1, 0, 0)).toBe(-1);
  });
});

describe('trackFrame', () => {
  it('centres the viewed face at full strength and dims the others', () => {
    const frame = trackFrame(0);
    expect(frame.railShift).toBeCloseTo(0, 10);
    expect(frame.opacities).toEqual({
      [-2]: WEEK_TRACK.DIM_OPACITY,
      [-1]: WEEK_TRACK.DIM_OPACITY,
      0: 1,
      1: WEEK_TRACK.DIM_OPACITY,
      2: WEEK_TRACK.DIM_OPACITY,
    });
  });

  it('brightens the arriving face with progress', () => {
    const frame = trackFrame(0.5);
    const half = 1 - (1 - WEEK_TRACK.DIM_OPACITY) * 0.5;
    expect(frame.railShift).toBe(-0.5);
    expect(frame.opacities[0]).toBeCloseTo(half, 10);
    expect(frame.opacities[1]).toBeCloseTo(half, 10);
    expect(frame.opacities[-1]).toBe(WEEK_TRACK.DIM_OPACITY);
  });
});

describe('railTransform and faceTransform', () => {
  it.each([
    [0, 'translateX(calc(0 * (100% + 12px)))'],
    [-0, 'translateX(calc(0 * (100% + 12px)))'],
    [1, 'translateX(calc(1 * (100% + 12px)))'],
    [-0.25, 'translateX(calc(-0.25 * (100% + 12px)))'],
  ])('%d → %s', (n, expected) => {
    expect(railTransform(n)).toBe(expected);
    expect(faceTransform(n)).toBe(expected);
  });

  it('never uses exponent notation', () => {
    expect(railTransform(1e-9)).toBe('translateX(calc(0 * (100% + 12px)))');
    expect(railTransform(-1.23456789)).toBe('translateX(calc(-1.23457 * (100% + 12px)))');
    expect(railTransform(1e-5)).toBe('translateX(calc(0.00001 * (100% + 12px)))');
  });
});

describe('trackHeight', () => {
  const heights = { [-2]: 123, [-1]: 152, 0: 123, 1: 123, 2: 152 };

  it('leaves the height to the layout at rest', () => {
    expect(trackHeight(0, heights)).toBeNull();
  });

  it('moves between the two Weeks in view', () => {
    expect(trackHeight(-0.5, heights)).toBeCloseTo(137.5, 10);
    expect(trackHeight(-0.75, heights)).toBeCloseTo(123 + 29 * 0.75, 10);
    expect(trackHeight(1.25, heights)).toBeCloseTo(123 + 29 * 0.25, 10);
    expect(trackHeight(-1, heights)).toBe(152);
  });

  it('stays within the five faces, with nothing past ±2', () => {
    expect(trackHeight(1.6, heights)).toBeCloseTo(123 + 29 * 0.6, 10);
    expect(trackHeight(2.4, heights)).toBeNull();
    expect(trackHeight(-2.4, heights)).toBe(123);
  });

  it('gives no height between two Weeks of the same height', () => {
    expect(trackHeight(0.5, heights)).toBeNull();
  });

  it('gives no height when one is unknown', () => {
    expect(trackHeight(0.5, { 0: 123 })).toBeNull();
  });
});

describe('frameSpeed', () => {
  it('turns a position change into px/ms', () => {
    expect(frameSpeed({ t: 0, position: 0 }, { t: 16, position: 0.1 }, 320)).toBeCloseTo(2, 10);
    expect(frameSpeed({ t: 0, position: 0.1 }, { t: 16, position: 0 }, 320)).toBeCloseTo(2, 10);
  });

  it('gives 0 with no time, no pitch or non-finite values', () => {
    expect(frameSpeed({ t: 16, position: 0 }, { t: 16, position: 0.5 }, 320)).toBe(0);
    expect(frameSpeed({ t: 0, position: 0 }, { t: 16, position: 0.5 }, 0)).toBe(0);
    expect(frameSpeed({ t: 0, position: 0 }, { t: 16, position: Number.NaN }, 320)).toBe(0);
  });
});

describe('smoothSpeed', () => {
  it('moves towards the newest sample by BLUR_SMOOTHING', () => {
    expect(smoothSpeed(0, 2)).toBeCloseTo(2 * WEEK_TRACK.BLUR_SMOOTHING, 10);
    expect(smoothSpeed(2, 2)).toBe(2);
  });
});

describe('motionBlur', () => {
  const { BLUR_MIN_SPEED: min, BLUR_PX_PER_SPEED: per, BLUR_MAX_PX: max, BLUR_STEP_PX: step } =
    WEEK_TRACK;

  it('stays sharp when slow', () => {
    expect(motionBlur(0)).toBe(0);
    expect(motionBlur(min)).toBe(0);
  });

  it('grows with speed, rounded to the step', () => {
    expect(motionBlur(min + (4 * step) / per)).toBeCloseTo(4 * step, 10);
    expect(motionBlur(min + (4.4 * step) / per)).toBeCloseTo(4 * step, 10);
  });

  it('never passes the maximum', () => {
    expect(motionBlur(100)).toBe(max);
  });
});

describe('blurFilter', () => {
  it('removes the filter at 0 and writes plain decimals otherwise', () => {
    expect(blurFilter(0)).toBe('');
    expect(blurFilter(1.25)).toBe('blur(1.25px)');
  });
});

describe('selectionFades', () => {
  const none = { [-2]: 0, [-1]: 0, 0: 0, 1: 0, 2: 0 };

  it('shows no arriving selection while no settle runs: a held drag only peeks', () => {
    expect(selectionFades(null, 0.4)).toEqual(none);
  });

  it('fades the arriving Week\'s selection in with the settle', () => {
    expect(selectionFades({ from: 0.2, to: 1 }, 0.2)).toEqual(none);
    expect(selectionFades({ from: 0.2, to: 1 }, 0.6)[1]).toBeCloseTo(0.5, 10);
    expect(selectionFades({ from: 0.2, to: 1 }, 1)[1]).toBe(1);
    expect(selectionFades({ from: -0.3, to: -1 }, -0.65)[-1]).toBeCloseTo(0.5, 10);
    expect(selectionFades({ from: 0.2, to: 1 }, 0.6)[0]).toBe(0);
  });

  it('fades nothing in on a spring-back: the viewed Week is already selected', () => {
    expect(selectionFades({ from: 0.2, to: 0 }, 0.1)).toEqual(none);
  });

  it('is fully in when the settle has no distance', () => {
    expect(selectionFades({ from: 1, to: 1 }, 1)[1]).toBe(1);
  });
});
