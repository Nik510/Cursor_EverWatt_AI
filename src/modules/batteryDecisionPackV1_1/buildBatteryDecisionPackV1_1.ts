import type { IntervalPointV1, TariffPriceSignalsV1, DeterminantsSignalsV1, DrReadinessV1 } from '../batteryEngineV1/types';
import { dispatchV1_1, DispatchV1_1WarningCodes } from '../batteryEngineV1/dispatchV1_1';

import type { BatteryEconomicsDeterminantsSignalsV1, BatteryEconomicsTariffSignalsV1, ConfidenceTierV1 } from '../batteryEconomicsV1/types';
import { evaluateBatteryEconomicsV1 } from '../batteryEconomicsV1/evaluateBatteryEconomicsV1';
import { safeNum, roundTo } from '../batteryEconomicsV1/helpers';

import type { IntervalIntelligenceV1 } from '../utilityIntelligence/intervalIntelligenceV1/types';

import { constraintsV1_1, sizingHeuristicsV1_1 } from './constants';
import { buildBoundedAuditV1_1 } from './audit';
import { generateCandidatesV1_1 } from './candidateGenerator';
import { applyConstraintsV1_1 } from './constraints';
import { BatteryDecisionPackReasonCodesV1_1, uniqSorted } from './reasons';
import { scoreCandidateV1_1 } from './scorer';
import type { BatteryDecisionPackV1_1, BatteryDecisionTopCandidateV1_1 } from './types';

function toProviderType(raw: unknown): 'NONE' | 'CCA' | 'DA' {
  const s = String(raw ?? '').trim().toUpperCase();
  if (s === 'CCA') return 'CCA';
  if (s === 'DA') return 'DA';
  return 'NONE';
}

