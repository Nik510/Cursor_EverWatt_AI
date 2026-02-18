import { getZonedParts } from '../billingEngineV1/time/zonedTime';
import type { IntervalPointV1, TouPriceWindowV1 } from './types';

export const DispatchV1_1WarningCodes = {
  DISPATCH_INSUFFICIENT_DATA: 'dispatch.insufficient_data',
  DISPATCH_TOU_AMBIGUOUS: 'dispatch.tou_ambiguous',
  DISPATCH_TOU_UNMATCHED: 'dispatch.tou_unmatched',
  DISPATCH_INVALID_BATTERY_PARAMS: 'dispatch.invalid_battery_params',
  DISPATCH_INVALID_TIMEZONE: 'dispatch.invalid_timezone',
  DISPATCH_SUPPLY_CCA_GENERATION_RATES_MISSING_FALLBACK: 'dispatch.supply.cca_generation_rates_missing_fallback',
  DISPATCH_SUPPLY_DA_GENERATION_RATES_MISSING_FALLBACK: 'dispatch.supply.da_generation_rates_missing_fallback',
} as const;

export type DispatchMethodTagV1_1 = 'dispatch_v1_1';

export type DispatchCycleInputV1_1 = {
  cycleLabel: string;
  cycleStartIso: string;
  cycleEndIso: string;
  timezone: string;
};

export type DispatchBatteryParamsV1_1 = {
  powerKw: number;
  energyKwh: number;
  rte: number;
  minSoc: number;
  maxSoc: number;
};

