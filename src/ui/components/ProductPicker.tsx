import { useLiveQuery } from 'dexie-react-hooks';
import {
  Block,
  BlockTitle,
  Button,
  List,
  ListInput,
  ListItem,
  PageContent,
  Segmented,
  Sheet,
} from 'framework7-react';
import { useState } from 'react';
import { normalizeName } from '../../domain/names';
import { shouldOfferCreate, suggestProducts } from '../../domain/products';
import type { Product, Unit } from '../../domain/types';
import { UNITS } from '../../domain/units';
import { useDeps } from '../hooks/useDeps';
import { createProductLabel, unitLabel } from '../view-models/dish-form';

export function ProductPicker({ onPick }: { onPick(product: Product): void }) {
  const deps = useDeps();
  const products = useLiveQuery(() => deps.products.list(), [deps]) ?? [];
  const [query, setQuery] = useState('');
  const [sheetOpened, setSheetOpened] = useState(false);
  const [unit, setUnit] = useState<Unit>('g');

  function pick(product: Product) {
    setQuery('');
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
      <List className="product-picker">
        <ListInput
          type="text"
          placeholder="Dodaj składnik…"
          value={query}
          onInput={(event) => setQuery((event.target as HTMLInputElement).value)}
        />
        {suggestProducts(products, query).map((product) => (
          <ListItem
            key={product.id}
            link
            title={product.name}
            after={unitLabel(product.unit)}
            onClick={() => pick(product)}
          />
        ))}
        {shouldOfferCreate(products, query) && (
          <ListItem link title={createProductLabel(query)} onClick={openCreateSheet} />
        )}
      </List>

      <Sheet
        className="product-sheet"
        opened={sheetOpened}
        onSheetClosed={() => setSheetOpened(false)}
        backdrop
        swipeToClose
        style={{ height: 'auto' }}
      >
        <PageContent>
          <BlockTitle>Nowy produkt</BlockTitle>
          <Block>
            <p>{normalizeName(query)}</p>
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
