import { Block, BlockFooter, Link, List, ListInput, PageContent, Sheet, Toolbar } from 'framework7-react';
import { useState } from 'react';
import { amountErrorMessage, amountFooter, type ProductRow } from '../view-models/shopping';

interface AmountSheetProps {
  /** The row as it is now in the live model; null when the Product left the list. */
  row: ProductRow | null;
  opened: boolean;
  onClose(): void;
  /** Resolves to whether the text was invalid, which keeps the sheet open (FR-019). */
  onSave(text: string): Promise<'invalid' | 'done'>;
}

/** The amount to buy for one Product (FR-017–FR-019). */
export function AmountSheet({ row, opened, onClose, onSave }: AmountSheetProps) {
  const [text, setText] = useState('');
  const [invalid, setInvalid] = useState(false);

  async function save() {
    if ((await onSave(text)) === 'invalid') setInvalid(true);
    else onClose();
  }

  return (
    <Sheet
      className="amount-sheet"
      opened={opened}
      onSheetOpen={() => {
        // Each opening starts from the amount shown on the row.
        setText(row?.fieldText ?? '');
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
                  label="Ilość do kupienia"
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
                >
                  <span slot="inner-end" className="amount-sheet-unit">
                    {row.unitLabel}
                  </span>
                </ListInput>
              </List>
            </form>
            <BlockFooter>{amountFooter}</BlockFooter>
          </>
        )}
      </PageContent>
    </Sheet>
  );
}
