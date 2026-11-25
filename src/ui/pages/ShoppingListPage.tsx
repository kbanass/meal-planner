import { useLiveQuery } from 'dexie-react-hooks';
import { Block, BlockTitle, f7, Icon, List, Navbar, Page } from 'framework7-react';
import { useRef, useState } from 'react';
import { addExtra, saveAdjustment, saveExtra, shareList } from '../../app/shopping';
import { addDays, weekRange, weekStartOf } from '../../domain/dates';
import { AmountSheet, type ProductEdit } from '../components/AmountSheet';
import { ExtraSheet, type ExtraEdit } from '../components/ExtraSheet';
import { ShoppingRow } from '../components/ShoppingRow';
import { WeekCarousel } from '../components/WeekCarousel';
import { useDeps } from '../hooks/useDeps';
import {
  atHomeTitle,
  copiedToast,
  emptyMessage,
  extraAmountPlaceholder,
  extraPlaceholder,
  listWeekFaces,
  shareFailedMessage,
  shoppingPage,
  type ExtraRow,
  type ProductRow,
  type ShoppingRow as Row,
} from '../view-models/shopping';

/**
 * The Lista zakupów tab: the Shown Week's live Shopping List, with its own Week header
 * (contracts/ui.md). Every rule lives in the view model and the domain.
 */
