import { useLiveQuery } from 'dexie-react-hooks';
import {
  Block,
  BlockTitle,
  Button,
  Icon,
  Link,
  List,
  ListInput,
  ListItem,
  PageContent,
  Segmented,
  Sheet,
} from 'framework7-react';
import { useDeferredValue, useState } from 'react';
import { shouldOfferCreate, suggestProducts } from '../../domain/products';
import type { Product, Unit } from '../../domain/types';
import { UNITS } from '../../domain/units';
import { useDeps } from '../hooks/useDeps';
import { createProductLabel, newProductName, unitLabel } from '../view-models/dish-form';

interface ProductPickerProps {
  onPick(product: Product): void;
  /**
   * Set when the picker sits inside another sheet (the Meal sheet). Framework7 sheets share one
   * backdrop, so the "Nowy produkt" sheet must not use it: closing it would hide the backdrop of
   * the sheet underneath.
   */
  insideSheet?: boolean;
}

export function ProductPicker({ onPick, insideSheet = false }: ProductPickerProps) {
  const deps = useDeps();
  const products = useLiveQuery(() => deps.products.list(), [deps]) ?? [];
  const [query, setQuery] = useState('');
  // The input echoes every keystroke at once; the list renders in interruptible slices,
  // so 500 Products keep typing responsive (SC-002).
  const listQuery = useDeferredValue(query);
  const [sheetOpened, setSheetOpened] = useState(false);
  const [unit, setUnit] = useState<Unit>('g');
  // A button until tapped; then the search field opens in place, so no further sheet stacks up
  // inside the Meal sheet.
  const [searching, setSearching] = useState(false);

  function close() {
    setQuery('');
    setSearching(false);
  }

  function pick(product: Product) {
    close();
    onPick(product);
  }

  function openCreateSheet() {
    setUnit('g');
    setSheetOpened(true);
  }

  async function create() {
    const result = await deps.products.createFromName(query, unit);
    setSheetOpened(false);
    if (result.kind !== 'invalid') pick(result.product);
  }

  return (
    <>
      {/* A stable wrapper: Framework7 moves the sheet below to the app root, so React must
          never need it as the reference node when swapping the button and the search. */}
      <div className="product-picker-area">
        {!searching ? (
          <button
            type="button"
            className="add-ingredient-button"
            onClick={() => setSearching(true)}
          >
            <Icon f7="plus" aria-hidden="true" />
            <span>Dodaj składnik</span>
          </button>
        ) : (
          <List className="product-picker">
            <ListInput
              outline
              type="text"
              placeholder="Szukaj produktu…"
              autofocus
              value={query}
              onInput={(event) => setQuery((event.target as HTMLInputElement).value)}
            />
            {suggestProducts(products, listQuery).map((product) => (
              <ListItem
                key={product.id}
                link
                title={product.name}
                after={unitLabel(product.unit)}
                onClick={() => pick(product)}
              />
            ))}
            {shouldOfferCreate(products, listQuery) && (
              <ListItem link title={createProductLabel(listQuery)} onClick={openCreateSheet} />
            )}
            <li className="product-picker-cancel">
              <Link onClick={close}>Anuluj</Link>
            </li>
          </List>
        )}
      </div>

      <Sheet
        className="product-sheet"
        opened={sheetOpened}
        onSheetClosed={() => setSheetOpened(false)}
        backdrop={!insideSheet}
        swipeToClose
        style={{ height: 'auto' }}
      >
        <PageContent>
          <BlockTitle>Nowy produkt</BlockTitle>
          <Block>
            <p>{newProductName(query)}</p>
            <Segmented strong tag="p">
              {UNITS.map((option) => (
                <Button
                  key={option}
                  type="button"
                  active={unit === option}
                  onClick={() => setUnit(option)}
                >
                  {unitLabel(option)}
                </Button>
              ))}
            </Segmented>
            <p className="grid grid-cols-2 grid-gap">
              <Button type="button" onClick={() => setSheetOpened(false)}>
                Anuluj
              </Button>
              <Button type="button" fill onClick={create}>
                Dodaj
              </Button>
            </p>
          </Block>
        </PageContent>
      </Sheet>
    </>
  );
}