export type DispatchCycleResultV1_1 = {
  cycle: DispatchCycleInputV1_1;
  dispatchMethod: DispatchMethodTagV1_1;
  ok: boolean;
  kwhChargedByTou: Record<string, number>;
  kwhDischargedByTou: Record<string, number>;
  netKwhShiftedByTou: Record<string, number>;
  demandPeakBeforeKw: number | null;
  demandPeakAfterKw: number | null;
  peakTimestampIso: string | null;
  warnings: string[];
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function roundTo(n: number, decimals: number): number {
  if (!Number.isFinite(n)) return NaN;
  const p = 10 ** decimals;
  return Math.round(n * p) / p;
}

function kwFromIntervalPoint(p: IntervalPointV1): number | null {
  const kW = Number((p as any)?.kW);
  if (Number.isFinite(kW)) return kW;
  const kWh = Number((p as any)?.kWh);
  const mins = Number((p as any)?.intervalMinutes);
  if (Number.isFinite(kWh) && Number.isFinite(mins) && mins > 0) return kWh * (60 / mins);
  return null;
}

function intervalHoursFromPoint(p: IntervalPointV1): number | null {
  const mins = Number((p as any)?.intervalMinutes);
  if (!Number.isFinite(mins) || !(mins > 0)) return null;
  return mins / 60;
}

function parseIsoMs(s: string): number | null {
  const ms = Date.parse(String(s || '').trim());
  return Number.isFinite(ms) ? ms : null;
}

function inHourWindow(hourLocal: number, w: { startHourLocal: number; endHourLocalExclusive: number }): boolean {
  const h = Math.max(0, Math.min(23, Math.floor(hourLocal)));
  const start = Math.max(0, Math.min(24, Math.floor(w.startHourLocal)));
  const end = Math.max(0, Math.min(24, Math.floor(w.endHourLocalExclusive)));
  if (start === end) return false;
  if (end > start) return h >= start && h < end;
  // Wrap across midnight
  return h >= start || h < end;
}

function touPeriodForTimestamp(args: { timestampMs: number; timezone: string; touEnergyPrices: TouPriceWindowV1[] }): { ok: true; periodId: string; pricePerKwh: number } | { ok: false; reason: string; code: string } {
  const parts = getZonedParts(new Date(args.timestampMs), args.timezone);
  if (!parts) return { ok: false, code: DispatchV1_1WarningCodes.DISPATCH_INVALID_TIMEZONE, reason: `Invalid timezone (${args.timezone}).` };
  const isWeekend = parts.weekday === 0 || parts.weekday === 6;

  const matches: Array<{ periodId: string; pricePerKwh: number }> = [];
  for (const w of args.touEnergyPrices || []) {
    const day = String((w as any)?.days || 'all');
    const dayOk = day === 'all' || (day === 'weekday' ? !isWeekend : day === 'weekend' ? isWeekend : false);
    if (!dayOk) continue;
    if (!inHourWindow(parts.hour, { startHourLocal: w.startHourLocal, endHourLocalExclusive: w.endHourLocalExclusive })) continue;
    const periodId = String((w as any)?.periodId || '').trim();
    const price = Number((w as any)?.pricePerKwh);
    if (!periodId || !Number.isFinite(price) || price < 0) continue;
    matches.push({ periodId, pricePerKwh: price });
  }

  if (matches.length !== 1) {
    return {
      ok: false,
      code: matches.length ? DispatchV1_1WarningCodes.DISPATCH_TOU_AMBIGUOUS : DispatchV1_1WarningCodes.DISPATCH_TOU_UNMATCHED,
      reason: matches.length ? `Multiple TOU windows matched (matches=${matches.length}).` : 'No TOU window matched.',
    };
  }
  return { ok: true, periodId: matches[0].periodId, pricePerKwh: matches[0].pricePerKwh };
}

function touPeriodForLocalHour(args: {
  hourLocal: number;
  isWeekend: boolean;
  touEnergyPrices: TouPriceWindowV1[];
}): { ok: true; periodId: string; pricePerKwh: number } | { ok: false; reason: string; code: string } {
  const matches: Array<{ periodId: string; pricePerKwh: number }> = [];
  for (const w of args.touEnergyPrices || []) {
    const day = String((w as any)?.days || 'all');
    const dayOk = day === 'all' || (day === 'weekday' ? !args.isWeekend : day === 'weekend' ? args.isWeekend : false);
    if (!dayOk) continue;
    if (!inHourWindow(args.hourLocal, { startHourLocal: w.startHourLocal, endHourLocalExclusive: w.endHourLocalExclusive })) continue;
    const periodId = String((w as any)?.periodId || '').trim();
    const price = Number((w as any)?.pricePerKwh);
    if (!periodId || !Number.isFinite(price) || price < 0) continue;
    matches.push({ periodId, pricePerKwh: price });
  }
  if (matches.length !== 1) {
    return {
      ok: false,
      code: matches.length ? DispatchV1_1WarningCodes.DISPATCH_TOU_AMBIGUOUS : DispatchV1_1WarningCodes.DISPATCH_TOU_UNMATCHED,
      reason: matches.length ? `Multiple TOU windows matched (matches=${matches.length}).` : 'No TOU window matched.',
    };
  }
  return { ok: true, periodId: matches[0].periodId, pricePerKwh: matches[0].pricePerKwh };
}

function addKwh(map: Record<string, number>, key: string, kwh: number): void {
  if (!key) return;
  const x = Number(kwh);
  if (!Number.isFinite(x) || x === 0) return;
  map[key] = (map[key] || 0) + x;
}

function netTouMaps(args: { discharge: Record<string, number>; charge: Record<string, number> }): Record<string, number> {
  const keys = Array.from(new Set([...Object.keys(args.discharge || {}), ...Object.keys(args.charge || {})])).sort((a, b) => a.localeCompare(b));
  const out: Record<string, number> = {};
  for (const k of keys) {
    const d = Number(args.discharge?.[k] || 0);
    const c = Number(args.charge?.[k] || 0);
    const n = d - c;
    if (Math.abs(n) <= 1e-12) continue;
    out[k] = n;
  }
  return out;
}

function minMaxPricePeriods(touEnergyPrices: TouPriceWindowV1[]): { ok: true; minPrice: number; maxPrice: number; minPeriods: Set<string>; maxPeriods: Set<string> } | { ok: false } {
  const rows = (touEnergyPrices || [])
    .map((w) => ({ periodId: String((w as any)?.periodId || '').trim(), price: Number((w as any)?.pricePerKwh) }))
    .filter((r) => r.periodId && Number.isFinite(r.price) && r.price >= 0);
  if (!rows.length) return { ok: false };
  const prices = rows.map((r) => r.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minPeriods = new Set(rows.filter((r) => r.price === minPrice).map((r) => r.periodId));
  const maxPeriods = new Set(rows.filter((r) => r.price === maxPrice).map((r) => r.periodId));
  return { ok: true, minPrice, maxPrice, minPeriods, maxPeriods };
}

export function dispatchV1_1(args: {
  cycles: DispatchCycleInputV1_1[];
  intervalPointsV1?: IntervalPointV1[] | null;
  /**
   * Optional daily load-shape buckets (deterministic fallback only).
   * Shape-only dispatch is considered insufficient for dollars (warnings-first).
   */
  dailyProfileBuckets?: Array<{ bucketStartHourLocal: number; avgKw: number }> | null;
  touEnergyPrices?: TouPriceWindowV1[] | null;
  /** Optional generation TOU energy windows (energy only). When present, preferred for arbitrage. */
  generationTouEnergyPrices?: TouPriceWindowV1[] | null;
  /** Optional derived all-in generation TOU energy windows (energy + adders). When present, preferred for arbitrage. */
  generationAllInTouEnergyPrices?: TouPriceWindowV1[] | null;
  /** Optional derived all-in generation TOU energy windows including exit fees (flat adder in v0). When present, preferred for arbitrage. */
  generationAllInWithExitFeesTouPrices?: TouPriceWindowV1[] | null;
  /** Optional supply context (warnings-first). */
  supplyProviderType?: 'CCA' | 'DA' | null;
  battery: DispatchBatteryParamsV1_1;
}): { cycles: DispatchCycleResultV1_1[]; warnings: string[] } {
  const warningsAll: string[] = [];

  const battery = args.battery;
  const P = Math.max(0, Number(battery?.powerKw) || 0);
  const E = Math.max(0, Number(battery?.energyKwh) || 0);
  const rte = clamp01(Number(battery?.rte) || 0);
  const minSoc = clamp01(Number(battery?.minSoc));
  const maxSoc = clamp01(Number(battery?.maxSoc));
  const minStored = E * Math.min(minSoc, maxSoc);
  const maxStored = E * Math.max(minSoc, maxSoc);

  const batteryOk = P > 0 && E > 0 && rte > 0 && maxStored > minStored + 1e-9;
  if (!batteryOk) warningsAll.push(DispatchV1_1WarningCodes.DISPATCH_INVALID_BATTERY_PARAMS);

  const genAllInWithExitFees = Array.isArray(args.generationAllInWithExitFeesTouPrices) ? args.generationAllInWithExitFeesTouPrices : [];
  const genAllIn = Array.isArray(args.generationAllInTouEnergyPrices) ? args.generationAllInTouEnergyPrices : [];
  const genEnergyOnly = Array.isArray(args.generationTouEnergyPrices) ? args.generationTouEnergyPrices : [];
  const delivery = Array.isArray(args.touEnergyPrices) ? args.touEnergyPrices : [];

  const touEnergyPrices = genAllInWithExitFees.length ? genAllInWithExitFees : genAllIn.length ? genAllIn : genEnergyOnly.length ? genEnergyOnly : delivery;
  const supplyProviderType = args.supplyProviderType === 'CCA' || args.supplyProviderType === 'DA' ? args.supplyProviderType : null;
  const usedDeliveryFallback =
    Boolean(supplyProviderType) && !genAllInWithExitFees.length && !genAllIn.length && !genEnergyOnly.length && delivery.length > 0;
  if (usedDeliveryFallback) {
    warningsAll.push(
      supplyProviderType === 'DA'
        ? DispatchV1_1WarningCodes.DISPATCH_SUPPLY_DA_GENERATION_RATES_MISSING_FALLBACK
        : DispatchV1_1WarningCodes.DISPATCH_SUPPLY_CCA_GENERATION_RATES_MISSING_FALLBACK,
    );
  }
  const touRank = minMaxPricePeriods(touEnergyPrices);

  const pointsAll = Array.isArray(args.intervalPointsV1) ? args.intervalPointsV1 : [];
  const hasIntervals = pointsAll.length > 0;
  const hasBuckets = Array.isArray(args.dailyProfileBuckets) && args.dailyProfileBuckets.length > 0;

  const cyclesOut: DispatchCycleResultV1_1[] = [];
  for (const cyc of args.cycles || []) {
    const cycleWarnings: string[] = [];
    const tz = String(cyc?.timezone || '').trim() || 'UTC';
    const sMs = parseIsoMs(String(cyc?.cycleStartIso || ''));
    const eMs = parseIsoMs(String(cyc?.cycleEndIso || ''));
    const cycleLabel = String(cyc?.cycleLabel || '').trim() || 'unknown';

    if (!batteryOk) cycleWarnings.push(DispatchV1_1WarningCodes.DISPATCH_INVALID_BATTERY_PARAMS);
    if (sMs === null || eMs === null || !(sMs < eMs)) cycleWarnings.push(DispatchV1_1WarningCodes.DISPATCH_INSUFFICIENT_DATA);

    const dischargeByTou: Record<string, number> = {};
    const chargeByTou: Record<string, number> = {};

    let demandPeakBeforeKw: number | null = null;
    let demandPeakAfterKw: number | null = null;
    let peakTimestampIso: string | null = null;

    const okTou = touRank.ok;
    const runWithIntervals = hasIntervals && sMs !== null && eMs !== null;
    const runWithBuckets = !runWithIntervals && hasBuckets && sMs !== null && eMs !== null;

    if (!runWithIntervals && !runWithBuckets) {
      cycleWarnings.push(DispatchV1_1WarningCodes.DISPATCH_INSUFFICIENT_DATA);
      cyclesOut.push({
        cycle: { cycleLabel, cycleStartIso: String(cyc?.cycleStartIso || ''), cycleEndIso: String(cyc?.cycleEndIso || ''), timezone: tz },
        dispatchMethod: 'dispatch_v1_1',
        ok: false,
        kwhChargedByTou: {},
        kwhDischargedByTou: {},
        netKwhShiftedByTou: {},
        demandPeakBeforeKw,
        demandPeakAfterKw,
        peakTimestampIso,
        warnings: Array.from(new Set(cycleWarnings)).sort((a, b) => a.localeCompare(b)),
      });
      continue;
    }

    // Build a deterministic interval stream (either actual intervals, or synthetic hourly points from buckets).
    const intervalStream: Array<{ timestampMs: number; timestampIso: string; kw: number; hours: number; touPeriodId: string | null; touPricePerKwh: number | null }> = [];

    if (runWithIntervals) {
      const pts = pointsAll
        .map((p) => {
          const ms = parseIsoMs(String((p as any)?.timestampIso || '').trim());
          if (ms === null) return null;
          if (!(ms >= sMs! && ms < eMs!)) return null;
          const kw = kwFromIntervalPoint(p);
          const hours = intervalHoursFromPoint(p);
          if (kw === null || hours === null) return null;
          return { timestampMs: ms, timestampIso: new Date(ms).toISOString(), kw, hours };
        })
        .filter((x): x is { timestampMs: number; timestampIso: string; kw: number; hours: number } => Boolean(x));

      pts.sort((a, b) => a.timestampMs - b.timestampMs || a.kw - b.kw || a.timestampIso.localeCompare(b.timestampIso));

      for (const r of pts) {
        const tou = okTou ? touPeriodForTimestamp({ timestampMs: r.timestampMs, timezone: tz, touEnergyPrices }) : null;
        if (okTou && tou && !tou.ok) {
          cycleWarnings.push(tou.code);
          cycleWarnings.push(DispatchV1_1WarningCodes.DISPATCH_INSUFFICIENT_DATA);
        }
        intervalStream.push({
          timestampMs: r.timestampMs,
          timestampIso: r.timestampIso,
          kw: r.kw,
          hours: r.hours,
          touPeriodId: okTou && tou && tou.ok ? tou.periodId : okTou ? null : 'ALL',
          touPricePerKwh: okTou && tou && tou.ok ? tou.pricePerKwh : null,
        });
      }
    } else {
      // Shape-only fallback (insufficient for audited dollars).
      cycleWarnings.push(DispatchV1_1WarningCodes.DISPATCH_INSUFFICIENT_DATA);
      const start = new Date(sMs!);
      const parts0 = getZonedParts(start, tz);
      if (!parts0) {
        cycleWarnings.push(DispatchV1_1WarningCodes.DISPATCH_INVALID_TIMEZONE);
      } else {
        // Build 24 hourly kW from 4h buckets (deterministic).
        const hourKw: number[] = Array.from({ length: 24 }, () => 0);
        const bucketCount: number[] = Array.from({ length: 24 }, () => 0);
        for (const b of args.dailyProfileBuckets || []) {
          const startHour = Math.max(0, Math.min(23, Math.floor(Number((b as any)?.bucketStartHourLocal))));
          const avgKw = Number((b as any)?.avgKw);
          if (!Number.isFinite(startHour) || !Number.isFinite(avgKw) || avgKw < 0) continue;
          for (let h = startHour; h < Math.min(24, startHour + 4); h++) {
            hourKw[h] += avgKw;
            bucketCount[h] += 1;
          }
        }
        for (let h = 0; h < 24; h++) {
          const v = bucketCount[h] ? hourKw[h] / bucketCount[h] : NaN;
          hourKw[h] = Number.isFinite(v) ? v : 0;
        }

        // Only a single representative day is simulated; kWh totals are per-day, not per-cycle.
        // Callers should treat this as insufficient for dollars (warnings-first).
        for (let h = 0; h < 24; h++) {
          const ts = sMs! + h * 3_600_000;
          const isWeekend = parts0.weekday === 0 || parts0.weekday === 6;
          const tou = okTou ? touPeriodForLocalHour({ hourLocal: h, isWeekend, touEnergyPrices }) : null;
          intervalStream.push({
            timestampMs: ts,
            timestampIso: new Date(ts).toISOString(),
            kw: hourKw[h],
            hours: 1,
            touPeriodId: okTou && tou && tou.ok ? tou.periodId : okTou ? null : 'ALL',
            touPricePerKwh: okTou && tou && tou.ok ? tou.pricePerKwh : null,
          });
        }
      }
    }

    if (!intervalStream.length) {
      cycleWarnings.push(DispatchV1_1WarningCodes.DISPATCH_INSUFFICIENT_DATA);
      cyclesOut.push({
        cycle: { cycleLabel, cycleStartIso: String(cyc?.cycleStartIso || ''), cycleEndIso: String(cyc?.cycleEndIso || ''), timezone: tz },
        dispatchMethod: 'dispatch_v1_1',
        ok: false,
        kwhChargedByTou: {},
        kwhDischargedByTou: {},
        netKwhShiftedByTou: {},
        demandPeakBeforeKw,
        demandPeakAfterKw,
        peakTimestampIso,
        warnings: Array.from(new Set(cycleWarnings)).sort((a, b) => a.localeCompare(b)),
      });
      continue;
    }

    // Demand-only fallback: when no TOU windows are provided, treat every interval as ALL and aim to shave peaks.
    const demandOnly = !okTou;

    // Deterministic SOC start: for TOU arbitrage start at minSoc; for demand-only start at maxSoc.
    let storedKwh = demandOnly ? maxStored : minStored;

    // Before peak
    let minKwInCycle = Number.POSITIVE_INFINITY;
    let maxKwInCycle = Number.NEGATIVE_INFINITY;
    for (const r of intervalStream) {
      const kw = Number(r.kw);
      if (!Number.isFinite(kw)) continue;
      minKwInCycle = Math.min(minKwInCycle, kw);
      maxKwInCycle = Math.max(maxKwInCycle, kw);
      if (demandPeakBeforeKw === null || kw > demandPeakBeforeKw + 1e-12 || (Math.abs(kw - demandPeakBeforeKw) <= 1e-12 && (peakTimestampIso === null || r.timestampIso < peakTimestampIso))) {
        demandPeakBeforeKw = kw;
        peakTimestampIso = r.timestampIso;
      }
    }

    // Execute deterministic greedy dispatch in chronological order.
    for (const r of intervalStream) {
      const hours = Number(r.hours);
      const kwLoad = Number(r.kw);
      if (!Number.isFinite(hours) || !(hours > 0) || !Number.isFinite(kwLoad) || kwLoad < 0) continue;

      const periodId = String(r.touPeriodId || '').trim() || (demandOnly ? 'ALL' : '');

      const canCharge = batteryOk && storedKwh < maxStored - 1e-9;
      const canDischarge = batteryOk && storedKwh > minStored + 1e-9;

      const isChargePeriod = (() => {
        if (demandOnly) return Number.isFinite(minKwInCycle) ? kwLoad <= minKwInCycle + 1e-12 : false;
        if (!touRank.ok) return false;
        return touRank.minPeriods.has(periodId);
      })();
      const isDischargePeriod = (() => {
        if (demandOnly) return Number.isFinite(maxKwInCycle) ? kwLoad >= maxKwInCycle - 1e-12 : false;
        if (!touRank.ok) return false;
        return touRank.maxPeriods.has(periodId);
      })();

      // If min==max price (flat), avoid churn.
      if (!demandOnly && touRank.ok && touRank.minPrice === touRank.maxPrice) {
        // no-op
      } else if (isDischargePeriod && !isChargePeriod && canDischarge) {
        const maxDischargeKwh = P * hours;
        const dischargeKwh = Math.max(0, Math.min(maxDischargeKwh, storedKwh - minStored));
        storedKwh -= dischargeKwh;
        addKwh(dischargeByTou, periodId || 'UNKNOWN', dischargeKwh);
        const kwAfter = Math.max(0, kwLoad - dischargeKwh / hours);
        if (demandPeakAfterKw === null || kwAfter > demandPeakAfterKw + 1e-12) demandPeakAfterKw = kwAfter;
      } else if (isChargePeriod && !isDischargePeriod && canCharge) {
        const maxChargeKwhGrid = P * hours;
        const gridKwhNeeded = (maxStored - storedKwh) / rte;
        const chargeGridKwh = Math.max(0, Math.min(maxChargeKwhGrid, gridKwhNeeded));
        storedKwh += chargeGridKwh * rte;
        addKwh(chargeByTou, periodId || 'UNKNOWN', chargeGridKwh);
        const kwAfter = kwLoad + chargeGridKwh / hours;
        if (demandPeakAfterKw === null || kwAfter > demandPeakAfterKw + 1e-12) demandPeakAfterKw = kwAfter;
      } else {
        const kwAfter = kwLoad;
        if (demandPeakAfterKw === null || kwAfter > demandPeakAfterKw + 1e-12) demandPeakAfterKw = kwAfter;
      }
    }

    // Round outputs for stable JSON + audit readability.
    for (const k of Object.keys(dischargeByTou)) dischargeByTou[k] = roundTo(dischargeByTou[k], 6);
    for (const k of Object.keys(chargeByTou)) chargeByTou[k] = roundTo(chargeByTou[k], 6);

    const ok = batteryOk && intervalStream.length > 0 && !cycleWarnings.includes(DispatchV1_1WarningCodes.DISPATCH_INSUFFICIENT_DATA);
    cyclesOut.push({
      cycle: { cycleLabel, cycleStartIso: String(cyc?.cycleStartIso || ''), cycleEndIso: String(cyc?.cycleEndIso || ''), timezone: tz },
      dispatchMethod: 'dispatch_v1_1',
      ok,
      kwhChargedByTou: Object.fromEntries(Object.keys(chargeByTou).sort().map((k) => [k, chargeByTou[k]])),
      kwhDischargedByTou: Object.fromEntries(Object.keys(dischargeByTou).sort().map((k) => [k, dischargeByTou[k]])),
      netKwhShiftedByTou: netTouMaps({ discharge: dischargeByTou, charge: chargeByTou }),
      demandPeakBeforeKw: demandPeakBeforeKw === null ? null : roundTo(demandPeakBeforeKw, 6),
      demandPeakAfterKw: demandPeakAfterKw === null ? null : roundTo(demandPeakAfterKw, 6),
      peakTimestampIso,
      warnings: Array.from(new Set(cycleWarnings)).sort((a, b) => a.localeCompare(b)),
    });
  }

  warningsAll.push(...cyclesOut.flatMap((c) => c.warnings));
  return { cycles: cyclesOut, warnings: Array.from(new Set(warningsAll)).sort((a, b) => a.localeCompare(b)) };
}

