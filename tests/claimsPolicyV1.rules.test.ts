import { describe, expect, it } from 'vitest';

import { evaluateClaimsPolicyV1 } from '../src/modules/claimsPolicyV1/evaluateClaimsPolicyV1';

describe('claimsPolicyV1 deterministic rules', () => {
  it('BLOCK when verifier FAIL', () => {
    const out = evaluateClaimsPolicyV1({
      analysisTraceV1: { coverage: { tariffMatchStatus: 'FOUND', hasRatchetHistory: true } },
      requiredInputsMissing: [],
      missingInfo: [],
      engineWarnings: [],
      verifierResultV1: { status: 'FAIL' },
    });
    expect(out.status).toBe('BLOCK');
    expect(out.allowedClaims.canClaimAnnualUsdSavings).toBe(false);
  });

  it('blocks financial claims when requiredInputsMissing present', () => {
    const out = evaluateClaimsPolicyV1({
      analysisTraceV1: { coverage: { tariffMatchStatus: 'FOUND', hasRatchetHistory: true } },
      requiredInputsMissing: ['Interval kW series required'],
      missingInfo: [],
      engineWarnings: [],
      verifierResultV1: { status: 'PASS' },
    });
    expect(out.allowedClaims.canClaimAnnualUsdSavings).toBe(false);
    expect(out.allowedClaims.canRecommendBatterySizing).toBe(false);
  });

  it('blocks demand savings when ratchet history missing', () => {
    const out = evaluateClaimsPolicyV1({
      analysisTraceV1: { coverage: { tariffMatchStatus: 'FOUND', hasRatchetHistory: false } },
      requiredInputsMissing: [],
      missingInfo: [],
      engineWarnings: [],
      verifierResultV1: { status: 'PASS' },
    });
    expect(out.allowedClaims.canClaimDemandSavings).toBe(false);
  });

  it('blocks tariff switch recommendation when tariff match ambiguous', () => {
    const out = evaluateClaimsPolicyV1({
      analysisTraceV1: { coverage: { tariffMatchStatus: 'AMBIGUOUS', hasRatchetHistory: true } },
      requiredInputsMissing: [],
      missingInfo: [],
      engineWarnings: [],
      verifierResultV1: { status: 'PASS' },
    });
    expect(out.allowedClaims.canRecommendTariffSwitch).toBe(false);
  });
});

