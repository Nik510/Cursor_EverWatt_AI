import type { BillBreakdown, ISODateTime, TariffModel } from '../types';

export type BillingOracleDeterminant = {
  determinantId: string;
  name: string;
  kind: 'monthlyMax' | 'dailyMax' | 'energy' | 'fixed';
  beforeKw?: number;
  afterKw?: number;
  bindingTimestampsBefore?: ISODateTime[];
  bindingTimestampsAfter?: ISODateTime[];
  amountUsd: number;
  notes: string[];
};

export type BillingOracleResult = {
  bill: BillBreakdown;
  chargeBreakdown: {
    fixedUsd: number;
    energyUsd: number;
    demandUsd: number;
  };
  determinants: BillingOracleDeterminant[];
  notes: string[];
};

function median(values: number[]): number | null {
  const v = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

function inferIntervalMinutes(rows: Array<{ timestamp: Date }>): number {
  if (rows.length < 2) return 15;
  const sorted = [...rows].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const diffs: number[] = [];
  for (let i = 1; i < Math.min(sorted.length, 2000); i++) {
    const dtMs = sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime();
    if (dtMs > 0) diffs.push(dtMs / (1000 * 60));
  }
  const m = median(diffs);
  return m && m > 0 ? m : 15;
}

function tieredCharge(kw: number, tiers: Array<{ upToKw?: number; pricePerKw: number }>): number {
  let remaining = Math.max(0, kw);
  let prevCap = 0;
  let cost = 0;
  for (const t of tiers) {
    const cap = typeof t.upToKw === 'number' ? t.upToKw : Infinity;
    const width = Math.max(0, cap - prevCap);
    const inTier = Math.min(remaining, width);
    cost += inTier * t.pricePerKw;
    remaining -= inTier;
    prevCap = cap;
    if (remaining <= 0) break;
  }
  return cost;
}

type LocalParts = {
  minuteOfDay: number; // 0..1439
  dayType: 'weekday' | 'weekend';
  dayKey: string; // YYYY-MM-DD in local time
};

function getLocalParts(ts: Date, timeZone: string): LocalParts {
  // Use Intl to compute local components deterministically (no external libs).
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = dtf.formatToParts(ts);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = Number(get('hour'));
  const minute = Number(get('minute'));
  const weekday = get('weekday'); // Mon/Tue/...
  const dayKey = `${year}-${month}-${day}`;
  const dayType: 'weekday' | 'weekend' = weekday === 'Sat' || weekday === 'Sun' ? 'weekend' : 'weekday';
  return { minuteOfDay: hour * 60 + minute, dayType, dayKey };
}

function inTouWindow(lp: LocalParts, w: { startMinute: number; endMinute: number; days: 'all' | 'weekday' | 'weekend' }): boolean {
  const okDay = w.days === 'all' ? true : w.days === lp.dayType;
  if (!okDay) return false;
  const m = lp.minuteOfDay;
  // Assume windows do not wrap midnight in Phase 1 (if they do, represent as two windows).
  return m >= w.startMinute && m < w.endMinute;
}

function filterIntervalsByWindows(args: {
  tariff: TariffModel;
  intervals: Array<{ timestamp: Date; kw: number; local: LocalParts }>;
  windows?: Array<{ startMinute: number; endMinute: number; days: 'all' | 'weekday' | 'weekend' }>;
}): Array<{ timestamp: Date; kw: number; local: LocalParts }> {
  if (!args.windows?.length) return args.intervals;
  return args.intervals.filter((r) => args.windows!.some((w) => inTouWindow(r.local, w)));
}

/**
 * Phase 1 Billing Oracle (deterministic truth engine).
 *
 * Requirements:
 * - deterministic and reproducible
 * - explicit determinants + charge breakdown
 * - supports monthlyMax and dailyMax demand determinants
 */
export function computeBillDeterministic(_args: {
  tariff: TariffModel;
  intervals: Array<{ timestamp: Date; kw: number }>;
}): BillingOracleResult {
  const { tariff, intervals } = _args;
  const timeZone = tariff.timezone || 'UTC';

  const normalized = intervals
    .filter((r) => r.timestamp instanceof Date && Number.isFinite(r.kw))
    .map((r) => ({ ...r, local: getLocalParts(r.timestamp, timeZone) }))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const intervalMinutes = inferIntervalMinutes(normalized);
  const intervalHours = intervalMinutes / 60;

  const determinants: BillingOracleDeterminant[] = [];
  const notes: string[] = [];

  // Fixed
  const fixedUsd = Number(tariff.fixedMonthlyChargeUsd ?? 0) || 0;
  if (fixedUsd > 0) {
    determinants.push({
      determinantId: 'fixed_monthly',
      name: 'Fixed monthly charge',
      kind: 'fixed',
      amountUsd: fixedUsd,
      notes: [],
    });
  }

  // Energy (TOU-aware)
  let energyUsd = 0;
  if (tariff.energyCharges?.length) {
    for (const r of normalized) {
      const kwh = r.kw * intervalHours;
      const charge = tariff.energyCharges.find((c) => c.windows?.some((w) => inTouWindow(r.local, w))) ?? null;
      if (!charge) continue;
      energyUsd += kwh * charge.pricePerKwh;
    }
    determinants.push({
      determinantId: 'energy_total',
      name: 'Energy charges',
      kind: 'energy',
      amountUsd: energyUsd,
      notes: ['Computed as sum over interval kWh assigned to matching TOU windows.'],
    });
  } else {
    notes.push('No energy charges modeled (tariff.energyCharges empty).');
  }

  // Demand determinants
  let demandUsd = 0;
  for (const det of tariff.demandDeterminants ?? []) {
    const scoped = filterIntervalsByWindows({ tariff, intervals: normalized, windows: det.windows });

    if (det.kind === 'monthlyMax') {
      let maxKw = 0;
      for (const r of scoped) maxKw = Math.max(maxKw, r.kw);
      const eps = 1e-6;
      const binding = scoped.filter((r) => Math.abs(r.kw - maxKw) <= eps).map((r) => r.timestamp.toISOString());
      const amount = tieredCharge(maxKw, det.tiers);
      demandUsd += amount;
      determinants.push({
        determinantId: det.id,
        name: det.name,
        kind: 'monthlyMax',
        beforeKw: maxKw,
        bindingTimestampsBefore: binding,
        amountUsd: amount,
        notes: ['Monthly max demand computed over scoped intervals (det.windows).'],
      });
      continue;
    }

    if (det.kind === 'dailyMax') {
      const byDay = new Map<string, Array<{ timestamp: Date; kw: number; local: LocalParts }>>();
      for (const r of scoped) {
        const list = byDay.get(r.local.dayKey) ?? [];
        list.push(r);
        byDay.set(r.local.dayKey, list);
      }
      let total = 0;
      const bindingTimestamps: string[] = [];
      byDay.forEach((rows) => {
        let maxKw = 0;
        for (const r of rows) maxKw = Math.max(maxKw, r.kw);
        const eps = 1e-6;
        bindingTimestamps.push(...rows.filter((r) => Math.abs(r.kw - maxKw) <= eps).map((r) => r.timestamp.toISOString()));
        total += tieredCharge(maxKw, det.tiers);
      });
      demandUsd += total;
      determinants.push({
        determinantId: det.id,
        name: det.name,
        kind: 'dailyMax',
        beforeKw: undefined,
        bindingTimestampsBefore: bindingTimestamps.slice(0, 50),
        amountUsd: total,
        notes: ['Daily max demand computed per local day (timezone) over scoped intervals (det.windows).'],
      });
      continue;
    }

    notes.push(`Unsupported determinant kind '${det.kind}' in Phase 1 billing oracle.`);
  }

  const totalUsd = fixedUsd + energyUsd + demandUsd;

  const bill: BillBreakdown = {
    totalUsd,
    fixedUsd,
    energyUsd,
    demandUsd,
    determinants: determinants
      .filter((d) => d.kind === 'monthlyMax' || d.kind === 'dailyMax')
      .map((d) => ({
        determinantId: d.determinantId,
        name: d.name,
        beforeKw: d.beforeKw,
        bindingTimestampsBefore: d.bindingTimestampsBefore,
      })),
    notes,
  };

  return {
    bill,
    chargeBreakdown: { fixedUsd, energyUsd, demandUsd },
    determinants,
    notes,
  };
}

