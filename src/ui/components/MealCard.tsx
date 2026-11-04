import { Icon } from 'framework7-react';
import type { MealRow } from '../view-models/week';
import { DishAvatar } from './DishAvatar';

/** Height of a Meal card, which its square photo fills. */
const CARD_HEIGHT = 104;

/** One Meal on the Week page: photo on the left, name, Servings and kcal (FR-042). */
export function MealCard({ row, onOpen }: { row: MealRow; onOpen(): void }) {
  return (
    <button type="button" className="meal-card" onClick={onOpen}>
      <DishAvatar name={row.avatarName} photo={row.photo} size={CARD_HEIGHT} shape="square" />
      <span className="meal-card-body">
        <span className="meal-card-title">{row.title}</span>
        <span className="meal-card-subtitle">{row.subtitle}</span>
        {row.badge && <span className="meal-card-chip">{row.badge}</span>}
      </span>
      <Icon f7="pencil" className="meal-card-edit" aria-hidden="true" />
    </button>
  );
}

/** A dashed card that adds something: a Meal to an empty Slot, or a Slot to the day. */
export function SlotAddCard({ label, onClick }: { label: string; onClick(): void }) {
  return (
    <button type="button" className="slot-add-card" onClick={onClick}>
      <Icon f7="plus" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
