import { useLiveQuery } from 'dexie-react-hooks';
import {
  Actions,
  ActionsButton,
  ActionsGroup,
  ActionsLabel,
  Block,
  f7,
  Link,
  List,
  ListItem,
  Navbar,
  NavRight,
  Page,
  Popup,
} from 'framework7-react';
import { useState } from 'react';
import {
  countProductUsage,
  mergeCandidates,
  productActions,
  selectProductRows,
} from '../../domain/products';
import type { Product, Unit } from '../../domain/types';
import { UNITS } from '../../domain/units';
import { useDeps } from '../hooks/useDeps';
import { errorMessage, unitLabel } from '../view-models/dish-form';
import {
  deleteConfirmMessage,
  deleteHint,
  mergeConfirmMessage,
  mergeHint,
  renameConflictMessage,
  renameMergeQuestion,
  unitHint,
  usageLabel,
} from '../view-models/products';

interface Row {
  product: Product;
  usage: number;
}

function Hint({ text }: { text: string | null }) {
  return text ? <span className="actions-hint">{text}</span> : null;
}

export function ProductsPage() {
  const deps = useDeps();
  const products = useLiveQuery(() => deps.products.list(), [deps]);
  const dishes = useLiveQuery(() => deps.dishes.list(), [deps]);
  // TODO(week-planning): pass Detached Meal Ingredient lists instead of [] (research R13).
  const rows = selectProductRows(products ?? [], countProductUsage(dishes ?? [], []));

  const [selected, setSelected] = useState<Row | null>(null);
  const [unitFor, setUnitFor] = useState<Product | null>(null);
  const [mergeFrom, setMergeFrom] = useState<Product | null>(null);

  const actions = productActions(selected?.usage ?? 0);
  const candidates = selected ? mergeCandidates(products ?? [], selected.product) : [];

  async function merge(from: Product, into: Product) {
    const result = await deps.products.merge(from.id, into.id);
    if (result.kind === 'unitMismatch') {
      f7.dialog.alert('Nie można scalić produktów o różnych jednostkach.');
    }
  }

  function rename(product: Product) {
    f7.dialog.prompt(
      'Nowa nazwa produktu',
      'Zmień nazwę',
      async (value) => {
        const result = await deps.products.rename(product.id, value);
        if (result.kind === 'invalid') {
          f7.dialog.alert(errorMessage('required'));
        } else if (result.kind === 'conflict' && result.mergeAllowed) {
          const { existing } = result;
          f7.dialog.confirm(
            `${renameConflictMessage(existing.name)} ${renameMergeQuestion(product.name, existing.name)}`,
            () => void merge(product, existing),
          );
        } else if (result.kind === 'conflict') {
          f7.dialog.alert(renameConflictMessage(result.existing.name));
        }
      },
      undefined,
      product.name,
    );
  }

  async function changeUnit(product: Product, unit: Unit) {
    const result = await deps.products.changeUnit(product.id, unit);
    if (result.kind === 'inUse') f7.dialog.alert(unitHint(result.usage));
  }

  function confirmMerge(from: Product, into: Product) {
    f7.dialog.confirm(mergeConfirmMessage(from.name, into.name), () => {
      setMergeFrom(null);
      void merge(from, into);
    });
  }

  function confirmDelete(product: Product) {
    f7.dialog.confirm(deleteConfirmMessage(product.name), async () => {
      const result = await deps.products.delete(product.id);
      if (result.kind === 'inUse') f7.dialog.alert(deleteHint(result.usage));
    });
  }

  return (
    <Page>
      <Navbar title="Produkty" backLink />
      <div className="page-wide">
        {products !== undefined && rows.length === 0 ? (
          <Block>
            <p>Nie masz jeszcze żadnych produktów.</p>
          </Block>
        ) : (
          <List>
            {rows.map((row) => (
              <ListItem
                key={row.product.id}
                link
                title={row.product.name}
                after={unitLabel(row.product.unit)}
                footer={usageLabel(row.usage)}
                onClick={() => setSelected(row)}
              />
            ))}
          </List>
        )}
      </div>

      <Actions opened={selected !== null} onActionsClosed={() => setSelected(null)}>
        {selected && (
          <ActionsGroup>
            <ActionsLabel>{selected.product.name}</ActionsLabel>
            <ActionsButton onClick={() => rename(selected.product)}>Zmień nazwę</ActionsButton>
            <ActionsButton
              className={actions.canChangeUnit ? undefined : 'disabled'}
              onClick={() => setUnitFor(selected.product)}
            >
              Zmień jednostkę
              <Hint text={actions.canChangeUnit ? null : unitHint(selected.usage)} />
            </ActionsButton>
            <ActionsButton
              className={candidates.length > 0 ? undefined : 'disabled'}
              onClick={() => setMergeFrom(selected.product)}
            >
              Scal z innym produktem…
              <Hint text={mergeHint(candidates.length > 0)} />
            </ActionsButton>
            <ActionsButton
              color="red"
              className={actions.canDelete ? undefined : 'disabled'}
              onClick={() => confirmDelete(selected.product)}
            >
              Usuń
              <Hint text={actions.canDelete ? null : deleteHint(selected.usage)} />
            </ActionsButton>
          </ActionsGroup>
        )}
        <ActionsGroup>
          <ActionsButton strong>Anuluj</ActionsButton>
        </ActionsGroup>
      </Actions>

      <Actions opened={unitFor !== null} onActionsClosed={() => setUnitFor(null)}>
        <ActionsGroup>
          <ActionsLabel>Jednostka</ActionsLabel>
          {unitFor &&
            UNITS.map((unit) => (
              <ActionsButton
                key={unit}
                strong={unit === unitFor.unit}
                onClick={() => void changeUnit(unitFor, unit)}
              >
                {unitLabel(unit)}
              </ActionsButton>
            ))}
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton strong>Anuluj</ActionsButton>
        </ActionsGroup>
      </Actions>

      <Popup opened={mergeFrom !== null} onPopupClosed={() => setMergeFrom(null)}>
        <Page>
          <Navbar title={mergeFrom ? `Scal „${mergeFrom.name}” z…` : ''}>
            <NavRight>
              <Link popupClose>Zamknij</Link>
            </NavRight>
          </Navbar>
          <List>
            {mergeFrom &&
              mergeCandidates(products ?? [], mergeFrom).map((product) => (
                <ListItem
                  key={product.id}
                  link
                  title={product.name}
                  after={unitLabel(product.unit)}
                  onClick={() => confirmMerge(mergeFrom, product)}
                />
              ))}
          </List>
        </Page>
      </Popup>
    </Page>
  );
}
