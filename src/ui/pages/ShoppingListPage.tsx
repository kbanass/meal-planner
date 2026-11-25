import { useLiveQuery } from 'dexie-react-hooks';
import { Block, BlockTitle, f7, Icon, List, Navbar, Page } from 'framework7-react';
import { useRef, useState, type PointerEvent } from 'react';
import { addExtra, saveAdjustment, shareList } from '../../app/shopping';
import { addDays, weekRange, weekStartOf } from '../../domain/dates';
import { AmountSheet, type ProductEdit } from '../components/AmountSheet';
import { ShoppingRow } from '../components/ShoppingRow';
import { useDeps } from '../hooks/useDeps';
import {
  atHomeTitle,
  copiedToast,
  emptyMessage,
  extraPlaceholder,
  headerSwipeDelta,
  shareFailedMessage,
  shoppingPage,
  type ExtraRow,
  type ProductRow,
  type ShoppingRow as Row,
} from '../view-models/shopping';
import { inEdgeZone } from '../view-models/week-track';

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

  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const [extraText, setExtraText] = useState('');
  const extraInput = useRef<HTMLInputElement>(null);

  function onHeaderPointerDown(event: PointerEvent) {
    // Starts at the screen edge belong to the system back swipe (research R6).
    swipeStart.current = inEdgeZone(event.clientX, window.innerWidth)
      ? null
      : { x: event.clientX, y: event.clientY };
  }

  function onHeaderPointerUp(event: PointerEvent) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const delta = headerSwipeDelta(event.clientX - start.x, event.clientY - start.y);
    if (delta !== 0) setWeekStart((current) => addDays(current, delta));
  }

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

  function deleteExtra(row: ExtraRow) {
    void deps.shopping.deleteExtra(row.id);
  }

  async function submitExtra() {
    if ((await addExtra(deps, weekStart, extraText)) === 'added') setExtraText('');
    // Focus stays in the field, so several Extras can be typed in a row (FR-022).
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
    onDelete: deleteExtra,
  };

  return (
    <Page className="shopping-page">
      <Navbar title="Lista zakupów" />
      {model && (
        <div className="page-wide">
          <section
            className="list-week-card"
            onPointerDown={onHeaderPointerDown}
            onPointerUp={onHeaderPointerUp}
            onPointerCancel={() => (swipeStart.current = null)}
          >
            <div className="list-week-row">
              <button
                type="button"
                className="round-button"
                aria-label="Poprzedni tydzień"
                onClick={() => setWeekStart((current) => addDays(current, -7))}
              >
                <Icon f7="arrow_left" aria-hidden="true" />
              </button>
              <h2 className="list-week-label">{model.weekLabel}</h2>
              <button
                type="button"
                className="round-button"
                aria-label="Następny tydzień"
                onClick={() => setWeekStart((current) => addDays(current, 7))}
              >
                <Icon f7="arrow_right" aria-hidden="true" />
              </button>
            </div>
            {model.shareText !== null && (
              <button
                type="button"
                className="week-card-copy list-week-share"
                onClick={() => share(model.shareText as string)}
              >
                <Icon f7="square_arrow_up" aria-hidden="true" />
                <span>Udostępnij listę</span>
              </button>
            )}
          </section>

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
                      enterKeyHint="done"
                      value={extraText}
                      onChange={(event) => setExtraText(event.target.value)}
                    />
                  </div>
                  <button type="submit" className="shopping-extra-add">
                    Dodaj
                  </button>
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
    </Page>
  );
}
