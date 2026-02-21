import type { ClaimsPolicyV1 } from '../claimsPolicyV1/types';
import type { VerifierResultV1 } from '../verifierV1/types';
import type { TruthSnapshotV1 } from '../truthEngineV1/types';
import type { ScenarioLabCategoryV1, ScenarioLabConfidenceTierV1, ScenarioLabStatusV1, ScenarioResultV1 } from './types';

type StoredRunSnapshotLike = {
  nowIso?: string;
  workflow?: any;
  analysisTraceV1?: any;
  engineVersions?: Record<string, string>;
  batteryDecisionPackV1_2?: any;
  batteryDecisionPackV1?: any;
  batteryEconomicsV1?: any;
  storageOpportunityPackV1?: any;
};

export type ScenarioTemplateV1 = {
  scenarioId: string;
  title: string;
  category: ScenarioLabCategoryV1;
  /** Deterministic sort key (lower first). */
  order: number;
  /**
   * Template-level data requirements. If unmet, scenario is BLOCKED/SKIPPED before KPI derivation.
   * Must be deterministic and bounded.
   */
  evaluate: (ctx: {
    storedRunSnapshot: StoredRunSnapshotLike;
    truthSnapshotV1: TruthSnapshotV1 | null;
    verifierResultV1: VerifierResultV1 | null;
    claimsPolicyV1: ClaimsPolicyV1 | null;
  }) => Omit<ScenarioResultV1, 'pros' | 'cons'> & { notes?: { warnings?: string[] } };
};

function safeString(x: unknown, max = 220): string {
  const s = String(x ?? '').trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, Math.max(0, max - 14)) + ' …(truncated)' : s;
}

function uniqSorted(items: string[], max: number): string[] {
  const set = new Set<string>();
  for (const it of items) {
    const s = safeString(it, 200);
    if (!s) continue;
    set.add(s);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b)).slice(0, max);
}

function tierFromTruthAndBattery(args: { truthTier: unknown; batteryTier: unknown }): ScenarioLabConfidenceTierV1 {
  const truth = safeString(args.truthTier, 10).toUpperCase();
  const t: ScenarioLabConfidenceTierV1 = truth === 'A' || truth === 'B' || truth === 'C' ? (truth as any) : 'C';
  const bRaw = safeString(args.batteryTier, 20).toUpperCase();
  const b: ScenarioLabConfidenceTierV1 = bRaw === 'HIGH' ? 'A' : bRaw === 'MEDIUM' ? 'B' : 'C';
  const rank = (x: ScenarioLabConfidenceTierV1) => (x === 'A' ? 0 : x === 'B' ? 1 : 2);
  return rank(t) >= rank(b) ? t : b;
}

function confidenceFromCtx(ctx: { truthSnapshotV1: TruthSnapshotV1 | null; batteryDecisionPackV1_2: any }): ScenarioLabConfidenceTierV1 {
  const truthTier = ctx.truthSnapshotV1?.truthConfidence?.tier;
  const batteryTier = ctx.batteryDecisionPackV1_2?.confidenceTier;
  return tierFromTruthAndBattery({ truthTier, batteryTier });
}

function buildProvenance(storedRunSnapshot: StoredRunSnapshotLike): ScenarioResultV1['provenance'] {
  const trace: any = storedRunSnapshot?.analysisTraceV1 ?? storedRunSnapshot?.workflow?.analysisTraceV1 ?? null;
  const prov: any = trace?.provenance ?? {};
  const engineVersions: any = storedRunSnapshot?.engineVersions ?? storedRunSnapshot?.workflow?.engineVersions ?? null;
  return {
    runId: safeString((storedRunSnapshot as any)?.runId, 120) || null,
    engineVersions: engineVersions && typeof engineVersions === 'object' ? engineVersions : null,
    snapshotIds: {
      tariffSnapshotId: safeString(prov?.tariffSnapshotId, 120) || null,
      generationEnergySnapshotId: safeString(prov?.generationEnergySnapshotId, 120) || null,
      addersSnapshotId: safeString(prov?.addersSnapshotId, 120) || null,
      exitFeesSnapshotId: safeString(prov?.exitFeesSnapshotId, 120) || null,
    },
  };
}

