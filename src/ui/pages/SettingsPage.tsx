import { useLiveQuery } from 'dexie-react-hooks';
import {
  Block,
  BlockFooter,
  Link,
  List,
  ListItem,
  Navbar,
  Page,
  PageContent,
  Sheet,
  Toolbar,
} from 'framework7-react';
import { useState } from 'react';
import { SLOTS_PER_DAY } from '../../domain/settings';
import { useDeps } from '../hooks/useDeps';

const SLOT_CHOICES = Array.from(
  { length: SLOTS_PER_DAY.max - SLOTS_PER_DAY.min + 1 },
  (_, i) => SLOTS_PER_DAY.min + i,
);

export function SettingsPage() {
  const deps = useDeps();
  const settings = useLiveQuery(() => deps.settings.get(), [deps]);
  const [pickerOpened, setPickerOpened] = useState(false);

  async function choose(slotsPerDay: number) {
    await deps.settings.setSlotsPerDay(slotsPerDay);
    setPickerOpened(false);
  }

  return (
    <Page>
      <Navbar title="Ustawienia" />
      <div className="page-wide">
        <List strong inset>
          {/* The value opens a sheet to pick from, instead of an inline stepper (FR-011). */}
          <ListItem
            link
            title="Liczba slotów"
            after={settings ? String(settings.slotsPerDay) : ''}
            onClick={() => setPickerOpened(true)}
          />
        </List>
        <BlockFooter>Domyślna liczba slotów w każdym dniu. Dzień może mieć ich więcej.</BlockFooter>
        <Block>
          <p>Cele i kopia zapasowa pojawią się w kolejnej wersji.</p>
        </Block>
      </div>

      <Sheet
        className="slots-sheet"
        opened={pickerOpened}
        onSheetClosed={() => setPickerOpened(false)}
        backdrop
        swipeToClose
        style={{ height: 'auto' }}
      >
        <Toolbar>
          <div className="left" />
          <div className="title">Liczba slotów</div>
          <div className="right">
            <Link sheetClose>Zamknij</Link>
          </div>
        </Toolbar>
        <PageContent>
          <List strong inset dividersIos className="slots-choices">
            {SLOT_CHOICES.map((n) => (
              <ListItem
                key={n}
                radio
                radioIcon="end"
                name="slots-per-day"
                value={n}
                title={String(n)}
                checked={settings?.slotsPerDay === n}
                onChange={() => void choose(n)}
              />
            ))}
          </List>
        </PageContent>
      </Sheet>
    </Page>
  );
}
