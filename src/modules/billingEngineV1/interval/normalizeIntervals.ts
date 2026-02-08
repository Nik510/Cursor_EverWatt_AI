import { getZonedParts, zonedLocalToUtcDate } from '../time/zonedTime';

export type IntervalInputRowV1 = {
  timestampIso?: string;
  timestamp?: string | number;
  ts?: string | number;
  kw?: number;
  kwh?: number;
  value?: number;
};

export type NormalizedIntervalV1 = {
  ts: string; // UTC ISO string
  kw: number;
  kwhForInterval: number;
  isValid: boolean;
  /** Optional: populated by TOU mapper */
  touLabel?: string;
};

export type NormalizeIntervalsResultV1 = {
  intervals: NormalizedIntervalV1[];
  inferred: {
    resolutionMinutes: number;
    inputUnit: 'kW' | 'kWh';
    timezone: string;
  };
  warnings: string[];
};

function safeNum(x: unknown): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function parseLocalIsoParts(s: string): { year: number; month: number; day: number; hour: number; minute: number; second: number } | null {
  const m =
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(String(s || '').trim()) ||
    /^(\d{4})\/(\d{2})\/(\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(String(s || '').trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = m[4] ? Number(m[4]) : 0;
  const minute = m[5] ? Number(m[5]) : 0;
  const second = m[6] ? Number(m[6]) : 0;
  if (![year, month, day, hour, minute, second].every((n) => Number.isFinite(n))) return null;
  return { year, month, day, hour, minute, second };
}

function parseTimestampToUtcDate(args: { row: IntervalInputRowV1; timezone: string; warnings: string[] }): Date | null {
  const row = args.row;
  const tz = args.timezone || 'UTC';
  const s =
    String(row.timestampIso ?? '').trim() ||
    (row.timestamp != null ? String(row.timestamp).trim() : '') ||
    (row.ts != null ? String(row.ts).trim() : '');

  if (!s) return null;

  // Epoch milliseconds / seconds
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    const ms = n > 2_000_000_000_000 ? n : n * 1000; // heuristic seconds vs ms
    const d = new Date(ms);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  // Explicit zone present (Z or ±hh:mm)
  if (/[zZ]$/.test(s) || /[+\-]\d{2}:\d{2}$/.test(s) || /[+\-]\d{4}$/.test(s)) {
    const d = new Date(s);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  // Interpret as local in `tz`
  const parts = parseLocalIsoParts(s);
  if (!parts) {
    args.warnings.push(`Unparseable timestamp: "${s}"`);
    return null;
  }
  const d = zonedLocalToUtcDate({ local: parts, timeZone: tz });
  return Number.isFinite(d.getTime()) ? d : null;
}

function inferResolutionMinutes(dates: Date[]): number {
  if (dates.length < 2) return 60;
  const diffs: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    const a = dates[i - 1].getTime();
    const b = dates[i].getTime();
    const dt = b - a;
    if (!Number.isFinite(dt) || dt <= 0) continue;
    diffs.push(dt);
  }
  diffs.sort((a, b) => a - b);
  const mid = diffs[Math.floor(diffs.length / 2)] ?? 3_600_000;
  const minutes = Math.max(1, Math.round(mid / 60_000));
  // Snap to common utility resolutions for stability.
  const candidates = [5, 10, 15, 30, 60];
  let best = minutes;
  let bestErr = Infinity;
  for (const c of candidates) {
    const err = Math.abs(c - minutes);
    if (err < bestErr) {
      bestErr = err;
      best = c;
    }
  }
  return best;
}

export function normalizeIntervals(args: {
  intervals: IntervalInputRowV1[];
  inputUnit?: 'kW' | 'kWh' | 'infer';
  timezone?: string;
}): NormalizeIntervalsResultV1 {
  const warnings: string[] = [];
  const tz = String(args.timezone || '').trim() || 'UTC';

  const parsed: Array<{ date: Date; row: IntervalInputRowV1; kw: number | null; kwh: number | null }> = [];
  for (const r of args.intervals || []) {
    const d = parseTimestampToUtcDate({ row: r, timezone: tz, warnings });
    if (!d) continue;
    const kw = safeNum(r.kw ?? (r as any).kW);
    const kwh = safeNum(r.kwh ?? (r as any).kWh);
    const value = safeNum(r.value);
    parsed.push({ date: d, row: r, kw, kwh: kwh ?? value });
  }

  parsed.sort((a, b) => a.date.getTime() - b.date.getTime());
  const dates = parsed.map((p) => p.date);
  const resolutionMinutes = inferResolutionMinutes(dates);
  const intervalHours = resolutionMinutes / 60;

  // Infer unit if needed.
  let unit: 'kW' | 'kWh' = 'kW';
  if (args.inputUnit && args.inputUnit !== 'infer') unit = args.inputUnit;
  else {
    const hasKw = parsed.some((p) => Number.isFinite(p.kw ?? NaN));
    const hasKwh = parsed.some((p) => Number.isFinite(p.kwh ?? NaN));
    unit = hasKwh && !hasKw ? 'kWh' : 'kW';
    if (hasKw && hasKwh) warnings.push('Both kW and kWh values detected; defaulting to kW for normalization.');
    if (!hasKw && !hasKwh) warnings.push('No kW/kWh values detected; all intervals will be marked invalid.');
  }

  const out: NormalizedIntervalV1[] = [];
  for (const p of parsed) {
    const ts = p.date.toISOString();
    let kw: number | null = null;
    let kwhForInterval: number | null = null;
    if (unit === 'kW') {
      kw = Number.isFinite(p.kw ?? NaN) ? Number(p.kw) : null;
      kwhForInterval = kw != null ? kw * intervalHours : null;
    } else {
      kwhForInterval = Number.isFinite(p.kwh ?? NaN) ? Number(p.kwh) : null;
      kw = kwhForInterval != null ? kwhForInterval / intervalHours : null;
    }

    const isValid = kw != null && kwhForInterval != null && Number.isFinite(kw) && Number.isFinite(kwhForInterval);
    out.push({
      ts,
      kw: isValid ? kw! : 0,
      kwhForInterval: isValid ? kwhForInterval! : 0,
      isValid,
    });
  }

  // Sanity: ensure at least one valid interval.
  if (!out.some((r) => r.isValid)) warnings.push('No valid intervals after normalization.');

  // Optional: warn when timezone seems mismatched (heuristic)
  if (tz !== 'UTC') {
    const sample = out.find((r) => r.isValid);
    if (sample) {
      const parts = getZonedParts(new Date(sample.ts), tz);
      if (!parts) warnings.push(`Timezone "${tz}" could not be applied by Intl; TOU mapping may be incorrect.`);
    }
  }

  return {
    intervals: out,
    inferred: { resolutionMinutes, inputUnit: unit, timezone: tz },
    warnings,
  };
}

