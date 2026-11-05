import { Icon } from 'framework7-react';
import { useRef } from 'react';
import type { IsoDate } from '../../domain/types';
import { useWeekTrackGesture } from '../hooks/useWeekTrackGesture';
import type { WeekFace } from '../view-models/week';
import { faceTransform, type FaceOffset } from '../view-models/week-track';
import { DayStrip } from './DayStrip';

interface WeekTrackProps {
  /** The five faces from `weekTrackFaces`, offsets −2…2. */
  faces: WeekFace[];
  /** Commits a Week change of ±7·n days; called inside `flushSync`. */
  onMove(days: number): void;
  onSelect(date: IsoDate): void;
}

/**
 * The Week card's month label and day strip on a rail of five Weeks (feature 003,
 * contracts/ui.md). The gesture adapter moves the rail; this only renders.
 */
export function WeekTrack({ faces, onMove, onSelect }: WeekTrackProps) {
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
                const faces = faceRefs.current;
                faces.set(face.offset, el);
                return () => {
                  if (faces.get(face.offset) === el) faces.delete(face.offset);
                };
              }}
            >
              <h2 className="week-card-month">{face.monthLabel}</h2>
              <DayStrip cells={face.strip} onSelect={onSelect} />
            </div>
          ))}
        </div>
      </div>
      {/* Visible on desktop; on phones the card is swiped, and these stay for screen readers. */}
      <div className="week-card-nav">
        <button
          type="button"
          className="round-button"
          aria-label="Poprzedni tydzień"
          onClick={() => step(-1)}
        >
          <Icon f7="arrow_left" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="round-button"
          aria-label="Następny tydzień"
          onClick={() => step(1)}
        >
          <Icon f7="arrow_right" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
