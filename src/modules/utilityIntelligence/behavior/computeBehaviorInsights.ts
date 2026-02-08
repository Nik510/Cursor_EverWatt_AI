import type { EvidenceItemV1 } from '../../determinants/types';
import type { DeterminantsPackV1 } from '../../determinants/types';
import type { ComprehensiveBillRecord } from '../../../utils/utility-data-types';
import type { MissingInfoItemV0 } from '../missingInfo/types';
import type { BehaviorInsightsV1, InsightCardV1 } from './types';

type MonthAgg = {
  month: string;
  billEndIso: string;
  kwh?: number | null;
  kwMax?: number | null;
  avgKw?: number | null;
  loadFactor?: number | null;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function monthKeyFromIso(iso: string): string | null {
  const ms = new Date(String(iso || '').trim()).getTime();
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function linearSlope(values: number[]): number | null {
  const n = values.length;
  if (n < 2) return null;
  const xs = values.map((_, i) => i);
  const xMean = xs.reduce((s, x) => s + x, 0) / n;
  const yMean = values.reduce((s, y) => s + y, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - xMean;
    num += dx * (values[i] - yMean);
    den += dx * dx;
  }
  if (den === 0) return null;
  return num / den;
}

function directionFromSlope(slope: number | null, baseline: number | null): 'up' | 'down' | 'flat' {
  if (!Number.isFinite(slope ?? NaN) || !Number.isFinite(baseline ?? NaN)) return 'flat';
  const rel = Math.abs((slope as number) / Math.max(1, Math.abs(baseline as number)));
  if (rel < 0.01) return 'flat';
  return (slope as number) > 0 ? 'up' : 'down';
}

function sum(values: Array<number | null | undefined>): number | null {
  const xs = values.filter((v): v is number => Number.isFinite(v as any));
  if (!xs.length) return null;
  return xs.reduce((s, v) => s + v, 0);
}

function mean(values: Array<number | null | undefined>): number | null {
  const xs = values.filter((v): v is number => Number.isFinite(v as any));
  if (!xs.length) return null;
  return xs.reduce((s, v) => s + v, 0) / xs.length;
}

function pctChange(current?: number | null, prior?: number | null): number | null {
  if (!Number.isFinite(current ?? NaN) || !Number.isFinite(prior ?? NaN) || Number(prior) === 0) return null;
  return (Number(current) - Number(prior)) / Number(prior);
}

function topN<T>(arr: T[], n: number, key: (x: T) => number): T[] {
  return arr
    .slice()
    .sort((a, b) => key(b) - key(a))
    .slice(0, n);
}

function monthFromDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function weekdayName(d: Date): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()] || 'n/a';
}

function pctStr(pct: number | null | undefined, digits = 0): string {
  if (!Number.isFinite(pct ?? NaN)) return '—';
  const sign = Number(pct) >= 0 ? '+' : '';
  return `${sign}${(Number(pct) * 100).toFixed(digits)}%`;
}

function numStr(n: number | null | undefined, digits = 0): string {
  if (!Number.isFinite(n ?? NaN)) return '—';
  return Number(n).toFixed(digits);
}

function confidenceLevel(args: { monthsAvailable: number; overlapMonthsReconcilable: number; signalStrength?: number | null }): 'high' | 'medium' | 'low' {
  const strength = Math.abs(Number(args.signalStrength ?? 0));
  if (args.monthsAvailable >= 24 && args.overlapMonthsReconcilable > 0 && strength >= 0.1) return 'high';
  if (args.monthsAvailable >= 18 && strength >= 0.05) return 'medium';
  return 'low';
}

function normalizeWeights(entries: Array<{ cause: string; weight: number }>): Array<{ cause: string; weight: number }> {
  const sum = entries.reduce((s, e) => s + Number(e.weight || 0), 0);
  if (!sum) return entries.map((e) => ({ ...e, weight: 0 }));
  return entries.map((e) => ({ ...e, weight: Number(e.weight || 0) / sum }));
}

