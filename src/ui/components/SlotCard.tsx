import { Icon } from 'framework7-react';
import type { MacroTotal, MealRow } from '../view-models/week';
import { DishAvatar } from './DishAvatar';
import { MacroTotals } from './MacroTotals';

/** Size of a Meal's photo inside its Slot card. */
const PHOTO_SIZE = 64;

interface SlotCardProps {
  slot: { number: number; rows: MealRow[]; totals: MacroTotal[] };
  onOpenMeal(row: MealRow): void;
  onAdd(): void;
}

/**
 * One Slot as a card: its number and Planned totals, its Meals as rows, and adding a Meal
 * (FR-008, FR-042, FR-044).
 */
export function SlotCard({ slot, onOpenMeal, onAdd }: SlotCardProps) {
  const empty = slot.rows.length === 0;
  return (
    <section className="slot-card" data-slot={slot.number}>
      <header className="slot-card-header">
        <span className="slot-number">{slot.number}</span>
        {!empty && <MacroTotals totals={slot.totals} compact />}
      </header>
      {slot.rows.map((row) => (
        <button key={row.id} type="button" className="meal-row" onClick={() => onOpenMeal(row)}>
          <DishAvatar name={row.avatarName} photo={row.photo} size={PHOTO_SIZE} shape="square" />
          <span className="meal-row-body">
            <span className="meal-row-title">{row.title}</span>
            <span className="meal-row-subtitle">{row.subtitle}</span>
            {row.badge && <span className="meal-row-chip">{row.badge}</span>}
          </span>
          <Icon f7="pencil" className="meal-row-edit" aria-hidden="true" />
        </button>
      ))}
      <button
        type="button"
        className={empty ? 'slot-add slot-add-empty' : 'slot-add'}
        onClick={onAdd}
      >
        <Icon f7="plus" aria-hidden="true" />
        <span>Dodaj posiłek</span>
      </button>
    </section>
  );
}
