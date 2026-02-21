type Ymd = { year: number; month: number; day: number };

function utcMsFromYmd({ year, month, day }: Ymd): number {
  return Date.UTC(year, month - 1, day);
}

function ymdFromUtcMs(ms: number): Ymd {
  const d = new Date(ms);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function addDays(ymd: Ymd, deltaDays: number): Ymd {
  return ymdFromUtcMs(utcMsFromYmd(ymd) + deltaDays * 86_400_000);
}

function dayOfWeek({ year, month, day }: Ymd): number {
  // 0=Sun ... 6=Sat
  return new Date(utcMsFromYmd({ year, month, day })).getUTCDay();
}

function isSameYmd(a: Ymd, b: Ymd): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function nthWeekdayOfMonth(args: { year: number; month: number; weekday: number; n: number }): number | null {
  const { year, month, weekday, n } = args;
  if (!Number.isFinite(n) || n <= 0) return null;
  const firstDow = dayOfWeek({ year, month, day: 1 });
  const offset = (weekday - firstDow + 7) % 7;
  const day = 1 + offset + 7 * (n - 1);
  // Validate within month (by checking month after constructing date)
  const ms = Date.UTC(year, month - 1, day);
  const d = new Date(ms);
  if (d.getUTCFullYear() !== year || d.getUTCMonth() + 1 !== month) return null;
  return day;
}

function lastWeekdayOfMonth(args: { year: number; month: number; weekday: number }): number {
  const { year, month, weekday } = args;
  // Day 0 of next month is the last day of this month
  const last = new Date(Date.UTC(year, month, 0));
  const lastDay = last.getUTCDate();
  const lastDow = last.getUTCDay();
  const offsetBack = (lastDow - weekday + 7) % 7;
  return lastDay - offsetBack;
}

function isFixedHolidayOrObserved(args: { date: Ymd; fixedMonth: number; fixedDay: number }): boolean {
  const { date, fixedMonth, fixedDay } = args;

  // Actual day
  if (date.month === fixedMonth && date.day === fixedDay) return true;

  // Observed rules (US federal convention):
  // - If holiday falls on Saturday, observed Friday.
  // - If holiday falls on Sunday, observed Monday.
  const fixed: Ymd = { year: date.year, month: fixedMonth, day: fixedDay };
  const dow = dayOfWeek(fixed);
  if (dow === 6) {
    const observed = addDays(fixed, -1);
    return isSameYmd(date, observed);
  }
  if (dow === 0) {
    const observed = addDays(fixed, 1);
    return isSameYmd(date, observed);
  }
  return false;
}

/**
 * Deterministic US holiday check (library-free).
 *
 * Notes:
 * - Input is a local calendar date (year/month/day), typically already timezone-adjusted upstream.
 * - Includes common US federal holidays + observed rules for fixed-date holidays.
 */
export function isUsHolidayYmd(args: Ymd): boolean {
  const date: Ymd = { year: Number(args.year), month: Number(args.month), day: Number(args.day) };
  if (![date.year, date.month, date.day].every((n) => Number.isFinite(n))) return false;

  // Fixed-date (with observed)
  if (isFixedHolidayOrObserved({ date, fixedMonth: 1, fixedDay: 1 })) return true; // New Year's Day
  if (isFixedHolidayOrObserved({ date, fixedMonth: 6, fixedDay: 19 })) return true; // Juneteenth
  if (isFixedHolidayOrObserved({ date, fixedMonth: 7, fixedDay: 4 })) return true; // Independence Day
  if (isFixedHolidayOrObserved({ date, fixedMonth: 11, fixedDay: 11 })) return true; // Veterans Day
  if (isFixedHolidayOrObserved({ date, fixedMonth: 12, fixedDay: 25 })) return true; // Christmas Day

  // Moving holidays
  // MLK Day: 3rd Monday in January
  const mlk = nthWeekdayOfMonth({ year: date.year, month: 1, weekday: 1, n: 3 });
  if (date.month === 1 && mlk && date.day === mlk) return true;

  // Presidents' Day: 3rd Monday in February
  const pres = nthWeekdayOfMonth({ year: date.year, month: 2, weekday: 1, n: 3 });
  if (date.month === 2 && pres && date.day === pres) return true;

  // Memorial Day: last Monday in May
  const memorial = lastWeekdayOfMonth({ year: date.year, month: 5, weekday: 1 });
  if (date.month === 5 && date.day === memorial) return true;

  // Labor Day: 1st Monday in September
  const labor = nthWeekdayOfMonth({ year: date.year, month: 9, weekday: 1, n: 1 });
  if (date.month === 9 && labor && date.day === labor) return true;

  // Columbus / Indigenous Peoples' Day: 2nd Monday in October
  const columbus = nthWeekdayOfMonth({ year: date.year, month: 10, weekday: 1, n: 2 });
  if (date.month === 10 && columbus && date.day === columbus) return true;

  // Thanksgiving Day: 4th Thursday in November
  const thanks = nthWeekdayOfMonth({ year: date.year, month: 11, weekday: 4, n: 4 });
  if (date.month === 11 && thanks && date.day === thanks) return true;

  return false;
}

