import type { IsoDate } from '../../domain/types';
import type { WeekFace } from '../view-models/week';
import { DayStrip } from './DayStrip';
import { WeekCarousel } from './WeekCarousel';

interface WeekTrackProps {
  /** The five faces from `weekTrackFaces`, offsets −2…2. */
  faces: WeekFace[];
  /** Commits a Week change of ±7·n days; called inside `flushSync`. */
  onMove(days: number): void;
  onSelect(date: IsoDate): void;
}

/**
 * The Week card's month label and day strip on the shared Week carousel (feature 003,
 * contracts/ui.md). On phones the ← / → buttons are hidden and kept for screen readers.
 */
export function WeekTrack({ faces, onMove, onSelect }: WeekTrackProps) {
  return (
    <WeekCarousel
      faces={faces}
      onMove={onMove}
      renderFace={(face) => (
        <>
          <h2 className="week-card-month">{face.monthLabel}</h2>
          <DayStrip cells={face.strip} onSelect={onSelect} />
        </>
      )}
    />
  );
}
