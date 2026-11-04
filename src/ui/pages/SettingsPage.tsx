import { useLiveQuery } from 'dexie-react-hooks';
import { Block, BlockFooter, List, ListItem, Navbar, Page, Stepper } from 'framework7-react';
import { SLOTS_PER_DAY } from '../../domain/settings';
import { useDeps } from '../hooks/useDeps';

export function SettingsPage() {
  const deps = useDeps();
  const settings = useLiveQuery(() => deps.settings.get(), [deps]);

  return (
    <Page>
      <Navbar title="Ustawienia" />
      <div className="page-wide">
        <List strong inset>
          <ListItem title="Liczba slotów">
            {settings && (
              <Stepper
                slot="after"
                min={SLOTS_PER_DAY.min}
                max={SLOTS_PER_DAY.max}
                step={1}
                small
                round
                value={settings.slotsPerDay}
                onStepperChange={(value: number) => void deps.settings.setSlotsPerDay(value)}
              />
            )}
          </ListItem>
        </List>
        <BlockFooter>Domyślna liczba slotów w każdym dniu. Dzień może mieć ich więcej.</BlockFooter>
        <Block>
          <p>Cele i kopia zapasowa pojawią się w kolejnej wersji.</p>
        </Block>
      </div>
    </Page>
  );
}
