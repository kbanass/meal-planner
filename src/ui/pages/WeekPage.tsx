import { useLiveQuery } from 'dexie-react-hooks';
import { Link, List, ListItem, Navbar, NavLeft, NavRight, NavTitle, Page } from 'framework7-react';
import { useEffect, useState } from 'react';
import { addDays, weekStartOf } from '../../domain/dates';
import { useDeps } from '../hooks/useDeps';
import { weekPage, weekRange } from '../view-models/week';

export function WeekPage() {
  const deps = useDeps();
  // Read on mount: the app always opens on the current Week (FR-002).
  const [today, setToday] = useState(() => deps.clock.today());
  const [weekStart, setWeekStart] = useState(() => weekStartOf(today));
  const meals = useLiveQuery(() => deps.week.listMeals(weekRange(weekStart)), [deps, weekStart]);
  const dishes = useLiveQuery(() => deps.dishes.list(), [deps]);
  const model = weekPage(weekStart, today, meals, dishes);

  // Resumed after midnight: move the today mark, but keep the viewed Week (research R2).
  useEffect(() => {
    function refreshToday() {
      if (document.visibilityState === 'visible') setToday(deps.clock.today());
    }
    document.addEventListener('visibilitychange', refreshToday);
    return () => document.removeEventListener('visibilitychange', refreshToday);
  }, [deps]);

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
