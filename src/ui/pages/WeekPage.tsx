import { useLiveQuery } from 'dexie-react-hooks';
import { f7, Icon, Page } from 'framework7-react';
import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { addMealFromDish, addSlotToDay, copyWeekToNext, weekHasPlanAt } from '../../app/week';
import { addDays, sameWeekday, weekRange, weekStartOf } from '../../domain/dates';
import type { Dish, IsoDate } from '../../domain/types';
import { DayStrip } from '../components/DayStrip';
import { DishPickerSheet } from '../components/DishPickerSheet';
import { MacroTotals } from '../components/MacroTotals';
import { MealSheet } from '../components/MealSheet';
import { SlotCard } from '../components/SlotCard';
import { useDeps } from '../hooks/useDeps';
import {
  copyConfirmMessage,
  copyDoneToast,
  copyFailedMessage,
  swipeWeekDelta,
  weekPage,
  type MealRow,
} from '../view-models/week';

/**
 * The Tydzień tab on one screen: the Week card with its day strip and the selected day's
 * totals, then that day's Slot cards (spec Revisions 2026-11-04, contracts/ui.md).
 */
export function WeekPage() {
  const deps = useDeps();
  // Read on mount: the app always opens on the current Week, with today selected (FR-002, FR-007).
  const [today, setToday] = useState(() => deps.clock.today());
  // The viewed Week and its selected day change together, so they share one state value.
  const [view, setView] = useState(() => ({ weekStart: weekStartOf(today), selected: today }));
  const { weekStart, selected } = view;
  const setSelected = (date: IsoDate) => setView((current) => ({ ...current, selected: date }));
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

  // Which way the Week card slides in after a change, for a short animation.
  const [slide, setSlide] = useState<'next' | 'previous' | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  /** Swipe, or ← / → on desktop: another Week, with the same weekday selected (FR-005, FR-007). */
  function moveWeek(days: number) {
    setSlide(days > 0 ? 'next' : 'previous');
    setView((current) => {
      const next = addDays(current.weekStart, days);
      return { weekStart: next, selected: sameWeekday(current.selected, next) };
    });
  }

  function onTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function onTouchEnd(event: TouchEvent) {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch) return;
    const days = swipeWeekDelta(touch.clientX - start.x, touch.clientY - start.y);
    if (days !== 0) moveWeek(days);
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
      <div className="page-wide week-content">
        <section className="week-card" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div key={weekStart} className={slide ? `week-slide week-slide-${slide}` : 'week-slide'}>
            <div className="week-card-header">
              <h2 className="week-card-month">{model.monthLabel}</h2>
              {/* Visible on desktop; on phones the card is swiped, and these stay for screen readers. */}
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
          </div>
          <div className="week-card-totals">
            <MacroTotals totals={model.dayTotals} />
          </div>
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
          <SlotCard
            key={slot.number}
            slot={slot}
            onOpenMeal={openMeal}
            onAdd={() => setPickerSlot(slot.number)}
          />
        ))}

        {/* Set apart from the Slot cards: adds one Slot to this day only (FR-010, FR-044). */}
        <div className="add-slot-area">
          <button
            type="button"
            className="add-slot-button"
            onClick={() => void addSlotToDay(deps, selected)}
          >
            <Icon f7="plus_circle" aria-hidden="true" />
            <span>dodaj kolejny</span>
          </button>
        </div>
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
