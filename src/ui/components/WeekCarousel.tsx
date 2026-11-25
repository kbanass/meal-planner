import { Icon } from 'framework7-react';
import { useRef, type ReactNode } from 'react';
import type { IsoDate } from '../../domain/types';
import { useWeekTrackGesture } from '../hooks/useWeekTrackGesture';
import { faceTransform, type FaceOffset } from '../view-models/week-track';

export interface CarouselFace {
  weekStart: IsoDate;
  offset: FaceOffset;
  /** Only the viewed face is focusable and read by screen readers. */
  isViewed: boolean;
}

interface WeekCarouselProps<F extends CarouselFace> {
  /** Five faces, offsets −2…2. */
  faces: F[];
  /** Commits a Week change of ±7·n days; called inside `flushSync`. */
  onMove(days: number): void;
  renderFace(face: F): ReactNode;
  /** Extra class on the ← / → group, for a page that places them differently. */
  navClassName?: string;
}

/**
 * Five Weeks on one rail that follows the finger and settles on a Week (feature 003). Shared by
 * the Week card and the Shopping List header: the gesture adapter moves the rail, and each page
 * only says what a face shows.
 */
export function WeekCarousel<F extends CarouselFace>({ faces, onMove, renderFace, navClassName }: WeekCarouselProps<F>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const faceRefs = useRef(new Map<FaceOffset, HTMLElement>());
  const { step } = useWeekTrackGesture(trackRef, railRef, faceRefs, { onMove });

  return (
    <div className="week-track" ref={trackRef}>
      {/* Clips the rail with overflow, not clip-path: WebKit keeps the faces' layers composited. */}
      <div className="week-track-clip">
        <div className="week-track-rail" ref={railRef}>
          {faces.map((face) => (
            <div
              key={face.weekStart}
              className={face.isViewed ? 'week-face week-face-viewed' : 'week-face'}
              style={{ transform: faceTransform(face.offset) }}
              inert={!face.isViewed}
              aria-hidden={face.isViewed ? undefined : 'true'}
              ref={(el) => {
                if (!el) return;
                const refs = faceRefs.current;
                refs.set(face.offset, el);
                return () => {
                  if (refs.get(face.offset) === el) refs.delete(face.offset);
                };
              }}
            >
              {renderFace(face)}
            </div>
          ))}
        </div>
      </div>
      <div className={navClassName ? `week-card-nav ${navClassName}` : 'week-card-nav'}>
        <button type="button" className="round-button" aria-label="Poprzedni tydzień" onClick={() => step(-1)}>
          <Icon f7="arrow_left" aria-hidden="true" />
        </button>
        <button type="button" className="round-button" aria-label="Następny tydzień" onClick={() => step(1)}>
          <Icon f7="arrow_right" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
