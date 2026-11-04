import { useLiveQuery } from 'dexie-react-hooks';
import { List, ListItem, Navbar, Page } from 'framework7-react';
import { useState } from 'react';
import { weekStartOf } from '../../domain/dates';
import { useDeps } from '../hooks/useDeps';
import { weekPage, weekRange } from '../view-models/week';

export function WeekPage() {
  const deps = useDeps();
  // Read once on mount: the app always opens on the current Week (FR-002).
  const [today] = useState(() => deps.clock.today());
  const [weekStart] = useState(() => weekStartOf(today));
  const meals = useLiveQuery(() => deps.week.listMeals(weekRange(weekStart)), [deps, weekStart]);
  const dishes = useLiveQuery(() => deps.dishes.list(), [deps]);
  const model = weekPage(weekStart, today, meals, dishes);

  return (
    <Page>
      <Navbar title={model.title} />
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
