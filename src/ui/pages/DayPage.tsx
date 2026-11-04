import { useLiveQuery } from 'dexie-react-hooks';
import { Badge, Block, BlockTitle, Icon, List, ListItem, Navbar, Page } from 'framework7-react';
import type { Router } from 'framework7/types';
import { useState } from 'react';
import { addMealFromDish } from '../../app/week';
import type { Dish } from '../../domain/types';
import { DishAvatar } from '../components/DishAvatar';
import { DishPickerSheet } from '../components/DishPickerSheet';
import { MealSheet } from '../components/MealSheet';
import { useDeps } from '../hooks/useDeps';
import { dayPage, invalidDayMessage, type MealRow } from '../view-models/week';

interface DayPageProps {
  f7route: Router.Route;
}

export function DayPage({ f7route }: DayPageProps) {
  const deps = useDeps();
  const date = f7route.params.date ?? '';
  const range = { start: date, end: date };
  const meals = useLiveQuery(() => deps.week.listMeals(range), [deps, date]);
  const daySlots = useLiveQuery(() => deps.week.listDaySlots(range), [deps, date]);
  const dishes = useLiveQuery(() => deps.dishes.list(), [deps]);
  const settings = useLiveQuery(() => deps.settings.get(), [deps]);
  const model = dayPage(date, { meals, daySlots, dishes, settings });

  // One picker and one Meal sheet per page; the target Slot or Meal lives in state.
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [sheetMeal, setSheetMeal] = useState<MealRow | null>(null);
  const [sheetOpened, setSheetOpened] = useState(false);

  async function pick(dish: Dish) {
    if (pickerSlot === null) return;
    setPickerSlot(null);
    await addMealFromDish(deps, { date, slot: pickerSlot, dishId: dish.id });
  }

  function openMeal(row: MealRow) {
    setSheetMeal(row);
    setSheetOpened(true);
  }

  if (!model.valid) {
    return (
      <Page>
        <Navbar title="Dzień" backLink />
        <Block>
          <p>{invalidDayMessage}</p>
        </Block>
      </Page>
    );
  }

  return (
    <Page>
      <Navbar title={model.title} backLink />
      <div className="page-wide">
        {model.slots.map((slot) => (
          <div key={slot.number} data-slot={slot.number}>
            <BlockTitle>{slot.number}</BlockTitle>
            <List mediaList inset>
              {slot.rows.map((row) => (
                <ListItem
                  key={row.id}
                  link
                  title={row.title}
                  subtitle={row.subtitle}
                  onClick={() => openMeal(row)}
                >
                  <div slot="media">
                    <DishAvatar name={row.avatarName} photo={row.photo} size={40} />
                  </div>
                  {row.badge && (
                    <div slot="after">
                      <Badge color="orange">{row.badge}</Badge>
                    </div>
                  )}
                </ListItem>
              ))}
              <ListItem link title="Dodaj posiłek" onClick={() => setPickerSlot(slot.number)}>
                <Icon slot="media" f7="plus_circle" />
              </ListItem>
            </List>
          </div>
        ))}
      </div>

      <DishPickerSheet
        opened={pickerSlot !== null}
        onClose={() => setPickerSlot(null)}
        onPick={(dish) => void pick(dish)}
      />
      <MealSheet
        mealId={sheetMeal?.id ?? null}
        title={sheetMeal?.title ?? ''}
        opened={sheetOpened}
        onClose={() => setSheetOpened(false)}
      />
    </Page>
  );
}
