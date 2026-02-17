import type { ComprehensiveBillRecord } from '../../utils/utility-data-types';
import { getZonedParts, zonedLocalToUtcDate } from '../billingEngineV1/time/zonedTime';
import type { MissingInfoItemV0 } from '../utilityIntelligence/missingInfo/types';
import { applyDemandRulesV1 } from './demandRules';
import { assignIntervalsToBillingCycles, computeCycleDemandDeterminants } from './intervalToDemand';
import { reconcileBillingRecordsV1 } from './reconcile';
import type {
  BillingCycleDeterminantsV1,
  BillingCycleV1,
  DeterminantsPackV1,
  EvidenceItemV1,
  IntervalSeriesV1,
  MeterDeterminantsV1,
} from './types';

const DETERMINANTS_VERSION_TAG = 'determinants_v1';
const TOU_LABELER_VERSION_TAG = 'tou_v1';
const RULES_VERSION_TAG = 'determinants:v1.0.0'; // backwards-compatible alias

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function uniqMissing(items: MissingInfoItemV0[]): MissingInfoItemV0[] {
  const out: MissingInfoItemV0[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const id = String(it?.id || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(it);
  }
  return out;
}

function monthLabelFromEnd(end: Date, tz: string): string {
  const p = getZonedParts(end, tz);
  if (!p) return 'unknown';
  return `${p.year}-${String(p.month).padStart(2, '0')}`;
}

function parseIsoMs(s: string): number | null {
  const ms = new Date(String(s || '').trim()).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function deriveCyclesFromBillingRecords(args: { billingRecords: ComprehensiveBillRecord[]; timezone: string }): {
  cycles: BillingCycleV1[];
  evidence: EvidenceItemV1[];
  missingInfo: MissingInfoItemV0[];
  warnings: string[];
} {
  const evidence: EvidenceItemV1[] = [];
  const missingInfo: MissingInfoItemV0[] = [];
  const warnings: string[] = [];

  const rows = (args.billingRecords || []).filter((r) => r && r.billEndDate instanceof Date);
  const cycles: BillingCycleV1[] = [];
  for (const r of rows) {
    const end = r.billEndDate;
    const endIso = end.toISOString();

    const startIso = (() => {
      if (r.billStartDate instanceof Date) return r.billStartDate.toISOString();
      const days = Number((r as any).billingDays);
      if (Number.isFinite(days) && days > 0) {
        const approx = new Date(end.getTime() - days * 86_400_000);
        evidence.push({
          kind: 'assumption',
          pointer: { source: 'billingRecords', key: 'billStartDate.approxFromBillingDays', value: days },
        });
        missingInfo.push({
          id: `determinants.billingCycle.startDate.approx.${monthLabelFromEnd(end, args.timezone)}`,
          category: 'tariff',
          severity: 'info',
          description: 'Billing cycle start date was approximated from billingDays because billStartDate was missing.',
        });
        return approx.toISOString();
      }
      return '';
    })();

    if (!startIso) continue;
    const startMs = parseIsoMs(startIso);
    const endMs = parseIsoMs(endIso);
    if (startMs === null || endMs === null || startMs >= endMs) continue;

    const label = monthLabelFromEnd(end, args.timezone);
    cycles.push({ startIso, endIso, label, timezone: args.timezone });
  }

  // Dedup + sort
  const seen = new Set<string>();
  const uniqCycles = cycles
    .filter((c) => {
      const k = `${c.startIso}|${c.endIso}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => (parseIsoMs(a.startIso) || 0) - (parseIsoMs(b.startIso) || 0));

  if (!uniqCycles.length) warnings.push('No valid billing cycles could be derived from billing records.');
  return { cycles: uniqCycles, evidence, missingInfo, warnings };
}

function deriveCyclesFromCalendarMonths(args: { intervals: IntervalSeriesV1; timezone: string }): {
  cycles: BillingCycleV1[];
  missingInfo: MissingInfoItemV0[];
  warnings: string[];
} {
  const missingInfo: MissingInfoItemV0[] = [];
  const warnings: string[] = [];

  const ms = args.intervals.points
    .map((p) => new Date(String(p.timestampIso || '')).getTime())
    .filter((t) => Number.isFinite(t));
  if (!ms.length) {
    missingInfo.push({
      id: 'determinants.calendarCycles.noIntervals',
      category: 'tariff',
      severity: 'blocking',
      description: 'No interval timestamps available to derive calendar billing cycles.',
    });
    return { cycles: [], missingInfo, warnings };
  }

  const minMs = Math.min(...ms);
  const maxMs = Math.max(...ms);
  const minParts = getZonedParts(new Date(minMs), args.timezone);
  const maxParts = getZonedParts(new Date(maxMs), args.timezone);
  if (!minParts || !maxParts) {
    missingInfo.push({
      id: 'determinants.calendarCycles.timezone.invalid',
      category: 'tariff',
      severity: 'blocking',
      description: 'Unable to derive calendar cycles due to invalid timezone or timestamps.',
    });
    return { cycles: [], missingInfo, warnings };
  }

  let y = minParts.year;
  let m = minParts.month;
  const endY = maxParts.year;
  const endM = maxParts.month;

  const cycles: BillingCycleV1[] = [];
  while (y < endY || (y === endY && m <= endM)) {
    const startUtc = zonedLocalToUtcDate({ local: { year: y, month: m, day: 1, hour: 0, minute: 0, second: 0 }, timeZone: args.timezone });
    const nextMonth = m === 12 ? { year: y + 1, month: 1 } : { year: y, month: m + 1 };
    const endUtc = zonedLocalToUtcDate({ local: { year: nextMonth.year, month: nextMonth.month, day: 1, hour: 0, minute: 0, second: 0 }, timeZone: args.timezone });
    cycles.push({
      startIso: startUtc.toISOString(),
      endIso: endUtc.toISOString(),
      label: `${y}-${String(m).padStart(2, '0')}`,
      timezone: args.timezone,
    });
    y = nextMonth.year;
    m = nextMonth.month;
  }

  if (!cycles.length) warnings.push('No calendar month cycles derived (unexpected).');
  return { cycles, missingInfo, warnings };
}

function applyDemandRulesToCycles(args: {
  utility: string;
  rateCode: string;
  cycles: BillingCycleDeterminantsV1[];
  billingRecords: ComprehensiveBillRecord[] | null | undefined;
}): BillingCycleDeterminantsV1[] {
  const out: BillingCycleDeterminantsV1[] = [];
  const history: Array<{ cycleLabel: string; kWMax: number | null; billingDemandKw?: number | null }> = [];

  for (const c of args.cycles) {
    const billingRecordDemand = (() => {
      const sMs = parseIsoMs(c.cycle.startIso);
      const eMs = parseIsoMs(c.cycle.endIso);
      if (sMs === null || eMs === null) return null;
      const rows = Array.isArray(args.billingRecords) ? args.billingRecords : [];
      for (const r of rows) {
        const rs = r.billStartDate instanceof Date ? r.billStartDate.getTime() : null;
        const re = r.billEndDate instanceof Date ? r.billEndDate.getTime() : null;
        if (rs === null || re === null) continue;
        if (rs === sMs && re === eMs) return Number((r as any).maxMaxDemandKw);
      }
      return null;
    })();

    const ruleOut = applyDemandRulesV1({
      utility: args.utility,
      rateCode: args.rateCode,
      history,
      computedKwMax: c.demand.kWMax,
      billingKwMax: Number.isFinite(billingRecordDemand as any) ? Number(billingRecordDemand) : null,
    });

    const merged: BillingCycleDeterminantsV1 = {
      ...c,
      demand: {
        ...c.demand,
        billingDemandKw: ruleOut.billingDemandKw,
        ...(typeof ruleOut.ratchetDemandKw !== 'undefined' ? { ratchetDemandKw: ruleOut.ratchetDemandKw } : {}),
        ...(typeof ruleOut.ratchetFloorPct !== 'undefined' ? { ratchetFloorPct: ruleOut.ratchetFloorPct } : {}),
        ...(typeof ruleOut.ratchetHistoryMaxKw !== 'undefined' ? { ratchetHistoryMaxKw: ruleOut.ratchetHistoryMaxKw } : {}),
        ...(typeof ruleOut.billingDemandMethod !== 'undefined' ? { billingDemandMethod: ruleOut.billingDemandMethod } : {}),
      },
      because: [...c.because, ...ruleOut.because],
      evidence: [...c.evidence, ...ruleOut.evidence],
      missingInfo: uniqMissing([...c.missingInfo, ...ruleOut.missingInfo]),
      warnings: [...(c.warnings || []), ...ruleOut.warnings],
      confidence: clamp01(c.confidence * clamp01(0.75 + 0.25 * ruleOut.confidence)),
    };

    out.push(merged);
    history.push({ cycleLabel: c.cycle.label, kWMax: c.demand.kWMax, billingDemandKw: ruleOut.billingDemandKw });
  }

  return out;
}

export function buildDeterminantsPackV1(args: {
  utility: string;
  rateCode: string;
  supplyType?: 'bundled' | 'CCA' | 'DA' | 'unknown';
  timezone: string;
  billingRecords?: ComprehensiveBillRecord[] | null;
  billPdfText?: string | null;
  intervalSeries?: IntervalSeriesV1[] | null;
  /**
   * Optional explicit billing cycles by meter.
   * When provided for a meterId, these cycles are used for interval assignment instead of deriving cycles from billing records.
   */
  billingCyclesByMeter?: Record<string, BillingCycleV1[]>;
  /** Optional evidence to attach to every cycle for a given meter (e.g., join + cycle derivation provenance). */
  externalCycleEvidenceByMeter?: Record<string, EvidenceItemV1[]>;
  /**
   * Optional observed TOU demand buckets (usage-export truth) keyed by meterId and cycleLabel.
   * Used as a fallback when interval TOU labeling is unavailable, and for cross-check when both exist.
   */
  observedTouDemandByMeterAndCycle?: Record<
    string,
    Record<
      string,
      {
        values: Partial<Record<'onPeak' | 'partialPeak' | 'offPeak' | 'superOffPeak', number>>;
        fields?: Partial<Record<'onPeak' | 'partialPeak' | 'offPeak' | 'superOffPeak', string>>;
      }
    >
  >;
  /**
   * Optional observed TOU energy buckets (usage-export truth) keyed by meterId and cycleLabel.
   * Used as a fallback when interval TOU labeling is unavailable, and for cross-check when both exist.
   */
  observedTouEnergyByMeterAndCycle?: Record<
    string,
    Record<
      string,
      {
        values: Partial<Record<'onPeak' | 'partialPeak' | 'offPeak' | 'superOffPeak', number>>;
        fields?: Partial<Record<'onPeak' | 'partialPeak' | 'offPeak' | 'superOffPeak', string>>;
      }
    >
  >;
}): DeterminantsPackV1 {
  const warnings: string[] = [];
  const packMissing: MissingInfoItemV0[] = [];
  const confidenceBecause: string[] = [];

  const timezone = String(args.timezone || '').trim() || 'UTC';

  const intervalSeries = Array.isArray(args.intervalSeries) ? args.intervalSeries : [];
  const billingRecords = Array.isArray(args.billingRecords) ? args.billingRecords : [];
  const billingCyclesByMeter = args.billingCyclesByMeter || {};
  const externalCycleEvidenceByMeter = args.externalCycleEvidenceByMeter || {};
  const observedTouDemandByMeterAndCycle = args.observedTouDemandByMeterAndCycle || {};
  const observedTouEnergyByMeterAndCycle = args.observedTouEnergyByMeterAndCycle || {};

  const meters: MeterDeterminantsV1[] = [];

  // Determine meter set: prefer interval series meters; else derive from billing records by saId/meterNumber; else single 'site'.
  const meterIds = (() => {
    const ids = intervalSeries.map((s) => String(s.meterId || '').trim()).filter(Boolean);
    const brIds = billingRecords.map((r) => String((r as any).saId || (r as any).meterNumber || '').trim()).filter(Boolean);
    const cycleIds = Object.keys(billingCyclesByMeter || {}).map((k) => String(k || '').trim()).filter(Boolean);
    const all = [...ids, ...brIds, ...cycleIds].filter(Boolean);
    if (all.length) return Array.from(new Set(all));
    return ['site'];
  })();

  for (const meterId of meterIds) {
    const series = intervalSeries.find((s) => String(s.meterId || '').trim() === meterId) || null;

    const meterBilling = billingRecords.filter((r) => {
      const said = String((r as any).saId || '').trim();
      const mn = String((r as any).meterNumber || '').trim();
      return (said && said === meterId) || (mn && mn === meterId) || (meterIds.length === 1 && !said && !mn);
    });

    const explicitCycles = Array.isArray((billingCyclesByMeter as any)?.[meterId]) ? (billingCyclesByMeter as any)[meterId] : null;

    const cycleDerivation = explicitCycles && explicitCycles.length
      ? {
          cycles: explicitCycles as BillingCycleV1[],
          evidence: [
            { kind: 'assumption', pointer: { source: 'determinants', key: 'billingCyclesByMeter', value: `provided:${meterId}` } },
            ...(Array.isArray(externalCycleEvidenceByMeter[meterId]) ? externalCycleEvidenceByMeter[meterId] : []),
          ] as EvidenceItemV1[],
          missingInfo: [] as MissingInfoItemV0[],
          warnings: [] as string[],
        }
      : meterBilling.length
        ? deriveCyclesFromBillingRecords({ billingRecords: meterBilling, timezone })
        : series
          ? { cycles: deriveCyclesFromCalendarMonths({ intervals: series, timezone }).cycles, evidence: [] as EvidenceItemV1[], missingInfo: [] as MissingInfoItemV0[], warnings: [] as string[] }
          : { cycles: [] as BillingCycleV1[], evidence: [] as EvidenceItemV1[], missingInfo: [] as MissingInfoItemV0[], warnings: ['No billing records or interval series available to derive billing cycles.'] };

    warnings.push(...(cycleDerivation.warnings || []));
    packMissing.push(...(cycleDerivation.missingInfo || []));

    const cycles = cycleDerivation.cycles;
    const assigned = series ? assignIntervalsToBillingCycles({ intervals: series.points, cycles }) : { assigned: cycles.map((c) => ({ cycle: c, intervals: [] })), missingInfo: [] as MissingInfoItemV0[], warnings: [] as string[] };
    warnings.push(...assigned.warnings);
    packMissing.push(...assigned.missingInfo);

    const cycleDet: BillingCycleDeterminantsV1[] = assigned.assigned.map(({ cycle, intervals }) => {
      const det = computeCycleDemandDeterminants({
        cycle,
        intervals,
        seriesIntervalMinutes: series?.intervalMinutes ?? null,
        touContext: { utility: args.utility, rateCode: args.rateCode },
      });
      const evidence: EvidenceItemV1[] = [...(cycleDerivation.evidence || []), ...det.evidence];
      const missingInfo: MissingInfoItemV0[] = uniqMissing([...(cycleDerivation.missingInfo || []), ...det.missingInfo]);
      const because = [...det.because];
      const cycleWarnings: string[] = [...(det.warnings || [])];

      const observed = (observedTouDemandByMeterAndCycle as any)?.[meterId]?.[cycle.label] || null;
      const computedTou = det.kWMaxByTouPeriod || null;
      const observedEnergy = (observedTouEnergyByMeterAndCycle as any)?.[meterId]?.[cycle.label] || null;
      const computedEnergyTou = (det as any).kwhByTouPeriod || null;

      const touMerged = (() => {
        if (computedTou) return computedTou;
        if (observed && observed.values && Object.keys(observed.values).length) {
          because.push('Using observed TOU demand as truth; interval TOU labeling not available.');
          for (const k of ['onPeak', 'partialPeak', 'offPeak', 'superOffPeak'] as const) {
            const v = Number(observed.values?.[k]);
            if (!Number.isFinite(v)) continue;
            const field = String(observed.fields?.[k] || '').trim();
            const src = field.toLowerCase().startsWith('billpdftext:') ? 'billPdfText' : 'pgeUsageCsv';
            evidence.push({
              kind: 'billingRecordField',
              pointer: { source: src, key: field ? field : `touDemandKw.${k}`, value: v },
            });
          }
          return observed.values as any;
        }
        missingInfo.push({
          id: 'determinants.tou.max.missing',
          category: 'tariff',
          severity: 'info',
          description: 'TOU kW max buckets unavailable; provide rate schedule metadata or usage export TOU demand columns.',
        });
        return undefined;
      })();

      // Cross-check when both exist: keep computed primary but warn/missingInfo on mismatch.
      if (computedTou && observed && observed.values && Object.keys(observed.values).length) {
        const threshold = 0.12;
        for (const k of ['onPeak', 'partialPeak', 'offPeak', 'superOffPeak'] as const) {
          const cVal = Number((computedTou as any)[k]);
          const oVal = Number((observed.values as any)[k]);
          if (!Number.isFinite(cVal) || !Number.isFinite(oVal) || oVal <= 0) continue;
          const deltaPct = Math.abs((cVal - oVal) / oVal);
          if (deltaPct > threshold) {
            missingInfo.push({
              id: `determinants.tou.mismatch.${cycle.label}.${k}`,
              category: 'tariff',
              severity: 'warning',
              description: 'TOU demand mismatch; verify TOU schedule mapping and interval alignment.',
            });
            cycleWarnings.push(
              `TOU demand mismatch for ${cycle.label} ${k}: computed=${cVal.toFixed(1)}kW vs usage=${oVal.toFixed(1)}kW (deltaPct=${(deltaPct * 100).toFixed(1)}%).`,
            );
          }
        }
      }

      // TOU energy buckets (computed primary, usage-export fallback)
      const energyTouMerged = (() => {
        if (computedEnergyTou && Object.keys(computedEnergyTou).length) {
          return { values: computedEnergyTou as any, source: 'computed' as const };
        }
        if (observedEnergy && observedEnergy.values && Object.keys(observedEnergy.values).length) {
          because.push('Using observed TOU kWh as truth; interval TOU energy labeling not available.');
          for (const k of ['onPeak', 'partialPeak', 'offPeak', 'superOffPeak'] as const) {
            const v = Number(observedEnergy.values?.[k]);
            if (!Number.isFinite(v)) continue;
            const field = String(observedEnergy.fields?.[k] || '').trim();
            const src = field.toLowerCase().startsWith('billpdftext:') ? 'billPdfText' : 'pgeUsageCsv';
            evidence.push({
              kind: 'billingRecordField',
              pointer: { source: src, key: field ? field : `touEnergyKwh.${k}`, value: v },
            });
          }
          return { values: observedEnergy.values as any, source: 'usage_export' as const };
        }
        return { values: undefined as any, source: 'unknown' as const };
      })();

      // Cross-check energy buckets when both exist: computed remains primary.
      if (computedEnergyTou && observedEnergy && observedEnergy.values && Object.keys(observedEnergy.values).length) {
        const threshold = 0.12;
        let comparable = 0;
        let worst = 0;
        const details: any = { computed: {}, usage_export: {} };
        for (const k of ['onPeak', 'partialPeak', 'offPeak', 'superOffPeak'] as const) {
          const cVal = Number((computedEnergyTou as any)[k]);
          const oVal = Number((observedEnergy.values as any)[k]);
          if (!Number.isFinite(cVal) || !Number.isFinite(oVal) || oVal <= 0) continue;
          comparable++;
          const deltaPct = Math.abs((cVal - oVal) / oVal);
          worst = Math.max(worst, deltaPct);
          details.computed[k] = cVal;
          details.usage_export[k] = oVal;
        }
        if (comparable > 0 && worst > threshold) {
          missingInfo.push({
            id: `determinants.tou.energy.mismatch.${cycle.label}`,
            category: 'tariff',
            severity: 'warning',
            description: 'TOU energy mismatch; verify TOU schedule mapping and interval alignment.',
            meterKey: meterId,
            billingCycleLabel: cycle.label,
            details: { ...details, mismatchPct: worst, comparable },
          } as any);
          cycleWarnings.push(`TOU energy mismatch for ${cycle.label}: worstDeltaPct=${(worst * 100).toFixed(1)}% (threshold 12%).`);
        }
      }

      // Coverage truth for TOU energy breakdown.
      const energyCoverage = Number((det as any).kwhTouCoveragePct);
      if (Number.isFinite(energyCoverage) && energyTouMerged.source !== 'unknown' && energyCoverage < 0.9) {
        missingInfo.push({
          id: `determinants.tou.energy.coverage.low.${cycle.label}`,
          category: 'billing',
          severity: 'warning',
          description: 'Insufficient interval coverage for TOU energy breakdown.',
          meterKey: meterId,
          billingCycleLabel: cycle.label,
          details: {
            expectedIntervals: (det as any).expectedIntervalCount ?? null,
            observedIntervals: (det as any).kwhTouIntervalCount ?? null,
            coveragePct: energyCoverage,
            firstIntervalTs: (det as any).firstIntervalTs ?? null,
            lastIntervalTs: (det as any).lastIntervalTs ?? null,
          },
        } as any);
        cycleWarnings.push(`TOU energy coverage below 90% for ${cycle.label}: coveragePct≈${energyCoverage.toFixed(3)}.`);
      }

      return {
        cycle,
        energy: {
          kwhTotal: det.kwhTotal,
          ...(energyTouMerged.values ? { kwhByTouPeriod: energyTouMerged.values } : {}),
          kwhByTouPeriodSource: energyTouMerged.source,
          ...((det as any).touLabelsObserved ? { touLabelsObserved: (det as any).touLabelsObserved } : {}),
          ...((det as any).unusedTouBuckets ? { unusedTouBuckets: (det as any).unusedTouBuckets } : {}),
        },
        maxTimestampIso: det.maxTimestampIso ?? null,
        demand: {
          intervalMinutes: det.intervalMinutes,
          kWMax: det.kWMax,
          ...(touMerged ? { kWMaxByTouPeriod: touMerged } : {}),
          intervalCount: det.intervalCount,
          expectedIntervalCount: det.expectedIntervalCount,
          coveragePct: det.coveragePct,
          firstIntervalTs: det.firstIntervalTs ?? null,
          lastIntervalTs: det.lastIntervalTs ?? null,
        },
        evidence,
        because,
        missingInfo,
        warnings: cycleWarnings,
        confidence: det.confidence,
      };
    });

    const withRules = applyDemandRulesToCycles({ utility: args.utility, rateCode: args.rateCode, cycles: cycleDet, billingRecords: meterBilling });
    const intervalWindow = (() => {
      const ts = (series?.points || [])
        .map((p) => new Date(String((p as any)?.timestampIso || '')).getTime())
        .filter((n) => Number.isFinite(n));
      if (!ts.length) return undefined;
      const min = Math.min(...ts);
      const max = Math.max(...ts);
      return { intervalStartIso: new Date(min).toISOString(), intervalEndIso: new Date(max).toISOString() };
    })();
    const reconciliation = reconcileBillingRecordsV1({
      billingRecords: meterBilling,
      computedCycles: withRules,
      meterKey: meterId,
      intervalWindow,
    });

    // Apply reconciliation confidence impact at meter level (do not mutate individual cycle confidence).
    const meterCycles = withRules.map((c) => ({ ...c, confidence: clamp01(c.confidence * reconciliation.confidenceImpact) }));
    if (reconciliation.warnings.length) warnings.push(...reconciliation.warnings);
    packMissing.push(...reconciliation.missingInfo);
    for (const c of meterCycles) {
      if (Array.isArray(c.warnings) && c.warnings.length) warnings.push(...c.warnings);
      if (Array.isArray(c.missingInfo) && c.missingInfo.length) packMissing.push(...c.missingInfo);
    }

    meters.push({
      meterId,
      cycles: meterCycles,
      reconciliation,
    });
  }

  const allCycleConfs = meters.flatMap((m) => m.cycles.map((c) => c.confidence)).filter((n) => Number.isFinite(n));
  const avgConf = allCycleConfs.length ? allCycleConfs.reduce((s, x) => s + x, 0) / allCycleConfs.length : 0.25;

  confidenceBecause.push(`rulesVersionTag=${RULES_VERSION_TAG}`);
  confidenceBecause.push(`Computed average cycle confidence≈${avgConf.toFixed(2)} across meters=${meters.length}.`);
  if (!intervalSeries.length) confidenceBecause.push('No interval series provided; determinants are incomplete.');

  const pack: DeterminantsPackV1 = {
    utility: String(args.utility || '').trim(),
    rateCode: String(args.rateCode || '').trim(),
    ...(args.supplyType ? { supplyType: args.supplyType } : {}),
    meters,
    confidenceSummary: { confidence: clamp01(avgConf), because: confidenceBecause },
    missingInfo: uniqMissing(packMissing),
    warnings: Array.from(new Set(warnings.map((w) => String(w || '').trim()).filter(Boolean))),
    determinantsVersionTag: DETERMINANTS_VERSION_TAG,
    touLabelerVersionTag: TOU_LABELER_VERSION_TAG,
    rulesVersionTag: RULES_VERSION_TAG,
  };

  // Optional aggregated rollup for UI convenience: last 12 cycles per site (flattened meters).
  const rollup = meters
    .flatMap((m) =>
      m.cycles.map((c) => ({
        cycleLabel: c.cycle.label,
        kwhTotal: c.energy.kwhTotal,
        kWMax: c.demand.kWMax,
        billingDemandKw: c.demand.billingDemandKw ?? null,
        ratchetDemandKw: (c.demand as any).ratchetDemandKw ?? null,
        billingDemandMethod: String((c.demand as any).billingDemandMethod || '') || null,
        coveragePct: c.demand.coveragePct ?? null,
        endMs: parseIsoMs(c.cycle.endIso) || 0,
      })),
    )
    .sort((a, b) => b.endMs - a.endMs)
    .slice(0, 12)
    .map(({ endMs, ...rest }) => rest);

  if (rollup.length) {
    pack.aggregated = { site: { last12Cycles: rollup } };
  }

  return pack;
}

