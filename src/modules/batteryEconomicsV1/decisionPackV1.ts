import type { IntervalPointV1, TariffPriceSignalsV1, DeterminantsSignalsV1, DrReadinessV1 } from '../batteryEngineV1/types';
import { simulateDispatchV1 } from '../batteryEngineV1/simulateDispatchV1';
import { batteryEngineVersionTagV1 } from '../batteryEngineV1/constants';

import type {
  BatteryEconomicsAuditLineItemV1,
  BatteryEconomicsCostsV1,
  BatteryEconomicsFinanceV1,
  BatteryEconomicsOutputsV1,
  BatteryEconomicsTariffSignalsV1,
  BatteryEconomicsDeterminantsSignalsV1,
  ConfidenceTierV1,
} from './types';
import { evaluateBatteryEconomicsV1 } from './evaluateBatteryEconomicsV1';
import { sizingSearchV1, type SizingSearchConstraintsV1 } from './sizingSearchV1';
import { batteryEconomicsVersionTagV1 } from './defaults';
import { safeNum } from './helpers';
import { BatteryEconomicsReasonCodesV1, uniqSorted } from './reasons';

export type BatteryDecisionOptionV1 = {
  optionId: string;
  battery: {
    powerKw: number;
    energyKwh: number;
    durationHours: number;
    roundTripEff: number;
    maxCyclesPerDay: number;
  };
  savingsAnnual: {
    energyArbitrageUsd: number;
    demandUsd: number;
    ratchetUsd: number;
    drUsd: number;
    totalUsd: number;
    /**
     * Reasons-first breakdown for any 0 values (no silent partial math).
     * Keys: energyArbitrageUsd | demandUsd | ratchetUsd | drUsd
     */
    reasonsByComponent: Record<string, string[]>;
  };
  economics: {
    capexTotalUsd: number | null;
    opexAnnualTotalUsd: number | null;
    netAnnualUsd: number | null;
    simplePaybackYears: number | null;
    npvLiteUsd: number | null;
  };
  confidenceTier: ConfidenceTierV1;
  warnings: string[];
  missingInfo: string[];
  audit: {
    /** Full audited line items (stable ordering by id). */
    lineItems: BatteryEconomicsAuditLineItemV1[];
    /** Convenience subset for report cards. */
    topLineItems: BatteryEconomicsAuditLineItemV1[];
  };
};

export type BatteryDecisionPackV1 = {
  schemaVersion: 'batteryDecisionPackV1';
  engineVersions: {
    batteryDecisionPackV1: 'battery_decision_pack_v1.0';
    batteryEconomicsV1: string;
    storageOpportunityPackV1: string;
    determinantsVersionTag?: string;
    touLabelerVersionTag?: string;
    tariffSnapshotId?: string | null;
  };
  confidenceTier: ConfidenceTierV1;
  constraints: {
    sizingSearchV1: {
      constraintsUsed: Required<Pick<SizingSearchConstraintsV1, 'maxKwFromPeakPct' | 'minHours' | 'maxHours'>> & {
        kwValues: number[];
        kwhValues: number[];
      };
      allCandidateCount: number;
    };
  };
  warnings: string[];
  missingInfo: string[];
  options: BatteryDecisionOptionV1[];
};

function touToEconomicsTariff(tariff: TariffPriceSignalsV1 | null, snapshotId?: string | null): BatteryEconomicsTariffSignalsV1 | null {
  if (!tariff) return null;
  const demand = safeNum((tariff as any)?.demandChargePerKw);
  const tou = Array.isArray((tariff as any)?.touEnergyPrices) ? ((tariff as any).touEnergyPrices as any[]) : [];
  const timezone = String((tariff as any)?.timezone || '').trim() || null;
  return {
    snapshotId: snapshotId ?? null,
    timezone,
    demandChargePerKwMonthUsd: demand,
    touEnergyPrices: tou.length ? (tou as any) : null,
  };
}