function numOrNull(x: unknown): number | null {
  if (x === null || x === undefined) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function toEconomicsTariffSignals(args: { tariff: TariffPriceSignalsV1 | null; tariffSnapshotId?: string | null; rateCode?: string | null }): BatteryEconomicsTariffSignalsV1 | null {
  const t = args.tariff;
  if (!t) return null;
  const tou = Array.isArray((t as any)?.touEnergyPrices) ? ((t as any).touEnergyPrices as any[]) : [];
  const genAllIn = Array.isArray((t as any)?.generationAllInTouEnergyPrices) ? ((t as any).generationAllInTouEnergyPrices as any[]) : [];
  const genTou = Array.isArray((t as any)?.generationTouEnergyPrices) ? ((t as any).generationTouEnergyPrices as any[]) : [];
  return {
    snapshotId: String(args.tariffSnapshotId || '').trim() || null,
    rateCode: String(args.rateCode || '').trim() || null,
    timezone: String((t as any)?.timezone || '').trim() || null,
    supplyProviderType: (t as any)?.supplyProviderType === 'CCA' || (t as any)?.supplyProviderType === 'DA' ? ((t as any).supplyProviderType as any) : null,
    supplyLseName: String((t as any)?.supplyLseName || '').trim() || null,
    demandChargePerKwMonthUsd: numOrNull((t as any)?.demandChargePerKw),
    touEnergyPrices: tou.length ? (tou as any) : null,
    generationAllInTouEnergyPrices: genAllIn.length ? (genAllIn as any) : null,
    generationTouEnergyPrices: genTou.length ? (genTou as any) : null,
    generationAddersPerKwhTotal: numOrNull((t as any)?.generationAddersPerKwhTotal),
    generationAddersSnapshotId: String((t as any)?.generationAddersSnapshotId || '').trim() || null,
    generationSnapshotId: String((t as any)?.generationSnapshotId || '').trim() || null,
    generationRateCode: String((t as any)?.generationRateCode || '').trim() || null,
  };
}

function toEconomicsDeterminants(det: (DeterminantsSignalsV1 & { ratchetHistoryMaxKw?: number | null; ratchetFloorPct?: number | null }) | null): BatteryEconomicsDeterminantsSignalsV1 | null {
  if (!det) return null;
  return {
    billingDemandKw: safeNum((det as any)?.billingDemandKw),
    ratchetDemandKw: safeNum((det as any)?.ratchetDemandKw),
    billingDemandMethod: String((det as any)?.billingDemandMethod || '').trim() || null,
    ratchetHistoryMaxKw: safeNum((det as any)?.ratchetHistoryMaxKw),
    ratchetFloorPct: safeNum((det as any)?.ratchetFloorPct),
  };
}

function sumMap(m: Record<string, number>): number {
  const keys = Object.keys(m || {}).sort((a, b) => a.localeCompare(b));
  let s = 0;
  for (const k of keys) {
    const v = Number(m[k]);
    if (!Number.isFinite(v)) continue;
    s += v;
  }
  return s;
}

function pickRepresentativeCycle(args: { determinantsCycles?: Array<{ startIso: string; endIso: string; cycleLabel?: string }> | null; intervalPointsV1?: IntervalPointV1[] | null; timezone: string }): {
  cycleLabel: string;
  cycleStartIso: string;
  cycleEndIso: string;
} | null {
  const detCycles = Array.isArray(args.determinantsCycles) ? args.determinantsCycles : [];
  const usable = detCycles
    .map((c) => ({
      cycleLabel: String((c as any)?.cycleLabel || '').trim() || 'cycle',
      cycleStartIso: String((c as any)?.startIso || (c as any)?.cycleStartIso || '').trim(),
      cycleEndIso: String((c as any)?.endIso || (c as any)?.cycleEndIso || '').trim(),
    }))
    .filter((c) => c.cycleStartIso && c.cycleEndIso);
  if (usable.length) {
    const sorted = usable.slice().sort((a, b) => String(b.cycleEndIso).localeCompare(String(a.cycleEndIso)) || String(b.cycleStartIso).localeCompare(String(a.cycleStartIso)));
    return { cycleLabel: `REP_${sorted[0].cycleLabel}`, cycleStartIso: sorted[0].cycleStartIso, cycleEndIso: sorted[0].cycleEndIso };
  }

  const pts = Array.isArray(args.intervalPointsV1) ? args.intervalPointsV1 : [];
  const ms = pts
    .map((p) => Date.parse(String((p as any)?.timestampIso || '').trim()))
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);
  if (!ms.length) return null;
  const startMs = ms[0];
  const endMs = startMs + 30 * 86_400_000;
  return { cycleLabel: 'REP_INTERVALS_30D', cycleStartIso: new Date(startMs).toISOString(), cycleEndIso: new Date(endMs).toISOString() };
}

function cycleDays(args: { startIso: string; endIso: string }): number {
  const s = Date.parse(String(args.startIso || '').trim());
  const e = Date.parse(String(args.endIso || '').trim());
  const d = Number.isFinite(s) && Number.isFinite(e) && e > s ? (e - s) / 86_400_000 : NaN;
  if (!Number.isFinite(d) || !(d > 0)) return 30;
  // cap to avoid extreme annualization for tiny windows
  return Math.max(7, Math.min(62, d));
}

function inferRateSourceKind(args: { auditLineItems: any[]; dispatchWarnings: string[] }): 'DELIVERY' | 'CCA_GENERATION_V0_ENERGY_ONLY' | 'CCA_GENERATION_V0_ALL_IN' | 'DA_FALLBACK_DELIVERY' {
  const byId = new Map<string, any>();
  for (const li of Array.isArray(args.auditLineItems) ? args.auditLineItems : []) {
    const id = String(li?.id || '').trim();
    if (!id || byId.has(id)) continue;
    byId.set(id, li);
  }
  const kind = String(byId.get('savings.energyAnnual')?.rateSource?.kind || '').trim();
  const base =
    kind === 'CCA_GENERATION_V0_ALL_IN'
      ? ('CCA_GENERATION_V0_ALL_IN' as const)
      : kind === 'CCA_GENERATION_V0_ENERGY_ONLY'
        ? ('CCA_GENERATION_V0_ENERGY_ONLY' as const)
        : ('DELIVERY' as const);

  const usedDaFallback = (args.dispatchWarnings || []).includes(DispatchV1_1WarningCodes.DISPATCH_SUPPLY_DA_GENERATION_RATES_MISSING_FALLBACK);
  return usedDaFallback && base === 'DELIVERY' ? 'DA_FALLBACK_DELIVERY' : base;
}

