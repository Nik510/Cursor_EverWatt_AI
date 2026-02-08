export type ZonedParts = {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  second: number; // 0-59
  weekday: number; // 0=Sun..6=Sat
};

const WEEKDAY_MAP: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export function getZonedParts(date: Date, timeZone: string): ZonedParts | null {
  if (!Number.isFinite(date.getTime())) return null;
  const tz = String(timeZone || '').trim() || 'UTC';

  // Use a fixed locale and hour cycle for deterministic parts.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  });

  const parts = fmt.formatToParts(date);
  const byType: Record<string, string> = {};
  for (const p of parts) {
    if (p.type === 'literal') continue;
    byType[p.type] = p.value;
  }

  const wdKey = String(byType.weekday || '').toLowerCase().slice(0, 3);
  const weekday = WEEKDAY_MAP[wdKey];
  const year = Number(byType.year);
  const month = Number(byType.month);
  const day = Number(byType.day);
  const hour = Number(byType.hour);
  const minute = Number(byType.minute);
  const second = Number(byType.second);

  if (![year, month, day, hour, minute, second, weekday].every((n) => Number.isFinite(n))) return null;
  return { year, month, day, hour, minute, second, weekday };
}

function dayNumberUtc(y: number, m: number, d: number): number {
  // Deterministic day index (UTC midnight).
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function countLocalDaysInRange(args: { startUtc: Date; endUtc: Date; timeZone: string }): number | null {
  const s = getZonedParts(args.startUtc, args.timeZone);
  const e = getZonedParts(args.endUtc, args.timeZone);
  if (!s || !e) return null;
  const startDay = dayNumberUtc(s.year, s.month, s.day);
  const endDay = dayNumberUtc(e.year, e.month, e.day);
  // Interpret end as exclusive day boundary for fixed per-day charges.
  const days = Math.max(0, endDay - startDay);
  return days;
}

/**
 * Convert a local-time ISO-like timestamp ("YYYY-MM-DDTHH:mm[:ss]") in `timeZone`
 * to a UTC Date. Handles typical cases deterministically; DST ambiguities pick the
 * closest match from an iterative offset refinement.
 */
export function zonedLocalToUtcDate(args: {
  local: { year: number; month: number; day: number; hour: number; minute: number; second: number };
  timeZone: string;
}): Date {
  const tz = String(args.timeZone || '').trim() || 'UTC';
  const target = args.local;

  function offsetMinutes(timeZone: string, utcMs: number): number {
    const parts = getZonedParts(new Date(utcMs), timeZone);
    if (!parts) return 0;
    const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    return (asUtc - utcMs) / 60_000;
  }

  let utcGuess = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute, target.second);
  for (let i = 0; i < 4; i++) {
    const offset = offsetMinutes(tz, utcGuess);
    const next = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute, target.second) - offset * 60_000;
    if (Math.abs(next - utcGuess) < 60_000) {
      return new Date(next);
    }
    utcGuess = next;
  }
  return new Date(utcGuess);
}

