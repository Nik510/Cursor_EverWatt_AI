import type { IntervalPointV1, TariffPriceSignalsV1, DeterminantsSignalsV1, DrReadinessV1 } from '../batteryEngineV1/types';
import { dispatchV1_1, DispatchV1_1WarningCodes } from '../batteryEngineV1/dispatchV1_1';

import type { BatteryEconomicsDeterminantsSignalsV1, BatteryEconomicsTariffSignalsV1, ConfidenceTierV1 } from '../batteryEconomicsV1/types';
import { evaluateBatteryEconomicsV1 } from '../batteryEconomicsV1/evaluateBatteryEconomicsV1';
import { pvaf, roundTo, sumFixedOrder } from '../batteryEconomicsV1/helpers';

import type { IntervalIntelligenceV1 } from '../utilityIntelligence/intervalIntelligenceV1/types';

import { batteryDecisionPackV1_2VersionTag, recommendationBandsV1_2, sensitivityScenariosV1_2 } from './constants';
import { buildBoundedAuditV1_2 } from './audit';
import { generateCandidatesV1_2 } from './candidateGenerator';
import { applyGatesV1_2 } from './constraints';
import { BatteryDecisionPackReasonCodesV1_2, uniqSorted } from './reasons';
import { scoreCandidateV1_2 } from './scorer';
import type {
  BatteryDecisionConstraintsV1,
  BatteryDecisionPackV1_2,
  BatteryDecisionTopCandidateV1_2,
  BatteryDecisionSensitivityV1_2,
  BatteryDecisionSensitivityScenarioV1_2,
  BatteryRecommendationTierV1_2,
  BatteryRecommendationV1_2,
} from './types';

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