function rollingStepChange(months: MonthAgg[]): { whenMonth: string; deltaKwh: number; confidence: number } | null {
  if (months.length < 8) return null;
  const vals = months.map((m) => Number(m.kwh ?? NaN));
  const best = { idx: -1, delta: 0 };
  for (let i = 3; i < vals.length - 3; i++) {
    const prev = vals.slice(i - 3, i).filter((v) => Number.isFinite(v));
    const next = vals.slice(i, i + 3).filter((v) => Number.isFinite(v));
    if (prev.length < 3 || next.length < 3) continue;
    const prevMean = prev.reduce((s, v) => s + v, 0) / prev.length;
    const nextMean = next.reduce((s, v) => s + v, 0) / next.length;
    if (prevMean <= 0) continue;
    const delta = nextMean - prevMean;
    if (Math.abs(delta) > Math.abs(best.delta)) best.idx = i, (best.delta = delta);
  }
  if (best.idx < 0) return null;
  const prevMean = Number(months[best.idx - 1].kwh ?? NaN);
  const conf = clamp01(Math.min(1, Math.abs(best.delta) / Math.max(1, prevMean)) + 0.2);
  if (Math.abs(best.delta) < 0.2 * Math.max(1, prevMean)) return null;
  return { whenMonth: months[best.idx].month, deltaKwh: best.delta, confidence: conf };
}

function computeWeekendShare(args: {
  intervalPoints: Array<{ timestampIso: string; intervalMinutes: number; kWh?: number; kW?: number }>;
  lastMonth: string | undefined;
}): { last12WeekendPct: number; prior12WeekendPct: number } | null {
  if (!args.lastMonth) return null;
  const sortedMonths = Array.from(
    new Set(
      args.intervalPoints
        .map((p) => monthKeyFromIso(p.timestampIso))
        .filter((m): m is string => Boolean(m)),
    ),
  ).sort();
  if (sortedMonths.length < 24) return null;
  const lastMonthIdx = sortedMonths.indexOf(args.lastMonth);
  if (lastMonthIdx < 0) return null;
  const last12 = new Set(sortedMonths.slice(Math.max(0, lastMonthIdx - 11), lastMonthIdx + 1));
  const prior12 = new Set(sortedMonths.slice(Math.max(0, lastMonthIdx - 23), lastMonthIdx - 11));
  if (last12.size < 6 || prior12.size < 6) return null;

  function accumulate(monthSet: Set<string>) {
    let weekend = 0;
    let total = 0;
    for (const p of args.intervalPoints) {
      const m = monthKeyFromIso(p.timestampIso);
      if (!m || !monthSet.has(m)) continue;
      const mins = Number(p.intervalMinutes);
      const kwh = Number(p.kWh);
      const kw = Number(p.kW);
      const energy = Number.isFinite(kwh) ? kwh : Number.isFinite(kw) && Number.isFinite(mins) ? kw * (mins / 60) : NaN;
      if (!Number.isFinite(energy)) continue;
      const d = new Date(p.timestampIso);
      const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
      total += energy;
      if (isWeekend) weekend += energy;
    }
    return total > 0 ? weekend / total : null;
  }

  const lastPct = accumulate(last12);
  const priorPct = accumulate(prior12);
  if (lastPct === null || priorPct === null) return null;
  return { last12WeekendPct: lastPct, prior12WeekendPct: priorPct };
}