function policyAllowsAnnual(claimsPolicyV1: ClaimsPolicyV1 | null): boolean {
  const allowed: any = claimsPolicyV1?.allowedClaims ?? null;
  return Boolean(allowed?.canClaimAnnualUsdSavings);
}

function policyAllowsDemand(claimsPolicyV1: ClaimsPolicyV1 | null): boolean {
  const allowed: any = claimsPolicyV1?.allowedClaims ?? null;
  return Boolean(allowed?.canClaimDemandSavings);
}

function policyAllowsTariffSwitch(claimsPolicyV1: ClaimsPolicyV1 | null): boolean {
  const allowed: any = claimsPolicyV1?.allowedClaims ?? null;
  return Boolean(allowed?.canRecommendTariffSwitch);
}

function kpiCapexPayback(sel: any): { capexUsd: number | null; paybackYears: number | null } {
  const econ = sel?.economicsSummary ?? null;
  const capex = Number(econ?.capexTotalUsd);
  const payback = Number(econ?.paybackYears);
  return {
    capexUsd: Number.isFinite(capex) ? capex : null,
    paybackYears: Number.isFinite(payback) ? payback : null,
  };
}

function kpiAnnualUsdFromEcon(sel: any, kind: 'total' | 'energy' | 'demand_only' | 'tou_plus_demand'): number | null {
  const econ = sel?.economicsSummary ?? null;
  const by = econ?.savingsByCategoryUsd ?? null;
  const num = (x: any): number | null => {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  };
  if (kind === 'total') return num(econ?.annualSavingsTotalUsd);
  if (kind === 'energy') return num(by?.energyArbitrageUsd);
  const demand = num(by?.demandUsd) ?? 0;
  const ratchet = num(by?.ratchetUsd) ?? 0;
  if (kind === 'demand_only') return (num(by?.demandUsd) ?? num(by?.ratchetUsd)) !== null ? demand + ratchet : null;
  const energy = num(by?.energyArbitrageUsd) ?? 0;
  return (num(by?.energyArbitrageUsd) ?? num(by?.demandUsd) ?? num(by?.ratchetUsd)) !== null ? energy + demand + ratchet : null;
}

function baseBatteryPack(storedRunSnapshot: StoredRunSnapshotLike): any {
  return storedRunSnapshot?.batteryDecisionPackV1_2 ?? storedRunSnapshot?.workflow?.utility?.insights?.batteryDecisionPackV1_2 ?? null;
}

function selectedTopCandidate(pack: any): any | null {
  const top: any[] = Array.isArray(pack?.topCandidates) ? pack.topCandidates : [];
  const want = safeString(pack?.selected?.candidateId, 120);
  if (want) {
    const hit = top.find((c) => safeString((c as any)?.id, 120) === want) || null;
    if (hit) return hit;
  }
  return top[0] || null;
}

function hasBatteryEcon(storedRunSnapshot: StoredRunSnapshotLike): boolean {
  const pack = baseBatteryPack(storedRunSnapshot);
  const sel = selectedTopCandidate(pack);
  const econ = sel?.economicsSummary ?? null;
  return Boolean(econ && typeof econ === 'object');
}

function stableBlocked(scenarioId: string, title: string, category: ScenarioLabCategoryV1, confidenceTier: ScenarioLabConfidenceTierV1, provenance: ScenarioResultV1['provenance'], reasons: string[], requiredNext: string[]): ScenarioResultV1 {
  return {
    scenarioId,
    title,
    category,
    status: 'BLOCKED',
    confidenceTier,
    kpis: { annualUsd: null, annualKwh: null, peakKwReduction: null, capexUsd: null, paybackYears: null },
    gating: { blockedReasons: uniqSorted(reasons, 40), requiredNextData: uniqSorted(requiredNext, 40) },
    pros: [],
    cons: [],
    provenance,
  };
}

function stableSkipped(scenarioId: string, title: string, category: ScenarioLabCategoryV1, confidenceTier: ScenarioLabConfidenceTierV1, provenance: ScenarioResultV1['provenance'], reason: string): ScenarioResultV1 {
  return {
    scenarioId,
    title,
    category,
    status: 'SKIPPED',
    confidenceTier,
    kpis: { annualUsd: null, annualKwh: null, peakKwReduction: null, capexUsd: null, paybackYears: null },
    gating: { blockedReasons: uniqSorted([reason], 40), requiredNextData: [] },
    pros: [],
    cons: [],
    provenance,
  };
}