function confidenceTierV1_1(args: { hasIntervals: boolean; hasTariff: boolean; sitePeakKw: number | null }): ConfidenceTierV1 {
  if (!args.hasIntervals) return 'NONE';
  if (!args.hasTariff) return 'NONE';
  if (safeNum(args.sitePeakKw) === null) return 'LOW';
  return 'MEDIUM';
}

export function buildBatteryDecisionPackV1_1(args: {
  utility: string | null;
  rate: string | null;
  intervalPointsV1: IntervalPointV1[] | null;
  intervalInsightsV1: IntervalIntelligenceV1 | null;
  tariffPriceSignalsV1: TariffPriceSignalsV1 | null;
  tariffSnapshotId?: string | null;
  determinantsV1: (DeterminantsSignalsV1 & { ratchetHistoryMaxKw?: number | null; ratchetFloorPct?: number | null }) | null;
  determinantsCycles?: Array<{ startIso: string; endIso: string; cycleLabel?: string }> | null;
  drReadinessV1?: DrReadinessV1 | null;
  drAnnualValueUsd?: number | null;
}): BatteryDecisionPackV1_1 {
  const warnings: string[] = [];
  const missingInfo: string[] = [];

  const intervalPoints = Array.isArray(args.intervalPointsV1) ? args.intervalPointsV1 : [];
  const hasIntervals = intervalPoints.length > 0;
  if (!hasIntervals) missingInfo.push(BatteryDecisionPackReasonCodesV1_1.PACK_MISSING_INTERVALS);

  const tariff = args.tariffPriceSignalsV1 || null;
  const hasTariff = Boolean(tariff);
  if (!hasTariff) missingInfo.push(BatteryDecisionPackReasonCodesV1_1.PACK_MISSING_TARIFF_PRICE_SIGNALS);

  const demandCharge = numOrNull((tariff as any)?.demandChargePerKw);
  if (hasTariff && demandCharge === null) missingInfo.push(BatteryDecisionPackReasonCodesV1_1.PACK_MISSING_DEMAND_CHARGE);

  if (!args.determinantsV1) missingInfo.push(BatteryDecisionPackReasonCodesV1_1.PACK_MISSING_DETERMINANTS);

  const ii = args.intervalInsightsV1 || null;
  const sitePeakKw = safeNum((ii as any)?.peakKw);
  const avgKw = safeNum((ii as any)?.avgKw);

  const providerType = toProviderType((tariff as any)?.supplyProviderType);
  const hasAllInGenPrices = Array.isArray((tariff as any)?.generationAllInTouEnergyPrices) && (tariff as any).generationAllInTouEnergyPrices.length > 0;

  const confidenceTier = confidenceTierV1_1({ hasIntervals, hasTariff, sitePeakKw });

  const candGen = generateCandidatesV1_1({ intervalInsightsV1: ii });
  warnings.push(...candGen.warnings);
  missingInfo.push(...candGen.missingInfo);

  const tz = String((tariff as any)?.timezone || (ii as any)?.timezoneUsed || '').trim() || 'UTC';
  const rep = pickRepresentativeCycle({ determinantsCycles: args.determinantsCycles || null, intervalPointsV1: intervalPoints, timezone: tz });
  if (!rep) warnings.push(DispatchV1_1WarningCodes.DISPATCH_INSUFFICIENT_DATA);

  const econTariff = toEconomicsTariffSignals({ tariff, tariffSnapshotId: args.tariffSnapshotId ?? null, rateCode: args.rate });
  const econDet = toEconomicsDeterminants(args.determinantsV1);

  const scored: Array<{
    candidate: BatteryDecisionTopCandidateV1_1;
    accepted: boolean;
    rejectReasons: string[];
    dispatchWarnings: string[];
    economicsWarnings: string[];
    econAuditLineItems: any[];
  }> = [];

  for (const c of candGen.candidates) {
    const dispatchWarnings: string[] = [];
    const cycle = rep;
    const dispatchRes = cycle
      ? dispatchV1_1({
          cycles: [{ cycleLabel: cycle.cycleLabel, cycleStartIso: cycle.cycleStartIso, cycleEndIso: cycle.cycleEndIso, timezone: tz }],
          intervalPointsV1: intervalPoints.length ? intervalPoints : null,
          dailyProfileBuckets: Array.isArray((ii as any)?.dailyProfileBuckets) ? ((ii as any).dailyProfileBuckets as any) : null,
          touEnergyPrices: Array.isArray((tariff as any)?.touEnergyPrices) ? ((tariff as any).touEnergyPrices as any) : null,
          generationTouEnergyPrices: Array.isArray((tariff as any)?.generationTouEnergyPrices) ? ((tariff as any).generationTouEnergyPrices as any) : null,
          generationAllInTouEnergyPrices: Array.isArray((tariff as any)?.generationAllInTouEnergyPrices) ? ((tariff as any).generationAllInTouEnergyPrices as any) : null,
          supplyProviderType: (tariff as any)?.supplyProviderType === 'CCA' || (tariff as any)?.supplyProviderType === 'DA' ? ((tariff as any).supplyProviderType as any) : null,
          battery: { powerKw: c.kw, energyKwh: c.kwh, rte: 0.9, minSoc: 0.1, maxSoc: 0.9 },
        })
      : { cycles: [], warnings: [DispatchV1_1WarningCodes.DISPATCH_INSUFFICIENT_DATA] };
    dispatchWarnings.push(...(dispatchRes.warnings || []));

    const cyc0: any = dispatchRes.cycles && dispatchRes.cycles.length ? dispatchRes.cycles[0] : null;
    const dischargedKwh = cyc0 ? sumMap(cyc0.kwhDischargedByTou || {}) : 0;
    const chargedKwh = cyc0 ? sumMap(cyc0.kwhChargedByTou || {}) : 0;
    const reducKw = (() => {
      const before = safeNum(cyc0?.demandPeakBeforeKw);
      const after = safeNum(cyc0?.demandPeakAfterKw);
      if (before === null || after === null) return null;
      return Math.max(0, before - after);
    })();
    const days = cycle ? cycleDays({ startIso: cycle.cycleStartIso, endIso: cycle.cycleEndIso }) : 30;
    const shiftedKwhAnnual = Math.max(0, dischargedKwh) * (365 / days);

    const econ = evaluateBatteryEconomicsV1({
      battery: { powerKw: c.kw, energyKwh: c.kwh, roundTripEff: 0.9, usableFraction: null, degradationPctYr: null },
      costs: null,
      tariffs: econTariff,
      determinants: econDet,
      dispatch: {
        shiftedKwhAnnual: roundTo(shiftedKwhAnnual, 6),
        peakReductionKwAssumed: reducKw === null ? null : roundTo(reducKw, 6),
        dispatchDaysPerYear: null,
      },
      dr: safeNum(args.drAnnualValueUsd) !== null ? { annualValueUsd: safeNum(args.drAnnualValueUsd) } : null,
      finance: null,
    });

    const auditLineItems = Array.isArray(econ.audit?.lineItems) ? econ.audit.lineItems : [];
    const rateSourceKind = inferRateSourceKind({ auditLineItems, dispatchWarnings });

    const econSummary = {
      annualSavingsTotalUsd: safeNum(econ.savingsAnnual?.totalUsd),
      savingsByCategoryUsd: {
        energyArbitrageUsd: safeNum(econ.savingsAnnual?.energyUsd),
        demandUsd: safeNum(econ.savingsAnnual?.demandUsd),
        drUsd: safeNum(econ.savingsAnnual?.drUsd),
        ratchetUsd: safeNum(econ.savingsAnnual?.ratchetAvoidedUsd),
        otherUsd: safeNum(econ.savingsAnnual?.otherUsd),
      },
      capexTotalUsd: safeNum(econ.capex?.totalUsd),
      opexAnnualTotalUsd: safeNum(econ.opexAnnual?.totalUsd),
      netAnnualUsd: (() => {
        const s = safeNum(econ.savingsAnnual?.totalUsd);
        const o = safeNum(econ.opexAnnual?.totalUsd);
        if (s === null || o === null) return null;
        return roundTo(s - o, 2);
      })(),
      paybackYears: safeNum(econ.cashflow?.simplePaybackYears),
      npvLiteUsd: safeNum(econ.cashflow?.npvUsd),
      rateSourceKind,
    } as const;

    const whyThisWorks: string[] = [];
    const whyNotBetter: string[] = [];

    const spreadNote = (() => {
      const e = econSummary.savingsByCategoryUsd.energyArbitrageUsd;
      if (e === null) return 'Energy arbitrage unavailable (missing dispatch and/or TOU prices).';
      if (e <= 0) return 'Energy arbitrage is minimal (insufficient price spread or limited shiftable energy).';
      return 'Energy arbitrage is material with current TOU price spread.';
    })();
    whyThisWorks.push(spreadNote);

    const demandNote = (() => {
      const d = econSummary.savingsByCategoryUsd.demandUsd;
      if (d === null) return 'Demand charge savings unavailable (missing demand charge and/or billed demand determinants).';
      if (d <= 0) return 'Demand charge savings is minimal (demand charges absent or peak reduction limited).';
      return 'Demand charge savings is material when billed demand is reducible.';
    })();
    whyThisWorks.push(demandNote);

    if (dispatchWarnings.includes(DispatchV1_1WarningCodes.DISPATCH_SUPPLY_CCA_GENERATION_RATES_MISSING_FALLBACK)) {
      whyNotBetter.push('CCA detected but generation rates missing → used IOU delivery TOU prices (fallback).');
    }
    if (dispatchWarnings.includes(DispatchV1_1WarningCodes.DISPATCH_SUPPLY_DA_GENERATION_RATES_MISSING_FALLBACK)) {
      whyNotBetter.push('DA detected but generation rates missing → used IOU delivery TOU prices (fallback).');
    }

    const constraintsRes = applyConstraintsV1_1({ candidate: c, economics: econ, sitePeakKw: sitePeakKw ?? (avgKw !== null ? avgKw * 1.5 : null) });
    const accepted = constraintsRes.accepted;
    if (!accepted) whyNotBetter.push(...constraintsRes.reasons.map((r) => `Rejected by gate: ${r}`));

    const extraWarnings = uniqSorted(dispatchWarnings);
    const scoredRes = scoreCandidateV1_1({ candidate: c, economics: econ, extraWarnings });

    scored.push({
      candidate: {
        ...c,
        score: scoredRes.score,
        economicsSummary: econSummary as any,
        whyThisWorks: uniqSorted(whyThisWorks),
        whyNotBetter: uniqSorted(whyNotBetter),
      },
      accepted,
      rejectReasons: constraintsRes.reasons,
      dispatchWarnings: extraWarnings,
      economicsWarnings: uniqSorted(Array.isArray(econ.warnings) ? econ.warnings : []),
      econAuditLineItems: auditLineItems,
    });
  }

  // Stable ranking.
  const ranked = scored
    .slice()
    .sort((a, b) => {
      const sa = Number(a.candidate.score);
      const sb = Number(b.candidate.score);
      if (sb !== sa) return sb - sa;
      const na = safeNum((a.candidate.economicsSummary as any)?.npvLiteUsd) ?? -1e18;
      const nb = safeNum((b.candidate.economicsSummary as any)?.npvLiteUsd) ?? -1e18;
      if (nb !== na) return nb - na;
      const pa = safeNum((a.candidate.economicsSummary as any)?.paybackYears) ?? 1e18;
      const pb = safeNum((b.candidate.economicsSummary as any)?.paybackYears) ?? 1e18;
      if (pa !== pb) return pa - pb;
      return a.candidate.id.localeCompare(b.candidate.id);
    });

  const topCandidates: BatteryDecisionTopCandidateV1_1[] = ranked.slice(0, 3).map((r) => r.candidate);
  const selectedAccepted = ranked.find((r) => r.accepted) || ranked[0] || null;

  const constraintsRejected = ranked
    .filter((r) => !r.accepted)
    .map((r) => ({ candidateId: r.candidate.id, reasons: r.rejectReasons }))
    .sort((a, b) => a.candidateId.localeCompare(b.candidateId));

  const selectedRationale: string[] = [];
  if (selectedAccepted) {
    const cov = (() => {
      const peak = safeNum(sitePeakKw);
      if (peak === null || !(peak > 0)) return null;
      return roundTo(selectedAccepted.candidate.kw / peak, 3);
    })();
    selectedRationale.push(`Deterministic top-ranked option under fixed weights (v1.1).`);
    if (cov !== null) selectedRationale.push(`Power covers ~${String(roundTo(cov * 100, 1))}% of observed site peak (band=${String(roundTo(sizingHeuristicsV1_1.minPeakCoveragePct * 100, 0))}..${String(roundTo(sizingHeuristicsV1_1.maxPeakCoveragePct * 100, 0))}%).`);
    selectedRationale.push(`Score=${String(selectedAccepted.candidate.score)}; payback=${String((selectedAccepted.candidate.economicsSummary as any)?.paybackYears ?? '—')}y; npvLite=$${String((selectedAccepted.candidate.economicsSummary as any)?.npvLiteUsd ?? '—')}.`);
  }

  const audit = buildBoundedAuditV1_1({
    economicsAuditLineItems: selectedAccepted ? selectedAccepted.econAuditLineItems : [],
  });

  // Bubble up warnings from the selected candidate (economics + dispatch).
  if (selectedAccepted) warnings.push(...(selectedAccepted.dispatchWarnings || []), ...(selectedAccepted.economicsWarnings || []));

  const ok = confidenceTier !== 'NONE' && Boolean(selectedAccepted) && audit.reconcile.delta !== null;

  return {
    method: 'battery_decision_pack_v1_1',
    ok,
    confidenceTier,
    warnings: uniqSorted(warnings),
    missingInfo: uniqSorted(missingInfo),
    inputsSummary: {
      utility: args.utility ? String(args.utility) : null,
      rate: args.rate ? String(args.rate) : null,
      providerType,
      hasIntervals,
      hasAllInGenPrices,
    },
    constraints: {
      gatesUsed: {
        minDurationH: constraintsV1_1.minDurationH,
        maxCyclesPerDay: constraintsV1_1.maxCyclesPerDay,
        minPeakCoveragePct: sizingHeuristicsV1_1.minPeakCoveragePct,
        maxPeakCoveragePct: sizingHeuristicsV1_1.maxPeakCoveragePct,
        maxPaybackYears: constraintsV1_1.maxPaybackYears,
        minNpvLiteUsd: constraintsV1_1.minNpvLiteUsd,
        minNetAnnualUsd: constraintsV1_1.minNetAnnualUsd,
      },
      rejected: constraintsRejected,
    },
    topCandidates,
    selected: { candidateId: selectedAccepted ? selectedAccepted.candidate.id : null, rationaleBullets: uniqSorted(selectedRationale) },
    audit,
  };
}