export function ShoppingListPage() {
  const deps = useDeps();
  // Its own Week, read once on mount: tab switches keep it (FR-003).
  const [weekStart, setWeekStart] = useState(() => weekStartOf(deps.clock.today()));
  const meals = useLiveQuery(() => deps.week.listMeals(weekRange(weekStart)), [deps, weekStart]);
  const dishes = useLiveQuery(() => deps.dishes.list(), [deps]);
  const products = useLiveQuery(() => deps.products.list(), [deps]);
  const states = useLiveQuery(() => deps.shopping.listProductStates(weekStart), [deps, weekStart]);
  const extras = useLiveQuery(() => deps.shopping.listExtras(weekStart), [deps, weekStart]);
  const model = shoppingPage(weekStart, { products, meals, dishes, states, extras });

  // One amount sheet per page; the row is looked up in the live model, so `planned` is current.
  const [sheetProductId, setSheetProductId] = useState<string | null>(null);
  const [sheetOpened, setSheetOpened] = useState(false);
  const sheetRow =
    [...(model?.toBuy ?? []), ...(model?.atHome ?? [])].find(
      (row): row is ProductRow => row.kind === 'product' && row.productId === sheetProductId,
    ) ?? null;

  // The Extra edit sheet, looked up the same way.
  const [sheetExtraId, setSheetExtraId] = useState<string | null>(null);
  const [extraSheetOpened, setExtraSheetOpened] = useState(false);
  const sheetExtra =
    model?.toBuy.find((row): row is ExtraRow => row.kind === 'extra' && row.id === sheetExtraId) ?? null;

  const [extraText, setExtraText] = useState('');
  const [extraAmount, setExtraAmount] = useState('');
  const extraInput = useRef<HTMLInputElement>(null);
  const extraAmountInput = useRef<HTMLInputElement>(null);

  function toggleTick(row: Row) {
    if (row.kind === 'product') {
      void deps.shopping.updateProductState(weekStart, row.productId, { ticked: !row.ticked });
    } else {
      void deps.shopping.setExtraTicked(row.id, !row.ticked);
    }
  }

  function toggleAtHome(row: ProductRow) {
    void deps.shopping.updateProductState(weekStart, row.productId, { atHome: !row.atHome });
  }

  function openAmount(row: ProductRow) {
    setSheetProductId(row.productId);
    setSheetOpened(true);
  }

  async function saveEdit({ text, ticked, atHome }: ProductEdit): Promise<'invalid' | 'done'> {
    if (!sheetRow) return 'done';
    const { productId } = sheetRow;
    const result = await saveAdjustment(deps, {
      weekStart,
      productId,
      text,
      filledText: sheetRow.fieldText,
      planned: sheetRow.planned,
    });
    if (result.kind === 'invalid') return 'invalid';
    if (ticked !== sheetRow.ticked || atHome !== sheetRow.atHome) {
      await deps.shopping.updateProductState(weekStart, productId, { ticked, atHome });
    }
    return 'done';
  }

  function openExtra(row: ExtraRow) {
    setSheetExtraId(row.id);
    setExtraSheetOpened(true);
  }

  async function saveExtraEdit(edit: ExtraEdit): Promise<'invalid' | 'done'> {
    if (!sheetExtra) return 'done';
    return (await saveExtra(deps, sheetExtra.id, edit)) === 'invalid' ? 'invalid' : 'done';
  }

  function deleteExtra(row: ExtraRow) {
    void deps.shopping.deleteExtra(row.id);
  }

  async function submitExtra() {
    if ((await addExtra(deps, weekStart, extraText, extraAmount)) === 'added') {
      setExtraText('');
      setExtraAmount('');
    }
    // Focus goes back to the name, so several Extras can be typed in a row (FR-022).
    extraInput.current?.focus();
  }

  function share(text: string) {
    // No await before the call: sharing needs the tap's user activation (research R5).
    shareList(deps, text).then(
      (result) => {
        if (result === 'copied') f7.toast.show({ text: copiedToast, closeTimeout: 2500 });
      },
      () => f7.dialog.alert(shareFailedMessage),
    );
  }

  const rowProps = {
    onToggleTick: toggleTick,
    onToggleAtHome: toggleAtHome,
    onOpenAmount: openAmount,
    onOpenExtra: openExtra,
    onDelete: deleteExtra,
  };

  return (
    <Page className="shopping-page">
      <Navbar title="Lista zakupów" />
      <div className="page-wide">
        {/* Rendered before the data loads, so the carousel never unmounts while the Week moves. */}
        <section className="list-week-card">
          <WeekCarousel
            faces={listWeekFaces(weekStart)}
            onMove={(days) => setWeekStart((current) => addDays(current, days))}
            renderFace={(face) => <h2 className="list-week-label">{face.label}</h2>}
            navClassName="list-week-nav"
          />
          {/* Always shown; dimmed and off when there is nothing to share (FR-025). */}
          <button
            type="button"
            className="week-card-copy list-week-share"
            disabled={!model?.shareText}
            onClick={() => model?.shareText && share(model.shareText)}
          >
            <Icon f7="square_arrow_up" aria-hidden="true" />
            <span>Udostępnij listę</span>
          </button>
        </section>
      </div>
      {model && (
        <div className="page-wide">

          {model.empty && (
            <Block className="shopping-empty">
              <p>{emptyMessage}</p>
            </Block>
          )}

          {model.toBuy.length > 0 && (
            <List strong inset dividersIos className="shopping-list">
              <ul>
                {model.toBuy.map((row) => (
                  <ShoppingRow key={row.key} row={row} {...rowProps} />
                ))}
              </ul>
            </List>
          )}

          <List strong inset className="shopping-extra-form">
            <ul>
              <li>
                <form
                  className="shopping-extra-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitExtra();
                  }}
                >
                  <div className="shopping-extra-input">
                    <Icon f7="plus" aria-hidden="true" />
                    <input
                      ref={extraInput}
                      type="text"
                      placeholder={extraPlaceholder}
                      aria-label={extraPlaceholder}
                      enterKeyHint="next"
                      value={extraText}
                      onChange={(event) => setExtraText(event.target.value)}
                      onKeyDown={(event) => {
                        // Enter moves on to the amount; the form is sent from there or by "Dodaj".
                        if (event.key === 'Enter' && extraText.trim() !== '') {
                          event.preventDefault();
                          extraAmountInput.current?.focus();
                        }
                      }}
                    />
                  </div>
                  <div className="shopping-extra-second">
                    <div className="shopping-extra-input shopping-extra-amount-input">
                      <input
                        ref={extraAmountInput}
                        type="text"
                        placeholder={extraAmountPlaceholder}
                        aria-label={extraAmountPlaceholder}
                        enterKeyHint="done"
                        value={extraAmount}
                        onChange={(event) => setExtraAmount(event.target.value)}
                      />
                    </div>
                    <button type="submit" className="shopping-extra-add" disabled={extraText.trim() === ''}>
                      Dodaj
                    </button>
                  </div>
                </form>
              </li>
            </ul>
          </List>

          {model.atHome.length > 0 && (
            <>
              <BlockTitle className="shopping-at-home-title">
                <Icon f7="house_fill" aria-hidden="true" />
                {atHomeTitle}
              </BlockTitle>
              <List strong inset dividersIos className="shopping-list is-at-home-list" aria-label={atHomeTitle}>
                <ul>
                  {model.atHome.map((row) => (
                    <ShoppingRow key={row.key} row={row} {...rowProps} />
                  ))}
                </ul>
              </List>
            </>
          )}
        </div>
      )}

      <AmountSheet
        row={sheetRow}
        opened={sheetOpened}
        onClose={() => setSheetOpened(false)}
        onSave={saveEdit}
      />
      <ExtraSheet
        row={sheetExtra}
        opened={extraSheetOpened}
        onClose={() => setExtraSheetOpened(false)}
        onSave={saveExtraEdit}
        onDelete={deleteExtra}
      />
    </Page>
  );
}
