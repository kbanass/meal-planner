import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import {
  WEEK_TRACK,
  classifyDrag,
  dragPosition,
  railTransform,
  releaseTarget,
  releaseVelocity,
  settleDuration,
  trackFrame,
  trackHeight,
  tweenPosition,
  type DragAxis,
  type FaceOffset,
  type VelocitySample,
} from '../view-models/week-track';

// The Week track's gesture adapter (feature 003, data-model.md "Gesture state"). It is the only
// code that touches pointer events, pointer capture, animation frames, matchMedia and
// clientWidth. Every decision and every number it writes comes from view-models/week-track.ts.

interface Tween {
  to: number;
  frame: number;
}

interface Gesture {
  /** Rail position in Weeks relative to the viewed Week; 0 is centred. */
  position: number;
  /** The Week the current gesture is measured from: 0 after every rebase. */
  anchor: number;
  pointerId: number | null;
  axis: DragAxis;
  start: { x: number; y: number; position: number };
  lastX: number;
  samples: VelocitySample[];
  pitch: number;
  /** Face heights, read when a gesture or settle starts and after a commit. */
  heights: Partial<Record<FaceOffset, number>>;
  tween: Tween | null;
}

interface TrackElements {
  track(): HTMLElement | null;
  rail(): HTMLElement | null;
  faces(): ReadonlyMap<FaceOffset, HTMLElement>;
  onMove(days: number): void;
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function createTrack(elements: TrackElements) {
  const g: Gesture = {
    position: 0,
    anchor: 0,
    pointerId: null,
    axis: 'pending',
    start: { x: 0, y: 0, position: 0 },
    lastX: 0,
    samples: [],
    pitch: 0,
    heights: {},
    tween: null,
  };

  /** One layout read per gesture, settle or commit, never per frame. */
  function measureHeights(): void {
    const heights: Partial<Record<FaceOffset, number>> = {};
    for (const [offset, face] of elements.faces()) heights[offset] = face.offsetHeight;
    g.heights = heights;
  }

  function writeFrame(): void {
    const frame = trackFrame(g.position);
    const rail = elements.rail();
    if (rail) rail.style.transform = railTransform(frame.railShift);
    const track = elements.track();
    const height = trackHeight(g.position, g.heights);
    if (track) track.style.height = height === null ? '' : `${height}px`;
    for (const [offset, face] of elements.faces()) {
      face.style.opacity = String(frame.opacities[offset]);
    }
  }

  /** The one way the Week changes (data-model rule 1): render it, then rebase, then draw. */
  function commit(n: number): void {
    if (n !== 0) {
      flushSync(() => elements.onMove(7 * n));
      g.position -= n;
      if (g.position !== 0) measureHeights();
    }
    writeFrame();
  }

  function stopTween(): Tween | null {
    const tween = g.tween;
    if (tween) {
      cancelAnimationFrame(tween.frame);
      g.tween = null;
    }
    return tween;
  }

  /** A touch or a button during a settle finishes it at once (spec FR-017, rule 3). */
  function catchSettle(): void {
    const tween = stopTween();
    if (tween) commit(tween.to);
  }

  function settle(to: number): void {
    stopTween();
    // Read at every settle, so a change in system settings applies at once (research R7).
    if (window.matchMedia(REDUCED_MOTION).matches) {
      g.position = to;
      commit(to);
      return;
    }
    measureHeights();
    const from = g.position;
    const duration = settleDuration(to - from);
    const startT = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startT;
      g.position = tweenPosition(from, to, elapsed, duration);
      if (elapsed >= duration) {
        g.tween = null;
        commit(to);
        return;
      }
      writeFrame();
      if (g.tween) g.tween.frame = requestAnimationFrame(tick);
    };
    g.tween = { to, frame: requestAnimationFrame(tick) };
  }

  /** Back to the anchor, so the face never stays between Weeks (rule 4). */
  function settleToAnchor(): void {
    if (g.position !== g.anchor) settle(g.anchor);
  }

  function accepts(event: PointerEvent, track: HTMLElement): boolean {
    if (g.pointerId !== null) return false;
    return track.clientWidth > 0;
  }

