import { Block, BlockFooter, Link, List, ListInput, ListItem, PageContent, Sheet, Toolbar } from 'framework7-react';
import { useState } from 'react';
import { amountErrorMessage, amountFooter, type ProductRow } from '../view-models/shopping';

/**
 * Framework7's toggle markup with a React-controlled input. framework7-react's <Toggle> gives
 * React a no-op onChange, so React resets a controlled `checked` before its own listener runs.
 */
function MarkToggle({ checked, onChange, label }: { checked: boolean; onChange(value: boolean): void; label: string }) {
  return (
    <label className="toggle" slot="after">
      <input type="checkbox" aria-label={label} checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-icon" />
    </label>
  );
}

export interface ProductEdit {
  text: string;
  ticked: boolean;
  atHome: boolean;
}

interface AmountSheetProps {
  /** The row as it is now in the live model; null when the Product left the list. */
  row: ProductRow | null;
  opened: boolean;
  onClose(): void;
  /** Resolves to whether the amount was invalid, which keeps the sheet open (FR-019). */
  onSave(edit: ProductEdit): Promise<'invalid' | 'done'>;
}

/**
 * The edit sheet for one Product, opened by tapping its row: the amount to buy (FR-017–FR-019),
 * the tick and At Home. Nothing is written until "Zapisz".
 */
export function AmountSheet({ row, opened, onClose, onSave }: AmountSheetProps) {
  const [text, setText] = useState('');
  const [ticked, setTicked] = useState(false);
  const [atHome, setAtHome] = useState(false);
  const [invalid, setInvalid] = useState(false);

  async function save() {
    if ((await onSave({ text, ticked, atHome })) === 'invalid') setInvalid(true);
    else onClose();
  }

  return (
    <Sheet
      className="amount-sheet"
      opened={opened}
      onSheetOpen={() => {
        // Each opening starts from the row as it is shown.
        setText(row?.fieldText ?? '');
        setTicked(row?.ticked ?? false);
        setAtHome(row?.atHome ?? false);
        setInvalid(false);
      }}
      onSheetClosed={onClose}
      backdrop
      swipeToClose
      style={{ height: 'auto' }}
    >
      <Toolbar>
        <div className="left">
          <Link sheetClose>Anuluj</Link>
        </div>
        <div className="title">{row?.name ?? ''}</div>
        <div className="right">
          <Link onClick={() => void save()}>Zapisz</Link>
        </div>
      </Toolbar>
      <PageContent>
        {row && (
          <>
            <Block className="amount-sheet-planned">
              <p>W planie: {row.plannedAmountText}</p>
            </Block>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <List strong inset className="form-card">
                <ListInput
                  outline
                  label={`Ilość do kupienia (${row.unitLabel})`}
                  type="text"
                  inputmode="decimal"
                  inputId="amount-to-buy"
                  value={text}
                  onInput={(event) => {
                    setText((event.target as HTMLInputElement).value);
                    setInvalid(false);
                  }}
                  errorMessage={invalid ? amountErrorMessage : undefined}
                  errorMessageForce={invalid}
                />
              </List>
            </form>
            <BlockFooter>{amountFooter}</BlockFooter>
            <List strong inset dividersIos className="amount-sheet-marks">
              <ListItem title="Kupione">
                <MarkToggle label="Kupione" checked={ticked} onChange={setTicked} />
              </ListItem>
              <ListItem title="Mam w domu">
                <MarkToggle label="Mam w domu" checked={atHome} onChange={setAtHome} />
              </ListItem>
            </List>
          </>
        )}
      </PageContent>
    </Sheet>
  );
}
