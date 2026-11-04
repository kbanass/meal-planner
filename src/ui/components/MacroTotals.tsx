import { Icon } from 'framework7-react';
import type { MacroTotal } from '../view-models/week';

/** kcal, protein, fat and carbs as small icons with numbers (FR-004, FR-044, FR-045). */
export function MacroTotals({ totals, compact = false }: { totals: MacroTotal[]; compact?: boolean }) {
  return (
    <span className={compact ? 'macro-totals macro-totals-compact' : 'macro-totals'}>
      {totals.map((total) => (
        <span
          key={total.key}
          className={`macro-total macro-total-${total.key}`}
          aria-label={`${total.label}: ${total.value} ${total.unit}`}
          title={total.label}
        >
          <Icon f7={total.icon} aria-hidden="true" />
          <span className="macro-total-value" aria-hidden="true">
            {total.value}
            <span className="macro-total-unit"> {total.unit}</span>
          </span>
        </span>
      ))}
    </span>
  );
}
