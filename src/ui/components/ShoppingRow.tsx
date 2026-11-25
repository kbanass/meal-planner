import { Icon, SwipeoutActions, SwipeoutButton } from 'framework7-react';
import type { ExtraRow, ProductRow, ShoppingRow as Row } from '../view-models/shopping';

interface ShoppingRowProps {
  row: Row;
  onToggleTick(row: Row): void;
  onToggleAtHome(row: ProductRow): void;
  onOpenAmount(row: ProductRow): void;
  onOpenExtra(row: ExtraRow): void;
  onDelete(row: ExtraRow): void;
}

function rowClass(row: Row, extra: string[] = []): string {
  return [
    'shopping-row',
    ...extra,
    row.ticked ? 'is-ticked' : '',
    row.kind === 'product' && row.atHome ? 'is-at-home' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** The tick: Framework7's checkbox alone (FR-011); the name opens the row's edit sheet. */
function Tick({ row, onToggle }: { row: Row; onToggle(): void }) {
  return (
    <label className="item-checkbox shopping-tick">
      <input type="checkbox" checked={row.ticked} onChange={onToggle} aria-label={row.name} />
      <i className="icon icon-checkbox" />
    </label>
  );
}

/**
 * One Shopping List row (contracts/ui.md "Rows", research R7). A Product row has the tick, the
 * name-and-amount button and the At Home button; an Extra row has the tick, its name-and-amount
 * button and a swipe-to-delete.
 */
export function ShoppingRow({ row, onToggleTick, onToggleAtHome, onOpenAmount, onOpenExtra, onDelete }: ShoppingRowProps) {
  if (row.kind === 'extra') {
    return (
      <li className={rowClass(row, ['swipeout'])}>
        <div className="swipeout-content shopping-row-inner">
          <Tick row={row} onToggle={() => onToggleTick(row)} />
          <button type="button" className="shopping-open" aria-label={row.openLabel} onClick={() => onOpenExtra(row)}>
            <span className="shopping-name">{row.name}</span>
            {row.amountText && (
              <span className="shopping-amount">
                <span className="shopping-amount-text">{row.amountText}</span>
              </span>
            )}
          </button>
        </div>
        {/* No confirmation (FR-023). Not Framework7's `delete`: it removes the element itself. */}
        <SwipeoutActions right>
          <SwipeoutButton color="red" close onClick={() => onDelete(row)}>
            Usuń
          </SwipeoutButton>
        </SwipeoutActions>
      </li>
    );
  }

  const amountClass = ['shopping-amount', row.direction ? `is-${row.direction}` : ''].filter(Boolean).join(' ');
  return (
    <li className={rowClass(row)}>
      <div className="shopping-row-inner">
        <Tick row={row} onToggle={() => onToggleTick(row)} />
        {/* The name and the amount together open the edit sheet (FR-017). */}
        <button type="button" className="shopping-open" aria-label={row.amountLabel} onClick={() => onOpenAmount(row)}>
          <span className="shopping-name">{row.name}</span>
          <span className={amountClass}>
            <span className="shopping-amount-text">
              {row.amountText}
              {row.direction && (
                <Icon f7={row.direction === 'more' ? 'arrow_up' : 'arrow_down'} aria-hidden="true" />
              )}
            </span>
            {row.plannedText && <span className="shopping-amount-plan">{row.plannedText}</span>}
          </span>
        </button>
        <button
          type="button"
          className="shopping-at-home"
          aria-pressed={row.atHome}
          aria-label={row.atHomeLabel}
          onClick={() => onToggleAtHome(row)}
        >
          <Icon f7={row.atHome ? 'house_fill' : 'house'} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}
