import { computeProvenMetricsV1 } from '../../interval/provenMetrics';
import { estimateAnnualKwh } from '../../interval/annualize';
import { extractBillPdfTouUsageV1 } from '../../billPdf/extractBillPdfTouUsageV1';

import { getDefaultCatalogForTerritory, matchPrograms } from '../../../programIntelligence/matchPrograms';
import { programMatchesToRecommendations } from '../../../programIntelligence/toRecommendations';

import { exceptionName, normText } from '../internals';
import type { AnalyzeUtilityV1Delta, AnalyzeUtilityV1State, NormalizedInputsV1, StepContextV1 } from '../types';

export function stepProgramIntelligence(args: {
  state: AnalyzeUtilityV1State;
  normalizedInputs: NormalizedInputsV1;
  ctx: StepContextV1;
}): AnalyzeUtilityV1Delta {
  const { inputs, nowIso, idFactory, warn, beginStep, endStep } = args.ctx as any;
  const loadShape = (args.state as any).loadShape;
  const schedule = (args.state as any).schedule;
  const loadShift = (args.state as any).loadShift;
  const intervalKwSeries = (args.state as any).intervalKwSeries || [];

  beginStep('programIntelligenceV1');
  const proven = computeProvenMetricsV1({ inputs, intervalKw: intervalKwSeries.length ? intervalKwSeries : null });
  const tz =
    String(proven.provenTouExposureSummary?.timezone || '').trim() ||
    (normText(inputs.utilityTerritory).includes('pge') ? 'America/Los_Angeles' : 'UTC');
  const billTou = (() => {
    try {
      return extractBillPdfTouUsageV1({ billPdfText: inputs.billPdfText || null, timezone: tz });
    } catch (e) {
      warn({
        code: 'UIE_BILL_PDF_TOU_EXTRACT_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'extractBillPdfTouUsageV1',
        exceptionName: exceptionName(e),
        contextKey: 'billPdfTou',
      });
      return null;
    }
  })();
  const monthlyKwh = (() => {
    const m = inputs.billingSummary?.monthly || [];
    const vals = m.map((x: any) => Number(x.kWh)).filter((n: number) => Number.isFinite(n) && n >= 0);
    if (!vals.length) return undefined;
    // v1: mean monthly kWh over provided months
    return vals.reduce((s: number, x: number) => s + x, 0) / vals.length;
  })();

  const annualEstimate = (() => {
    const m = inputs.billingSummary?.monthly || [];
    const monthVals = m.map((x: any) => Number(x.kWh)).filter((n: number) => Number.isFinite(n) && n >= 0);
    return (
      estimateAnnualKwh({
        monthlyKwhValues: monthVals,
        monthlyKwhScalar: Number.isFinite(proven.provenMonthlyKwh ?? NaN) ? proven.provenMonthlyKwh : monthlyKwh,
      }) || undefined
    );
  })();
  const annualKwh = (() => {
    const m = inputs.billingSummary?.monthly || [];
    const vals = m.map((x: any) => Number(x.kWh)).filter((n: number) => Number.isFinite(n) && n >= 0);
    if (!vals.length) return undefined;
    const sum = vals.reduce((s: number, x: number) => s + x, 0);
    // If fewer than 12 months, do not extrapolate in v1 (conservative).
    return vals.length >= 12 ? sum : undefined;
  })();

  const catalog = getDefaultCatalogForTerritory(inputs.utilityTerritory);
  const matches = matchPrograms({
    inputs,
    derived: {
      peakKw: loadShape.metrics.peakKw,
      provenPeakKw: proven.provenPeakKw,
      monthlyKwh,
      provenMonthlyKwh: proven.provenMonthlyKwh,
      provenAnnualKwhEstimate: annualEstimate,
      annualKwh,
      scheduleBucket: schedule.scheduleBucket,
      loadShiftScore: loadShift.score,
      hasIntervalData: Boolean(intervalKwSeries.length),
      hasAdvancedMetering: Boolean(intervalKwSeries.length),
      intervalKw: intervalKwSeries.length ? intervalKwSeries : undefined,
      timezone: proven.provenTouExposureSummary?.timezone || (normText(inputs.utilityTerritory).includes('pge') ? 'America/Los_Angeles' : 'UTC'),
      provenTouExposureSummary: proven.provenTouExposureSummary,
    },
    catalog,
  });

  const programRecs = programMatchesToRecommendations({
    inputs,
    matches: matches.filter((m: any) => m.matchStatus !== 'unlikely').slice(0, 6),
    catalog,
    nowIso,
    idFactory,
  });

  // Deterministic ordering for output-only (does not affect which matches are turned into recommendations above).
  const matchesSortedForOutput = matches
    .slice()
    .sort((a: any, b: any) => {
      const rank = (s: any): number => {
        const x = String(s ?? '');
        if (x === 'eligible') return 0;
        if (x === 'likely_eligible') return 1;
        if (x === 'unknown') return 2;
        return 3; // unlikely / other
      };
      const ra = rank((a as any)?.matchStatus);
      const rb = rank((b as any)?.matchStatus);
      if (ra !== rb) return ra - rb;
      const sa = Number((a as any)?.score);
      const sb = Number((b as any)?.score);
      if (Number.isFinite(sa) && Number.isFinite(sb) && sa !== sb) return sb - sa;
      return String((a as any)?.programId || '').localeCompare(String((b as any)?.programId || ''));
    });

  const programs = {
    matches: matchesSortedForOutput as any,
    topRecommendations: programRecs.slice(0, 5),
  };
  endStep('programIntelligenceV1');

  return { proven, tz, billTou, monthlyKwh, annualEstimate, annualKwh, catalog, matches, programRecs, programs };
}

