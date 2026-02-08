import { describe, expect, it } from 'vitest';
import { estimateAnnualKwh } from '../src/modules/utilityIntelligence/interval/annualize';

describe('utilityIntelligence annualize', () => {
  it('annualizes from a monthly scalar (low/medium confidence)', () => {
    const est = estimateAnnualKwh({ monthlyKwhScalar: 7200 });
    expect(est).not.toBeNull();
    expect(est!.annualKwhEstimate).toBe(86400);
    expect(est!.monthsUsed).toBe(1);
    expect(est!.confidence).toBeCloseTo(0.45, 6);
  });

  it('uses sum of 12 months when 12+ exist (high confidence)', () => {
    const months = new Array(12).fill(1000);
    const est = estimateAnnualKwh({ monthlyKwhValues: months });
    expect(est).not.toBeNull();
    expect(est!.annualKwhEstimate).toBe(12000);
    expect(est!.monthsUsed).toBe(12);
    expect(est!.confidence).toBeCloseTo(0.9, 6);
  });

  it('confidence differs for 1 month vs 12 months', () => {
    const a = estimateAnnualKwh({ monthlyKwhValues: [1000] })!;
    const b = estimateAnnualKwh({ monthlyKwhValues: new Array(12).fill(1000) })!;
    expect(b.confidence).toBeGreaterThan(a.confidence);
  });
});

