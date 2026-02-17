import { describe, it, expect } from 'vitest';

import { applyDemandRulesV1 } from '../src/modules/determinants/demandRules';
import { PgeDemandRuleWarningCodesV1, PGE_COMMON_RATCHET_FLOOR_PCT_V1 } from '../src/modules/determinants/rules/pge';

describe('determinants: PG&E ratchet demand rules (common case)', () => {
  it('applies ratchet floor when history max is higher', () => {
    const out = applyDemandRulesV1({
      utility: 'PGE',
      rateCode: 'B-19',
      history: [
        { cycleLabel: '2025-12', kWMax: 120, billingDemandKw: 120 },
        { cycleLabel: '2026-01', kWMax: 200, billingDemandKw: 200 },
      ],
      computedKwMax: 100,
      billingKwMax: null,
    });

    const expectedFloor = 200 * PGE_COMMON_RATCHET_FLOOR_PCT_V1;
    expect(Number(out.ratchetDemandKw)).toBeCloseTo(expectedFloor, 8);
    expect(Number(out.billingDemandKw)).toBeCloseTo(expectedFloor, 8);
    expect(String(out.billingDemandMethod || '')).toContain('pge_ratchet_common_v1');
    expect((out.warnings || []).includes(PgeDemandRuleWarningCodesV1.DETERMINANT_RATCHET_UNSUPPORTED)).toBe(false);
    expect((out.warnings || []).includes(PgeDemandRuleWarningCodesV1.DETERMINANT_RATCHET_NEEDS_HISTORY)).toBe(false);
  });

  it('does not reduce billing demand below computed max', () => {
    const out = applyDemandRulesV1({
      utility: 'PGE',
      rateCode: 'B-19',
      history: [{ cycleLabel: '2026-01', kWMax: 150, billingDemandKw: 150 }],
      computedKwMax: 250,
      billingKwMax: null,
    });

    expect(Number(out.ratchetDemandKw)).toBeCloseTo(150 * PGE_COMMON_RATCHET_FLOOR_PCT_V1, 8);
    expect(Number(out.billingDemandKw)).toBeCloseTo(250, 8);
  });

  it('emits explicit needs-history missingInfo when prior cycles are absent', () => {
    const out = applyDemandRulesV1({
      utility: 'PGE',
      rateCode: 'B-19',
      history: [],
      computedKwMax: 100,
      billingKwMax: null,
    });

    expect(out.billingDemandKw).toBe(100);
    expect(out.ratchetDemandKw).toBe(null);
    expect(out.warnings).toContain(PgeDemandRuleWarningCodesV1.DETERMINANT_RATCHET_NEEDS_HISTORY);
    expect(out.missingInfo.some((it) => String(it?.id || '').includes(PgeDemandRuleWarningCodesV1.DETERMINANT_RATCHET_NEEDS_HISTORY))).toBe(true);
  });
});