function stableRan(args: {
  scenarioId: string;
  title: string;
  category: ScenarioLabCategoryV1;
  confidenceTier: ScenarioLabConfidenceTierV1;
  provenance: ScenarioResultV1['provenance'];
  status?: ScenarioLabStatusV1;
  annualUsd: number | null;
  capexUsd: number | null;
  paybackYears: number | null;
  blockedReasons?: string[];
  requiredNextData?: string[];
  warnings?: string[];
}): Omit<ScenarioResultV1, 'pros' | 'cons'> & { notes?: { warnings?: string[] } } {
  const status: ScenarioLabStatusV1 = args.status ?? 'RAN';
  return {
    scenarioId: args.scenarioId,
    title: args.title,
    category: args.category,
    status,
    confidenceTier: args.confidenceTier,
    kpis: {
      annualUsd: args.annualUsd,
      annualKwh: null,
      peakKwReduction: null,
      capexUsd: args.capexUsd,
      paybackYears: args.paybackYears,
    },
    gating: {
      blockedReasons: uniqSorted(args.blockedReasons || [], 40),
      requiredNextData: uniqSorted(args.requiredNextData || [], 40),
    },
    provenance: args.provenance,
    notes: args.warnings?.length ? { warnings: uniqSorted(args.warnings, 40) } : undefined,
  };
}

function claimsPolicyRequiredNextData(claimsPolicyV1: ClaimsPolicyV1 | null): string[] {
  const req = Array.isArray(claimsPolicyV1?.requiredNextData) ? claimsPolicyV1!.requiredNextData : [];
  return req.map((r) => safeString((r as any)?.code || (r as any)?.label, 160)).filter(Boolean);
}

function analysisTraceCoverage(storedRunSnapshot: StoredRunSnapshotLike): any {
  const trace: any = storedRunSnapshot?.analysisTraceV1 ?? storedRunSnapshot?.workflow?.analysisTraceV1 ?? null;
  return trace?.coverage ?? {};
}

function hasRatchetHistory(storedRunSnapshot: StoredRunSnapshotLike): boolean | null {
  const cov = analysisTraceCoverage(storedRunSnapshot);
  if (cov?.hasRatchetHistory === null || cov?.hasRatchetHistory === undefined) return null;
  return Boolean(cov.hasRatchetHistory);
}

function tariffMatchStatus(storedRunSnapshot: StoredRunSnapshotLike): string {
  const cov = analysisTraceCoverage(storedRunSnapshot);
  return safeString(cov?.tariffMatchStatus, 40).toUpperCase() || 'UNKNOWN';
}

function verifierStatus(verifierResultV1: VerifierResultV1 | null): string {
  return safeString(verifierResultV1?.status, 10).toUpperCase() || 'UNKNOWN';
}

