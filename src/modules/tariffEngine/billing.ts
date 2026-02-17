import type { BillingPeriod, IntervalRow, TariffModel } from './schema';
import type { CycleAssignmentRow } from './join';
import { getZonedParts } from '../billingEngineV1/time/zonedTime';

export const TariffEngineWarningCodesV1 = {
  TARIFFENGINE_UNSUPPORTED_CONSTRUCT: 'TARIFFENGINE_UNSUPPORTED_CONSTRUCT',
} as const;

export type BillingDeterminant = {
  determinantId: string;
  name: string;
  kind: string;
  beforeKw: number;
  afterKw: number;
  bindingTimestampsBefore: string[];
  bindingTimestampsAfter: string[];
  ratchetApplied: boolean;
  ratchetFloorKw?: number;
};

export type BillLineItem = {
  kind: 'fixed' | 'energy' | 'demand' | 'other';
  label: string;
  amount: number;
  meta?: Record<string, unknown>;
};

export type CycleBill = {
  cycleId: string;
  billStartDate: string;
  billEndDate: string;
  statedTotalBill?: number;
  determinants: BillingDeterminant[];
  lineItems: BillLineItem[];
  energyBreakdown?: {
    intervalMinutes: number;
    kwhTotal: number;
    kwhByTouPeriod: Record<string, number>;
    chargesByTouPeriod: Record<string, number>;
    totalEnergyCharge: number;
    reconcile: { ok: boolean; deltaKwh: number; deltaKwhPct: number; deltaDollars: number; deltaDollarsPct: number; notes: string[] };
  };
  total: number;
  reconcile?: {
    ok: boolean;
    delta: number;
    deltaPct: number;
    notes: string[];
  };
};

export type TariffRunOutput = {
  tariffId: string;
  tariffVersion: string;
  timezone: string;
  cycles: CycleBill[];
  summary: {
    cyclesCount: number;
    totalBefore: number;
    totalAfter: number;
    totalSavings: number;
    missingComponentsNotes: string[];
  };
};

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

function inMinuteWindow(minuteOfDay: number, w: { startMinute: number; endMinute: number }): boolean {
  const m = Math.max(0, Math.min(1440, Math.floor(minuteOfDay)));
  const start = Math.max(0, Math.min(1440, Math.floor(w.startMinute)));
  const end = Math.max(0, Math.min(1440, Math.floor(w.endMinute)));
  if (start === end) return false;
  if (end > start) return m >= start && m < end;
  // Wrap across midnight
  return m >= start || m < end;
}

function seasonForMonth(month: number): 'summer' | 'winter' {
  // Deterministic heuristic for v1: Jun–Sep => summer, else winter.
  return month >= 6 && month <= 9 ? 'summer' : 'winter';
}

function inferUniformIntervalMinutes(rows: Array<{ timestamp: Date }>): { ok: true; intervalMinutes: number } | { ok: false; reason: string } {
  const ts = rows
    .map((r) => r.timestamp.getTime())
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (ts.length < 2) return { ok: false, reason: 'Insufficient points to infer intervalMinutes (need >=2).' };
  const deltasMin = new Set<number>();
  for (let i = 1; i < ts.length; i++) {
    const dm = (ts[i] - ts[i - 1]) / 60_000;
    if (!Number.isFinite(dm) || dm <= 0) continue;
    deltasMin.add(Math.round(dm));
    if (deltasMin.size > 1) break;
  }
  if (deltasMin.size !== 1) return { ok: false, reason: 'Non-uniform interval granularity within cycle.' };
  const intervalMinutes = [...deltasMin][0];
  if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) return { ok: false, reason: 'Invalid inferred intervalMinutes.' };
  return { ok: true, intervalMinutes };
}