export function computeBehaviorInsights(args: {
  billingRecords?: ComprehensiveBillRecord[] | null;
  determinantsPack?: DeterminantsPackV1 | null;
  intervalPointsV1?: Array<{ timestampIso: string; intervalMinutes: number; kWh?: number; kW?: number; temperatureF?: number }> | null;
  loadAttribution?: { baseLoadKw?: number | null } | null;
}): BehaviorInsightsV1 {
  const evidence: EvidenceItemV1[] = [];
  const because: string[] = [];
  const missingInfo: MissingInfoItemV0[] = [];

  const billingRecords = Array.isArray(args.billingRecords) ? args.billingRecords : [];
  const pack = args.determinantsPack || null;
  const intervalPoints = Array.isArray(args.intervalPointsV1) ? args.intervalPointsV1 : [];

  const usageByMonth = new Map<string, { kwh: number; kwMax: number | null }>();
  for (const br of billingRecords) {
    const endIso = br.billEndDate instanceof Date ? br.billEndDate.toISOString() : '';
    const month = monthKeyFromIso(endIso || '');
    if (!month) continue;
    const kwh = Number((br as any).totalUsageKwh);
    const kwMax = Number((br as any).maxMaxDemandKw);
    if (!Number.isFinite(kwh) && !Number.isFinite(kwMax)) continue;
    usageByMonth.set(month, { kwh: Number.isFinite(kwh) ? kwh : 0, kwMax: Number.isFinite(kwMax) ? kwMax : null });
  }

  const cycleAggs: MonthAgg[] = [];
  const peaks: Array<{ timestampIso: string; kW: number; touBucket?: string; temperatureF?: number; meterKey?: string }> = [];
  let overlapMonthsReconcilable = 0;
  if (pack && Array.isArray(pack.meters)) {
    for (const m of pack.meters) {
      for (const c of m.cycles || []) {
        const month = monthKeyFromIso(c.cycle.endIso);
        if (!month) continue;
        const billed = usageByMonth.get(month);
        const kwh = Number.isFinite(billed?.kwh as any) && (billed?.kwh as number) > 0 ? billed?.kwh : c.energy.kwhTotal ?? null;
        const kwMax = Number.isFinite(billed?.kwMax as any) ? billed?.kwMax : c.demand.kWMax ?? null;
        const startMs = new Date(c.cycle.startIso).getTime();
        const endMs = new Date(c.cycle.endIso).getTime();
        const hours = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs ? (endMs - startMs) / 3_600_000 : null;
        const avgKw = kwh !== null && hours ? kwh / hours : null;
        const loadFactor = avgKw !== null && kwMax !== null && kwMax > 0 ? avgKw / kwMax : null;
        cycleAggs.push({ month, billEndIso: c.cycle.endIso, kwh, kwMax, avgKw, loadFactor });

        if (c.maxTimestampIso && Number.isFinite(c.demand?.kWMax as any)) {
          const touBucket =
            c.demand?.kWMaxByTouPeriod &&
            Object.entries(c.demand.kWMaxByTouPeriod)
              .filter(([, v]) => Number.isFinite(v as any))
              .sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0];
          peaks.push({
            timestampIso: c.maxTimestampIso,
            kW: Number(c.demand.kWMax),
            touBucket,
            meterKey: m.meterId,
          });
        }
      }
      const recon = (m as any)?.reconciliation;
      if (Array.isArray(recon?.matches)) {
        overlapMonthsReconcilable += recon.matches.filter((x: any) => x?.isReconcilable).length;
      }
    }
  }

  const monthMap = new Map<string, MonthAgg>();
  for (const m of cycleAggs) {
    if (!monthMap.has(m.month)) monthMap.set(m.month, { ...m });
    else {
      const cur = monthMap.get(m.month)!;
      cur.kwh = Number.isFinite(cur.kwh as any) ? (cur.kwh as number) + (m.kwh ?? 0) : m.kwh ?? cur.kwh ?? null;
      cur.kwMax = Math.max(Number(cur.kwMax ?? 0), Number(m.kwMax ?? 0)) || cur.kwMax || m.kwMax || null;
      cur.avgKw = mean([cur.avgKw ?? null, m.avgKw ?? null]);
      cur.loadFactor = mean([cur.loadFactor ?? null, m.loadFactor ?? null]);
      cur.billEndIso = m.billEndIso;
    }
  }

  const months = Array.from(monthMap.values()).sort((a, b) => a.billEndIso.localeCompare(b.billEndIso));
  const monthsAvailable = months.length;
  const firstMonth = months[0]?.month;
  const lastMonth = months[months.length - 1]?.month;

  evidence.push({ kind: 'intervalCalc', pointer: { source: 'behaviorInsights', key: 'monthsAvailable', value: monthsAvailable } });
  if (firstMonth && lastMonth) evidence.push({ kind: 'intervalCalc', pointer: { source: 'behaviorInsights', key: 'dataWindow', value: `${firstMonth}..${lastMonth}` } });

  const last12 = months.slice(-12);
  const prior12 = months.slice(-24, -12);
  const last12Kwh = sum(last12.map((m) => m.kwh));
  const prior12Kwh = sum(prior12.map((m) => m.kwh));
  const last12Kw = mean(last12.map((m) => m.kwMax));
  const prior12Kw = mean(prior12.map((m) => m.kwMax));

  const usageSlope = linearSlope(months.map((m) => Number(m.kwh ?? NaN)).filter((n) => Number.isFinite(n)));
  const demandSlope = linearSlope(months.map((m) => Number(m.kwMax ?? NaN)).filter((n) => Number.isFinite(n)));
  const usageDirection = directionFromSlope(usageSlope, mean(months.map((m) => m.kwh ?? null)));

  const yoyByMonth: Array<{ month: string; pctChange: number }> = [];
  if (months.length >= 24) {
    const byMonth = new Map<string, MonthAgg>();
    for (const m of months) byMonth.set(m.month, m);
    for (const m of months) {
      const [y, mo] = m.month.split('-');
      const prior = `${Number(y) - 1}-${mo}`;
      const prev = byMonth.get(prior);
      const pct = pctChange(m.kwh ?? null, prev?.kwh ?? null);
      if (pct !== null) yoyByMonth.push({ month: m.month, pctChange: pct });
    }
  } else {
    missingInfo.push({
      id: 'behavior.yoy.insufficientMonths',
      category: 'tariff',
      severity: 'info',
      description: 'Insufficient months for YoY comparisons (need >= 24 months).',
    });
  }

  const topMonthsByKwh = topN(
    months.filter((m) => Number.isFinite(m.kwh as any)),
    3,
    (m) => Number(m.kwh || 0),
  ).map((m) => ({ month: m.month, kwh: Number(m.kwh || 0) }));
  const topMonthsByKw = topN(
    months.filter((m) => Number.isFinite(m.kwMax as any)),
    3,
    (m) => Number(m.kwMax || 0),
  ).map((m) => ({ month: m.month, kw: Number(m.kwMax || 0) }));

  const kwhVals = months.map((m) => m.kwh ?? null).filter((n): n is number => Number.isFinite(n as any));
  const kwVals = months.map((m) => m.kwMax ?? null).filter((n): n is number => Number.isFinite(n as any));
  const kwhAmp = kwhVals.length ? (Math.max(...kwhVals) - Math.min(...kwhVals)) / Math.max(1, mean(kwhVals) || 1) : null;
  const kwAmp = kwVals.length ? (Math.max(...kwVals) - Math.min(...kwVals)) / Math.max(1, mean(kwVals) || 1) : null;

  const topSpikes = topN(
    peaks.filter((p) => Number.isFinite(p.kW)),
    5,
    (p) => Number(p.kW || 0),
  );
  const peakHourHistogram: Record<string, number> = {};
  const peakWeekdayHistogram: Record<string, number> = {};
  for (const p of topSpikes) {
    const d = new Date(p.timestampIso);
    if (!Number.isFinite(d.getTime())) continue;
    const hour = String(d.getUTCHours()).padStart(2, '0');
    peakHourHistogram[hour] = (peakHourHistogram[hour] || 0) + 1;
    const wd = weekdayName(d);
    peakWeekdayHistogram[wd] = (peakWeekdayHistogram[wd] || 0) + 1;
  }

  if (!topSpikes.length) {
    missingInfo.push({
      id: 'behavior.peaks.missing',
      category: 'tariff',
      severity: 'info',
      description: 'Peak timestamps unavailable; cannot compute peak timing histograms.',
    });
  }

  const baseLoadKw = Number.isFinite(args.loadAttribution?.baseLoadKw as any) ? Number(args.loadAttribution?.baseLoadKw) : undefined;
  const baseLoadTrend = linearSlope(months.map((m) => Number(m.avgKw ?? NaN)).filter((n) => Number.isFinite(n)));
  const loadFactorTrend = linearSlope(months.map((m) => Number(m.loadFactor ?? NaN)).filter((n) => Number.isFinite(n)));

  const behavior: BehaviorInsightsV1 = {
    dataWindow: {
      monthsAvailable,
      overlapMonthsReconcilable,
      ...(firstMonth ? { firstMonth } : {}),
      ...(lastMonth ? { lastMonth } : {}),
    },
    usageTrend: {
      ...(last12Kwh !== null ? { last12Kwh } : {}),
      ...(prior12Kwh !== null ? { prior12Kwh } : {}),
      ...(pctChange(last12Kwh, prior12Kwh) !== null ? { pctChange: pctChange(last12Kwh, prior12Kwh) as number } : {}),
      ...(usageSlope !== null ? { slopeKwhPerMonth: usageSlope } : {}),
      direction: usageDirection,
      ...(yoyByMonth.length ? { yoyByMonth } : {}),
    },
    demandTrend: {
      ...(last12Kw !== null ? { last12Kw } : {}),
      ...(prior12Kw !== null ? { prior12Kw } : {}),
      ...(pctChange(last12Kw, prior12Kw) !== null ? { pctChange: pctChange(last12Kw, prior12Kw) as number } : {}),
      ...(demandSlope !== null ? { slopeKwPerMonth: demandSlope } : {}),
    },
    seasonality: {
      topMonthsByKwh,
      topMonthsByKw,
      seasonalAmplitude: {
        ...(kwhAmp !== null ? { kwhPct: kwhAmp } : {}),
        ...(kwAmp !== null ? { kwPct: kwAmp } : {}),
      },
    },
    peaks: {
      topSpikes,
      peakHourHistogram: Object.keys(peakHourHistogram).length ? peakHourHistogram : undefined,
      peakWeekdayHistogram: Object.keys(peakWeekdayHistogram).length ? peakWeekdayHistogram : undefined,
    },
    loadShape: {
      ...(baseLoadKw !== undefined ? { baseLoadKw } : {}),
      ...(baseLoadTrend !== null ? { baseLoadTrend } : {}),
      ...(loadFactorTrend !== null ? { loadFactorTrend } : {}),
    },
    anomalies: {},
    insightCards: [],
    confidence: 0.5,
    because,
    evidence,
    missingInfo,
  };

  if (monthsAvailable < 12) {
    missingInfo.push({
      id: 'behavior.months.insufficient',
      category: 'tariff',
      severity: 'info',
      description: 'Insufficient months for robust multi-year behavior insights (need >= 12).',
    });
  }
  const step = rollingStepChange(months);
  if (step) {
    behavior.anomalies.stepChangeDetected = { whenMonth: step.whenMonth, deltaKwh: step.deltaKwh, confidence: step.confidence };
    because.push(`Step change detected near ${step.whenMonth} (ΔkWh≈${step.deltaKwh.toFixed(0)}).`);
    evidence.push({ kind: 'intervalCalc', pointer: { source: 'behaviorInsights', key: 'stepChangeMonth', value: step.whenMonth } });
  }

  const weekendShare = computeWeekendShare({ intervalPoints, lastMonth });
  if (weekendShare) {
    behavior.anomalies.weekendShareChange = weekendShare;
    evidence.push({
      kind: 'intervalCalc',
      pointer: { source: 'behaviorInsights', key: 'weekendShare', value: `${(weekendShare.last12WeekendPct * 100).toFixed(1)}%/${(weekendShare.prior12WeekendPct * 100).toFixed(1)}%` },
    });
  } else {
    missingInfo.push({
      id: 'behavior.weekendShare.unavailable',
      category: 'tariff',
      severity: 'info',
      description: 'Weekend share change unavailable (insufficient interval months or missing timestamps).',
    });
  }

  const insightCards: InsightCardV1[] = [];
  const windowLabel = firstMonth && lastMonth ? `${firstMonth}..${lastMonth}` : 'available window';

  if (last12Kwh !== null && prior12Kwh !== null) {
    const pct = pctChange(last12Kwh, prior12Kwh);
    const level = confidenceLevel({ monthsAvailable, overlapMonthsReconcilable, signalStrength: pct });
    const becauseList = [`last12Kwh=${numStr(last12Kwh, 0)} kWh; prior12Kwh=${numStr(prior12Kwh, 0)} kWh`, `window=${windowLabel}`];
    const questions = [
      'Were there any occupancy or production changes in the last 12 months?',
      'Did operating hours or schedules change compared to the prior year?',
      'Have there been any major equipment additions/removals?',
    ];
    if (level === 'low') questions.push('Please confirm operating schedule / equipment change.');
    insightCards.push({
      id: 'behavior.usage.yoy',
      finding: `Usage changed ${pctStr(pct, 0)} over the last 12 months vs prior 12 (${numStr(last12Kwh, 0)} vs ${numStr(prior12Kwh, 0)} kWh).`,
      whyItMatters: 'Sustained usage shifts drive energy cost and may indicate operational changes.',
      confidence: { level, because: becauseList },
      customerQuestions: questions.slice(0, 5),
      likelyCauses: normalizeWeights([
        { cause: 'Occupancy or production changes may indicate higher/lower usage', weight: 0.35 },
        { cause: 'Operating schedule changes may indicate different runtime hours', weight: 0.25 },
        { cause: 'Weather-driven load shifts may indicate HVAC load changes', weight: 0.25 },
        { cause: 'Metering/billing changes may indicate measurement differences', weight: 0.15 },
      ]),
      recommendedNextSteps: ['Confirm schedule/occupancy changes across the 24-month window.', 'Share any major equipment changes or retrofits.', 'Review weather-normalized load if available.'],
    });
  }

  if (last12Kw !== null && prior12Kw !== null) {
    const pct = pctChange(last12Kw, prior12Kw);
    const level = confidenceLevel({ monthsAvailable, overlapMonthsReconcilable, signalStrength: pct });
    const becauseList = [`last12KwAvg=${numStr(last12Kw, 1)} kW; prior12KwAvg=${numStr(prior12Kw, 1)} kW`, `window=${windowLabel}`];
    const questions = ['Did any large equipment come online or change operating schedule?', 'Were there changes to demand management or peak control strategies?'];
    if (level === 'low') questions.push('Please confirm operating schedule / equipment change.');
    insightCards.push({
      id: 'behavior.demand.yoy',
      finding: `Peak demand changed ${pctStr(pct, 0)} in the last 12 months vs prior 12 (avg max ${numStr(last12Kw, 1)} vs ${numStr(prior12Kw, 1)} kW).`,
      whyItMatters: 'Demand shifts can materially change demand charges and peak-related costs.',
      confidence: { level, because: becauseList },
      customerQuestions: questions,
      likelyCauses: normalizeWeights([
        { cause: 'New or rescheduled equipment may indicate higher peak demand', weight: 0.35 },
        { cause: 'Operational timing shifts may indicate coincident loads', weight: 0.25 },
        { cause: 'Demand ratchets or billing rules may indicate billed peak changes', weight: 0.2 },
        { cause: 'Interval coverage gaps may indicate measurement differences', weight: 0.2 },
      ]),
      recommendedNextSteps: ['Confirm peak control or scheduling changes.', 'Check any demand-response participation or curtailments.', 'Verify interval coverage for peak months.'],
    });
  }

  if (Object.keys(peakHourHistogram).length && topSpikes.length) {
    const topHour = Object.entries(peakHourHistogram).sort((a, b) => b[1] - a[1])[0];
    const weekdays =
      (peakWeekdayHistogram['Mon'] || 0) +
      (peakWeekdayHistogram['Tue'] || 0) +
      (peakWeekdayHistogram['Wed'] || 0) +
      (peakWeekdayHistogram['Thu'] || 0) +
      (peakWeekdayHistogram['Fri'] || 0);
    const weekends = (peakWeekdayHistogram['Sat'] || 0) + (peakWeekdayHistogram['Sun'] || 0);
    const total = weekdays + weekends;
    const weekendShare = total ? weekends / total : null;
    const level = confidenceLevel({ monthsAvailable, overlapMonthsReconcilable, signalStrength: total ? topHour[1] / total : 0 });
    const becauseList = [`topHour=${topHour[0]}:00 (${topHour[1]}/${total || 'n/a'} spikes)`, `window=${windowLabel}`];
    const questions = ['What processes or equipment typically run during the peak hour window?', 'Are peaks driven by HVAC, charging, or batch processes?'];
    if (level === 'low') questions.push('Please confirm operating schedule / equipment change.');
    insightCards.push({
      id: 'behavior.peak.timing',
      finding: `Peak demand clusters around ${topHour[0]}:00, mostly on ${weekendShare !== null && weekendShare > 0.4 ? 'weekends' : 'weekdays'}.`,
      whyItMatters: 'Peak timing affects demand charges and informs load shifting opportunities.',
      confidence: { level, because: becauseList },
      customerQuestions: questions,
      likelyCauses: normalizeWeights([
        { cause: 'Process scheduling may indicate peaks during specific hours', weight: 0.35 },
        { cause: 'HVAC scheduling may indicate afternoon peaks', weight: 0.25 },
        { cause: 'EV or fleet charging may indicate off-hour clustering', weight: 0.2 },
        { cause: 'TOU labeling or rate mapping may indicate timing shifts', weight: 0.2 },
      ]),
      recommendedNextSteps: ['Confirm operating schedules for the identified peak window.', 'Check whether peaks align with tariff TOU periods.', 'Review any curtailment or automation policies.'],
    });
  }

  if (behavior.anomalies.stepChangeDetected) {
    const step = behavior.anomalies.stepChangeDetected;
    const level = step.confidence >= 0.7 ? 'high' : step.confidence >= 0.45 ? 'medium' : 'low';
    const becauseList = [`stepMonth=${step.whenMonth}; ΔkWh≈${numStr(step.deltaKwh, 0)}`, `window=${windowLabel}`];
    const questions = ['Was there a known operational or tenant change around this month?', 'Were any major equipment installations or removals completed then?'];
    if (level === 'low') questions.push('Please confirm operating schedule / equipment change.');
    insightCards.push({
      id: 'behavior.step.change',
      finding: `Usage shifted around ${step.whenMonth} by roughly ${numStr(step.deltaKwh, 0)} kWh.`,
      whyItMatters: 'Step changes often signal structural shifts that can affect baseline costs and savings.',
      confidence: { level, because: becauseList },
      customerQuestions: questions,
      likelyCauses: normalizeWeights([
        { cause: 'Equipment added/removed may indicate a structural usage change', weight: 0.35 },
        { cause: 'Schedule changes may indicate step shifts in runtime', weight: 0.3 },
        { cause: 'Tenant or space use changes may indicate load shifts', weight: 0.2 },
        { cause: 'Metering/billing changes may indicate data discontinuity', weight: 0.15 },
      ]),
      recommendedNextSteps: ['Confirm any operational milestones near the step month.', 'Review maintenance logs or project timelines.', 'Check for meter or billing configuration changes.'],
    });
  }

  if (Number.isFinite(baseLoadTrend)) {
    const level = confidenceLevel({ monthsAvailable, overlapMonthsReconcilable, signalStrength: baseLoadTrend });
    const direction = baseLoadTrend !== null && baseLoadTrend > 0 ? 'increasing' : 'decreasing';
    const becauseList = [`avgKwSlope≈${numStr(baseLoadTrend, 2)} kW/month`, `window=${windowLabel}`];
    const questions = ['Have always-on loads or controls drifted over the last 12-24 months?', 'Did any 24/7 equipment get added or left running?'];
    if (level === 'low') questions.push('Please confirm operating schedule / equipment change.');
    insightCards.push({
      id: 'behavior.baseLoad.trend',
      finding: `Base load appears ${direction} by about ${numStr(Math.abs(baseLoadTrend || 0), 2)} kW/month.`,
      whyItMatters: 'Rising base load increases costs even without production growth.',
      confidence: { level, because: becauseList },
      customerQuestions: questions,
      likelyCauses: normalizeWeights([
        { cause: 'Always-on equipment growth may indicate base load creep', weight: 0.35 },
        { cause: 'Controls drift may indicate higher idle consumption', weight: 0.25 },
        { cause: 'Process changes may indicate new continuous loads', weight: 0.25 },
        { cause: 'Metering changes may indicate baseline shifts', weight: 0.15 },
      ]),
      recommendedNextSteps: ['Inventory always-on equipment and controls settings.', 'Check overnight baseload profiles in intervals.', 'Validate metering configuration continuity.'],
    });
  }

  if (behavior.anomalies.weekendShareChange) {
    const ws = behavior.anomalies.weekendShareChange;
    const delta = ws.last12WeekendPct - ws.prior12WeekendPct;
    const level = confidenceLevel({ monthsAvailable, overlapMonthsReconcilable, signalStrength: delta });
    const becauseList = [`weekendShare ${pctStr(ws.last12WeekendPct, 1)} vs ${pctStr(ws.prior12WeekendPct, 1)}`, `window=${windowLabel}`];
    const questions = ['Did weekend operations change in the last 12 months?', 'Were cleaning/maintenance schedules adjusted to weekends?'];
    if (level === 'low') questions.push('Please confirm operating schedule / equipment change.');
    insightCards.push({
      id: 'behavior.weekend.share',
      finding: `Weekend energy share changed by ${pctStr(delta, 1)} vs the prior year.`,
      whyItMatters: 'Weekend shifts can indicate schedule changes that affect staffing and cost planning.',
      confidence: { level, because: becauseList },
      customerQuestions: questions,
      likelyCauses: normalizeWeights([
        { cause: 'Weekend operating schedule changes may indicate shifted production', weight: 0.4 },
        { cause: 'Maintenance or cleaning schedules may indicate weekend load shifts', weight: 0.25 },
        { cause: 'Occupancy changes may indicate weekend usage differences', weight: 0.2 },
        { cause: 'Interval coverage differences may indicate measurement bias', weight: 0.15 },
      ]),
      recommendedNextSteps: ['Confirm weekend operating policies and staffing.', 'Review interval completeness on weekends.', 'Check whether weekend loads align with TOU pricing.'],
    });
  }

  behavior.insightCards = insightCards;
  const conf = clamp01(0.3 + 0.4 * Math.min(1, monthsAvailable / 24) + 0.3 * (overlapMonthsReconcilable > 0 ? 1 : 0));
  behavior.confidence = conf;
  because.push(`Behavior insights built from months=${monthsAvailable}; reconcilable overlap=${overlapMonthsReconcilable}.`);
  return behavior;
}
