// The Week track's gesture rules (feature 003, research R4–R6): pure functions, no DOM.
// The adapter in src/ui/hooks/useWeekTrackGesture.ts only wires events to these.

/** Tunable gesture thresholds. Tests read these fields, not literal values. */
export const WEEK_TRACK = {
  GAP_PX: 12, // space between faces (FR-002)
  EDGE_ZONE_PX: 24, // ignore starts this close to a viewport edge (FR-011)
  SLOP_PX: 8, // movement before the axis is decided (FR-005, FR-010)
  COMMIT_RATIO: 1 / 3, // of the pitch (FR-005)
  FLICK_VELOCITY: 0.3, // px/ms
  FLICK_MIN_PX: 20,
  VELOCITY_WINDOW_MS: 100,
  RESISTANCE: 0.35, // rubber band past anchor ± 1
  DIM_OPACITY: 0.5, // neighbour strength (FR-004)
  SETTLE_MIN_MS: 150, // FR-006
  SETTLE_MAX_MS: 250,
  // Motion blur: the moving card softens with speed, like a camera, and is sharp at rest.
  BLUR_MIN_SPEED: 0.5, // px/ms: slower than this stays sharp
  BLUR_PX_PER_SPEED: 1, // px of blur per px/ms above BLUR_MIN_SPEED
  BLUR_MAX_PX: 2,
  BLUR_SMOOTHING: 0.5, // weight of the newest speed sample, so the blur doesn't flicker
  BLUR_STEP_PX: 0.25, // blur is rounded to this, so tiny changes aren't redrawn
} as const;

export type FaceOffset = -2 | -1 | 0 | 1 | 2;

export const FACE_OFFSETS: readonly FaceOffset[] = [-2, -1, 0, 1, 2];

export type DragAxis = 'pending' | 'horizontal' | 'vertical';

export interface VelocitySample {
  t: number; // ms
  x: number; // px
}

/** A start this close to a screen edge belongs to the system's edge swipe (FR-011). */
export function inEdgeZone(x: number, viewportWidth: number): boolean {
  return x < WEEK_TRACK.EDGE_ZONE_PX || x > viewportWidth - WEEK_TRACK.EDGE_ZONE_PX;
}

/** Axis lock after the slop (FR-010). A tie scrolls. */
export function classifyDrag(dx: number, dy: number): DragAxis {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < WEEK_TRACK.SLOP_PX) return 'pending';
  return ax > ay ? 'horizontal' : 'vertical';
}

/**
 * The rail position, in Weeks, while the finger is down. Dragging left moves towards the next
 * Week. Past `anchor ± 1`, the excess is resisted.
 */
export function dragPosition(
  startPosition: number,
  dxPx: number,
  pitchPx: number,
  anchor: number,
): number {
  if (!(pitchPx > 0)) return startPosition;
  const raw = startPosition - dxPx / pitchPx;
  const high = anchor + 1;
  const low = anchor - 1;
  if (raw > high) return high + (raw - high) * WEEK_TRACK.RESISTANCE;
  if (raw < low) return low + (raw - low) * WEEK_TRACK.RESISTANCE;
  return raw;
}

/** The finger's speed in px/ms over the last VELOCITY_WINDOW_MS of samples. */
export function releaseVelocity(samples: readonly VelocitySample[], nowT: number): number {
  const recent = samples.filter((s) => s.t >= nowT - WEEK_TRACK.VELOCITY_WINDOW_MS);
  const first = recent[0];
  const last = recent[recent.length - 1];
  if (!first || !last || recent.length < 2) return 0;
  const span = last.t - first.t;
  const velocity = (last.x - first.x) / span;
  return span > 0 && Number.isFinite(velocity) ? velocity : 0;
}

/** Where a release settles: always within `anchor ± 1` (research R4, FR-005, FR-009). */
export function releaseTarget({
  anchor,
  position,
  velocity,
  movedPx,
}: {
  anchor: number;
  position: number;
  velocity: number;
  movedPx: number;
}): number {
  const isFlick =
    Math.abs(velocity) >= WEEK_TRACK.FLICK_VELOCITY &&
    Math.abs(movedPx) >= WEEK_TRACK.FLICK_MIN_PX &&
    Math.sign(velocity) === Math.sign(movedPx);
  // A flick decides before distance: after a catch the card can rest past a third the other
  // way (say −0.4), and a flick left from there must still show the next Week (FR-017).
  // A finger moving left (negative px) shows the next Week.
  if (isFlick) return velocity < 0 ? anchor + 1 : anchor - 1;
  const d = position - anchor;
  if (d >= WEEK_TRACK.COMMIT_RATIO) return anchor + 1;
  if (d <= -WEEK_TRACK.COMMIT_RATIO) return anchor - 1;
  return anchor;
}

/** 150 ms for a short spring-back up to 250 ms for a full Week (FR-006). */
export function settleDuration(distance: number): number {
  const { SETTLE_MIN_MS: min, SETTLE_MAX_MS: max } = WEEK_TRACK;
  return min + (max - min) * Math.min(1, Math.abs(distance));
}

