import type { DeterminantsPackV1, EvidenceItemV1 } from '../../determinants/types';
import type { MissingInfoItemV0 } from '../missingInfo/types';
import type { BehaviorInsightsV3, ElectricBehaviorInsightsV3, GasBehaviorInsightsV3, InsightCardV3 } from './types';

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

function confidenceLevel(monthCount: number, deltaPct: number | null): 'high' | 'medium' | 'low' {
  const d = Math.abs(Number(deltaPct ?? 0));
  if (monthCount >= 36 && d >= 0.1) return 'high';
  if (monthCount >= 24 && d >= 0.05) return 'medium';
  return 'low';
}

function rollingMedianStepChanges(
  months: Array<{ month: string; v: number }>,
  opts?: { minMonths?: number; thresholdPct?: number },
): Array<{ whenMonth: string; delta: number; deltaPct: number; confidence: number }> {
  const minMonths = Number.isFinite(opts?.minMonths as any) ? Number(opts?.minMonths) : 10;
  const thresholdPct = Number.isFinite(opts?.thresholdPct as any) ? Number(opts?.thresholdPct) : 0.2;
  if (months.length < minMonths) return [];
  const out: Array<{ whenMonth: string; delta: number; deltaPct: number; confidence: number }> = [];
  for (let i = 4; i < months.length - 4; i++) {
    const prev = months.slice(i - 3, i).map((m) => m.v);
    const next = months.slice(i, i + 3).map((m) => m.v);
    const prevMed = median(prev);
    const nextMed = median(next);
    if (!Number.isFinite(prevMed ?? NaN) || !Number.isFinite(nextMed ?? NaN) || Number(prevMed) <= 0) continue;
    const delta = Number(nextMed) - Number(prevMed);
    const deltaPct = delta / Number(prevMed);
    if (Math.abs(deltaPct) < thresholdPct) continue;
    const conf = clamp01(Math.min(1, Math.abs(deltaPct)) + 0.15);
    out.push({ whenMonth: months[i].month, delta, deltaPct, confidence: conf });
  }
  const byMonth = new Map<string, (typeof out)[number]>();
  for (const s of out) {
    const cur = byMonth.get(s.whenMonth);
    if (!cur || Math.abs(s.delta) > Math.abs(cur.delta)) byMonth.set(s.whenMonth, s);
  }
  return Array.from(byMonth.values()).sort((a, b) => a.whenMonth.localeCompare(b.whenMonth));
}

function seasonalitySkewPct(args: { months: Array<{ month: string; v: number }>; winter: number[]; summer: number[] }): {
  winterAvg: number | null;
  summerAvg: number | null;
  skewPct: number | null;
} {
  const byMo: Record<number, number[]> = {};
  for (const m of args.months) {
    const mo = Number(String(m.month).split('-')[1]);
    if (!Number.isFinite(mo) || mo < 1 || mo > 12) continue;
    byMo[mo] = byMo[mo] || [];
    byMo[mo].push(Number(m.v));
  }
  function avgFor(mos: number[]): number | null {
    const vals: number[] = [];
    for (const mo of mos) vals.push(...(byMo[mo] || []));
    return vals.length ? vals.reduce((s, x) => s + x, 0) / vals.length : null;
  }
  const winterAvg = avgFor(args.winter);
  const summerAvg = avgFor(args.summer);
  if (!Number.isFinite(winterAvg ?? NaN) || !Number.isFinite(summerAvg ?? NaN)) return { winterAvg, summerAvg, skewPct: null };
  const denom = (Number(winterAvg) + Number(summerAvg)) / 2;
  const skewPct = denom > 0 ? ((Number(winterAvg) - Number(summerAvg)) / denom) * 100 : null;
  return { winterAvg, summerAvg, skewPct };
}

function windowSums(months: Array<{ v: number }>, n: number): number | null {
  const slice = months.slice(-n);
  if (slice.length < n) return null;
  return sum(slice.map((m) => m.v));
}

function peakMonth(months: Array<{ month: string; v: number }>): { month: string; v: number } | null {
  let best: { month: string; v: number } | null = null;
  for (const m of months) {
    if (!Number.isFinite(m.v)) continue;
    if (!best || m.v > best.v) best = { month: m.month, v: m.v };
  }
  return best;
}