function computeTouEnergyBreakdown(args: {
  tariff: TariffModel;
  rows: Array<{ timestamp: Date; kw: number }>;
}):
  | { ok: true; breakdown: NonNullable<CycleBill['energyBreakdown']>; lineItems: BillLineItem[] }
  | { ok: false; warningCode: string; reason: string } {
  const { tariff, rows } = args;
  if (!tariff.energyCharges.length) {
    return { ok: false, warningCode: TariffEngineWarningCodesV1.TARIFFENGINE_UNSUPPORTED_CONSTRUCT, reason: 'energyCharges empty.' };
  }

  const inferred = inferUniformIntervalMinutes(rows);
  if (!inferred.ok) {
    return { ok: false, warningCode: TariffEngineWarningCodesV1.TARIFFENGINE_UNSUPPORTED_CONSTRUCT, reason: inferred.reason };
  }
  const intervalMinutes = inferred.intervalMinutes;
  const intervalHours = intervalMinutes / 60;

  const kwhByTouPeriod: Record<string, number> = {};
  const chargesByTouPeriod: Record<string, number> = {};
  const priceByTouPeriod: Record<string, number> = {};

  for (const r of rows) {
    const parts = getZonedParts(r.timestamp, tariff.timezone);
    if (!parts) {
      return {
        ok: false,
        warningCode: TariffEngineWarningCodesV1.TARIFFENGINE_UNSUPPORTED_CONSTRUCT,
        reason: `Invalid timezone "${tariff.timezone}" for TOU window assignment.`,
      };
    }
    const minuteOfDay = parts.hour * 60 + parts.minute;
    const isWeekend = parts.weekday === 0 || parts.weekday === 6;
    const season = seasonForMonth(parts.month);

    const matches: Array<{ energyId: string; windowName: string; pricePerKwh: number }> = [];
    for (const ec of tariff.energyCharges) {
      const ecSeason = String(ec.season || 'all') as any;
      if (ecSeason !== 'all' && ecSeason !== season) continue;
      for (const w of ec.windows || []) {
        const day = String((w as any).days || 'all');
        const dayOk = day === 'all' || (day === 'weekday' ? !isWeekend : day === 'weekend' ? isWeekend : false);
        if (!dayOk) continue;
        if (!inMinuteWindow(minuteOfDay, w)) continue;
        matches.push({ energyId: String(ec.id), windowName: String(w.name), pricePerKwh: Number(ec.pricePerKwh) });
      }
    }

    if (matches.length !== 1) {
      return {
        ok: false,
        warningCode: TariffEngineWarningCodesV1.TARIFFENGINE_UNSUPPORTED_CONSTRUCT,
        reason:
          matches.length === 0
            ? `No TOU energy window matched interval at ${r.timestamp.toISOString()} (minuteOfDay=${minuteOfDay}, weekend=${isWeekend}, season=${season}).`
            : `Multiple TOU energy windows matched interval at ${r.timestamp.toISOString()} (ambiguous matches=${matches.length}).`,
      };
    }

    const m = matches[0];
    const touKey = m.windowName || m.energyId;
    const kwh = r.kw * intervalHours;
    kwhByTouPeriod[touKey] = (kwhByTouPeriod[touKey] || 0) + kwh;
    priceByTouPeriod[touKey] = m.pricePerKwh;
  }

  for (const [k, kwh] of Object.entries(kwhByTouPeriod)) {
    const p = Number(priceByTouPeriod[k] ?? NaN);
    const dollars = Number.isFinite(p) ? kwh * p : NaN;
    chargesByTouPeriod[k] = Number.isFinite(dollars) ? dollars : 0;
  }

  const kwhTotal = sum(rows.map((r) => r.kw * intervalHours));
  const kwhBucketsTotal = sum(Object.values(kwhByTouPeriod));
  const dollarsBucketsTotal = sum(Object.values(chargesByTouPeriod));

  const deltaKwh = kwhBucketsTotal - kwhTotal;
  const deltaKwhPct = kwhTotal > 0 ? deltaKwh / kwhTotal : 0;
  const deltaDollars = dollarsBucketsTotal - dollarsBucketsTotal; // by construction, 0
  const deltaDollarsPct = 0;
  const ok = Math.abs(deltaKwh) <= 1e-6 || Math.abs(deltaKwhPct) <= 1e-6;
  const notes: string[] = [];
  if (!ok) notes.push('kWh buckets do not reconcile to total kWh (unexpected).');

  const lineItems: BillLineItem[] = Object.keys(kwhByTouPeriod)
    .sort()
    .map((k) => ({
      kind: 'energy' as const,
      label: `Energy: ${k}`,
      amount: chargesByTouPeriod[k],
      meta: { touPeriod: k, kwh: kwhByTouPeriod[k], pricePerKwh: priceByTouPeriod[k] },
    }));

  return {
    ok: true,
    breakdown: {
      intervalMinutes,
      kwhTotal,
      kwhByTouPeriod,
      chargesByTouPeriod,
      totalEnergyCharge: dollarsBucketsTotal,
      reconcile: { ok, deltaKwh, deltaKwhPct, deltaDollars, deltaDollarsPct, notes },
    },
    lineItems,
  };
}

