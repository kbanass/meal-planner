import { Icon } from 'framework7-react';

interface IngredientRowProps {
  inputId: string;
  name: string;
  unit: string;
  amount: string;
  error?: string;
  onAmountChange(amount: string): void;
  onRemove(): void;
}

export function IngredientRow({
  inputId,
  name,
  unit,
  amount,
  error,
  onAmountChange,
  onRemove,
}: IngredientRowProps) {
  return (
    <li className={error ? 'item-input-with-error-message item-input-invalid' : undefined}>
      <div className="item-content item-input">
        <div className="item-inner">
          <label className="item-title item-label" htmlFor={inputId}>
            {name}
          </label>
          <div className="item-input-wrap ingredient-amount">
            <input
              id={inputId}
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
            />
            <span className="ingredient-unit">{unit}</span>
          </div>
          {error && <div className="item-input-error-message">{error}</div>}
        </div>
        <button
          type="button"
          className="link icon-only ingredient-remove"
          aria-label="Usuń składnik"
          onClick={onRemove}
        >
          <Icon f7="trash" />
        </button>
      </div>
    </li>
  );
}
