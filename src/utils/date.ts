/**
 * Date and Time Utilities
 * Provides functions for date manipulation and calculations
 */

/**
 * Check if a date is valid
 */
export function isValidDate(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  return !isNaN(d.getTime());
}

/**
 * Parse a date string or return Date object
 */
export function parseDate(date: Date | string): Date {
  if (date instanceof Date) return date;
  return new Date(date);
}

/**
 * Get start of day
 */
export function startOfDay(date: Date | string): Date {
  const d = parseDate(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day
 */
export function endOfDay(date: Date | string): Date {
  const d = parseDate(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get start of month
 */
export function startOfMonth(date: Date | string): Date {
  const d = parseDate(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Get end of month
 */
export function endOfMonth(date: Date | string): Date {
  const d = parseDate(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Get start of year
 */
export function startOfYear(date: Date | string): Date {
  const d = parseDate(date);
  return new Date(d.getFullYear(), 0, 1);
}

/**
 * Get end of year
 */
export function endOfYear(date: Date | string): Date {
  const d = parseDate(date);
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
}

/**
 * Add days to a date
 */
export function addDays(date: Date | string, days: number): Date {
  const d = parseDate(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Add months to a date
 */
export function addMonths(date: Date | string, months: number): Date {
  const d = parseDate(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Add years to a date
 */
export function addYears(date: Date | string, years: number): Date {
  const d = parseDate(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

/**
 * Get difference in days between two dates
 */
export function diffInDays(date1: Date | string, date2: Date | string): number {
  const d1 = startOfDay(parseDate(date1));
  const d2 = startOfDay(parseDate(date2));
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get difference in hours between two dates
 */
export function diffInHours(date1: Date | string, date2: Date | string): number {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  return (d2.getTime() - d1.getTime()) / (1000 * 60 * 60);
}

/**
 * Get difference in minutes between two dates
 */
export function diffInMinutes(date1: Date | string, date2: Date | string): number {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  return (d2.getTime() - d1.getTime()) / (1000 * 60);
}

/**
 * Check if a date is today
 */
export function isToday(date: Date | string): boolean {
  const d = parseDate(date);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date | string): boolean {
  return parseDate(date).getTime() < Date.now();
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: Date | string): boolean {
  return parseDate(date).getTime() > Date.now();
}

/**
 * Check if a date is within a date range
 */
export function isInDateRange(
  date: Date | string,
  start: Date | string,
  end: Date | string
): boolean {
  const d = parseDate(date).getTime();
  const s = parseDate(start).getTime();
  const e = parseDate(end).getTime();
  return d >= s && d <= e;
}

/**
 * Get age in years from a date
 */
export function getAge(birthDate: Date | string): number {
  const today = new Date();
  const birth = parseDate(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Get month name
 */
export function getMonthName(date: Date | string, format: 'short' | 'long' = 'long'): string {
  const d = parseDate(date);
  return d.toLocaleString('en-US', { month: format });
}

/**
 * Get day name
 */
export function getDayName(date: Date | string, format: 'short' | 'long' = 'long'): string {
  const d = parseDate(date);
  return d.toLocaleString('en-US', { weekday: format });
}

/**
 * Get ISO week number
 */
export function getWeekNumber(date: Date | string): number {
  const d = parseDate(date);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

/**
 * Check if a year is a leap year
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Get number of days in a month
 */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Format date as relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = parseDate(date);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  const isPast = diffMs < 0;
  const prefix = isPast ? '' : 'in ';
  const suffix = isPast ? ' ago' : '';

  if (diffYears > 0) {
    return `${prefix}${diffYears} ${diffYears === 1 ? 'year' : 'years'}${suffix}`;
  }
  if (diffMonths > 0) {
    return `${prefix}${diffMonths} ${diffMonths === 1 ? 'month' : 'months'}${suffix}`;
  }
  if (diffWeeks > 0) {
    return `${prefix}${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'}${suffix}`;
  }
  if (diffDays > 0) {
    return `${prefix}${diffDays} ${diffDays === 1 ? 'day' : 'days'}${suffix}`;
  }
  if (diffHours > 0) {
    return `${prefix}${diffHours} ${diffHours === 1 ? 'hour' : 'hours'}${suffix}`;
  }
  if (diffMinutes > 0) {
    return `${prefix}${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'}${suffix}`;
  }
  return 'just now';
}

/**
 * Get all dates in a date range
 */
export function getDatesInRange(start: Date | string, end: Date | string): Date[] {
  const dates: Date[] = [];
  const startDate = startOfDay(parseDate(start));
  const endDate = startOfDay(parseDate(end));
  const current = new Date(startDate);

  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  return (
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
  );
}

/**
 * Check if two dates are in the same month
 */
export function isSameMonth(date1: Date | string, date2: Date | string): boolean {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  return d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
}

/**
 * Check if two dates are in the same year
 */
export function isSameYear(date1: Date | string, date2: Date | string): boolean {
  return parseDate(date1).getFullYear() === parseDate(date2).getFullYear();
}
