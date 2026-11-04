import { describe, expect, it } from 'vitest';
import {
  addDays,
  DAY_NAMES,
  dayLabel,
  fromDayNumber,
  isIsoDate,
  MONTH_ABBREVIATIONS,
  toDayNumber,
  weekDates,
  weekdayIndex,
  weekRange,
  weekRangeLabel,
  weekStartOf,
} from '../../src/domain/dates';

describe('weekStartOf', () => {
  it.each([
    ['2026-11-04', '2026-11-02'], // Wednesday
    ['2026-11-08', '2026-11-02'], // Sunday ends the Week that started on Monday
    ['2026-11-02', '2026-11-02'], // Monday is its own start
    ['2027-01-01', '2026-12-28'], // across a year boundary
  ])('%s → %s', (date, monday) => {
    expect(weekStartOf(date)).toBe(monday);
  });
});

describe('weekDates', () => {
  // The EU clock changes fall on 2026-03-29 and 2026-10-25.
  it.each(['2026-03-30', '2026-10-19', '2026-10-26', '2026-03-23'])(
    'the Week of %s has 7 consecutive days, Monday to Sunday',
    (weekStart) => {
      const dates = weekDates(weekStart);
      expect(dates).toHaveLength(7);
      expect(dates[0]).toBe(weekStart);
      dates.forEach((date, i) => {
        expect(weekdayIndex(date)).toBe(i);
        expect(toDayNumber(date)).toBe(toDayNumber(weekStart) + i);
      });
    },
  );

  it('lists the dates of the spec example Week', () => {
    expect(weekDates('2026-11-02')).toEqual([
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
    ]);
  });
});

describe('weekRange', () => {
  it('reads Monday to Sunday', () => {
    expect(weekRange('2026-11-02')).toEqual({ start: '2026-11-02', end: '2026-11-08' });
  });
});

describe('addDays', () => {
  it.each([
    ['2024-02-28', 1, '2024-02-29'],
    ['2024-02-29', 1, '2024-03-01'],
    ['2025-02-28', 1, '2025-03-01'],
    ['2026-12-28', 6, '2027-01-03'],
    ['2026-11-09', -7, '2026-11-02'],
    ['2000-02-28', 1, '2000-02-29'], // divisible by 400: leap year
    ['2100-02-28', 1, '2100-03-01'], // divisible by 100 only: no leap year
  ])('%s + %d → %s', (date, days, expected) => {
    expect(addDays(date, days)).toBe(expected);
  });
});

describe('toDayNumber and fromDayNumber', () => {
  it('counts days from 1970-01-01', () => {
    expect(toDayNumber('1970-01-01')).toBe(0);
    expect(toDayNumber('1969-12-31')).toBe(-1);
    expect(toDayNumber('1970-03-01')).toBe(59);
    expect(fromDayNumber(-1)).toBe('1969-12-31');
  });

  it('round-trips every day from 2023 to 2028', () => {
    const first = toDayNumber('2023-01-01');
    const last = toDayNumber('2028-12-31');
    for (let day = first; day <= last; day += 1) {
      expect(toDayNumber(fromDayNumber(day))).toBe(day);
    }
    expect(last - first + 1).toBe(365 * 4 + 366 * 2);
  });

  it('pads years, months and days', () => {
    expect(fromDayNumber(toDayNumber('0999-01-05'))).toBe('0999-01-05');
  });
});

describe('weekdayIndex', () => {
  it.each([
    ['2026-11-02', 0],
    ['2026-11-05', 3],
    ['2026-11-08', 6],
    ['1970-01-01', 3], // a Thursday
    ['1969-12-29', 0], // a Monday before the epoch
  ])('%s → %d', (date, index) => {
    expect(weekdayIndex(date)).toBe(index);
  });
});

describe('isIsoDate', () => {
  it.each(['2026-11-04', '2024-02-29', '2000-02-29', '2026-12-31'])('accepts %j', (value) => {
    expect(isIsoDate(value)).toBe(true);
  });

  it.each([
    '2026-02-30',
    '2025-02-29',
    '2100-02-29',
    '2026-13-01',
    '2026-00-10',
    '2026-11-00',
    '2026-1-5',
    '2026-11-04T00:00',
    '',
    42,
    null,
    undefined,
  ])('rejects %j', (value) => {
    expect(isIsoDate(value)).toBe(false);
  });
});

describe('labels', () => {
  it('names the days and months in Polish', () => {
    expect(DAY_NAMES).toEqual([
      'Poniedziałek',
      'Wtorek',
      'Środa',
      'Czwartek',
      'Piątek',
      'Sobota',
      'Niedziela',
    ]);
    expect(MONTH_ABBREVIATIONS).toEqual([
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
    ]);
  });

  it('labels a day', () => {
    expect(dayLabel('2026-11-05')).toEqual({ dayName: 'Czwartek', dateText: '5 lis' });
    expect(dayLabel('2026-11-08')).toEqual({ dayName: 'Niedziela', dateText: '8 lis' });
  });

  it.each([
    ['2026-11-02', '2–8 lis 2026'],
    ['2026-11-30', '30 lis – 6 gru 2026'],
    ['2026-12-28', '28 gru 2026 – 3 sty 2027'],
  ])('labels the Week of %s as %j', (weekStart, label) => {
    expect(weekRangeLabel(weekStart)).toBe(label);
  });
});
