import { useLiveQuery } from 'dexie-react-hooks';
import {
  Block,
  Button,
  f7,
  Link,
  List,
  ListItem,
  Navbar,
  NavLeft,
  NavRight,
  NavTitle,
  Page,
} from 'framework7-react';
import { useEffect, useState } from 'react';
import { copyWeekToNext, weekHasPlanAt } from '../../app/week';
import { addDays, weekRange, weekStartOf } from '../../domain/dates';
import { useDeps } from '../hooks/useDeps';
import { copyConfirmMessage, copyDoneToast, copyFailedMessage, weekPage } from '../view-models/week';

export function WeekPage() {
  const deps = useDeps();
  // Read on mount: the app always opens on the current Week (FR-002).
  const [today, setToday] = useState(() => deps.clock.today());
  const [weekStart, setWeekStart] = useState(() => weekStartOf(today));
  const meals = useLiveQuery(() => deps.week.listMeals(weekRange(weekStart)), [deps, weekStart]);
  const daySlots = useLiveQuery(
    () => deps.week.listDaySlots(weekRange(weekStart)),
    [deps, weekStart],
  );
  const dishes = useLiveQuery(() => deps.dishes.list(), [deps]);
  const model = weekPage(weekStart, today, { meals, daySlots, dishes });

  // Resumed after midnight: move the today mark, but keep the viewed Week (research R2).
  useEffect(() => {
    function refreshToday() {
      if (document.visibilityState === 'visible') setToday(deps.clock.today());
    }
    document.addEventListener('visibilitychange', refreshToday);
    return () => document.removeEventListener('visibilitychange', refreshToday);
  }, [deps]);

  async function copy() {
    try {
      await copyWeekToNext(deps, weekStart);
      f7.toast.show({ text: copyDoneToast, closeTimeout: 2500 });
    } catch {
      f7.dialog.alert(copyFailedMessage);
    }
  }

  // Asks first when the next Week already has a plan (FR-034). Stays on this Week (FR-037).
  async function startCopy() {
    if (await weekHasPlanAt(deps, addDays(weekStart, 7))) {
      f7.dialog.confirm(copyConfirmMessage, () => void copy());
    } else {
      await copy();
    }
  }

  return (
    <Page>
      <Navbar>
        <NavLeft>
          <Link
            iconF7="chevron_left"
            aria-label="Poprzedni tydzień"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          />
        </NavLeft>
        <NavTitle>{model.title}</NavTitle>
        <NavRight>
          <Link
            iconF7="chevron_right"
            aria-label="Następny tydzień"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          />
        </NavRight>
      </Navbar>
      <div className="page-wide">
        <Block>
          <Button outline disabled={!model.canCopy} onClick={() => void startCopy()}>
            Skopiuj do następnego tygodnia
          </Button>
        </Block>
        <List mediaList strong inset dividersIos>
          {model.days.map((day) => (
            <ListItem
              key={day.date}
              link={`/day/${day.date}/`}
              title={day.title}
              subtitle={day.subtitle}
              after={day.after}
              className={day.isToday ? 'day-today' : undefined}
            />
          ))}
        </List>
      </div>
    </Page>
  );
}
