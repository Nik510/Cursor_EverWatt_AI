import type { MissingInfoItemV0 } from '../utilityIntelligence/missingInfo/types';
import type { EvidenceItemV1 } from './types';
import { applyPgeDemandRulesV1 } from './rules/pge';

export type DemandRuleInputV1 = {
  utility: string;
  rateCode: string;
  /** prior cycles for potential ratchets */
  history: Array<{ cycleLabel: string; kWMax: number | null; billingDemandKw?: number | null }>;
  computedKwMax: number | null;
  /** optional stated demand (billing record) */
  billingKwMax?: number | null;
};

export type DemandRuleOutputV1 = {
  billingDemandKw: number | null;
  /**
   * Optional ratchet floor demand (kW) when a ratchet rule applies.
   * When present, billingDemandKw is typically max(computedKwMax, ratchetDemandKw).
   */
  ratchetDemandKw?: number | null;
  /** Optional ratchet floor percent (e.g. 0.9 for 90%). */
  ratchetFloorPct?: number | null;
  /** Optional history maximum used in ratchet computation. */
  ratchetHistoryMaxKw?: number | null;
  /** Deterministic method tag for billingDemandKw derivation. */
  billingDemandMethod?: string;
  because: string[];
  evidence: EvidenceItemV1[];
  missingInfo: MissingInfoItemV0[];
  warnings: string[];
  confidence: number; // 0..1
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normalizeUtility(u: string): 'PGE' | 'SCE' | 'SDGE' | null {
  const x = String(u || '').trim().toUpperCase();
  if (x === 'PGE' || x === 'PG&E') return 'PGE';
  if (x === 'SCE') return 'SCE';
  if (x === 'SDGE' || x === 'SDG&E') return 'SDGE';
  return null;
}

export function applyDemandRulesV1(input: DemandRuleInputV1): DemandRuleOutputV1 {
  const utility = normalizeUtility(input.utility);
  if (utility === 'PGE') {
    return applyPgeDemandRulesV1({
      utility: 'PGE',
      rateCode: input.rateCode,
      history: input.history,
      computedKwMax: input.computedKwMax,
      billingKwMax: input.billingKwMax ?? null,
    });
  }

  // Default: no ratchet (explicitly)
  const missingInfo: MissingInfoItemV0[] = [];
  const warnings: string[] = [];
  const because: string[] = [];
  const evidence: EvidenceItemV1[] = [];

  if (!utility) {
    missingInfo.push({
      id: 'determinants.demandRules.utility.unsupported',
      category: 'tariff',
      severity: 'info',
      description: 'Demand rules not modeled for this utility (supported: PGE placeholder).',
    });
  } else {
    missingInfo.push({
      id: `determinants.demandRules.utility.${utility}.missing`,
      category: 'tariff',
      severity: 'info',
      description: `Demand ratchet/demand-window rules are not modeled for utility ${utility}; billing demand may differ from interval max demand.`,
    });
  }

  because.push('Applied default demand rule: no ratchet modeled (billingDemandKw = kWMax).');

  return {
    billingDemandKw: input.computedKwMax,
    because,
    evidence,
    missingInfo,
    warnings,
    confidence: clamp01(0.6),
  };
}

