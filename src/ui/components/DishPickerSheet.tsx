import { useLiveQuery } from 'dexie-react-hooks';
import { Block, Link, PageContent, Sheet, Toolbar } from 'framework7-react';
import { selectLibrary } from '../../domain/dishes';
import type { Dish } from '../../domain/types';
import { useDeps } from '../hooks/useDeps';
import { pickerEmptyMessage } from '../view-models/week';
import { DishAvatar } from './DishAvatar';

interface DishPickerSheetProps {
  opened: boolean;
  onClose(): void;
  onPick(dish: Dish): void;
}

/** The horizontally scrolling Dish picker at the bottom of the Day page (FR-013–FR-016). */
export function DishPickerSheet({ opened, onClose, onPick }: DishPickerSheetProps) {
  const deps = useDeps();
  const dishes = useLiveQuery(() => deps.dishes.list(), [deps]);
  const library = selectLibrary(dishes ?? []);

  return (
    <Sheet
      className="dish-picker-sheet"
      opened={opened}
      onSheetClosed={onClose}
      backdrop
      swipeToClose
      style={{ height: 'auto' }}
    >
      <Toolbar>
        <div className="left">
          <strong className="sheet-title">Wybierz danie</strong>
        </div>
        <div className="right">
          <Link sheetClose>Zamknij</Link>
        </div>
      </Toolbar>
      <PageContent>
        {dishes !== undefined && library.length === 0 ? (
          <Block>
            <p>{pickerEmptyMessage}</p>
          </Block>
        ) : (
          <div className="dish-picker-strip">
            {library.map((dish) => (
              <button
                key={dish.id}
                type="button"
                className="dish-picker-tile"
                onClick={() => onPick(dish)}
              >
                <DishAvatar name={dish.name} photo={dish.photo} size={72} />
                <span className="dish-picker-name">{dish.name}</span>
              </button>
            ))}
          </div>
        )}
      </PageContent>
    </Sheet>
  );
}