export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - (1 - clamped) ** 3;
}

export function tweenPosition(
  from: number,
  to: number,
  elapsedMs: number,
  durationMs: number,
): number {
  if (!(durationMs > 0) || elapsedMs >= durationMs) return to;
  return from + (to - from) * easeOutCubic(elapsedMs / durationMs);
}

export interface TrackFrame {
  /** The rail's shift, in pitches. */
  railShift: number;
  opacities: Record<FaceOffset, number>;
}

/** The rail shift and each face's strength at `position` (research R6, FR-004). */
export function trackFrame(position: number): TrackFrame {
  const opacity = (offset: FaceOffset) =>
    1 - (1 - WEEK_TRACK.DIM_OPACITY) * Math.min(1, Math.abs(offset - position));
  return {
    railShift: -position,
    opacities: {
      [-2]: opacity(-2),
      [-1]: opacity(-1),
      0: opacity(0),
      1: opacity(1),
      2: opacity(2),
    },
  };
}

/**
 * The track's height, in px, between two Weeks whose month labels take a different number of
 * lines: it moves with the position, so the totals below slide instead of jumping. `null` at
 * rest, between two Weeks of the same height, or when a height is unknown, leaves the height
 * to the layout.
 */
export function trackHeight(
  position: number,
  heights: Partial<Record<FaceOffset, number>>,
): number | null {
  if (position === 0) return null;
  const clamped = Math.min(2, Math.max(-2, position));
  const low = Math.floor(clamped);
  const high = Math.min(2, low + 1);
  const lowHeight = heights[low as FaceOffset];
  const highHeight = heights[high as FaceOffset];
  // Equal heights need no override, so the usual drag causes no layout at all.
  if (lowHeight === undefined || highHeight === undefined || lowHeight === highHeight) return null;
  return lowHeight + (highHeight - lowHeight) * (clamped - low);
}

/**
 * How far the selected pill has faded in on each face (0–1). Only a settle heading to another
 * Week fades one in, on that Week's face, in step with the slide; a held drag only peeks, and a
 * spring-back fades nothing (the viewed Week is already selected).
 */
export function selectionFades(
  tween: { from: number; to: number } | null,
  position: number,
): Record<FaceOffset, number> {
  const fades: Record<FaceOffset, number> = { [-2]: 0, [-1]: 0, 0: 0, 1: 0, 2: 0 };
  if (!tween || tween.to === 0 || !FACE_OFFSETS.includes(tween.to as FaceOffset)) return fades;
  const distance = Math.abs(tween.to - tween.from);
  const progress = distance > 0 ? 1 - Math.abs(tween.to - position) / distance : 1;
  fades[tween.to as FaceOffset] = Math.min(1, Math.max(0, progress));
  return fades;
}

export interface MotionSample {
  t: number; // ms
  position: number; // Weeks
}

/** How fast the rail moved between two frames, in px/ms. */
export function frameSpeed(
  previous: MotionSample,
  current: MotionSample,
  pitchPx: number,
): number {
  const dt = current.t - previous.t;
  if (!(dt > 0) || !(pitchPx > 0)) return 0;
  const speed = (Math.abs(current.position - previous.position) * pitchPx) / dt;
  return Number.isFinite(speed) ? speed : 0;
}

/** Eases the measured speed towards the newest sample. */
export function smoothSpeed(previous: number, sample: number): number {
  return previous + (sample - previous) * WEEK_TRACK.BLUR_SMOOTHING;
}

/** The blur radius, in px, for a speed in px/ms: 0 when slow, at most BLUR_MAX_PX. */
export function motionBlur(speed: number): number {
  const { BLUR_MIN_SPEED, BLUR_PX_PER_SPEED, BLUR_MAX_PX, BLUR_STEP_PX } = WEEK_TRACK;
  const raw = Math.min(BLUR_MAX_PX, Math.max(0, (speed - BLUR_MIN_SPEED) * BLUR_PX_PER_SPEED));
  return Math.round(raw / BLUR_STEP_PX) * BLUR_STEP_PX;
}

/** The CSS filter for a blur radius: none at all at 0, so text at rest is fully sharp. */
export function blurFilter(px: number): string {
  return px > 0 ? `blur(${formatPitches(px)}px)` : '';
}

/** A plain decimal, never in exponent notation, with -0 shown as 0. */
function formatPitches(n: number): string {
  const rounded = Number(n.toFixed(5));
  return String(rounded === 0 ? 0 : rounded);
}

function pitchTransform(n: number): string {
  return `translateX(calc(${formatPitches(n)} * (100% + ${WEEK_TRACK.GAP_PX}px)))`;
}

export function railTransform(shift: number): string {
  return pitchTransform(shift);
}

export function faceTransform(offset: number): string {
  return pitchTransform(offset);
}
