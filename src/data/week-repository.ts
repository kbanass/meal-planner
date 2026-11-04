import { newMeal } from '../domain/meals';
import type { IdGenerator } from '../domain/ports';
import { nextPosition } from '../domain/slots';
import type { DaySlots, Ingredient, IsoDate, Meal } from '../domain/types';
import type { PlannerDb } from './db';

/** Inclusive on both ends. */
export interface DateRange {
  start: IsoDate;
  end: IsoDate;
}

export interface WeekRepository {
  listMeals(range: DateRange): Promise<Meal[]>;
  listDaySlots(range: DateRange): Promise<DaySlots[]>;
  getMeal(id: string): Promise<Meal | undefined>;
  addMeal(input: { date: IsoDate; slot: number; dishId: string }): Promise<Meal>;
  putMeal(meal: Meal): Promise<void>;
  removeMeal(id: string): Promise<void>;
  /** `detached.ingredients` of every Detached Meal, in all Weeks (Product usage). */
  listAllDetachedIngredientLists(): Promise<Ingredient[][]>;
}

/** Shared with the Product repository, which reads it inside its own transactions. */
export async function detachedIngredientLists(db: PlannerDb): Promise<Ingredient[][]> {
  const meals = await db.meals.filter((meal) => meal.detached !== null).toArray();
  return meals.map((meal) => (meal.detached as NonNullable<Meal['detached']>).ingredients);
}

export function createWeekRepository(db: PlannerDb, ids: IdGenerator): WeekRepository {
  return {
    // ISO dates sort as strings in calendar order, so a key range is a date range.
    listMeals: ({ start, end }) => db.meals.where('date').between(start, end, true, true).toArray(),
    listDaySlots: ({ start, end }) =>
      db.daySlots.where('date').between(start, end, true, true).toArray(),
    getMeal: (id) => db.meals.get(id),

    addMeal({ date, slot, dishId }) {
      return db.transaction('rw', db.meals, async () => {
        const inSlot = await db.meals
          .where('date')
          .equals(date)
          .filter((meal) => meal.slot === slot)
          .toArray();
        const meal = newMeal({ id: ids.next(), date, slot, position: nextPosition(inSlot), dishId });
        await db.meals.add(meal);
        return meal;
      });
    },

    async putMeal(meal) {
      await db.meals.put(meal);
    },
    removeMeal: (id) => db.meals.delete(id),
    listAllDetachedIngredientLists: () => detachedIngredientLists(db),
  };
}
