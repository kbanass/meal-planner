import type { IsoDate } from './types';

// Calendar math on whole day numbers (days since 1970-01-01), using Howard Hinnant's
// days_from_civil / civil_from_days algorithms. No Date object is involved, so time zones
// and daylight saving time cannot shift a date (research R1).

export const DAY_NAMES: readonly string[] = [
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
  'Niedziela',
];

export const MONTH_ABBREVIATIONS: readonly string[] = [
  'sty',
  'lut',
  'mar',
  'kwi',
  'maj',
  'cze',
  'lip',
  'sie',
  'wrz',
  'paź',
  'lis',
  'gru',
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface Civil {
  year: number;
  month: number; // 1–12
  day: number; // 1–31
}

function parse(date: IsoDate): Civil {
  return {
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
    day: Number(date.slice(8, 10)),
  };
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

export function toDayNumber(date: IsoDate): number {
  const civil = parse(date);
  const { month, day } = civil;
  // The algorithm's year starts in March, so January and February belong to the year before.
  const year = civil.year - (month <= 2 ? 1 : 0);
  const era = Math.floor(year / 400);
  const yearOfEra = year - era * 400;
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

export function fromDayNumber(dayNumber: number): IsoDate {
  const z = dayNumber + 719468;
  const era = Math.floor(z / 146097);
  const dayOfEra = z - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365,
  );
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const monthIndex = Math.floor((5 * dayOfYear + 2) / 153); // 0 = March
  const day = dayOfYear - Math.floor((153 * monthIndex + 2) / 5) + 1;
  const month = monthIndex < 10 ? monthIndex + 3 : monthIndex - 9;
  const year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0);
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

/** 'YYYY-MM-DD' naming a real calendar day (no 2026-02-30). */
export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const { month } = parse(value);
  // An impossible day or month does not survive the round trip through a day number.
  return month >= 1 && month <= 12 && fromDayNumber(toDayNumber(value)) === value;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromDayNumber(toDayNumber(date) + days);
}

/** Monday = 0 … Sunday = 6. 1970-01-01, day 0, was a Thursday. */
export function weekdayIndex(date: IsoDate): number {
  return (((toDayNumber(date) + 3) % 7) + 7) % 7;
}

/** The Monday that starts the Week containing `date`. */
export function weekStartOf(date: IsoDate): IsoDate {
  return addDays(date, -weekdayIndex(date));
}

export function weekDates(weekStart: IsoDate): IsoDate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function monthName(month: number): string {
  return MONTH_ABBREVIATIONS[month - 1] as string;
}

export function dayLabel(date: IsoDate): { dayName: string; dateText: string } {
  const { month, day } = parse(date);
  return {
    dayName: DAY_NAMES[weekdayIndex(date)] as string,
    dateText: `${day} ${monthName(month)}`,
  };
}

/** "2–8 lis 2026", "30 lis – 6 gru 2026", "28 gru 2026 – 3 sty 2027". */
export function weekRangeLabel(weekStart: IsoDate): string {
  const first = parse(weekStart);
  const last = parse(addDays(weekStart, 6));
  if (first.year !== last.year) {
    return `${first.day} ${monthName(first.month)} ${first.year} – ${last.day} ${monthName(last.month)} ${last.year}`;
  }
  if (first.month !== last.month) {
    return `${first.day} ${monthName(first.month)} – ${last.day} ${monthName(last.month)} ${last.year}`;
  }
  return `${first.day}–${last.day} ${monthName(last.month)} ${last.year}`;
}
