import { act } from '@testing-library/react';

// Helpers that drive the Week track with PointerEvents and fixed timestamps (research R10).

export interface PointerOptions {
  x: number;
  y: number;
  t: number;
  pointerId?: number;
  pointerType?: string;
}

/** jsdom has no layout: give the track the width the adapter reads. */
export function setTrackWidth(el: Element, px: number): void {
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: px });
}

/** Dispatches one bubbling PointerEvent, with its timeStamp fixed to `t`. */
export function pointer(
  el: Element,
  type: string,
  { x, y, t, pointerId = 1, pointerType = 'touch' }: PointerOptions,
): void {
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    pointerId,
    pointerType,
    isPrimary: true,
  });
  Object.defineProperty(event, 'timeStamp', { configurable: true, value: t });
  act(() => {
    el.dispatchEvent(event);
  });
}

export interface DragOptions {
  from: [number, number];
  to: [number, number];
  steps: number;
  durationMs: number;
  startT?: number;
  pointerType?: string;
  pointerId?: number;
}

/** Down, `steps` evenly spaced moves, then up. */
export function drag(
  el: Element,
  { from, to, steps, durationMs, startT = 0, pointerType, pointerId }: DragOptions,
): void {
  const [x0, y0] = from;
  const [x1, y1] = to;
  pointer(el, 'pointerdown', { x: x0, y: y0, t: startT, pointerType, pointerId });
  for (let i = 1; i <= steps; i++) {
    const f = i / steps;
    pointer(el, 'pointermove', {
      x: x0 + (x1 - x0) * f,
      y: y0 + (y1 - y0) * f,
      t: startT + durationMs * f,
      pointerType,
      pointerId,
    });
  }
  pointer(el, 'pointerup', { x: x1, y: y1, t: startT + durationMs, pointerType, pointerId });
}

/** Down and up with no move, then the click the browser sends after a tap. */
export function tap(el: Element, { x = 180, y = 40, t = 0 } = {}): void {
  pointer(el, 'pointerdown', { x, y, t });
  pointer(el, 'pointerup', { x, y, t: t + 40 });
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}
