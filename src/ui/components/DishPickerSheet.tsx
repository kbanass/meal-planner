import { useLiveQuery } from 'dexie-react-hooks';
import { Block, Link, PageContent, Sheet, Toolbar } from 'framework7-react';
import { selectLibrary } from '../../domain/dishes';
import type { Dish } from '../../domain/types';
import { useDeps } from '../hooks/useDeps';
import { useEffect, useRef } from 'react';
import { pickerEmptyMessage, pickerTile, wheelScrollDelta } from '../view-models/week';
import { DishAvatar } from './DishAvatar';
import { MacroTotals } from './MacroTotals';

interface DishPickerSheetProps {
  opened: boolean;
  onClose(): void;
  onPick(dish: Dish): void;
}

/** The horizontally scrolling Dish picker at the bottom of the Week page (FR-013–FR-016). */
export function DishPickerSheet({ opened, onClose, onPick }: DishPickerSheetProps) {
  const deps = useDeps();
  const dishes = useLiveQuery(() => deps.dishes.list(), [deps]);
  const library = selectLibrary(dishes ?? []);
  const strip = useRef<HTMLDivElement>(null);

  // A mouse wheel scrolls the strip sideways (FR-045). Not passive, so the sheet itself does
  // not scroll at the same time.
  useEffect(() => {
    const element = strip.current;
    if (!element) return;
    function onWheel(event: WheelEvent) {
      const delta = wheelScrollDelta(event.deltaX, event.deltaY);
      if (delta === 0 || !element) return;
      event.preventDefault();
      element.scrollLeft += delta;
    }
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [library.length]);

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
        <div className="left" />
        <div className="title">Wybierz danie</div>
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
          <div className="dish-picker-strip" ref={strip}>
            {library.map((dish) => {
              const tile = pickerTile(dish);
              return (
                <button
                  key={tile.id}
                  type="button"
                  className="dish-picker-tile"
                  onClick={() => onPick(dish)}
                >
                  <DishAvatar name={tile.name} photo={tile.photo} size={120} shape="square" />
                  <span className="dish-picker-body">
                    <span className="dish-picker-name">{tile.name}</span>
                    <MacroTotals totals={tile.totals} compact />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </PageContent>
    </Sheet>
  );
}