export const scenarioTemplatesV1: ScenarioTemplateV1[] = [
  {
    scenarioId: 'TARIFF_VALIDATE_CURRENT',
    title: 'Validate current tariff match (snapshot-only)',
    category: 'TARIFF',
    order: 1,
    evaluate: ({ storedRunSnapshot, truthSnapshotV1, verifierResultV1, claimsPolicyV1 }) => {
      const prov = buildProvenance(storedRunSnapshot);
      const pack = baseBatteryPack(storedRunSnapshot);
      const conf = tierFromTruthAndBattery({ truthTier: truthSnapshotV1?.truthConfidence?.tier, batteryTier: pack?.confidenceTier });

      const tms = tariffMatchStatus(storedRunSnapshot);
      const vStatus = verifierStatus(verifierResultV1);
      const blockedReasons: string[] = [];
      const requiredNext: string[] = [];
      if (tms !== 'FOUND') {
        blockedReasons.push(`tariffMatchStatus:${tms}`);
        requiredNext.push('rate_code');
      }
      if (vStatus === 'FAIL') blockedReasons.push('verifier:FAIL');

      // Tariff validation is always "RAN" (it can be informational), but still reports gating context.
      return stableRan({
        scenarioId: 'TARIFF_VALIDATE_CURRENT',
        title: 'Validate current tariff match (snapshot-only)',
        category: 'TARIFF',
        confidenceTier: conf,
        provenance: prov,
        annualUsd: null,
        capexUsd: null,
        paybackYears: null,
        blockedReasons: uniqSorted(blockedReasons, 40),
        requiredNextData: uniqSorted([...requiredNext, ...claimsPolicyRequiredNextData(claimsPolicyV1)], 40),
      });
    },
  },
  {
    scenarioId: 'TARIFF_RISK_RATCHET_EXPOSURE',
    title: 'Assess ratchet / demand-charge exposure (no optimizer)',
    category: 'TARIFF',
    order: 2,
    evaluate: ({ storedRunSnapshot, truthSnapshotV1, verifierResultV1, claimsPolicyV1 }) => {
      const prov = buildProvenance(storedRunSnapshot);
      const pack = baseBatteryPack(storedRunSnapshot);
      const conf = tierFromTruthAndBattery({ truthTier: truthSnapshotV1?.truthConfidence?.tier, batteryTier: pack?.confidenceTier });

      const det0: any =
        storedRunSnapshot?.workflow?.utility?.insights?.determinantsPackSummary?.meters?.[0]?.last12Cycles?.[0] ??
        null;
      const method = safeString(det0?.billingDemandMethod, 80);
      const looksDemand = Boolean(method);
      if (!looksDemand) return stableSkipped('TARIFF_RISK_RATCHET_EXPOSURE', 'Assess ratchet / demand-charge exposure (no optimizer)', 'TARIFF', conf, prov, 'not_a_demand_tariff_detected');

      const ratchetHist = hasRatchetHistory(storedRunSnapshot);
      const blockedReasons: string[] = [];
      const requiredNext: string[] = [];
      if (ratchetHist === false) {
        blockedReasons.push('ratchetHistory:MISSING');
        requiredNext.push('billing_history_12_months');
      }
      if (verifierStatus(verifierResultV1) === 'FAIL') blockedReasons.push('verifier:FAIL');

      return stableRan({
        scenarioId: 'TARIFF_RISK_RATCHET_EXPOSURE',
        title: 'Assess ratchet / demand-charge exposure (no optimizer)',
        category: 'TARIFF',
        confidenceTier: conf,
        provenance: prov,
        annualUsd: null,
        capexUsd: null,
        paybackYears: null,
        blockedReasons,
        requiredNextData: uniqSorted([...requiredNext, ...claimsPolicyRequiredNextData(claimsPolicyV1)], 40),
      });
    },
  },
  {
    scenarioId: 'BATTERY_TOU_ARBITRAGE_ONLY',
    title: 'Battery: TOU arbitrage only (energy shifting)',
    category: 'BATTERY',
    order: 10,
    evaluate: ({ storedRunSnapshot, truthSnapshotV1, verifierResultV1, claimsPolicyV1 }) => {
      const prov = buildProvenance(storedRunSnapshot);
      const pack = baseBatteryPack(storedRunSnapshot);
      const conf = confidenceFromCtx({ truthSnapshotV1, batteryDecisionPackV1_2: pack });

      if (!hasBatteryEcon(storedRunSnapshot)) {
        return stableBlocked(
          'BATTERY_TOU_ARBITRAGE_ONLY',
          'Battery: TOU arbitrage only (energy shifting)',
          'BATTERY',
          conf,
          prov,
          ['batteryDecisionPackV1_2.economicsSummary_missing'],
          ['interval_data', 'tariff_tou_prices'],
        );
      }

      const selTop = selectedTopCandidate(pack);
      const annual = kpiAnnualUsdFromEcon(selTop, 'energy');
      const k = kpiCapexPayback(selTop);

      const blockedReasons: string[] = [];
      const requiredNext: string[] = [];
      if (verifierStatus(verifierResultV1) === 'FAIL') blockedReasons.push('verifier:FAIL');

      const canClaim = policyAllowsAnnual(claimsPolicyV1);
      const annualOut = canClaim ? annual : null;
      if (!canClaim) blockedReasons.push('LIMITED_BY_CLAIMS_POLICY');

      return stableRan({
        scenarioId: 'BATTERY_TOU_ARBITRAGE_ONLY',
        title: 'Battery: TOU arbitrage only (energy shifting)',
        category: 'BATTERY',
        confidenceTier: conf,
        provenance: prov,
        annualUsd: annualOut,
        capexUsd: k.capexUsd,
        paybackYears: k.paybackYears,
        blockedReasons,
        requiredNextData: uniqSorted([...requiredNext, ...claimsPolicyRequiredNextData(claimsPolicyV1)], 40),
        warnings: uniqSorted(Array.isArray(pack?.warnings) ? pack.warnings.map(String) : [], 40),
      });
    },
  },
  {
    scenarioId: 'BATTERY_DEMAND_SHAVE_ONLY',
    title: 'Battery: demand shaving only',
    category: 'BATTERY',
    order: 11,
    evaluate: ({ storedRunSnapshot, truthSnapshotV1, verifierResultV1, claimsPolicyV1 }) => {
      const prov = buildProvenance(storedRunSnapshot);
      const pack = baseBatteryPack(storedRunSnapshot);
      const conf = confidenceFromCtx({ truthSnapshotV1, batteryDecisionPackV1_2: pack });

      const ratchetHist = hasRatchetHistory(storedRunSnapshot);
      const canDemand = policyAllowsDemand(claimsPolicyV1);
      if (ratchetHist === false || !canDemand) {
        return stableBlocked(
          'BATTERY_DEMAND_SHAVE_ONLY',
          'Battery: demand shaving only',
          'BATTERY',
          conf,
          prov,
          uniqSorted([ratchetHist === false ? 'ratchetHistory:MISSING' : '', !canDemand ? 'LIMITED_BY_CLAIMS_POLICY' : ''].filter(Boolean), 40),
          uniqSorted(['billing_history_12_months', ...claimsPolicyRequiredNextData(claimsPolicyV1)], 40),
        );
      }

      if (!hasBatteryEcon(storedRunSnapshot)) {
        return stableBlocked(
          'BATTERY_DEMAND_SHAVE_ONLY',
          'Battery: demand shaving only',
          'BATTERY',
          conf,
          prov,
          ['batteryDecisionPackV1_2.economicsSummary_missing'],
          ['interval_data', 'tariff_demand_charges'],
        );
      }

      const selTop = selectedTopCandidate(pack);
      const annual = kpiAnnualUsdFromEcon(selTop, 'demand_only');
      const k = kpiCapexPayback(selTop);

      const blockedReasons: string[] = [];
      if (verifierStatus(verifierResultV1) === 'FAIL') blockedReasons.push('verifier:FAIL');

      const canAnnual = policyAllowsAnnual(claimsPolicyV1);
      const annualOut = canAnnual ? annual : null;
      if (!canAnnual) blockedReasons.push('LIMITED_BY_CLAIMS_POLICY');

      return stableRan({
        scenarioId: 'BATTERY_DEMAND_SHAVE_ONLY',
        title: 'Battery: demand shaving only',
        category: 'BATTERY',
        confidenceTier: conf,
        provenance: prov,
        annualUsd: annualOut,
        capexUsd: k.capexUsd,
        paybackYears: k.paybackYears,
        blockedReasons,
        requiredNextData: uniqSorted(claimsPolicyRequiredNextData(claimsPolicyV1), 40),
        warnings: uniqSorted(Array.isArray(pack?.warnings) ? pack.warnings.map(String) : [], 40),
      });
    },
  },
  {
    scenarioId: 'BATTERY_HYBRID_TOU_PLUS_DEMAND',
    title: 'Battery: hybrid (TOU + demand)',
    category: 'BATTERY',
    order: 12,
    evaluate: ({ storedRunSnapshot, truthSnapshotV1, verifierResultV1, claimsPolicyV1 }) => {
      const prov = buildProvenance(storedRunSnapshot);
      const pack = baseBatteryPack(storedRunSnapshot);
      const conf = confidenceFromCtx({ truthSnapshotV1, batteryDecisionPackV1_2: pack });

      if (!hasBatteryEcon(storedRunSnapshot)) {
        return stableBlocked(
          'BATTERY_HYBRID_TOU_PLUS_DEMAND',
          'Battery: hybrid (TOU + demand)',
          'BATTERY',
          conf,
          prov,
          ['batteryDecisionPackV1_2.economicsSummary_missing'],
          ['interval_data', 'tariff_prices'],
        );
      }

      const selTop = selectedTopCandidate(pack);
      const annual = kpiAnnualUsdFromEcon(selTop, 'total');
      const k = kpiCapexPayback(selTop);

      const blockedReasons: string[] = [];
      const requiredNext: string[] = [];
      if (verifierStatus(verifierResultV1) === 'FAIL') blockedReasons.push('verifier:FAIL');

      const canAnnual = policyAllowsAnnual(claimsPolicyV1);
      const annualOut = canAnnual ? annual : null;
      if (!canAnnual) blockedReasons.push('LIMITED_BY_CLAIMS_POLICY');

      return stableRan({
        scenarioId: 'BATTERY_HYBRID_TOU_PLUS_DEMAND',
        title: 'Battery: hybrid (TOU + demand)',
        category: 'BATTERY',
        confidenceTier: conf,
        provenance: prov,
        annualUsd: annualOut,
        capexUsd: k.capexUsd,
        paybackYears: k.paybackYears,
        blockedReasons,
        requiredNextData: uniqSorted([...requiredNext, ...claimsPolicyRequiredNextData(claimsPolicyV1)], 40),
        warnings: uniqSorted(Array.isArray(pack?.warnings) ? pack.warnings.map(String) : [], 40),
      });
    },
  },
  {
    scenarioId: 'BATTERY_BACKUP_ONLY_SMALL',
    title: 'Battery: backup-only (small) — resilience value not monetized',
    category: 'RELIABILITY',
    order: 13,
    evaluate: ({ storedRunSnapshot, truthSnapshotV1, verifierResultV1, claimsPolicyV1 }) => {
      const prov = buildProvenance(storedRunSnapshot);
      const pack = baseBatteryPack(storedRunSnapshot);
      const conf = confidenceFromCtx({ truthSnapshotV1, batteryDecisionPackV1_2: pack });

      if (!hasBatteryEcon(storedRunSnapshot)) {
        return stableBlocked(
          'BATTERY_BACKUP_ONLY_SMALL',
          'Battery: backup-only (small) — resilience value not monetized',
          'RELIABILITY',
          conf,
          prov,
          ['batteryDecisionPackV1_2.economicsSummary_missing'],
          ['interval_data'],
        );
      }

      // Deterministic proxy: smallest topCandidate capex as "small".
      const top: any[] = Array.isArray(pack?.topCandidates) ? pack.topCandidates : [];
      const sorted = top
        .map((c) => ({ c, kwh: Number(c?.kwh), capex: Number(c?.economicsSummary?.capexTotalUsd) }))
        .filter((x) => Number.isFinite(x.kwh))
        .sort((a, b) => a.kwh - b.kwh || safeString(a?.c?.id, 80).localeCompare(safeString(b?.c?.id, 80)));
      const pick = sorted[0]?.c ?? selectedTopCandidate(pack);
      const k = kpiCapexPayback(pick);

      const blockedReasons: string[] = [];
      if (verifierStatus(verifierResultV1) === 'FAIL') blockedReasons.push('verifier:FAIL');

      // Always null annualUsd: backup value is not monetized in v1 templates.
      return stableRan({
        scenarioId: 'BATTERY_BACKUP_ONLY_SMALL',
        title: 'Battery: backup-only (small) — resilience value not monetized',
        category: 'RELIABILITY',
        confidenceTier: conf,
        provenance: prov,
        annualUsd: null,
        capexUsd: k.capexUsd,
        paybackYears: null,
        blockedReasons: uniqSorted(['resilience_value_not_monetized', ...blockedReasons], 40),
        requiredNextData: uniqSorted(claimsPolicyRequiredNextData(claimsPolicyV1), 40),
      });
    },
  },
  {
    scenarioId: 'BATTERY_BACKUP_ONLY_MED',
    title: 'Battery: backup-only (medium) — resilience value not monetized',
    category: 'RELIABILITY',
    order: 14,
    evaluate: ({ storedRunSnapshot, truthSnapshotV1, verifierResultV1, claimsPolicyV1 }) => {
      const prov = buildProvenance(storedRunSnapshot);
      const pack = baseBatteryPack(storedRunSnapshot);
      const conf = confidenceFromCtx({ truthSnapshotV1, batteryDecisionPackV1_2: pack });

      if (!hasBatteryEcon(storedRunSnapshot)) {
        return stableBlocked(
          'BATTERY_BACKUP_ONLY_MED',
          'Battery: backup-only (medium) — resilience value not monetized',
          'RELIABILITY',
          conf,
          prov,
          ['batteryDecisionPackV1_2.economicsSummary_missing'],
          ['interval_data'],
        );
      }

      const top: any[] = Array.isArray(pack?.topCandidates) ? pack.topCandidates : [];
      const sorted = top
        .map((c) => ({ c, kwh: Number(c?.kwh) }))
        .filter((x) => Number.isFinite(x.kwh))
        .sort((a, b) => a.kwh - b.kwh || safeString(a?.c?.id, 80).localeCompare(safeString(b?.c?.id, 80)));
      const mid = sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)]?.c : null;
      const pick = mid ?? selectedTopCandidate(pack);
      const k = kpiCapexPayback(pick);

      const blockedReasons: string[] = [];
      if (verifierStatus(verifierResultV1) === 'FAIL') blockedReasons.push('verifier:FAIL');

      return stableRan({
        scenarioId: 'BATTERY_BACKUP_ONLY_MED',
        title: 'Battery: backup-only (medium) — resilience value not monetized',
        category: 'RELIABILITY',
        confidenceTier: conf,
        provenance: prov,
        annualUsd: null,
        capexUsd: k.capexUsd,
        paybackYears: null,
        blockedReasons: uniqSorted(['resilience_value_not_monetized', ...blockedReasons], 40),
        requiredNextData: uniqSorted(claimsPolicyRequiredNextData(claimsPolicyV1), 40),
      });
    },
  },
  {
    scenarioId: 'BATTERY_NON_EXPORT',
    title: 'Battery: non-export / interconnection-limited mode',
    category: 'BATTERY',
    order: 15,
    evaluate: ({ storedRunSnapshot, truthSnapshotV1, verifierResultV1, claimsPolicyV1 }) => {
      const prov = buildProvenance(storedRunSnapshot);
      const pack = baseBatteryPack(storedRunSnapshot);
      const conf = confidenceFromCtx({ truthSnapshotV1, batteryDecisionPackV1_2: pack });

      const applied = pack?.constraints?.applied ?? null;
      const hasLimit = Number.isFinite(Number(applied?.interconnectionLimitKw)) || Boolean(applied?.noExport);
      if (!hasLimit) {
        return stableBlocked(
          'BATTERY_NON_EXPORT',
          'Battery: non-export / interconnection-limited mode',
          'BATTERY',
          conf,
          prov,
          ['interconnection_export_limit_unknown'],
          uniqSorted(['interconnection_limit_kw', 'export_policy', ...claimsPolicyRequiredNextData(claimsPolicyV1)], 40),
        );
      }

      if (!hasBatteryEcon(storedRunSnapshot)) {
        return stableBlocked(
          'BATTERY_NON_EXPORT',
          'Battery: non-export / interconnection-limited mode',
          'BATTERY',
          conf,
          prov,
          ['batteryDecisionPackV1_2.economicsSummary_missing'],
          ['interval_data'],
        );
      }

      const selTop = selectedTopCandidate(pack);
      const annual = kpiAnnualUsdFromEcon(selTop, 'total');
      const k = kpiCapexPayback(selTop);

      const blockedReasons: string[] = [];
      if (verifierStatus(verifierResultV1) === 'FAIL') blockedReasons.push('verifier:FAIL');
      const canAnnual = policyAllowsAnnual(claimsPolicyV1);
      const annualOut = canAnnual ? annual : null;
      if (!canAnnual) blockedReasons.push('LIMITED_BY_CLAIMS_POLICY');

      return stableRan({
        scenarioId: 'BATTERY_NON_EXPORT',
        title: 'Battery: non-export / interconnection-limited mode',
        category: 'BATTERY',
        confidenceTier: conf,
        provenance: prov,
        annualUsd: annualOut,
        capexUsd: k.capexUsd,
        paybackYears: k.paybackYears,
        blockedReasons: uniqSorted(['non_export_constraints_applied', ...blockedReasons], 40),
        requiredNextData: uniqSorted(claimsPolicyRequiredNextData(claimsPolicyV1), 40),
      });
    },
  },
  {
    scenarioId: 'BATTERY_DR_READY_MODE',
    title: 'Battery: DR-ready mode (requires DR inputs)',
    category: 'OPS',
    order: 16,
    evaluate: ({ storedRunSnapshot, truthSnapshotV1, verifierResultV1, claimsPolicyV1 }) => {
      const prov = buildProvenance(storedRunSnapshot);
      const pack = baseBatteryPack(storedRunSnapshot);
      const conf = confidenceFromCtx({ truthSnapshotV1, batteryDecisionPackV1_2: pack });

      const dr = storedRunSnapshot?.workflow?.utility?.insights?.storageOpportunityPackV1?.drReadinessV1 ?? null;
      const hasDr = Boolean(dr && typeof dr === 'object');
      if (!hasDr) {
        return stableBlocked(
          'BATTERY_DR_READY_MODE',
          'Battery: DR-ready mode (requires DR inputs)',
          'OPS',
          conf,
          prov,
          ['dr_inputs_missing'],
          uniqSorted(['dr_program_inputs', ...claimsPolicyRequiredNextData(claimsPolicyV1)], 40),
        );
      }

      // v1: no DR optimizer; treat as operational readiness scenario (no savings claim).
      const blockedReasons: string[] = [];
      if (verifierStatus(verifierResultV1) === 'FAIL') blockedReasons.push('verifier:FAIL');

      return stableRan({
        scenarioId: 'BATTERY_DR_READY_MODE',
        title: 'Battery: DR-ready mode (requires DR inputs)',
        category: 'OPS',
        confidenceTier: conf,
        provenance: prov,
        annualUsd: null,
        capexUsd: null,
        paybackYears: null,
        blockedReasons: uniqSorted(['dr_value_not_monetized_v1', ...blockedReasons], 40),
        requiredNextData: uniqSorted(claimsPolicyRequiredNextData(claimsPolicyV1), 40),
      });
    },
  },
  {
    scenarioId: 'TARIFF_LIGHT_VALIDATE_SWITCHES',
    title: 'Tariff: shortlist alternatives (no switch recommendation)',
    category: 'TARIFF',
    order: 20,
    evaluate: ({ storedRunSnapshot, truthSnapshotV1, verifierResultV1, claimsPolicyV1 }) => {
      const prov = buildProvenance(storedRunSnapshot);
      const pack = baseBatteryPack(storedRunSnapshot);
      const conf = tierFromTruthAndBattery({ truthTier: truthSnapshotV1?.truthConfidence?.tier, batteryTier: pack?.confidenceTier });
      const allowed = policyAllowsTariffSwitch(claimsPolicyV1);
      const blockedReasons: string[] = [];
      if (!allowed) blockedReasons.push('LIMITED_BY_CLAIMS_POLICY');
      if (verifierStatus(verifierResultV1) === 'FAIL') blockedReasons.push('verifier:FAIL');
      return stableRan({
        scenarioId: 'TARIFF_LIGHT_VALIDATE_SWITCHES',
        title: 'Tariff: shortlist alternatives (no switch recommendation)',
        category: 'TARIFF',
        confidenceTier: conf,
        provenance: prov,
        annualUsd: null,
        capexUsd: null,
        paybackYears: null,
        blockedReasons,
        requiredNextData: uniqSorted(claimsPolicyRequiredNextData(claimsPolicyV1), 40),
      });
    },
  },
];

// Hard bounds + deterministic ordering
scenarioTemplatesV1.sort((a, b) => a.order - b.order || a.scenarioId.localeCompare(b.scenarioId));
if (scenarioTemplatesV1.length > 15) scenarioTemplatesV1.length = 15;