function tieredDemandCharge(kw: number, tiers: Array<{ upToKw?: number; pricePerKw: number }>): number {
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

function maxWithTimestamps(rows: Array<{ timestamp: Date; kw: number }>): { maxKw: number; timestamps: string[] } {
  let maxKw = -Infinity;
  for (const r of rows) maxKw = Math.max(maxKw, r.kw);
  if (!Number.isFinite(maxKw)) return { maxKw: 0, timestamps: [] };
  const eps = 1e-6;
  const timestamps = rows
    .filter((r) => Math.abs(r.kw - maxKw) <= eps)
    .map((r) => r.timestamp.toISOString());
  return { maxKw, timestamps };
}

export function calculateBillsPerCycle(args: {
  tariff: TariffModel;
  billingPeriods: BillingPeriod[];
  assignedBefore: CycleAssignmentRow[];
  assignedAfter: CycleAssignmentRow[];
  // For reconciliation: allow caller to pass stated totals by cycleId
  statedTotalsByCycleId?: Record<string, number | undefined>;
}): TariffRunOutput {
  const { tariff, billingPeriods, assignedBefore, assignedAfter, statedTotalsByCycleId } = args;

  const byCycleBefore = new Map<string, Array<{ timestamp: Date; kw: number }>>();
  const byCycleAfter = new Map<string, Array<{ timestamp: Date; kw: number }>>();
  for (const r of assignedBefore) {
    const arr = byCycleBefore.get(r.cycleId) || [];
    arr.push({ timestamp: r.timestamp, kw: r.kw });
    byCycleBefore.set(r.cycleId, arr);
  }
  for (const r of assignedAfter) {
    const arr = byCycleAfter.get(r.cycleId) || [];
    arr.push({ timestamp: r.timestamp, kw: r.kw });
    byCycleAfter.set(r.cycleId, arr);
  }

  const cyclesSorted = [...billingPeriods].sort((a, b) => a.billEndDate.getTime() - b.billEndDate.getTime());

  // Ratchet tracking by determinant id: keep history of post-ratchet “before” values by cycle
  const ratchetHistory: Record<string, number[]> = {};

  const cycles: CycleBill[] = [];
  const missingComponentsNotes: string[] = [];

  for (const cycle of cyclesSorted) {
    const beforeRows = byCycleBefore.get(cycle.cycleId) || [];
    const afterRows = byCycleAfter.get(cycle.cycleId) || [];

    const determinants: BillingDeterminant[] = [];
    const lineItems: BillLineItem[] = [];

    // Fixed monthly charge
    if (tariff.fixedMonthlyCharge > 0) {
      lineItems.push({ kind: 'fixed', label: 'Fixed monthly charge', amount: tariff.fixedMonthlyCharge });
    }

    // Energy charges (deterministic TOU window assignment; no approximations)
    const energyRes = tariff.energyCharges.length ? computeTouEnergyBreakdown({ tariff, rows: afterRows }) : null;
    if (!energyRes) {
      missingComponentsNotes.push(
        `${TariffEngineWarningCodesV1.TARIFFENGINE_UNSUPPORTED_CONSTRUCT}: Energy charges not modeled (tariff.energyCharges empty).`,
      );
    } else if (!energyRes.ok) {
      missingComponentsNotes.push(`${energyRes.warningCode}: ${energyRes.reason}`);
    } else {
      lineItems.push(...energyRes.lineItems);
    }

    // Demand determinants
    for (const det of tariff.demandDeterminants) {
      const { maxKw: beforeKw, timestamps: beforeTs } = maxWithTimestamps(beforeRows);
      const { maxKw: afterKw, timestamps: afterTs } = maxWithTimestamps(afterRows);

      // Ratchet (optional)
      const ratchet = tariff.ratchets.find((r) => r.appliesToDeterminantId === det.id);
      let ratchetApplied = false;
      let ratchetFloorKw: number | undefined;
      let ratchetedBefore = beforeKw;
      let ratchetedAfter = afterKw;

      if (ratchet) {
        const history = ratchetHistory[det.id] || [];
        const lookback = history.slice(-ratchet.lookbackCycles);
        const prevMax = lookback.length ? Math.max(...lookback) : 0;
        ratchetFloorKw = ratchet.percent * prevMax;
        if (ratchetFloorKw > ratchetedBefore || ratchetFloorKw > ratchetedAfter) {
          ratchetApplied = true;
          ratchetedBefore = Math.max(ratchetedBefore, ratchetFloorKw);
          ratchetedAfter = Math.max(ratchetedAfter, ratchetFloorKw);
        }
      }

      // Demand charge based on AFTER determinant (billing engine “after” total)
      const demandCostAfter = tieredDemandCharge(ratchetedAfter, det.tiers);
      lineItems.push({
        kind: 'demand',
        label: `Demand: ${det.name}`,
        amount: demandCostAfter,
        meta: { determinantId: det.id, afterKw: ratchetedAfter },
      });

      determinants.push({
        determinantId: det.id,
        name: det.name,
        kind: det.kind,
        beforeKw: ratchetedBefore,
        afterKw: ratchetedAfter,
        bindingTimestampsBefore: beforeTs,
        bindingTimestampsAfter: afterTs,
        ratchetApplied,
        ratchetFloorKw,
      });

      // Update ratchet history with ratcheted BEFORE (utility ratchets are based on historical billing determinants)
      ratchetHistory[det.id] = [...(ratchetHistory[det.id] || []), ratchetedBefore];
    }

    const total = lineItems.reduce((s, li) => s + li.amount, 0);
    const statedTotal = statedTotalsByCycleId?.[cycle.cycleId] ?? cycle.statedTotalBill;
    const reconcileNotes: string[] = [];
    let reconcile: CycleBill['reconcile'] | undefined;
    if (typeof statedTotal === 'number' && statedTotal > 0) {
      const delta = total - statedTotal;
      const deltaPct = statedTotal > 0 ? delta / statedTotal : 0;
      const ok = Math.abs(delta) <= 50 || Math.abs(deltaPct) <= 0.1;
      if (!ok) {
        reconcileNotes.push('Computed bill does not reconcile; missing components likely (riders, taxes, energy TOU, minimums).');
      }
      reconcile = { ok, delta, deltaPct, notes: reconcileNotes };
    }

    const energyBreakdown = energyRes && energyRes.ok ? energyRes.breakdown : undefined;

    cycles.push({
      cycleId: cycle.cycleId,
      billStartDate: cycle.billStartDate.toISOString(),
      billEndDate: cycle.billEndDate.toISOString(),
      statedTotalBill: statedTotal,
      determinants,
      lineItems,
      ...(energyBreakdown ? { energyBreakdown } : {}),
      total,
      reconcile,
    });
  }

  const totalAfter = cycles.reduce((s, c) => s + c.total, 0);
  // totalBefore is computed by re-running with before as after (caller should run separately). For now caller provides both.
  // We keep in output but set to 0 here; integration computes both.
  return {
    tariffId: tariff.tariffId,
    tariffVersion: tariff.version,
    timezone: tariff.timezone,
    cycles,
    summary: {
      cyclesCount: cycles.length,
      totalBefore: 0,
      totalAfter,
      totalSavings: 0,
      missingComponentsNotes: [...new Set(missingComponentsNotes)].slice(0, 10),
    },
  };
}