function strictNumOrNull(x: unknown): number | null {
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
    billingDemandKw: numOrNull((det as any)?.billingDemandKw),
    ratchetDemandKw: numOrNull((det as any)?.ratchetDemandKw),
    billingDemandMethod: String((det as any)?.billingDemandMethod || '').trim() || null,
    ratchetHistoryMaxKw: numOrNull((det as any)?.ratchetHistoryMaxKw),
    ratchetFloorPct: numOrNull((det as any)?.ratchetFloorPct),
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

function confidenceTierV1_2(args: { hasIntervals: boolean; hasTariff: boolean; sitePeakKw: number | null }): ConfidenceTierV1 {
  if (!args.hasIntervals) return 'NONE';
  if (!args.hasTariff) return 'NONE';
  if (numOrNull(args.sitePeakKw) === null) return 'LOW';
  return 'MEDIUM';
}

function clampNonNegFinite(x: unknown): number | null {
  const n = Number(x);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function normalizeConstraints(cons: BatteryDecisionConstraintsV1 | null | undefined): BatteryDecisionConstraintsV1 | null {
  if (!cons || typeof cons !== 'object') return null;
  const exclude = Array.isArray(cons.excludeDurationsHours) ? cons.excludeDurationsHours : [];
  const excludeNorm = exclude
    .map((x) => clampNonNegFinite(x))
    .filter((x): x is number => x !== null)
    .map((x) => Math.round(x * 1e9) / 1e9);
  return {
    maxKw: clampNonNegFinite(cons.maxKw),
    minKw: clampNonNegFinite(cons.minKw),
    maxKwh: clampNonNegFinite(cons.maxKwh),
    minDurationHours: clampNonNegFinite(cons.minDurationHours),
    maxDurationHours: clampNonNegFinite(cons.maxDurationHours),
    excludeDurationsHours: Array.from(new Set(excludeNorm)).sort((a, b) => a - b),
    requireIndoorRated: Boolean(cons.requireIndoorRated),
    requireNemaRating: cons.requireNemaRating === '3R' || cons.requireNemaRating === '4' || cons.requireNemaRating === '4X' ? cons.requireNemaRating : null,
    interconnectionLimitKw: clampNonNegFinite(cons.interconnectionLimitKw),
    noExport: Boolean(cons.noExport),
    backupOnly: Boolean(cons.backupOnly),
    siteNotes: String(cons.siteNotes || '').trim() || undefined,
  };
}

function tierFromPaybackAndNpv(args: { confidenceTier: ConfidenceTierV1; paybackYears: number | null; npvLiteUsd: number | null }): BatteryRecommendationTierV1_2 {
  if (args.confidenceTier === 'NONE') return 'DO_NOT_PROCEED';
  const pb = strictNumOrNull(args.paybackYears);
  const npv = strictNumOrNull(args.npvLiteUsd);
  if (pb === null) return 'DO_NOT_PROCEED';
  if (pb <= recommendationBandsV1_2.strongMaxPaybackYears && (npv === null || npv >= 0)) return 'STRONG';
  if (pb <= recommendationBandsV1_2.moderateMaxPaybackYears) return 'MODERATE';
  if (pb <= recommendationBandsV1_2.weakMaxPaybackYears) return 'WEAK';
  return 'DO_NOT_PROCEED';
}

function buildSensitivityV1(args: {
  selected: BatteryDecisionTopCandidateV1_2 | null;
}): BatteryDecisionSensitivityV1_2 {
  const sel = args.selected;
  const base = sel?.economicsSummary || null;
  const scenariosOut: BatteryDecisionSensitivityScenarioV1_2[] = [];

  const baseCapex = strictNumOrNull(base?.capexTotalUsd);
  const baseOpex = strictNumOrNull(base?.opexAnnualTotalUsd);
  const baseEnergy = strictNumOrNull(base?.savingsByCategoryUsd?.energyArbitrageUsd);
  const baseDemand = strictNumOrNull(base?.savingsByCategoryUsd?.demandUsd);
  const baseRatchet = strictNumOrNull(base?.savingsByCategoryUsd?.ratchetUsd);
  const baseDr = strictNumOrNull(base?.savingsByCategoryUsd?.drUsd);
  const baseOther = strictNumOrNull(base?.savingsByCategoryUsd?.otherUsd);

  const termYears = 10;
  const discountRate = 0.09;
  const annuity = pvaf(discountRate, termYears);

  for (const sc of sensitivityScenariosV1_2) {
    const warnings: string[] = [];

    const capex = baseCapex === null ? null : roundTo(baseCapex * sc.capexFactor, 2);
    if (baseCapex === null) warnings.push('battery.decision.sensitivity.missing_capex');

    const energy = baseEnergy === null ? null : roundTo(baseEnergy * sc.energyValueFactor, 2);
    if (baseEnergy === null) warnings.push('battery.decision.sensitivity.missing_energy_component');

    const demand = baseDemand === null ? null : roundTo(baseDemand * sc.demandValueFactor, 2);
    if (baseDemand === null) warnings.push('battery.decision.sensitivity.missing_demand_component');

    const ratchet = baseRatchet;
    const dr = baseDr;
    const other = baseOther;

    const annualSavingsTotal = (() => {
      const total = sumFixedOrder([demand, energy, ratchet, dr, other]);
      return total === null ? null : roundTo(total, 2);
    })();
    if (annualSavingsTotal === null) warnings.push('battery.decision.sensitivity.missing_total_savings');

    const netAnnual = (() => {
      if (annualSavingsTotal === null) return null;
      if (baseOpex === null) return null;
      return roundTo(annualSavingsTotal - baseOpex, 2);
    })();
    if (baseOpex === null) warnings.push('battery.decision.sensitivity.missing_opex');

    const simplePaybackYears = (() => {
      if (capex === null) return null;
      if (!(capex > 0)) return null;
      if (netAnnual === null || !(netAnnual > 0)) return null;
      return roundTo(capex / netAnnual, 6);
    })();

    const npvLite = (() => {
      if (capex === null) return null;
      if (netAnnual === null) return null;
      if (annuity === null) return null;
      return roundTo(-capex + netAnnual * annuity, 2);
    })();

    scenariosOut.push({
      scenarioId: sc.scenarioId,
      simplePaybackYears,
      npvLite,
      annualSavingsTotal,
      warnings: uniqSorted(warnings),
    });
  }

  const baseScenario = scenariosOut.find((s) => s.scenarioId === 'base') || null;
  const ok = Boolean(sel && baseScenario && baseScenario.annualSavingsTotal !== null);
  const reasonCodes: string[] = [];
  if (!ok) reasonCodes.push(BatteryDecisionPackReasonCodesV1_2.SENSITIVITY_UNAVAILABLE);

  return {
    ok,
    reasonCodes: uniqSorted(reasonCodes),
    scenarios: scenariosOut,
  };
}

function recommendationTemplatesV1_2(): {
  reasons: {
    financialStrong: string;
    financialModerate: string;
    financialWeak: string;
    financialDnp: string;
    energyArbEnabled: string;
    energyArbDisabled: string;
    demandMaterial: string;
    demandMinimal: string;
    ccaAllIn: string;
    ccaEnergyOnly: string;
    ccaFallbackDelivery: string;
    daFallback: string;
    deliveryOnly: string;
    sensitivityStable: string;
    sensitivityDownTier: string;
  };
  risks: Record<string, string>;
} {
  return {
    reasons: {
      financialStrong: 'Strong economics: simple payback is in the strong band and NPV-lite is non-negative.',
      financialModerate: 'Moderate economics: simple payback is in the moderate band under current assumptions.',
      financialWeak: 'Weak economics: simple payback is long and value is sensitive to assumptions.',
      financialDnp: 'Do not proceed: economics or confidence is insufficient for a decision-quality recommendation.',
      energyArbEnabled: 'Energy arbitrage is enabled and contributes to annual savings under current TOU spread.',
      energyArbDisabled: 'Backup-only constraint disables energy arbitrage value; recommendation reflects demand-only value.',
      demandMaterial: 'Demand charge savings is a primary value driver when peak reduction is achievable.',
      demandMinimal: 'Demand charge savings appears limited with current determinants/dispatch signals.',
      ccaAllIn: 'CCA detected with all-in generation pricing (energy + adders).',
      ccaEnergyOnly: 'CCA detected with energy-only generation pricing (adders missing).',
      ccaFallbackDelivery: 'CCA detected but generation rates missing → used IOU delivery prices (fallback).',
      daFallback: 'DA detected but generation rates missing → used IOU delivery prices (fallback).',
      deliveryOnly: 'IOU delivery pricing used for energy valuation.',
      sensitivityStable: 'Sensitivity: capex ±15% does not change the recommendation tier.',
      sensitivityDownTier: 'Sensitivity: capex +15% worsens the recommendation tier (cost sensitivity).',
    },
    risks: {
      [DispatchV1_1WarningCodes.DISPATCH_SUPPLY_CCA_GENERATION_RATES_MISSING_FALLBACK]: 'CCA detected but generation rates were missing; delivery fallback used for dispatch valuation.',
      [DispatchV1_1WarningCodes.DISPATCH_SUPPLY_DA_GENERATION_RATES_MISSING_FALLBACK]: 'DA detected but generation rates were missing; delivery fallback used for dispatch valuation.',
      'battery.econ.supply.cca_generation_rates_missing_fallback': 'CCA detected but generation rates were missing; delivery fallback used for savings valuation.',
      'battery.econ.supply.da_generation_rates_missing_fallback': 'DA detected but generation rates were missing; delivery fallback used for savings valuation.',
      'cca.v0.energy_only_no_exit_fees': 'CCA generation adders/fees are missing (energy-only); all-in pricing uncertainty may impact savings.',
      'cca.adders.v0.missing': 'CCA adders are missing; all-in energy pricing may be understated.',
      'battery.econ.ratchet_unavailable': 'Ratchet method indicated but ratchet history is missing; demand savings is conservative (clipped).',
      [BatteryDecisionPackReasonCodesV1_2.CONSTRAINTS_NO_CANDIDATES]: 'Hard constraints eliminated all sizing candidates; loosen constraints or provide updated limits.',
      [BatteryDecisionPackReasonCodesV1_2.CONSTRAINTS_INTERCONNECTION_LIMIT]: 'Interconnection limit constrained sizing candidates; confirm allowable export/import and interconnect capacity.',
      [BatteryDecisionPackReasonCodesV1_2.CONSTRAINTS_BACKUP_ONLY_ARBITRAGE_DISABLED]: 'Backup-only constraint disables energy arbitrage value; value may be understated if arbitrage is later allowed.',
      [BatteryDecisionPackReasonCodesV1_2.SENSITIVITY_UNAVAILABLE]: 'Sensitivity analysis unavailable due to missing base economics components.',
    },
  };
}

function buildRecommendationV1(args: {
  selected: BatteryDecisionTopCandidateV1_2 | null;
  confidenceTier: ConfidenceTierV1;
  providerType: 'NONE' | 'CCA' | 'DA';
  hasAllInGenPrices: boolean;
  packWarnings: string[];
  packMissingInfo: string[];
  sensitivityV1: BatteryDecisionSensitivityV1_2;
  constraints: BatteryDecisionConstraintsV1 | null;
  topCandidates: BatteryDecisionTopCandidateV1_2[];
}): BatteryRecommendationV1_2 {
  const t = recommendationTemplatesV1_2();
  const sel = args.selected;
  const econ = sel?.economicsSummary || null;

  const tierBase = tierFromPaybackAndNpv({ confidenceTier: args.confidenceTier, paybackYears: econ?.paybackYears ?? null, npvLiteUsd: econ?.npvLiteUsd ?? null });
  const tier = tierBase;

  const reasonsTop: string[] = [];
  if (tier === 'STRONG') reasonsTop.push(t.reasons.financialStrong);
  else if (tier === 'MODERATE') reasonsTop.push(t.reasons.financialModerate);
  else if (tier === 'WEAK') reasonsTop.push(t.reasons.financialWeak);
  else reasonsTop.push(t.reasons.financialDnp);

  const backupOnly = Boolean(args.constraints?.backupOnly);
  reasonsTop.push(backupOnly ? t.reasons.energyArbDisabled : t.reasons.energyArbEnabled);

  const demand = strictNumOrNull(econ?.savingsByCategoryUsd?.demandUsd);
  reasonsTop.push(demand !== null && demand > 0 ? t.reasons.demandMaterial : t.reasons.demandMinimal);

  const rateKind = String(econ?.rateSourceKind || '').trim();
  if (args.providerType === 'CCA') {
    if (rateKind === 'CCA_GENERATION_V0_ALL_IN') reasonsTop.push(t.reasons.ccaAllIn);
    else if (rateKind === 'CCA_GENERATION_V0_ENERGY_ONLY') reasonsTop.push(t.reasons.ccaEnergyOnly);
    else reasonsTop.push(t.reasons.ccaFallbackDelivery);
  } else if (args.providerType === 'DA') {
    reasonsTop.push(t.reasons.daFallback);
  } else {
    reasonsTop.push(t.reasons.deliveryOnly);
  }

  const tierCapexPlus = (() => {
    const sc = args.sensitivityV1.scenarios.find((s) => s.scenarioId === 'capex_plus_15pct') || null;
    if (!sc) return tier;
    return tierFromPaybackAndNpv({ confidenceTier: args.confidenceTier, paybackYears: sc.simplePaybackYears, npvLiteUsd: sc.npvLite });
  })();
  const downTier = tierCapexPlus !== tier;
  reasonsTop.push(downTier ? t.reasons.sensitivityDownTier : t.reasons.sensitivityStable);

  const whyNotOthers = (() => {
    const out: Array<{ candidateId: string; reasons: string[] }> = [];
    if (!sel) return out;
    const base = args.topCandidates.filter((c) => String(c.id) !== String(sel.id));
    const pick = base.slice(0, 2);
    for (const c of pick) {
      const reasons: string[] = [];
      const npvSel = strictNumOrNull(econ?.npvLiteUsd);
      const npvOther = strictNumOrNull(c?.economicsSummary?.npvLiteUsd);
      if (npvSel !== null && npvOther !== null && npvOther < npvSel - 1e-9) reasons.push('Lower NPV-lite than the recommended option.');
      const pbSel = strictNumOrNull(econ?.paybackYears);
      const pbOther = strictNumOrNull(c?.economicsSummary?.paybackYears);
      if (pbSel !== null && pbOther !== null && pbOther > pbSel + 1e-9) reasons.push('Longer simple payback than the recommended option.');
      const capSel = strictNumOrNull(econ?.capexTotalUsd);
      const capOther = strictNumOrNull(c?.economicsSummary?.capexTotalUsd);
      if (capSel !== null && capOther !== null && capOther > capSel + 1e-9) reasons.push('Higher CAPEX than the recommended option.');
      out.push({ candidateId: String(c.id), reasons: uniqSorted(reasons).slice(0, 3) });
    }
    return out;
  })();

  const keyAssumptions = (() => {
    const out: string[] = [];
    out.push(`rateSource.kind=${String(econ?.rateSourceKind || 'DELIVERY')}`);
    if (args.providerType === 'CCA') {
      if (rateKind === 'CCA_GENERATION_V0_ALL_IN') out.push('CCA pricing mode: all-in (generation + adders).');
      else if (rateKind === 'CCA_GENERATION_V0_ENERGY_ONLY') out.push('CCA pricing mode: energy-only (adders missing).');
      else out.push('CCA pricing mode: delivery fallback (generation rates missing).');
    }
    if (args.providerType === 'DA') out.push('Direct Access detected: delivery fallback used for generation valuation.');
    if (args.hasAllInGenPrices) out.push('Generation all-in TOU windows were present (preferred for energy valuation).');
    if (backupOnly) out.push('backupOnly=true: energy arbitrage value forced off (demand-only economics).');
    return uniqSorted(out).slice(0, 5);
  })();

  const risks = (() => {
    const out: string[] = [];
    const all = uniqSorted([...(args.packWarnings || []), ...(args.packMissingInfo || []), ...(args.sensitivityV1.reasonCodes || [])]);
    for (const code of all) {
      const msg = t.risks[String(code)] || null;
      if (msg) out.push(msg);
    }
    if (downTier) out.push('CAPEX sensitivity indicates the project may drop a tier if costs run high (+15%).');
    return uniqSorted(out).slice(0, 5);
  })();

  return {
    recommendedCandidateId: sel ? String(sel.id) : null,
    recommendationTier: tier,
    reasonsTop: uniqSorted(reasonsTop).slice(0, 5),
    whyNotOthers: whyNotOthers.slice(0, 2).map((x) => ({ candidateId: x.candidateId, reasons: x.reasons.slice(0, 3) })),
    keyAssumptions,
    risks,
  };
}

export function buildBatteryDecisionPackV1_2(args: {
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
  batteryDecisionConstraintsV1?: BatteryDecisionConstraintsV1 | null;
}): BatteryDecisionPackV1_2 {
  const warnings: string[] = [];
  const missingInfo: string[] = [];

  const constraintsIn = normalizeConstraints(args.batteryDecisionConstraintsV1 ?? null);

  // Ratchet history guardrail (deterministic, conservative):
  // If billing demand method indicates ratchet but history is missing, clip demand savings to 0 by forcing peakReduction=0 in economics.
  const ratchetHistoryMissingClipsDemand = (() => {
    const det: any = args.determinantsV1 || null;
    const method = String(det?.billingDemandMethod || '').toLowerCase();
    const floorPct = numOrNull(det?.ratchetFloorPct);
    const histMax = numOrNull(det?.ratchetHistoryMaxKw);
    return Boolean(method.includes('ratchet') && floorPct !== null && histMax === null);
  })();
  if (ratchetHistoryMissingClipsDemand) warnings.push('battery.econ.ratchet_unavailable');

  const intervalPoints = Array.isArray(args.intervalPointsV1) ? args.intervalPointsV1 : [];
  const hasIntervals = intervalPoints.length > 0;
  if (!hasIntervals) missingInfo.push(BatteryDecisionPackReasonCodesV1_2.PACK_MISSING_INTERVALS);

  const tariff = args.tariffPriceSignalsV1 || null;
  const hasTariff = Boolean(tariff);
  if (!hasTariff) missingInfo.push(BatteryDecisionPackReasonCodesV1_2.PACK_MISSING_TARIFF_PRICE_SIGNALS);

  const demandCharge = numOrNull((tariff as any)?.demandChargePerKw);
  if (hasTariff && demandCharge === null) missingInfo.push(BatteryDecisionPackReasonCodesV1_2.PACK_MISSING_DEMAND_CHARGE);

  if (!args.determinantsV1) missingInfo.push(BatteryDecisionPackReasonCodesV1_2.PACK_MISSING_DETERMINANTS);

  const ii = args.intervalInsightsV1 || null;
  const sitePeakKw = numOrNull((ii as any)?.peakKw);
  const avgKw = numOrNull((ii as any)?.avgKw);

  const providerType = toProviderType((tariff as any)?.supplyProviderType);
  const hasAllInGenPrices = Array.isArray((tariff as any)?.generationAllInTouEnergyPrices) && (tariff as any).generationAllInTouEnergyPrices.length > 0;

  const confidenceTier = confidenceTierV1_2({ hasIntervals, hasTariff, sitePeakKw });

  const candGen = generateCandidatesV1_2({ intervalInsightsV1: ii, constraints: constraintsIn });
  warnings.push(...candGen.warnings);
  missingInfo.push(...candGen.missingInfo);

  // Interconnection constraint traceability.
  if (constraintsIn?.interconnectionLimitKw !== null) {
    const maxKw = constraintsIn?.maxKw ?? null;
    const bindingByInterconn = maxKw === null || constraintsIn.interconnectionLimitKw < maxKw - 1e-9;
    if (bindingByInterconn && candGen.hardFilter.before > candGen.hardFilter.after) missingInfo.push(BatteryDecisionPackReasonCodesV1_2.CONSTRAINTS_INTERCONNECTION_LIMIT);
  }
  if (constraintsIn && candGen.candidates.length === 0) missingInfo.push(BatteryDecisionPackReasonCodesV1_2.CONSTRAINTS_NO_CANDIDATES);

  const backupOnly = Boolean(constraintsIn?.backupOnly);
  if (backupOnly) warnings.push(BatteryDecisionPackReasonCodesV1_2.CONSTRAINTS_BACKUP_ONLY_ARBITRAGE_DISABLED);

  const tz = String((tariff as any)?.timezone || (ii as any)?.timezoneUsed || '').trim() || 'UTC';
  const rep = pickRepresentativeCycle({ determinantsCycles: args.determinantsCycles || null, intervalPointsV1: intervalPoints, timezone: tz });
  if (!rep) warnings.push(DispatchV1_1WarningCodes.DISPATCH_INSUFFICIENT_DATA);

  const econTariff = toEconomicsTariffSignals({ tariff, tariffSnapshotId: args.tariffSnapshotId ?? null, rateCode: args.rate });
  const econDet = toEconomicsDeterminants(args.determinantsV1);

  const scored: Array<{
    candidate: BatteryDecisionTopCandidateV1_2;
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
          dailyProfileBuckets: Array.isArray((ii as any)?.dailyProfileBuckets) ? ((ii as any)?.dailyProfileBuckets as any) : null,
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
    const reducKw = (() => {
      const before = numOrNull(cyc0?.demandPeakBeforeKw);
      const after = numOrNull(cyc0?.demandPeakAfterKw);
      if (before === null || after === null) return null;
      return Math.max(0, before - after);
    })();
    const days = cycle ? cycleDays({ startIso: cycle.cycleStartIso, endIso: cycle.cycleEndIso }) : 30;
    const shiftedKwhAnnualRaw = Math.max(0, dischargedKwh) * (365 / days);
    const shiftedKwhAnnual = backupOnly ? 0 : shiftedKwhAnnualRaw;

    const econ = evaluateBatteryEconomicsV1({
      battery: { powerKw: c.kw, energyKwh: c.kwh, roundTripEff: 0.9, usableFraction: null, degradationPctYr: null },
      costs: null,
      tariffs: econTariff,
      determinants: econDet,
      dispatch: {
        shiftedKwhAnnual: roundTo(shiftedKwhAnnual, 6),
        peakReductionKwAssumed: ratchetHistoryMissingClipsDemand ? 0 : reducKw === null ? null : roundTo(reducKw, 6),
        dispatchDaysPerYear: null,
      },
      dr: numOrNull(args.drAnnualValueUsd) !== null ? { annualValueUsd: numOrNull(args.drAnnualValueUsd) } : null,
      finance: null,
    });

    const auditLineItems = Array.isArray(econ.audit?.lineItems) ? econ.audit.lineItems : [];
    const rateSourceKind = inferRateSourceKind({ auditLineItems, dispatchWarnings });

    const econSummary = {
      annualSavingsTotalUsd: numOrNull(econ.savingsAnnual?.totalUsd),
      savingsByCategoryUsd: {
        energyArbitrageUsd: numOrNull(econ.savingsAnnual?.energyUsd),
        demandUsd: numOrNull(econ.savingsAnnual?.demandUsd),
        drUsd: numOrNull(econ.savingsAnnual?.drUsd),
        ratchetUsd: numOrNull(econ.savingsAnnual?.ratchetAvoidedUsd),
        otherUsd: numOrNull(econ.savingsAnnual?.otherUsd),
      },
      capexTotalUsd: numOrNull(econ.capex?.totalUsd),
      opexAnnualTotalUsd: numOrNull(econ.opexAnnual?.totalUsd),
      netAnnualUsd: (() => {
        const s = numOrNull(econ.savingsAnnual?.totalUsd);
        const o = numOrNull(econ.opexAnnual?.totalUsd);
        if (s === null || o === null) return null;
        return roundTo(s - o, 2);
      })(),
      paybackYears: numOrNull(econ.cashflow?.simplePaybackYears),
      npvLiteUsd: numOrNull(econ.cashflow?.npvUsd),
      rateSourceKind,
    } as const;

    const whyThisWorks: string[] = [];
    const whyNotBetter: string[] = [];

    const spreadNote = (() => {
      if (backupOnly) return 'Energy arbitrage disabled by backup-only constraint.';
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

    const gatesRes = applyGatesV1_2({ candidate: c, economics: econ, sitePeakKw: sitePeakKw ?? (avgKw !== null ? avgKw * 1.5 : null) });
    const accepted = gatesRes.accepted;
    if (!accepted) whyNotBetter.push(...gatesRes.reasons.map((r) => `Rejected by gate: ${r}`));

    const extraWarnings = uniqSorted(dispatchWarnings);
    const scoredRes = scoreCandidateV1_2({ candidate: c, economics: econ, extraWarnings: uniqSorted([...extraWarnings, ...(backupOnly ? [BatteryDecisionPackReasonCodesV1_2.CONSTRAINTS_BACKUP_ONLY_ARBITRAGE_DISABLED] : [])]) });

    scored.push({
      candidate: {
        ...c,
        score: scoredRes.score,
        economicsSummary: econSummary as any,
        whyThisWorks: uniqSorted(whyThisWorks),
        whyNotBetter: uniqSorted(whyNotBetter),
      },
      accepted,
      rejectReasons: gatesRes.reasons,
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
      const na = numOrNull((a.candidate.economicsSummary as any)?.npvLiteUsd) ?? -1e18;
      const nb = numOrNull((b.candidate.economicsSummary as any)?.npvLiteUsd) ?? -1e18;
      if (nb !== na) return nb - na;
      const pa = numOrNull((a.candidate.economicsSummary as any)?.paybackYears) ?? 1e18;
      const pb = numOrNull((b.candidate.economicsSummary as any)?.paybackYears) ?? 1e18;
      if (pa !== pb) return pa - pb;
      return a.candidate.id.localeCompare(b.candidate.id);
    });

  const topCandidates: BatteryDecisionTopCandidateV1_2[] = ranked.slice(0, 3).map((r) => r.candidate);
  const selectedAccepted = ranked.find((r) => r.accepted) || ranked[0] || null;

  const rejectedByGates = ranked
    .filter((r) => !r.accepted)
    .map((r) => ({ candidateId: r.candidate.id, reasons: r.rejectReasons }))
    .sort((a, b) => a.candidateId.localeCompare(b.candidateId));

  const selectedRationale: string[] = [];
  if (selectedAccepted) {
    const cov = (() => {
      const peak = numOrNull(sitePeakKw);
      if (peak === null || !(peak > 0)) return null;
      return roundTo(selectedAccepted.candidate.kw / peak, 3);
    })();
    selectedRationale.push(`Deterministic top-ranked option under fixed weights (v1.2).`);
    if (cov !== null) selectedRationale.push(`Power covers ~${String(roundTo(cov * 100, 1))}% of observed site peak (heuristic band).`);
    selectedRationale.push(
      `Score=${String(selectedAccepted.candidate.score)}; payback=${String((selectedAccepted.candidate.economicsSummary as any)?.paybackYears ?? '—')}y; npvLite=$${String((selectedAccepted.candidate.economicsSummary as any)?.npvLiteUsd ?? '—')}.`,
    );
    if (backupOnly) selectedRationale.push('backupOnly=true: energy arbitrage value forced off (shiftedKwhAnnual set to 0).');
  }

  const audit = buildBoundedAuditV1_2({
    economicsAuditLineItems: selectedAccepted ? selectedAccepted.econAuditLineItems : [],
  });

  // Bubble up warnings from the selected candidate (economics + dispatch).
  if (selectedAccepted) warnings.push(...(selectedAccepted.dispatchWarnings || []), ...(selectedAccepted.economicsWarnings || []));

  const sensitivityV1 = buildSensitivityV1({
    selected: selectedAccepted ? selectedAccepted.candidate : null,
  });

  const recommendationV1 = buildRecommendationV1({
    selected: selectedAccepted ? selectedAccepted.candidate : null,
    confidenceTier,
    providerType,
    hasAllInGenPrices,
    packWarnings: warnings,
    packMissingInfo: missingInfo,
    sensitivityV1,
    constraints: constraintsIn,
    topCandidates,
  });

  // ok indicates "decision-quality": required inputs + auditable reconcile.
  const ok = confidenceTier !== 'NONE' && Boolean(selectedAccepted) && audit.reconcile.delta !== null;

  const constraintsSummary = {
    input: constraintsIn,
    applied: {
      maxKwEffective: (() => {
        const maxKw = numOrNull(constraintsIn?.maxKw);
        const inter = numOrNull(constraintsIn?.interconnectionLimitKw);
        const vals = [maxKw, inter].filter((x): x is number => x !== null && x >= 0);
        return vals.length ? Math.min(...vals) : null;
      })(),
      minKwEffective: numOrNull(constraintsIn?.minKw),
      maxKwhEffective: numOrNull(constraintsIn?.maxKwh),
      minDurationHoursEffective: numOrNull(constraintsIn?.minDurationHours),
      maxDurationHoursEffective: numOrNull(constraintsIn?.maxDurationHours),
      excludeDurationsHoursEffective: Array.isArray(constraintsIn?.excludeDurationsHours) ? constraintsIn!.excludeDurationsHours!.slice() : [],
      backupOnly,
      noExport: Boolean(constraintsIn?.noExport),
      interconnectionLimitKw: numOrNull(constraintsIn?.interconnectionLimitKw),
      requireIndoorRated: Boolean(constraintsIn?.requireIndoorRated),
      requireNemaRating: (constraintsIn?.requireNemaRating === '3R' || constraintsIn?.requireNemaRating === '4' || constraintsIn?.requireNemaRating === '4X') ? constraintsIn.requireNemaRating : null,
      siteNotes: String(constraintsIn?.siteNotes || '').trim() || null,
    },
    hardFilter: {
      candidatesBefore: candGen.hardFilter.before,
      candidatesAfter: candGen.hardFilter.after,
      bindingConstraintIds: candGen.hardFilter.bindingConstraintIds,
    },
    rejectedByGates,
  } as const;

  return {
    method: batteryDecisionPackV1_2VersionTag,
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
    constraints: constraintsSummary as any,
    topCandidates,
    selected: { candidateId: selectedAccepted ? selectedAccepted.candidate.id : null, rationaleBullets: uniqSorted(selectedRationale) },
    batteryDecisionSensitivityV1: sensitivityV1,
    recommendationV1,
    audit,
  };
}

