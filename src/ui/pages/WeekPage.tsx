import { useLiveQuery } from 'dexie-react-hooks';
import { f7, Icon, Navbar, Page } from 'framework7-react';
import { useEffect, useState } from 'react';
import { addMealFromDish, addSlotToDay, copyWeekToNext, weekHasPlanAt } from '../../app/week';
import { addDays, sameWeekday, weekRange, weekStartOf } from '../../domain/dates';
import type { Dish, IsoDate } from '../../domain/types';
import { DayStrip } from '../components/DayStrip';
import { DishPickerSheet } from '../components/DishPickerSheet';
import { MealCard, SlotAddCard } from '../components/MealCard';
import { MealSheet } from '../components/MealSheet';
import { useDeps } from '../hooks/useDeps';
import {
  copyConfirmMessage,
  copyDoneToast,
  copyFailedMessage,
  weekPage,
  type MealRow,
} from '../view-models/week';

/**
 * The Tydzień tab on one screen: the Week card with its day strip, then the selected day's
 * Slots (spec Revisions 2026-11-04, contracts/ui.md).
 */
export function WeekPage() {
  const deps = useDeps();
  // Read on mount: the app always opens on the current Week, with today selected (FR-002, FR-007).
  const [today, setToday] = useState(() => deps.clock.today());
  const [weekStart, setWeekStart] = useState(() => weekStartOf(today));
  const [selected, setSelected] = useState<IsoDate>(today);
  const meals = useLiveQuery(() => deps.week.listMeals(weekRange(weekStart)), [deps, weekStart]);
  const daySlots = useLiveQuery(
    () => deps.week.listDaySlots(weekRange(weekStart)),
    [deps, weekStart],
  );
  const dishes = useLiveQuery(() => deps.dishes.list(), [deps]);
  const settings = useLiveQuery(() => deps.settings.get(), [deps]);
  const model = weekPage(weekStart, today, selected, { meals, daySlots, dishes, settings });

  // One picker and one Meal sheet per page; the target Slot or Meal lives in state.
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [sheetMeal, setSheetMeal] = useState<MealRow | null>(null);
  const [sheetOpened, setSheetOpened] = useState(false);

  // Resumed after midnight: move the today mark, but keep the Week and the selection (research R2).
  useEffect(() => {
    function refreshToday() {
      if (document.visibilityState === 'visible') setToday(deps.clock.today());
    }
    document.addEventListener('visibilitychange', refreshToday);
    return () => document.removeEventListener('visibilitychange', refreshToday);
  }, [deps]);

  /** ← / →: another Week, with the same weekday selected (FR-007). */
  function moveWeek(days: number) {
    const next = addDays(weekStart, days);
    setWeekStart(next);
    setSelected(sameWeekday(selected, next));
  }

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

  async function pick(dish: Dish) {
    if (pickerSlot === null) return;
    setPickerSlot(null);
    await addMealFromDish(deps, { date: selected, slot: pickerSlot, dishId: dish.id });
  }

  function openMeal(row: MealRow) {
    setSheetMeal(row);
    setSheetOpened(true);
  }

  return (
    <Page className="week-page">
      <Navbar large transparent title="Tydzień" />
      <div className="page-wide week-content">
        <section className="week-card">
          <div className="week-card-header">
            <h2 className="week-card-month">{model.monthLabel}</h2>
            <div className="week-card-nav">
              <button
                type="button"
                className="round-button"
                aria-label="Poprzedni tydzień"
                onClick={() => moveWeek(-7)}
              >
                <Icon f7="arrow_left" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="round-button"
                aria-label="Następny tydzień"
                onClick={() => moveWeek(7)}
              >
                <Icon f7="arrow_right" aria-hidden="true" />
              </button>
            </div>
          </div>
          <DayStrip cells={model.strip} onSelect={setSelected} />
          <button
            type="button"
            className="week-card-copy"
            disabled={!model.canCopy}
            onClick={() => void startCopy()}
          >
            <Icon f7="doc_on_doc" aria-hidden="true" />
            <span>Skopiuj do następnego tygodnia</span>
          </button>
        </section>

        <div className="day-heading">
          <h3>{model.heading}</h3>
          <span className="day-heading-summary">{model.summary}</span>
        </div>

        {model.slots.map((slot) => (
          <section key={slot.number} className="slot" data-slot={slot.number}>
            <div className="slot-label">{slot.number}</div>
            {slot.rows.map((row) => (
              <MealCard key={row.id} row={row} onOpen={() => openMeal(row)} />
            ))}
            {slot.rows.length === 0 ? (
              <SlotAddCard label="Dodaj posiłek" onClick={() => setPickerSlot(slot.number)} />
            ) : (
              <button
                type="button"
                className="slot-add-link"
                onClick={() => setPickerSlot(slot.number)}
              >
                <Icon f7="plus" aria-hidden="true" />
                <span>Dodaj posiłek</span>
              </button>
            )}
          </section>
        ))}
        {/* Adds one Slot to this day only (FR-010). */}
        <SlotAddCard label="dodaj kolejny" onClick={() => void addSlotToDay(deps, selected)} />
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
