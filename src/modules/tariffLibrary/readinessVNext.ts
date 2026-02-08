import type { TariffEvidenceV0, TariffRateMetadata } from './types';

function normRateCode(raw: string): string {
  const s = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
  const m = /^([A-Z]{1,3})-?(\d{1,3})([A-Z]?)$/.exec(s);
  if (m) return `${m[1]}-${m[2]}${m[3] || ''}`;
  return s;
}

function addInferEvidence(args: { rate: TariffRateMetadata; fieldName: string; ruleId: string; value: string }): TariffEvidenceV0 {
  return {
    kind: 'meta',
    fieldName: args.fieldName,
    inferenceRuleId: args.ruleId,
    matchedText: normRateCode(args.rate.rateCode),
    value: args.value,
    sourceUrl: args.rate.sourceUrl,
  };
}

/**
 * Deterministic, conservative readiness inference for downstream billing/battery engines.
 * No $ math; no effective date guessing.
 */
export function applyTariffReadinessVNext(rate: TariffRateMetadata): TariffRateMetadata {
  const r: TariffRateMetadata = { ...(rate as any) };
  const rc = normRateCode(r.rateCode);
  const evidence: TariffEvidenceV0[] = Array.isArray(r.evidence) ? r.evidence.slice() : [];

  // Only infer readiness for business-relevant tariffs.
  const isBusiness = Boolean((r as any).isBusinessRelevant);
  if (!isBusiness) {
    r.chargeDeterminantsVNext = { determinantsSource: 'unknown' };
    r.evidence = evidence;
    return r;
  }

  const isCommonBusinessFamily = /^B-(19|20)/.test(rc) || /^E-(19|20)/.test(rc);
  if (isCommonBusinessFamily) {
    r.chargeDeterminantsVNext = {
      hasDemandCharges: true,
      demandChargeTypes: ['max_kw'],
      hasTouEnergy: true,
      touPeriodsObserved: null,
      determinantsSource: 'inferred',
    };
    evidence.push(addInferEvidence({ rate: r, fieldName: 'chargeDeterminantsVNext.hasDemandCharges', ruleId: 'infer.readiness.commonBusinessFamilies', value: 'true' }));
    evidence.push(addInferEvidence({ rate: r, fieldName: 'chargeDeterminantsVNext.demandChargeTypes', ruleId: 'infer.readiness.commonBusinessFamilies', value: 'max_kw' }));
    evidence.push(addInferEvidence({ rate: r, fieldName: 'chargeDeterminantsVNext.hasTouEnergy', ruleId: 'infer.readiness.commonBusinessFamilies', value: 'true' }));
  } else {
    r.chargeDeterminantsVNext = { determinantsSource: 'unknown' };
  }

  r.evidence = evidence;
  return r;
}

