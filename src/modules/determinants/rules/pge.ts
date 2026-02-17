import type { MissingInfoItemV0 } from '../../utilityIntelligence/missingInfo/types';
import type { EvidenceItemV1 } from '../types';
import type { DemandRuleOutputV1 } from '../demandRules';

export type PgeDemandRuleInputV1 = {
  utility: 'PGE';
  rateCode: string;
  history: Array<{ cycleLabel: string; kWMax: number | null; billingDemandKw?: number | null }>;
  computedKwMax: number | null;
  billingKwMax: number | null;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normRate(rateCode: string): string {
  return String(rateCode || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9]/g, '');
}

function rateFamily(rc: string): 'B19' | 'B20' | 'OTHER' {
  const s = normRate(rc);
  if (s.includes('B19')) return 'B19';
  if (s.includes('B20')) return 'B20';
  return 'OTHER';
}

/**
 * Deterministic warning codes for demand-rule decisions.
 */
export const PgeDemandRuleWarningCodesV1 = {
  DETERMINANT_RATCHET_UNSUPPORTED: 'DETERMINANT_RATCHET_UNSUPPORTED',
  DETERMINANT_RATCHET_NEEDS_HISTORY: 'DETERMINANT_RATCHET_NEEDS_HISTORY',
} as const;

/**
 * Common PG&E commercial ratchet pattern (v1 implementation).
 *
 * Formula (common pattern):
 *   ratchetFloorKw = floorPct * max(priorBillingDemandKwOrKwMax over historyWindow)
 *   billingDemandKw = max(computedKwMax, ratchetFloorKw)
 *
 * Notes:
 * - This is intended as a deterministic, auditable baseline for targeted tariffs.
 * - If history is missing, we do NOT silently apply a floor; we surface missingInfo + warning code.
 */
export const PGE_COMMON_RATCHET_FLOOR_PCT_V1 = 0.9;
export const PGE_COMMON_RATCHET_HISTORY_WINDOW_CYCLES_V1 = 11;
export const PGE_COMMON_RATCHET_METHOD_TAG_V1 = 'pge_ratchet_common_v1';

export function applyPgeDemandRulesV1(input: PgeDemandRuleInputV1): DemandRuleOutputV1 {
  const because: string[] = [];
  const warnings: string[] = [];
  const missingInfo: MissingInfoItemV0[] = [];
  const evidence: EvidenceItemV1[] = [];

  const fam = rateFamily(input.rateCode);

  if (input.computedKwMax === null || !Number.isFinite(input.computedKwMax)) {
    missingInfo.push({
      id: 'determinants.demandRules.computedKwMax.missing',
      category: 'tariff',
      severity: 'blocking',
      description: 'Computed interval max kW is missing; cannot apply demand rules.',
    });
    because.push('Computed interval max kW is missing; billingDemandKw cannot be derived.');
    return { billingDemandKw: null, because, evidence, missingInfo, warnings, confidence: 0.2 };
  }

  because.push(`Computed kWMax=${Number(input.computedKwMax).toFixed(3)} kW for cycle (interval-derived).`);

  // Default: billing demand equals interval max.
  let billingDemandKw = Number(input.computedKwMax);
  const out: DemandRuleOutputV1 = {
    billingDemandKw,
    ratchetDemandKw: null,
    ratchetFloorPct: null,
    ratchetHistoryMaxKw: null,
    billingDemandMethod: 'no_ratchet_v1',
    because: [...because, 'Applied default rule: no ratchet (billingDemandKw = kWMax).'],
    evidence,
    missingInfo,
    warnings,
    confidence: clamp01(0.65),
  };

  // Apply common ratchet for the targeted families.
  if (fam === 'B19' || fam === 'B20') {
    const floorPct = PGE_COMMON_RATCHET_FLOOR_PCT_V1;
    const hist = (input.history || []).slice(-PGE_COMMON_RATCHET_HISTORY_WINDOW_CYCLES_V1);
    const histVals = hist
      .map((h) => Number(h.billingDemandKw ?? h.kWMax))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (!histVals.length) {
      warnings.push(PgeDemandRuleWarningCodesV1.DETERMINANT_RATCHET_NEEDS_HISTORY);
      missingInfo.push({
        id: `determinants.demandRules.pge.ratchet.${PgeDemandRuleWarningCodesV1.DETERMINANT_RATCHET_NEEDS_HISTORY}`,
        category: 'tariff',
        severity: 'warning',
        description: `PG&E demand ratchet requires prior-month demand history (${PGE_COMMON_RATCHET_HISTORY_WINDOW_CYCLES_V1} month window). Provide prior billing cycles or usage history to compute ratchet floor.`,
        details: { reasonCode: PgeDemandRuleWarningCodesV1.DETERMINANT_RATCHET_NEEDS_HISTORY, historyWindowCycles: PGE_COMMON_RATCHET_HISTORY_WINDOW_CYCLES_V1 },
      } as any);
      out.because.push('Ratchet not applied due to missing history; billingDemandKw left as kWMax.');
      out.billingDemandMethod = PGE_COMMON_RATCHET_METHOD_TAG_V1;
      out.ratchetFloorPct = floorPct;
      return out;
    }

    const histMax = Math.max(...histVals);
    const ratchetFloorKw = histMax * floorPct;
    const billing = Math.max(Number(input.computedKwMax), ratchetFloorKw);
    out.ratchetHistoryMaxKw = histMax;
    out.ratchetFloorPct = floorPct;
    out.ratchetDemandKw = ratchetFloorKw;
    out.billingDemandKw = billing;
    out.billingDemandMethod = PGE_COMMON_RATCHET_METHOD_TAG_V1;
    out.because.push(
      `Applied PG&E ratchet floor (${PGE_COMMON_RATCHET_METHOD_TAG_V1}): billingDemandKw=max(kWMax, ${floorPct} * histMax) with histMax=${histMax.toFixed(3)}kW.`,
    );
    out.evidence.push({ kind: 'assumption', pointer: { source: 'demandRules:pge', key: 'ratchetFloorPct', value: floorPct } });
    out.evidence.push({ kind: 'assumption', pointer: { source: 'demandRules:pge', key: 'ratchetHistoryWindowCycles', value: PGE_COMMON_RATCHET_HISTORY_WINDOW_CYCLES_V1 } });
    out.evidence.push({ kind: 'intervalCalc', pointer: { source: 'demandRules:pge', key: 'ratchetHistoryMaxKw', value: histMax } });
    out.evidence.push({ kind: 'intervalCalc', pointer: { source: 'demandRules:pge', key: 'ratchetDemandKw', value: ratchetFloorKw } });
    return out;
  }

  // Unsupported for now: warnings-first.
  warnings.push(PgeDemandRuleWarningCodesV1.DETERMINANT_RATCHET_UNSUPPORTED);
  missingInfo.push({
    id: `determinants.demandRules.pge.ratchet.${PgeDemandRuleWarningCodesV1.DETERMINANT_RATCHET_UNSUPPORTED}`,
    category: 'tariff',
    severity: 'info',
    description: `PG&E demand ratchet not implemented for this tariff (rateCode=${input.rateCode}).`,
    details: { reasonCode: PgeDemandRuleWarningCodesV1.DETERMINANT_RATCHET_UNSUPPORTED, rateCode: input.rateCode },
  } as any);
  out.billingDemandMethod = 'pge_unsupported_v1';
  return out;

  // (unreachable)
}

