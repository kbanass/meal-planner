import type { DishCardModel } from '../view-models/dishes';
import { DishAvatar } from './DishAvatar';
import { MacroTotals } from './MacroTotals';

/** One Dish in Dania: photo, name, yield, one Serving's kcal and macros, notes (FR-046). */
export function DishCard({ card }: { card: DishCardModel }) {
  return (
    // A plain link: the Framework7 router opens the Dish form from it.
    <a href={`/dishes/${card.id}/`} className="dish-card">
      <DishAvatar name={card.name} photo={card.photo} size={88} shape="square" />
      <span className="dish-card-body">
        <span className="dish-card-name">{card.name}</span>
        <span className="dish-card-meta">{card.meta}</span>
        <span className="dish-card-totals">
          <span className="dish-card-per-serving">na porcję</span>
          <MacroTotals totals={card.totals} compact />
        </span>
        {card.notes && <span className="dish-card-notes">{card.notes}</span>}
      </span>
    </a>
  );
}