function detToEconomicsDeterminants(det: DeterminantsSignalsV1 | null): BatteryEconomicsDeterminantsSignalsV1 | null {
  if (!det) return null;
  // Allow additive fields (ratchet history) when caller supplies them.
  return {
    billingDemandKw: safeNum((det as any)?.billingDemandKw),
    ratchetDemandKw: safeNum((det as any)?.ratchetDemandKw),
    billingDemandMethod: String((det as any)?.billingDemandMethod || '').trim() || null,
    ratchetHistoryMaxKw: safeNum((det as any)?.ratchetHistoryMaxKw),
    ratchetFloorPct: safeNum((det as any)?.ratchetFloorPct),
  };
}

function isDrEligibleLite(dr: DrReadinessV1 | null | undefined): { eligible: boolean; reason: string } {
  if (!dr) return { eligible: false, reason: 'drReadinessV1.missing' };
  const conf = String((dr as any)?.confidenceTier || 'NONE');
  if (conf === 'NONE') return { eligible: false, reason: 'drReadinessV1.confidence_none' };
  const top = Array.isArray((dr as any)?.topEventWindows) ? ((dr as any).topEventWindows as any[]) : [];
  if (!top.length) return { eligible: false, reason: 'drReadinessV1.no_event_windows' };
  const range = Array.isArray((dr as any)?.typicalShedPotentialKwRange) ? ((dr as any).typicalShedPotentialKwRange as any[]) : [];
  const p25 = safeNum(range[0]);
  const p75 = safeNum(range[1]);
  const anyShed = (p25 !== null && p25 > 0) || (p75 !== null && p75 > 0);
  if (!anyShed) return { eligible: false, reason: 'drReadinessV1.shed_potential_zero' };
  return { eligible: true, reason: 'drReadinessV1.eligible_lite' };
}

function reasonsForZeroSavings(args: { out: BatteryEconomicsOutputsV1; drEligible: boolean; drEligibleReason: string }): Record<string, string[]> {
  const reasons: Record<string, string[]> = {
    energyArbitrageUsd: [],
    demandUsd: [],
    ratchetUsd: [],
    drUsd: [],
  };

  const w = Array.isArray(args.out.warnings) ? args.out.warnings : [];

  // Energy
  if (!(safeNum(args.out.savingsAnnual.energyUsd) !== null && Number(args.out.savingsAnnual.energyUsd) > 0)) {
    if (w.includes(BatteryEconomicsReasonCodesV1.BATTERY_ECON_SAVINGS_UNAVAILABLE_NO_TARIFFENGINE)) reasons.energyArbitrageUsd.push('tariff.tou_prices_missing');
    if (w.includes(BatteryEconomicsReasonCodesV1.BATTERY_ECON_SAVINGS_UNAVAILABLE_NO_DISPATCH)) reasons.energyArbitrageUsd.push('dispatch.shifted_kwh_missing');
  }

  // Demand
  if (!(safeNum(args.out.savingsAnnual.demandUsd) !== null && Number(args.out.savingsAnnual.demandUsd) > 0)) {
    if (w.includes(BatteryEconomicsReasonCodesV1.BATTERY_ECON_MISSING_TARIFF_INPUTS)) reasons.demandUsd.push('tariff.demand_charge_missing');
    if (w.includes(BatteryEconomicsReasonCodesV1.BATTERY_ECON_DEMAND_SAVINGS_UNAVAILABLE_MISSING_DETERMINANTS)) reasons.demandUsd.push('determinants.billing_demand_missing');
    if (w.includes(BatteryEconomicsReasonCodesV1.BATTERY_ECON_SAVINGS_UNAVAILABLE_NO_DISPATCH)) reasons.demandUsd.push('dispatch.peak_reduction_missing');
  }

  // Ratchet
  if (!(safeNum(args.out.savingsAnnual.ratchetAvoidedUsd) !== null && Number(args.out.savingsAnnual.ratchetAvoidedUsd) > 0)) {
    if (w.includes(BatteryEconomicsReasonCodesV1.BATTERY_ECON_RATCHET_UNAVAILABLE)) reasons.ratchetUsd.push('ratchet.unavailable');
  }

  // DR
  if (!(safeNum(args.out.savingsAnnual.drUsd) !== null && Number(args.out.savingsAnnual.drUsd) > 0)) {
    if (!args.drEligible) reasons.drUsd.push(args.drEligibleReason);
    if (w.includes(BatteryEconomicsReasonCodesV1.BATTERY_ECON_DR_VALUE_UNKNOWN)) reasons.drUsd.push('dr.value_missing');
  }

  // Stable ordering
  for (const k of Object.keys(reasons)) reasons[k] = uniqSorted(reasons[k]);
  return reasons;
}

