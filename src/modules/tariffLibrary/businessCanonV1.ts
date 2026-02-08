import type { TariffEvidenceV0, TariffRateMetadata } from './types';

function normRateCode(raw: string): string {
  const s = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
  const m = /^([A-Z]{1,3})-?(\d{1,3})([A-Z]?)$/.exec(s);
  if (m) return `${m[1]}-${m[2]}${m[3] || ''}`;
  return s;
}

function addCanonEvidence(args: { rate: TariffRateMetadata; fieldName: string; ruleId: string; value: string }): TariffEvidenceV0 {
  return {
    kind: 'meta',
    sourceUrl: args.rate.sourceUrl,
    fieldName: args.fieldName,
    inferenceRuleId: args.ruleId,
    matchedText: normRateCode(args.rate.rateCode),
    value: args.value,
  };
}

function classifyPgeBusinessFamilyV1(rateCodeRaw: string): { familyKey: string; ruleId: string } | null {
  const rc = normRateCode(rateCodeRaw);
  if (/^B-19/.test(rc)) return { familyKey: 'PGE_B19_FAMILY', ruleId: 'canon.pge.family.B-19*' };
  if (/^B-20/.test(rc)) return { familyKey: 'PGE_B20_FAMILY', ruleId: 'canon.pge.family.B-20*' };
  if (/^E-19/.test(rc)) return { familyKey: 'PGE_E19_FAMILY', ruleId: 'canon.pge.family.E-19*' };
  if (/^E-20/.test(rc)) return { familyKey: 'PGE_E20_FAMILY', ruleId: 'canon.pge.family.E-20*' };
  if (rc === 'B-10') return { familyKey: 'PGE_B10', ruleId: 'canon.pge.B-10' };
  return null;
}

export function applyTariffBusinessCanonV1(rate: TariffRateMetadata): TariffRateMetadata {
  const r: TariffRateMetadata = { ...(rate as any) };
  const evidence: TariffEvidenceV0[] = Array.isArray(r.evidence) ? r.evidence.slice() : [];

  const util = String((r as any).utility || '').toUpperCase();
  let family: { familyKey: string; ruleId: string } | null = null;
  if (util === 'PGE') family = classifyPgeBusinessFamilyV1(r.rateCode);

  if (family) {
    r.businessFamilyKey = family.familyKey;
    r.businessFamilySource = 'inferred';
    r.isEverWattCanonicalBusiness = true;
    evidence.push(addCanonEvidence({ rate: r, fieldName: 'businessFamilyKey', ruleId: family.ruleId, value: family.familyKey }));
    evidence.push(addCanonEvidence({ rate: r, fieldName: 'isEverWattCanonicalBusiness', ruleId: family.ruleId, value: 'true' }));
  } else {
    r.businessFamilyKey = null;
    r.businessFamilySource = 'unknown';
    r.isEverWattCanonicalBusiness = false;
  }

  r.evidence = evidence;
  return r;
}

