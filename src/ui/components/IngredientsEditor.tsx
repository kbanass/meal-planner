import type { Product } from '../../domain/types';
import type { SheetIngredient } from '../view-models/meal-sheet';
import { IngredientRow } from './IngredientRow';
import { ProductPicker } from './ProductPicker';

interface IngredientsEditorProps {
  rows: SheetIngredient[];
  /** DOM id for a field path, e.g. `ingredients[1].amount`. */
  inputId(path: string): string;
  error(path: string): string | undefined;
  onAmountChange(index: number, amount: string): void;
  onRemove(index: number): void;
  onPick(product: Product): void;
  /** Set inside a sheet (the Meal sheet); see ProductPicker. */
  insideSheet?: boolean;
}

/** The Ingredient rows and "Dodaj składnik", the same in the Dish form and the Meal sheet (FR-047). */
export function IngredientsEditor(props: IngredientsEditorProps) {
  const { rows, inputId, error, onAmountChange, onRemove, onPick, insideSheet } = props;
  return (
    <>
      {rows.length > 0 && (
        // Plain list markup: Framework7's <List> only puts its own item components inside <ul>.
        <div className="list list-strong inset form-card">
          <ul>
            {rows.map((row, index) => {
              const path = `ingredients[${index}]`;
              return (
                <IngredientRow
                  key={row.productId}
                  inputId={inputId(`${path}.amount`)}
                  name={row.name}
                  unit={row.unitLabel}
                  amount={row.amount}
                  error={error(`${path}.productId`) ?? error(`${path}.amount`)}
                  onAmountChange={(amount) => onAmountChange(index, amount)}
                  onRemove={() => onRemove(index)}
                />
              );
            })}
          </ul>
        </div>
      )}
      <ProductPicker onPick={onPick} insideSheet={insideSheet} />
    </>
  );
}
