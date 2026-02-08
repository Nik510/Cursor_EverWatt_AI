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
 * Placeholder ratchet floors (NOT authoritative).
 *
 * These constants exist to make the demand-rule slot reproducible and auditable.
 * Before using in production decisions, validate against PG&E tariff schedules.
 */
export const PGE_B19_RATCHET_FLOOR_PCT_V1 = null as null | number; // e.g., 0.9 for 90% ratchet (unknown in v1)
export const PGE_B20_RATCHET_FLOOR_PCT_V1 = null as null | number;

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

  // Default: no ratchet modeled.
  let billingDemandKw = Number(input.computedKwMax);
  because.push('Applied default rule: no ratchet modeled (billingDemandKw = kWMax).');

  // Rate-family placeholders: explicitly surface that ratchets are not modeled.
  if (fam === 'B19' || fam === 'B20') {
    const floorPct = fam === 'B19' ? PGE_B19_RATCHET_FLOOR_PCT_V1 : PGE_B20_RATCHET_FLOOR_PCT_V1;
    if (floorPct === null) {
      missingInfo.push({
        id: `determinants.demandRules.pge.${fam}.ratchet.unmodeled`,
        category: 'tariff',
        severity: 'info',
        description: `Demand ratchet rule is not modeled for PG&E ${fam === 'B19' ? 'B-19' : 'B-20'}; billing demand may differ from interval max demand.`,
      });
      warnings.push('Demand ratchet/demand-window rules are placeholders in v1; verify demand determinants before relying on billing-demand values.');
    } else {
      // Hook: apply a ratchet floor based on prior history maximum.
      const histMax = Math.max(
        0,
        ...input.history
          .map((h) => Number(h.billingDemandKw ?? h.kWMax))
          .filter((n) => Number.isFinite(n) && n > 0),
      );
      const floor = histMax * floorPct;
      if (Number.isFinite(floor) && floor > billingDemandKw) {
        billingDemandKw = floor;
        because.push(`Applied ratchet floor: billingDemandKw=max(kWMax, ${floorPct} * histMax) with histMax=${histMax.toFixed(2)}kW.`);
        evidence.push({ kind: 'assumption', pointer: { source: 'demandRules:pge', key: 'ratchetFloorPct', value: floorPct } });
      }
    }
  } else {
    missingInfo.push({
      id: 'determinants.demandRules.pge.rateFamily.unmodeled',
      category: 'tariff',
      severity: 'info',
      description: `Demand rules not modeled for PG&E rate family (rateCode=${input.rateCode}).`,
    });
  }

  return {
    billingDemandKw,
    because,
    evidence,
    missingInfo,
    warnings,
    confidence: clamp01(0.65),
  };
}