function toTopLineItems(lineItems: BatteryEconomicsAuditLineItemV1[]): BatteryEconomicsAuditLineItemV1[] {
  const ids = new Set([
    'capex.total',
    'opex.totalAnnual',
    'savings.energyAnnual',
    'savings.demandAnnual',
    'savings.ratchetAvoidedAnnual',
    'savings.drAnnual',
    'savings.totalAnnual',
    'finance.npv',
    'finance.netAnnual',
  ]);
  const out = (lineItems || []).filter((li) => ids.has(String(li?.id || '')));
  return out.slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function stableOptionId(i0: number): string {
  return `OPT_${String(i0 + 1).padStart(2, '0')}`;
}

export function buildBatteryDecisionPackV1(args: {
  intervalPointsV1: IntervalPointV1[] | null;
  intervalInsightsV1: any | null;
  tariffPriceSignalsV1: TariffPriceSignalsV1 | null;
  tariffSnapshotId?: string | null;
  determinantsV1: (DeterminantsSignalsV1 & { ratchetHistoryMaxKw?: number | null; ratchetFloorPct?: number | null }) | null;
  drReadinessV1?: DrReadinessV1 | null;
  drAnnualValueUsd?: number | null;
  costs?: BatteryEconomicsCostsV1 | null;
  finance?: BatteryEconomicsFinanceV1 | null;
  sizingSearchConstraintsV1?: SizingSearchConstraintsV1 | null;
  /** Optional upstream version tags from `analyzeUtility` (additive). */
  versionTags?: { determinantsVersionTag?: string; touLabelerVersionTag?: string } | null;
}): BatteryDecisionPackV1 {
  const warnings: string[] = [];
  const missingInfo: string[] = [];

  const points = Array.isArray(args.intervalPointsV1) ? args.intervalPointsV1 : [];
  const hasIntervals = points.length > 0;
  if (!hasIntervals) missingInfo.push(BatteryEconomicsReasonCodesV1.BATTERY_DECISION_MISSING_INTERVAL);

  const intervalInsights = args.intervalInsightsV1 || null;
  const sitePeakKw = safeNum((intervalInsights as any)?.peakKw) ?? safeNum((intervalInsights as any)?.provenPeakKw) ?? null;

  const tariffEcon = touToEconomicsTariff(args.tariffPriceSignalsV1, args.tariffSnapshotId ?? null);
  const detEcon = detToEconomicsDeterminants(args.determinantsV1);

  const drElig = isDrEligibleLite(args.drReadinessV1 || null);
  if (!drElig.eligible) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_DR_INELIGIBLE);

  const engineVersions = {
    batteryDecisionPackV1: 'battery_decision_pack_v1.0' as const,
    batteryEconomicsV1: batteryEconomicsVersionTagV1,
    storageOpportunityPackV1: batteryEngineVersionTagV1,
    ...(args.versionTags?.determinantsVersionTag ? { determinantsVersionTag: String(args.versionTags.determinantsVersionTag) } : {}),
    ...(args.versionTags?.touLabelerVersionTag ? { touLabelerVersionTag: String(args.versionTags.touLabelerVersionTag) } : {}),
    tariffSnapshotId: args.tariffSnapshotId ?? null,
  };

  if (!hasIntervals) {
    return {
      schemaVersion: 'batteryDecisionPackV1',
      engineVersions,
      confidenceTier: 'NONE',
      constraints: {
        sizingSearchV1: {
          constraintsUsed: {
            maxKwFromPeakPct: safeNum(args.sizingSearchConstraintsV1?.maxKwFromPeakPct) ?? 0.8,
            minHours: safeNum(args.sizingSearchConstraintsV1?.minHours) ?? 1,
            maxHours: safeNum(args.sizingSearchConstraintsV1?.maxHours) ?? 6,
            kwValues: Array.isArray(args.sizingSearchConstraintsV1?.kwValues) ? args.sizingSearchConstraintsV1!.kwValues!.slice() : [50, 100, 150, 200],
            kwhValues: Array.isArray(args.sizingSearchConstraintsV1?.kwhValues) ? args.sizingSearchConstraintsV1!.kwhValues!.slice() : [100, 200, 300, 400, 600, 800],
          },
          allCandidateCount: 0,
        },
      },
      warnings: uniqSorted(warnings),
      missingInfo: uniqSorted(missingInfo),
      options: [],
    };
  }

  const optionMemo = new Map<string, BatteryDecisionOptionV1>();

  const search = sizingSearchV1({
    sitePeakKw,
    constraints: args.sizingSearchConstraintsV1 || null,
    conservativeWhenPeakUnknown: true,
    scoreCandidate: (c) => {
      const key = `${c.powerKw}|${c.energyKwh}`;
      try {
        const durationHours = c.energyKwh / c.powerKw;
        const batteryCfg = {
          powerKw: c.powerKw,
          energyKwh: c.energyKwh,
          durationHours,
          rte: 0.9,
          maxCyclesPerDay: 1,
        };

        const dispatchSim = simulateDispatchV1({
          intervalInsightsV1: intervalInsights,
          intervalPointsV1: points,
          tariffPriceSignalsV1: args.tariffPriceSignalsV1,
          determinantsV1: args.determinantsV1,
          battery: batteryCfg,
          config: { rte: 0.9, maxCyclesPerDay: 1, dispatchDaysPerYear: 260, demandWindowStrategy: 'WINDOW_AROUND_DAILY_PEAK_V1' },
        });
        const hybrid: any =
          dispatchSim.strategyResults.find((r: any) => String(r?.strategyId || '') === 'HYBRID_V1') || dispatchSim.strategyResults[0] || null;

        const shifted = safeNum(hybrid?.estimatedShiftedKwhAnnual?.value);
        const peakReduc = safeNum(hybrid?.estimatedPeakKwReduction?.min);

        const out = evaluateBatteryEconomicsV1({
          battery: { powerKw: c.powerKw, energyKwh: c.energyKwh, roundTripEff: 0.9, usableFraction: null, degradationPctYr: null },
          costs: args.costs || null,
          tariffs: tariffEcon,
          determinants: detEcon,
          dispatch: {
            shiftedKwhAnnual: shifted,
            peakReductionKwAssumed: peakReduc,
            dispatchDaysPerYear: safeNum((dispatchSim as any)?.assumptions?.dispatchDaysPerYear),
          },
          dr: drElig.eligible && safeNum(args.drAnnualValueUsd) !== null ? { annualValueUsd: safeNum(args.drAnnualValueUsd) } : null,
          finance: args.finance || null,
        });

        const optionWarnings = uniqSorted([
          ...(out.warnings || []),
          ...(Array.isArray((dispatchSim as any)?.warnings) ? (dispatchSim as any).warnings : []),
        ]);

        const energy = Math.max(0, safeNum(out.savingsAnnual.energyUsd) ?? 0);
        const demand = Math.max(0, safeNum(out.savingsAnnual.demandUsd) ?? 0);
        const ratchet = Math.max(0, safeNum(out.savingsAnnual.ratchetAvoidedUsd) ?? 0);
        const dr = Math.max(0, safeNum(out.savingsAnnual.drUsd) ?? 0);
        const total = energy + demand + ratchet + dr + Math.max(0, safeNum(out.savingsAnnual.otherUsd) ?? 0);

        const netAnnual = (() => {
          const s = safeNum(total);
          const o = safeNum(out.opexAnnual.totalUsd);
          if (s === null || o === null) return null;
          return s - o;
        })();

        const reasonsByComponent = reasonsForZeroSavings({ out, drEligible: drElig.eligible, drEligibleReason: drElig.reason });

        const lineItems = Array.isArray(out.audit?.lineItems) ? out.audit.lineItems : [];
        const topLineItems = toTopLineItems(lineItems);

        const opt: BatteryDecisionOptionV1 = {
          optionId: key, // temporary, made stable later when selecting top3
          battery: {
            powerKw: c.powerKw,
            energyKwh: c.energyKwh,
            durationHours,
            roundTripEff: 0.9,
            maxCyclesPerDay: 1,
          },
          savingsAnnual: {
            energyArbitrageUsd: energy,
            demandUsd: demand,
            ratchetUsd: ratchet,
            drUsd: dr,
            totalUsd: total,
            reasonsByComponent,
          },
          economics: {
            capexTotalUsd: safeNum(out.capex.totalUsd),
            opexAnnualTotalUsd: safeNum(out.opexAnnual.totalUsd),
            netAnnualUsd: netAnnual,
            simplePaybackYears: safeNum(out.cashflow.simplePaybackYears),
            npvLiteUsd: safeNum(out.cashflow.npvUsd),
          },
          confidenceTier: out.confidenceTier,
          warnings: optionWarnings,
          missingInfo: [],
          audit: { lineItems, topLineItems },
        };

        optionMemo.set(key, opt);
        return { npvLiteUsd: safeNum(out.cashflow.npvUsd), simplePaybackYears: safeNum(out.cashflow.simplePaybackYears) };
      } catch (e) {
        // Fail closed: keep deterministic ordering but score as nulls; options omitted from top3 later.
        optionMemo.delete(key);
        return { npvLiteUsd: null, simplePaybackYears: null };
      }
    },
  });

  warnings.push(...(search.warnings || []));
  missingInfo.push(...(search.missingInfo || []));

  const top3: BatteryDecisionOptionV1[] = [];
  for (const [i, r] of search.top3.entries()) {
    const key = `${r.candidate.powerKw}|${r.candidate.energyKwh}`;
    const opt = optionMemo.get(key);
    if (!opt) continue;
    top3.push({ ...opt, optionId: stableOptionId(i) });
  }

  // Confidence: deterministic + conservative.
  const confidenceTier: ConfidenceTierV1 = (() => {
    if (!top3.length) return 'NONE';
    // Start with sizingSearch confidence, then cap based on tariff/determinants coverage.
    let c: ConfidenceTierV1 = search.confidenceTier;
    const hasTou = Boolean(Array.isArray((args.tariffPriceSignalsV1 as any)?.touEnergyPrices) && (args.tariffPriceSignalsV1 as any).touEnergyPrices.length);
    const hasDemand = safeNum((args.tariffPriceSignalsV1 as any)?.demandChargePerKw) !== null && safeNum((args.determinantsV1 as any)?.billingDemandKw) !== null;
    if (!hasTou && !hasDemand) c = 'LOW';
    if (!safeNum(sitePeakKw)) c = 'LOW';
    // If only conservative grids were used due to missing peak, keep LOW at best.
    if ((search.missingInfo || []).includes(BatteryEconomicsReasonCodesV1.BATTERY_DECISION_SITE_PEAK_KW_UNKNOWN)) c = 'LOW';
    return c;
  })();

  return {
    schemaVersion: 'batteryDecisionPackV1',
    engineVersions,
    confidenceTier,
    constraints: {
      sizingSearchV1: {
        constraintsUsed: search.constraintsUsed,
        allCandidateCount: search.allCandidates.length,
      },
    },
    warnings: uniqSorted(warnings),
    missingInfo: uniqSorted(missingInfo),
    options: top3,
  };
}

