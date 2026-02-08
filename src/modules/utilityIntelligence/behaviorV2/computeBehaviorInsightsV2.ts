import type { DeterminantsPackV1, EvidenceItemV1 } from '../../determinants/types';
import type { MissingInfoItemV0 } from '../missingInfo/types';
import type { BehaviorInsightsV2, BehaviorInsightConfidenceLevelV2, InsightCardV2 } from './types';

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

function median(xs: number[]): number | null {
  const a = xs.filter((n) => Number.isFinite(n)).slice().sort((x, y) => x - y);
  if (!a.length) return null;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function pctChange(cur: number | null, prior: number | null): number | null {
  if (!Number.isFinite(cur ?? NaN) || !Number.isFinite(prior ?? NaN) || Number(prior) === 0) return null;
  return (Number(cur) - Number(prior)) / Number(prior);
}

function sum(xs: Array<number | null | undefined>): number | null {
  const vals = xs.filter((n): n is number => Number.isFinite(n as any));
  if (!vals.length) return null;
  return vals.reduce((s, x) => s + x, 0);
}

function mean(xs: Array<number | null | undefined>): number | null {
  const vals = xs.filter((n): n is number => Number.isFinite(n as any));
  if (!vals.length) return null;
  return vals.reduce((s, x) => s + x, 0) / vals.length;
}

function confidenceLevel(args: { cycleCount: number; deltaPct?: number | null }): BehaviorInsightConfidenceLevelV2 {
  const d = Math.abs(Number(args.deltaPct ?? 0));
  if (args.cycleCount >= 24 && d >= 0.1) return 'high';
  if (args.cycleCount >= 18 && d >= 0.05) return 'medium';
  return 'low';
}

type ReconCycle = {
  month: string;
  startIso: string;
  endIso: string;
  kwh: number | null;
  kwMax: number | null;
  avgKw: number | null;
  maxTimestampIso: string | null;
  meterKey: string;
};

function rollingMedianStepChanges(months: Array<{ month: string; kwh: number }>): Array<{ whenMonth: string; deltaKwh: number; deltaPct: number; confidence: number }> {
  if (months.length < 10) return [];
  const out: Array<{ whenMonth: string; deltaKwh: number; deltaPct: number; confidence: number }> = [];
  for (let i = 4; i < months.length - 4; i++) {
    const prev = months.slice(i - 3, i).map((m) => m.kwh);
    const next = months.slice(i, i + 3).map((m) => m.kwh);
    const prevMed = median(prev);
    const nextMed = median(next);
    if (!Number.isFinite(prevMed ?? NaN) || !Number.isFinite(nextMed ?? NaN) || Number(prevMed) <= 0) continue;
    const delta = Number(nextMed) - Number(prevMed);
    const deltaPct = delta / Number(prevMed);
    if (Math.abs(deltaPct) < 0.2) continue;
    const conf = clamp01(Math.min(1, Math.abs(deltaPct)) + 0.15);
    out.push({ whenMonth: months[i].month, deltaKwh: delta, deltaPct, confidence: conf });
  }
  // De-dupe by month (keep largest delta)
  const byMonth = new Map<string, (typeof out)[number]>();
  for (const s of out) {
    const cur = byMonth.get(s.whenMonth);
    if (!cur || Math.abs(s.deltaKwh) > Math.abs(cur.deltaKwh)) byMonth.set(s.whenMonth, s);
  }
  return Array.from(byMonth.values()).sort((a, b) => a.whenMonth.localeCompare(b.whenMonth));
}

export function computeBehaviorInsightsV2(args: {
  determinantsPack: DeterminantsPackV1 | null | undefined;
  intervalPointsV1?: Array<{ timestampIso: string; intervalMinutes: number; kWh?: number; kW?: number }> | null;
  loadAttribution?: { baseLoadKw?: number | null } | null;
  nowIso: string;
}): BehaviorInsightsV2 {
  const evidence: EvidenceItemV1[] = [];
  const because: string[] = [];
  const missingInfo: MissingInfoItemV0[] = [];
  const pack = args.determinantsPack || null;
  const intervalPoints = Array.isArray(args.intervalPointsV1) ? args.intervalPointsV1 : [];

  const reconCycles: ReconCycle[] = [];
  if (pack && Array.isArray(pack.meters)) {
    for (const m of pack.meters) {
      const cyclesByLabel = new Map((m.cycles || []).map((c) => [String(c.cycle.label), c]));
      const matches = Array.isArray(m.reconciliation?.matches) ? m.reconciliation.matches : [];
      for (const match of matches) {
        if (!match?.isReconcilable) continue;
        const cyc = cyclesByLabel.get(String(match.cycleLabel || ''));
        if (!cyc) continue;
        const month = monthKeyFromIso(cyc.cycle.endIso);
        if (!month) continue;
        const startMs = new Date(cyc.cycle.startIso).getTime();
        const endMs = new Date(cyc.cycle.endIso).getTime();
        const hours = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs ? (endMs - startMs) / 3_600_000 : null;
        const kwh = Number.isFinite(match.computedKwh as any) ? Number(match.computedKwh) : cyc.energy.kwhTotal;
        const kwMax = cyc.demand?.kWMax ?? null;
        const avgKw = kwh !== null && hours ? kwh / hours : null;
        reconCycles.push({
          month,
          startIso: cyc.cycle.startIso,
          endIso: cyc.cycle.endIso,
          kwh,
          kwMax,
          avgKw,
          maxTimestampIso: cyc.maxTimestampIso ?? null,
          meterKey: m.meterId,
        });
      }
    }
  }

  // Aggregate to month series across meters (sum kWh, max kW, mean avgKw).
  const byMonth = new Map<string, { month: string; startIso: string; endIso: string; kwh: number; kwMax: number; avgKw: number[]; peaks: Array<{ ts: string; kw: number; meterKey: string }> }>();
  for (const c of reconCycles) {
    const cur = byMonth.get(c.month);
    const kwh = Number.isFinite(c.kwh as any) ? Number(c.kwh) : 0;
    const kw = Number.isFinite(c.kwMax as any) ? Number(c.kwMax) : 0;
    const peak = c.maxTimestampIso && Number.isFinite(c.kwMax as any) ? [{ ts: String(c.maxTimestampIso), kw: Number(c.kwMax), meterKey: c.meterKey }] : [];
    if (!cur) {
      byMonth.set(c.month, {
        month: c.month,
        startIso: c.startIso,
        endIso: c.endIso,
        kwh,
        kwMax: kw,
        avgKw: Number.isFinite(c.avgKw as any) ? [Number(c.avgKw)] : [],
        peaks: peak,
      });
    } else {
      cur.kwh += kwh;
      cur.kwMax = Math.max(cur.kwMax, kw);
      if (Number.isFinite(c.avgKw as any)) cur.avgKw.push(Number(c.avgKw));
      cur.peaks.push(...peak);
      // keep widest window for month
      if (String(c.startIso) < String(cur.startIso)) cur.startIso = c.startIso;
      if (String(c.endIso) > String(cur.endIso)) cur.endIso = c.endIso;
    }
  }

  const months = Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
  const cycleCount = months.length;
  const startIso = cycleCount ? months[0].startIso : null;
  const endExclusiveIso = cycleCount ? months[months.length - 1].endIso : null;

  const notes: string[] = [];
  if (!cycleCount) notes.push('No reconcilable overlap cycles available (need overlap + adequate interval coverage + usage present).');

  evidence.push({ kind: 'intervalCalc', pointer: { source: 'behaviorV2', key: 'cycleCount', value: cycleCount } });
  if (startIso && endExclusiveIso) evidence.push({ kind: 'intervalCalc', pointer: { source: 'behaviorV2', key: 'window', value: `${startIso}..${endExclusiveIso}` } });

  const monthKwhSeries = months.map((m) => ({ month: m.month, kwh: m.kwh }));
  const monthKwSeries = months.map((m) => ({ month: m.month, kwMax: m.kwMax }));
  const monthAvgKwSeries = months.map((m) => ({ month: m.month, avgKw: m.avgKw.length ? m.avgKw.reduce((s, x) => s + x, 0) / m.avgKw.length : NaN }));

  const last12 = months.slice(-12);
  const prior12 = months.slice(-24, -12);

  const last12Kwh = sum(last12.map((m) => m.kwh));
  const prior12Kwh = sum(prior12.map((m) => m.kwh));
  const usageDeltaPct = pctChange(last12Kwh, prior12Kwh);
  const usageSlope = linearSlope(months.map((m) => Number(m.kwh)).filter((n) => Number.isFinite(n)));

  const last12Kw = mean(last12.map((m) => m.kwMax));
  const prior12Kw = mean(prior12.map((m) => m.kwMax));
  const demandDeltaPct = pctChange(last12Kw, prior12Kw);
  const demandSlope = linearSlope(months.map((m) => Number(m.kwMax)).filter((n) => Number.isFinite(n)));

  if (cycleCount < 12) {
    missingInfo.push({
      id: 'behaviorV2.insufficientCycles',
      category: 'tariff',
      severity: 'info',
      description: 'Insufficient reconcilable overlap cycles for multi-year behavior insights (need >= 12).',
    });
  }

  const stepChanges = rollingMedianStepChanges(monthKwhSeries.filter((m) => Number.isFinite(m.kwh)));
  if (!stepChanges.length && cycleCount >= 12) notes.push('No step changes detected above threshold (rolling median).');

  const peaksAll = months.flatMap((m) => m.peaks || []);
  const topPeaks = peaksAll
    .filter((p) => p.ts && Number.isFinite(p.kw))
    .sort((a, b) => b.kw - a.kw || String(a.ts).localeCompare(String(b.ts)))
    .slice(0, 8)
    .map((p) => ({ timestampIso: p.ts, kW: p.kw, meterKey: p.meterKey }));
  if (!topPeaks.length) {
    missingInfo.push({
      id: 'behaviorV2.peaks.missing',
      category: 'tariff',
      severity: 'info',
      description: 'Peak timing unavailable (missing determinant timestamps for kW maxima).',
    });
  }

  // Seasonality: month-of-year averages across available months.
  const byMoKwh: Record<number, number[]> = {};
  const byMoKw: Record<number, number[]> = {};
  for (const m of months) {
    const mo = Number(String(m.month).split('-')[1]);
    if (!Number.isFinite(mo) || mo < 1 || mo > 12) continue;
    byMoKwh[mo] = byMoKwh[mo] || [];
    byMoKwh[mo].push(Number(m.kwh));
    byMoKw[mo] = byMoKw[mo] || [];
    byMoKw[mo].push(Number(m.kwMax));
  }
  const kwhByMonthOfYear = Array.from({ length: 12 }, (_, i) => i + 1)
    .filter((mo) => Array.isArray(byMoKwh[mo]) && byMoKwh[mo].length)
    .map((mo) => ({ month: mo, avgKwh: (byMoKwh[mo].reduce((s, x) => s + x, 0) / byMoKwh[mo].length) || 0 }));
  const kwMaxByMonthOfYear = Array.from({ length: 12 }, (_, i) => i + 1)
    .filter((mo) => Array.isArray(byMoKw[mo]) && byMoKw[mo].length)
    .map((mo) => ({ month: mo, avgKwMax: (byMoKw[mo].reduce((s, x) => s + x, 0) / byMoKw[mo].length) || 0 }));

  // Base load drift: monthly avg kW slope + latest attribution baseLoadKw if available.
  const avgKwSlope = linearSlope(monthAvgKwSeries.map((m) => Number(m.avgKw)).filter((n) => Number.isFinite(n)));
  const baseLoadKwLatest = Number.isFinite(args.loadAttribution?.baseLoadKw as any) ? Number(args.loadAttribution?.baseLoadKw) : null;
  if (!Number.isFinite(avgKwSlope ?? NaN)) {
    missingInfo.push({
      id: 'behaviorV2.baseLoadDrift.unavailable',
      category: 'tariff',
      severity: 'info',
      description: 'Base load drift unavailable (insufficient reconcilable months).',
    });
  }

  // Weekend share (interval timestamps): last12 vs prior12 for months in window.
  const windowMonths = new Set(months.map((m) => m.month));
  const monthsForWeekend = months.map((m) => m.month).sort();
  const lastMonth = monthsForWeekend[monthsForWeekend.length - 1];
  const last12Months = new Set(monthsForWeekend.slice(-12));
  const prior12Months = new Set(monthsForWeekend.slice(-24, -12));

  function weekendShareFor(monthSet: Set<string>): number | null {
    let weekend = 0;
    let total = 0;
    for (const p of intervalPoints) {
      const mk = monthKeyFromIso(String(p.timestampIso || ''));
      if (!mk || !windowMonths.has(mk) || !monthSet.has(mk)) continue;
      const mins = Number((p as any).intervalMinutes);
      const kwh = Number((p as any).kWh);
      const kw = Number((p as any).kW);
      const energy = Number.isFinite(kwh) ? kwh : Number.isFinite(kw) && Number.isFinite(mins) && mins > 0 ? kw * (mins / 60) : NaN;
      if (!Number.isFinite(energy)) continue;
      const d = new Date(String(p.timestampIso || ''));
      if (!Number.isFinite(d.getTime())) continue;
      const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
      total += energy;
      if (isWeekend) weekend += energy;
    }
    return total > 0 ? weekend / total : null;
  }

  const last12WeekendPct = lastMonth && cycleCount >= 24 ? weekendShareFor(last12Months) : null;
  const prior12WeekendPct = lastMonth && cycleCount >= 24 ? weekendShareFor(prior12Months) : null;
  const deltaPctPts =
    last12WeekendPct !== null && prior12WeekendPct !== null ? (last12WeekendPct - prior12WeekendPct) * 100 : null;
  if (cycleCount < 24) {
    missingInfo.push({
      id: 'behaviorV2.weekendShare.insufficientMonths',
      category: 'tariff',
      severity: 'info',
      description: 'Weekend share comparison requires >= 24 reconcilable months.',
    });
  }

  // Conversation cards (customer-ready)
  const cards: InsightCardV2[] = [];
  if (usageDeltaPct !== null) {
    const lvl = confidenceLevel({ cycleCount, deltaPct: usageDeltaPct });
    cards.push({
      id: 'behaviorV2.card.usageYoY',
      finding: `Energy use changed ${(usageDeltaPct * 100).toFixed(0)}% (last12 vs prior12, reconcilable months).`,
      askCustomer: lvl === 'low' ? 'Can you confirm any schedule/equipment changes in the last 12–24 months?' : 'What changed operationally year-over-year that could explain this usage shift?',
      confidence: { level: lvl, because: [`last12Kwh=${last12Kwh}`, `prior12Kwh=${prior12Kwh}`, `months=${cycleCount}`] },
      evidence: [{ kind: 'intervalCalc', pointer: { source: 'behaviorV2', key: 'usageDeltaPct', value: usageDeltaPct } }],
    });
  }
  if (demandDeltaPct !== null) {
    const lvl = confidenceLevel({ cycleCount, deltaPct: demandDeltaPct });
    cards.push({
      id: 'behaviorV2.card.demandYoY',
      finding: `Peak demand changed ${(demandDeltaPct * 100).toFixed(0)}% (last12 vs prior12, reconcilable months).`,
      askCustomer: lvl === 'low' ? 'Can you confirm any schedule/equipment changes in the last 12–24 months?' : 'Did any equipment, runtime, or peak-control strategy change year-over-year?',
      confidence: { level: lvl, because: [`last12KwMax=${last12Kw}`, `prior12KwMax=${prior12Kw}`, `months=${cycleCount}`] },
      evidence: [{ kind: 'intervalCalc', pointer: { source: 'behaviorV2', key: 'demandDeltaPct', value: demandDeltaPct } }],
    });
  }
  if (stepChanges.length) {
    const s0 = stepChanges[0];
    const lvl: BehaviorInsightConfidenceLevelV2 = s0.confidence >= 0.75 ? 'high' : s0.confidence >= 0.5 ? 'medium' : 'low';
    cards.push({
      id: 'behaviorV2.card.stepChange',
      finding: `A persistent step change occurred near ${s0.whenMonth} (ΔkWh≈${s0.deltaKwh.toFixed(0)}; ${(s0.deltaPct * 100).toFixed(0)}%).`,
      askCustomer: lvl === 'low' ? 'Can you confirm any schedule/equipment changes around that month?' : 'What changed around that month (tenant/equipment/schedule) that could explain the shift?',
      confidence: { level: lvl, because: [`when=${s0.whenMonth}`, `deltaPct=${s0.deltaPct.toFixed(3)}`] },
      evidence: [{ kind: 'intervalCalc', pointer: { source: 'behaviorV2', key: 'stepChangeMonth', value: s0.whenMonth } }],
    });
  }
  if (topPeaks.length) {
    const p0 = topPeaks[0];
    cards.push({
      id: 'behaviorV2.card.peakTiming',
      finding: `Top observed peak reached ${p0.kW.toFixed(1)} kW at ${String(p0.timestampIso).slice(0, 16)}Z.`,
      askCustomer: 'What was running at that time window (HVAC, batch process, charging, etc.)?',
      confidence: { level: 'medium', because: ['Derived from determinant maxTimestampIso + kWMax'] },
      evidence: [{ kind: 'intervalCalc', pointer: { source: 'behaviorV2', key: 'peakTimestampIso', value: p0.timestampIso } }],
    });
  }

  const confidence = clamp01(0.2 + 0.6 * Math.min(1, cycleCount / 24) + 0.2 * (cycleCount >= 12 ? 1 : 0));
  because.push(`Computed from reconcilable overlap cycles only (count=${cycleCount}).`);

  return {
    dataWindow: { startIso, endExclusiveIso, cycleCount, notes },
    usageTrend: { last12Kwh, prior12Kwh, deltaPct: usageDeltaPct, slopePerMonth: usageSlope, confidence: clamp01(cycleCount / 24) },
    demandTrend: { last12KwMax: last12Kw, prior12KwMax: prior12Kw, deltaPct: demandDeltaPct, slopePerMonth: demandSlope, confidence: clamp01(cycleCount / 24) },
    stepChanges: stepChanges.length ? stepChanges : undefined,
    peakTiming: topPeaks.length ? { topPeaks } : undefined,
    seasonality: cycleCount ? { kwhByMonthOfYear, kwMaxByMonthOfYear } : undefined,
    baseLoadDrift: { baseLoadKwLatest, avgKwSlopePerMonth: avgKwSlope },
    weekendShare: { last12WeekendPct, prior12WeekendPct, deltaPctPts },
    conversationCards: cards,
    because,
    evidence,
    missingInfo,
    confidence,
  };
}

