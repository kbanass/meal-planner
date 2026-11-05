import type { IsoDate } from '../../domain/types';
import type { StripCell } from '../view-models/week';

interface DayStripProps {
  cells: StripCell[];
  onSelect(date: IsoDate): void;
}

/** The Week card's seven days: tapping one selects it (FR-001, FR-003, FR-004, FR-007). */
export function DayStrip({ cells, onSelect }: DayStripProps) {
  return (
    <div className="day-strip" role="group" aria-label="Dni tygodnia">
      {cells.map((cell) => (
        <button
          key={cell.date}
          type="button"
          className={[
            'day-pill',
            cell.isSelected ? 'day-pill-selected' : '',
            cell.isToday ? 'day-pill-today' : '',
          ].join(' ')}
          aria-pressed={cell.isSelected}
          aria-label={cell.ariaLabel}
          onClick={() => onSelect(cell.date)}
        >
          <span className="day-pill-name">{cell.shortName}</span>
          <span className="day-pill-number">{cell.dayNumber}</span>
          <span className="day-pill-kcal">{cell.kcal}</span>
        </button>
      ))}
    </div>
  );
}
