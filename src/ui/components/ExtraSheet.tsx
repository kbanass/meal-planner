import { Link, List, ListButton, ListInput, ListItem, PageContent, Sheet, Toolbar } from 'framework7-react';
import { useState } from 'react';
import { extraAmountLabel, extraNameError, extraNameLabel, type ExtraRow } from '../view-models/shopping';
import { MarkToggle } from './MarkToggle';

export interface ExtraEdit {
  text: string;
  amount: string;
  ticked: boolean;
}

interface ExtraSheetProps {
  /** The row as it is now in the live model; null when the Extra is gone. */
  row: ExtraRow | null;
  opened: boolean;
  onClose(): void;
  /** Resolves to 'invalid' for a blank name, which keeps the sheet open. */
  onSave(edit: ExtraEdit): Promise<'invalid' | 'done'>;
  onDelete(row: ExtraRow): void;
}

/**
 * The edit sheet for a hand-added item (Extra): its name, optional amount and tick, and "Usuń".
 * Nothing is written until "Zapisz", except "Usuń", which deletes at once like the row's swipe.
 */
export function ExtraSheet({ row, opened, onClose, onSave, onDelete }: ExtraSheetProps) {
  const [text, setText] = useState('');
  const [amount, setAmount] = useState('');
  const [ticked, setTicked] = useState(false);
  const [invalid, setInvalid] = useState(false);

  async function save() {
    if ((await onSave({ text, amount, ticked })) === 'invalid') setInvalid(true);
    else onClose();
  }

  return (
    <Sheet
      className="extra-sheet"
      opened={opened}
      onSheetOpen={() => {
        // Each opening starts from the row as it is shown.
        setText(row?.name ?? '');
        setAmount(row?.amountText ?? '');
        setTicked(row?.ticked ?? false);
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
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <List strong inset className="form-card">
                <ListInput
                  outline
                  label={extraNameLabel}
                  type="text"
                  inputId="extra-name"
                  value={text}
                  onInput={(event) => {
                    setText((event.target as HTMLInputElement).value);
                    setInvalid(false);
                  }}
                  errorMessage={invalid ? extraNameError : undefined}
                  errorMessageForce={invalid}
                />
                <ListInput
                  outline
                  label={extraAmountLabel}
                  type="text"
                  inputId="extra-amount"
                  placeholder="np. 2 opak."
                  value={amount}
                  onInput={(event) => setAmount((event.target as HTMLInputElement).value)}
                />
              </List>
              {/* Lets Enter in either field save. */}
              <button type="submit" hidden />
            </form>
            <List strong inset>
              <ListItem title="Kupione">
                <MarkToggle label="Kupione" checked={ticked} onChange={setTicked} />
              </ListItem>
            </List>
            <List strong inset>
              <ListButton
                color="red"
                onClick={() => {
                  onDelete(row);
                  onClose();
                }}
              >
                Usuń
              </ListButton>
            </List>
          </>
        )}
      </PageContent>
    </Sheet>
  );
}