export function computeBehaviorInsightsV3(args: {
  inputsBillingMonthly?: Array<{ start: string; end: string; therms?: number; kWh?: number; kW?: number }> | null;
  determinantsPack?: DeterminantsPackV1 | null;
  nowIso: string;
}): BehaviorInsightsV3 {
  const out: BehaviorInsightsV3 = { version: 'behaviorV3.v1' };

  // -------------------------
  // Electric (from determinantsPack overlap-reconcilable months)
  // -------------------------
  const pack = args.determinantsPack || null;
  if (pack && Array.isArray(pack.meters)) {
    const evidence: EvidenceItemV1[] = [];
    const because: string[] = [];
    const missingInfo: MissingInfoItemV0[] = [];

    const byMonth = new Map<
      string,
      { month: string; startIso: string; endIso: string; kwh: number; kwMax: number; peaks: Array<{ ts: string; kw: number; meterKey: string }> }
    >();

    for (const m of pack.meters) {
      const cyclesByLabel = new Map((m.cycles || []).map((c: any) => [String(c.cycle?.label || ''), c]));
      const matches = Array.isArray(m.reconciliation?.matches) ? (m.reconciliation?.matches as any[]) : [];
      for (const match of matches) {
        if (!match?.isReconcilable) continue;
        const cyc = cyclesByLabel.get(String(match.cycleLabel || ''));
        if (!cyc) continue;
        const month = monthKeyFromIso(String(cyc.cycle?.endIso || ''));
        if (!month) continue;
        const kwh = Number.isFinite(match.computedKwh as any) ? Number(match.computedKwh) : Number(cyc.energy?.kwhTotal);
        const kwMax = Number(cyc.demand?.kWMax);
        const peak = cyc.maxTimestampIso && Number.isFinite(kwMax) ? [{ ts: String(cyc.maxTimestampIso), kw: kwMax, meterKey: String(m.meterId) }] : [];
        const cur = byMonth.get(month);
        if (!cur) {
          byMonth.set(month, {
            month,
            startIso: String(cyc.cycle?.startIso || ''),
            endIso: String(cyc.cycle?.endIso || ''),
            kwh: Number.isFinite(kwh) ? kwh : 0,
            kwMax: Number.isFinite(kwMax) ? kwMax : 0,
            peaks: peak,
          });
        } else {
          cur.kwh += Number.isFinite(kwh) ? kwh : 0;
          cur.kwMax = Math.max(cur.kwMax, Number.isFinite(kwMax) ? kwMax : 0);
          cur.peaks.push(...peak);
          if (String(cyc.cycle?.startIso || '') < String(cur.startIso)) cur.startIso = String(cyc.cycle?.startIso || '');
          if (String(cyc.cycle?.endIso || '') > String(cur.endIso)) cur.endIso = String(cyc.cycle?.endIso || '');
        }
      }
    }

    const months = Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
    const monthCount = months.length;
    const startIso = monthCount ? months[0].startIso : null;
    const endExclusiveIso = monthCount ? months[months.length - 1].endIso : null;
    const notes: string[] = [];
    if (!monthCount) notes.push('No reconcilable overlap months available for electric behavior insights.');

    evidence.push({ kind: 'intervalCalc', pointer: { source: 'behaviorV3.electric', key: 'monthCount', value: monthCount } });
    if (startIso && endExclusiveIso) evidence.push({ kind: 'intervalCalc', pointer: { source: 'behaviorV3.electric', key: 'window', value: `${startIso}..${endExclusiveIso}` } });

    const kwhSeries = months.map((m) => ({ month: m.month, v: Number(m.kwh) }));
    const kwSeries = months.map((m) => ({ month: m.month, v: Number(m.kwMax) }));

    const last12 = windowSums(kwhSeries, 12);
    const last24 = windowSums(kwhSeries, 24);
    const last36 = windowSums(kwhSeries, 36);
    const prior12 = monthCount >= 24 ? sum(kwhSeries.slice(-24, -12).map((m) => m.v)) : null;
    const yoyDeltaPct = pctChange(last12, prior12);
    const slopePerMonth = linearSlope(kwhSeries.map((m) => m.v).filter((n) => Number.isFinite(n)));

    const last12AvgMonthlyMax = monthCount >= 12 ? mean(kwSeries.slice(-12).map((m) => m.v)) : null;
    const prior12AvgMonthlyMax = monthCount >= 24 ? mean(kwSeries.slice(-24, -12).map((m) => m.v)) : null;
    const demandYoyDeltaPct = pctChange(last12AvgMonthlyMax, prior12AvgMonthlyMax);
    const demandSlopePerMonth = linearSlope(kwSeries.map((m) => m.v).filter((n) => Number.isFinite(n)));

    const stepChangesRaw = rollingMedianStepChanges(kwhSeries.filter((m) => Number.isFinite(m.v)));
    const stepChanges = stepChangesRaw.map((s) => ({ whenMonth: s.whenMonth, deltaKwh: s.delta, deltaPct: s.deltaPct, confidence: s.confidence }));

    const kwhPeak = peakMonth(kwhSeries) ? { month: peakMonth(kwhSeries)!.month, kWh: peakMonth(kwhSeries)!.v } : null;
    const kwPeak = peakMonth(kwSeries) ? { month: peakMonth(kwSeries)!.month, kWMax: peakMonth(kwSeries)!.v } : null;

    const seas = seasonalitySkewPct({ months: kwhSeries, winter: [12, 1, 2], summer: [6, 7, 8] });

    const peaksAll = months.flatMap((m) => m.peaks || []);
    const topPeaks = peaksAll
      .filter((p) => p.ts && Number.isFinite(p.kw))
      .sort((a, b) => b.kw - a.kw || String(a.ts).localeCompare(String(b.ts)))
      .slice(0, 8)
      .map((p) => ({ timestampIso: p.ts, kW: p.kw, meterKey: p.meterKey }));

    if (monthCount < 12) {
      missingInfo.push({
        id: 'behaviorV3.electric.insufficientMonths',
        category: 'tariff',
        severity: 'info',
        description: 'Insufficient reconcilable overlap months for electric behavior insights (need >= 12).',
      });
    }

    const cards: InsightCardV3[] = [];
    if (yoyDeltaPct !== null) {
      const lvl = confidenceLevel(monthCount, yoyDeltaPct);
      cards.push({
        id: 'behaviorV3.card.electric.usageYoY',
        commodity: 'electric',
        finding: `Electric usage changed ${(yoyDeltaPct * 100).toFixed(0)}% (last12 vs prior12).`,
        askCustomer:
          lvl === 'low'
            ? 'Can you confirm any schedule/equipment changes over the last 12–24 months?'
            : 'What changed year-over-year that may have increased or decreased electric usage?',
        confidence: { level: lvl, because: [`last12Kwh=${last12}`, `prior12Kwh=${prior12}`, `months=${monthCount}`] },
        evidence: [{ kind: 'intervalCalc', pointer: { source: 'behaviorV3.electric', key: 'usage.yoyDeltaPct', value: yoyDeltaPct } }],
      });
    }
    if (demandYoyDeltaPct !== null) {
      const lvl = confidenceLevel(monthCount, demandYoyDeltaPct);
      cards.push({
        id: 'behaviorV3.card.electric.demandYoY',
        commodity: 'electric',
        finding: `Electric peak demand changed ${(demandYoyDeltaPct * 100).toFixed(0)}% (avg monthly max kW, last12 vs prior12).`,
        askCustomer:
          lvl === 'low'
            ? 'Can you confirm any changes to peak drivers (HVAC/production) over the last 12–24 months?'
            : 'Did equipment, runtimes, or peak-control strategy change year-over-year?',
        confidence: { level: lvl, because: [`last12AvgMonthlyMax=${last12AvgMonthlyMax}`, `prior12AvgMonthlyMax=${prior12AvgMonthlyMax}`, `months=${monthCount}`] },
        evidence: [{ kind: 'intervalCalc', pointer: { source: 'behaviorV3.electric', key: 'demand.yoyDeltaPct', value: demandYoyDeltaPct } }],
      });
    }
    if (stepChanges.length) {
      const s0 = stepChanges[0];
      cards.push({
        id: 'behaviorV3.card.electric.stepChange',
        commodity: 'electric',
        finding: `Electric usage step change detected around ${s0.whenMonth} (Δ${s0.deltaPct >= 0 ? '+' : ''}${(s0.deltaPct * 100).toFixed(0)}%).`,
        askCustomer: 'What changed around that month (equipment, occupancy, operating hours, or process changes)?',
        confidence: { level: s0.confidence >= 0.75 ? 'high' : s0.confidence >= 0.55 ? 'medium' : 'low', because: [`when=${s0.whenMonth}`, `deltaKwh=${s0.deltaKwh.toFixed(0)}`] },
        evidence: [{ kind: 'intervalCalc', pointer: { source: 'behaviorV3.electric', key: 'stepChange.whenMonth', value: s0.whenMonth } }],
      });
    }
    if (seas.skewPct !== null) {
      const lvl: any = monthCount >= 24 ? 'medium' : 'low';
      cards.push({
        id: 'behaviorV3.card.electric.seasonality',
        commodity: 'electric',
        finding: `Electric usage is ${seas.skewPct >= 0 ? 'winter-skewed' : 'summer-skewed'} (skew ${seas.skewPct >= 0 ? '+' : ''}${seas.skewPct.toFixed(0)}%).`,
        askCustomer: 'Is your electric load primarily driven by heating, cooling, or other seasonal operations?',
        confidence: { level: lvl, because: [`winterAvgKwh=${seas.winterAvg}`, `summerAvgKwh=${seas.summerAvg}`] },
        evidence: [{ kind: 'intervalCalc', pointer: { source: 'behaviorV3.electric', key: 'seasonality.skewPct', value: seas.skewPct } }],
      });
    }

    // Keep top 5 cards deterministically by stable id order.
    const conversationCards = cards.slice(0, 5);
    const confidence = clamp01(monthCount >= 36 ? 0.85 : monthCount >= 24 ? 0.75 : monthCount >= 12 ? 0.6 : 0.25);
    if (conversationCards.length) because.push('Conversation cards derived from overlap-reconcilable monthly determinants.');

    out.electric = {
      commodity: 'electric',
      dataWindow: { startIso, endExclusiveIso, monthCount, notes },
      usage: {
        unit: 'kWh',
        last12,
        last24,
        last36,
        prior12,
        yoyDeltaPct,
        slopePerMonth,
        peakMonth: kwhPeak,
      },
      demand: {
        unit: 'kW',
        last12AvgMonthlyMax,
        prior12AvgMonthlyMax,
        yoyDeltaPct: demandYoyDeltaPct,
        slopePerMonth: demandSlopePerMonth,
        peakMonth: kwPeak,
      },
      stepChanges,
      seasonality: { winterAvgKwh: seas.winterAvg, summerAvgKwh: seas.summerAvg, skewPct: seas.skewPct },
      peakTiming: { topPeaks },
      conversationCards,
      because,
      evidence,
      missingInfo,
      confidence,
    } satisfies ElectricBehaviorInsightsV3;
  }

  // -------------------------
  // Gas (from billing summary therms, if available)
  // -------------------------
  const billingMonthly = Array.isArray(args.inputsBillingMonthly) ? args.inputsBillingMonthly : [];
  const gasRows = billingMonthly
    .map((m) => ({
      month: monthKeyFromIso(String(m.end || '')) || monthKeyFromIso(String(m.start || '')),
      therms: Number(m.therms),
      start: String(m.start || ''),
      end: String(m.end || ''),
    }))
    .filter((r) => r.month && Number.isFinite(r.therms))
    .map((r) => ({ month: r.month as string, therms: Number(r.therms), start: r.start, end: r.end }))
    .sort((a, b) => a.month.localeCompare(b.month));

  if (gasRows.length) {
    const evidence: EvidenceItemV1[] = [];
    const because: string[] = [];
    const missingInfo: MissingInfoItemV0[] = [];
    const notes: string[] = [];

    const monthCount = gasRows.length;
    const startIso = gasRows[0]?.start ? String(gasRows[0].start) : null;
    const endExclusiveIso = gasRows[gasRows.length - 1]?.end ? String(gasRows[gasRows.length - 1].end) : null;

    evidence.push({ kind: 'intervalCalc', pointer: { source: 'behaviorV3.gas', key: 'monthCount', value: monthCount } });

    const series = gasRows.map((r) => ({ month: r.month, v: Number(r.therms) }));
    const last12 = windowSums(series, 12);
    const last24 = windowSums(series, 24);
    const last36 = windowSums(series, 36);
    const prior12 = monthCount >= 24 ? sum(series.slice(-24, -12).map((m) => m.v)) : null;
    const yoyDeltaPct = pctChange(last12, prior12);
    const slopePerMonth = linearSlope(series.map((m) => m.v).filter((n) => Number.isFinite(n)));
    const seas = seasonalitySkewPct({ months: series, winter: [12, 1, 2], summer: [6, 7, 8] });
    const peak = peakMonth(series) ? { month: peakMonth(series)!.month, therms: peakMonth(series)!.v } : null;

    if (monthCount < 12) {
      missingInfo.push({
        id: 'behaviorV3.gas.insufficientMonths',
        category: 'tariff',
        severity: 'info',
        description: 'Insufficient billing summary months for gas behavior insights (need >= 12).',
      });
    }

    const stepChangesRaw = rollingMedianStepChanges(series.filter((m) => Number.isFinite(m.v)));
    const stepChanges = stepChangesRaw.map((s) => ({ whenMonth: s.whenMonth, deltaTherms: s.delta, deltaPct: s.deltaPct, confidence: s.confidence }));

    const cards: InsightCardV3[] = [];
    if (yoyDeltaPct !== null) {
      const lvl = confidenceLevel(monthCount, yoyDeltaPct);
      cards.push({
        id: 'behaviorV3.card.gas.usageYoY',
        commodity: 'gas',
        finding: `Gas usage changed ${(yoyDeltaPct * 100).toFixed(0)}% (last12 vs prior12).`,
        askCustomer:
          lvl === 'low'
            ? 'Can you confirm any schedule/equipment changes over the last 12–24 months (boilers, ovens, DHW)?'
            : 'What changed year-over-year that may have increased or decreased gas usage?',
        confidence: { level: lvl, because: [`last12Therms=${last12}`, `prior12Therms=${prior12}`, `months=${monthCount}`] },
        evidence: [{ kind: 'intervalCalc', pointer: { source: 'behaviorV3.gas', key: 'usage.yoyDeltaPct', value: yoyDeltaPct } }],
      });
    }
    if (seas.skewPct !== null) {
      const lvl: any = monthCount >= 24 ? 'medium' : 'low';
      cards.push({
        id: 'behaviorV3.card.gas.seasonality',
        commodity: 'gas',
        finding: `Gas usage is ${seas.skewPct >= 0 ? 'winter-skewed' : 'summer-skewed'} (skew ${seas.skewPct >= 0 ? '+' : ''}${seas.skewPct.toFixed(0)}%).`,
        askCustomer: 'Is your gas load primarily driven by space heating, process heat, or domestic hot water?',
        confidence: { level: lvl, because: [`winterAvgTherms=${seas.winterAvg}`, `summerAvgTherms=${seas.summerAvg}`] },
        evidence: [{ kind: 'intervalCalc', pointer: { source: 'behaviorV3.gas', key: 'seasonality.skewPct', value: seas.skewPct } }],
      });
    }
    if (stepChanges.length) {
      const s0 = stepChanges[0];
      cards.push({
        id: 'behaviorV3.card.gas.stepChange',
        commodity: 'gas',
        finding: `Gas usage step change detected around ${s0.whenMonth} (Δ${s0.deltaPct >= 0 ? '+' : ''}${(s0.deltaPct * 100).toFixed(0)}%).`,
        askCustomer: 'What changed around that month (boiler schedule, setpoints, equipment, or occupancy)?',
        confidence: { level: s0.confidence >= 0.75 ? 'high' : s0.confidence >= 0.55 ? 'medium' : 'low', because: [`when=${s0.whenMonth}`, `deltaTherms=${s0.deltaTherms.toFixed(1)}`] },
        evidence: [{ kind: 'intervalCalc', pointer: { source: 'behaviorV3.gas', key: 'stepChange.whenMonth', value: s0.whenMonth } }],
      });
    }

    const conversationCards = cards.slice(0, 5);
    const confidence = clamp01(monthCount >= 36 ? 0.85 : monthCount >= 24 ? 0.75 : monthCount >= 12 ? 0.6 : 0.25);
    if (conversationCards.length) because.push('Conversation cards derived from monthly billing summary (therms).');

    out.gas = {
      commodity: 'gas',
      dataWindow: { startIso, endExclusiveIso, monthCount, notes },
      usage: {
        unit: 'therms',
        last12,
        last24,
        last36,
        prior12,
        yoyDeltaPct,
        slopePerMonth,
        peakMonth: peak,
      },
      stepChanges,
      seasonality: { winterAvgTherms: seas.winterAvg, summerAvgTherms: seas.summerAvg, skewPct: seas.skewPct },
      conversationCards,
      because,
      evidence,
      missingInfo,
      confidence,
    } satisfies GasBehaviorInsightsV3;
  }

  return out;
}