  function onPointerDown(event: PointerEvent): void {
    const track = elements.track();
    // Filter, then catch, then record: an ignored pointer never touches a running settle.
    if (!track || !accepts(event, track)) return;
    catchSettle();
    g.pointerId = event.pointerId;
    g.anchor = 0;
    g.axis = 'pending';
    g.start = { x: event.clientX, y: event.clientY, position: g.position };
    g.lastX = event.clientX;
    g.samples = [{ t: event.timeStamp, x: event.clientX }];
    g.pitch = track.clientWidth + WEEK_TRACK.GAP_PX;
    measureHeights();
  }

  function onPointerMove(event: PointerEvent): void {
    if (event.pointerId !== g.pointerId) return;
    const dx = event.clientX - g.start.x;
    const dy = event.clientY - g.start.y;
    if (g.axis === 'pending') {
      g.axis = classifyDrag(dx, dy);
      if (g.axis === 'pending') return;
      if (g.axis === 'horizontal') elements.track()?.setPointerCapture(event.pointerId);
    }
    if (g.axis !== 'horizontal') return;
    g.position = dragPosition(g.start.position, dx, g.pitch, g.anchor);
    g.lastX = event.clientX;
    g.samples.push({ t: event.timeStamp, x: event.clientX });
    g.samples = g.samples.filter((s) => s.t >= event.timeStamp - WEEK_TRACK.VELOCITY_WINDOW_MS);
    writeFrame();
  }

  function onPointerUp(event: PointerEvent): void {
    if (event.pointerId !== g.pointerId) return;
    // Cleared first, so the lostpointercapture that follows a release is a no-op.
    g.pointerId = null;
    if (g.axis === 'horizontal') {
      settle(
        releaseTarget({
          anchor: g.anchor,
          position: g.position,
          velocity: releaseVelocity(g.samples, event.timeStamp),
          movedPx: g.lastX - g.start.x,
        }),
      );
    } else {
      settleToAnchor();
    }
  }

  function onPointerCancel(event: PointerEvent): void {
    if (event.pointerId !== g.pointerId) return;
    g.pointerId = null;
    settleToAnchor();
  }

  /** The ← / → buttons: the same path as a flick, so quick clicks chain (research R8). */
  function step(direction: 1 | -1): void {
    catchSettle();
    settle(direction);
  }

  function attach(track: HTMLElement): () => void {
    writeFrame();
    track.addEventListener('pointerdown', onPointerDown);
    track.addEventListener('pointermove', onPointerMove);
    track.addEventListener('pointerup', onPointerUp);
    track.addEventListener('pointercancel', onPointerCancel);
    return () => {
      track.removeEventListener('pointerdown', onPointerDown);
      track.removeEventListener('pointermove', onPointerMove);
      track.removeEventListener('pointerup', onPointerUp);
      track.removeEventListener('pointercancel', onPointerCancel);
      stopTween();
      g.pointerId = null;
    };
  }

  return { attach, step };
}

/**
 * Makes the Week track follow the finger and settle on a Week (feature 003). React learns about
 * a gesture only through `onMove(days)`, called inside `flushSync` when a Week is reached.
 */
export function useWeekTrackGesture(
  trackRef: RefObject<HTMLElement | null>,
  railRef: RefObject<HTMLElement | null>,
  faceRefs: RefObject<Map<FaceOffset, HTMLElement>>,
  { onMove }: { onMove(days: number): void },
): { step(direction: 1 | -1): void } {
  const onMoveRef = useRef(onMove);
  useEffect(() => {
    onMoveRef.current = onMove;
  });
  const controllerRef = useRef<ReturnType<typeof createTrack> | null>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    const controller = createTrack({
      track: () => trackRef.current,
      rail: () => railRef.current,
      faces: () => faceRefs.current,
      onMove: (days) => onMoveRef.current(days),
    });
    controllerRef.current = controller;
    const detach = controller.attach(el);
    return () => {
      detach();
      controllerRef.current = null;
    };
  }, [trackRef, railRef, faceRefs]);

  const step = useCallback((direction: 1 | -1) => controllerRef.current?.step(direction), []);
  return { step };
}
