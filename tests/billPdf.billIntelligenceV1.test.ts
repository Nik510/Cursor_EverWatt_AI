import { describe, expect, it } from 'vitest';
import { analyzeBillIntelligenceV1 } from '../src/modules/utilityIntelligence/billPdf/analyzeBillIntelligenceV1';
import { BillIntelligenceWarningCodesV1 } from '../src/modules/utilityIntelligence/billIntelligence/typesV1';

describe('analyzeBillIntelligenceV1', () => {
  it('extracts labeled facts and computes derived metrics when all labels are present', () => {
    const text = `
      Billing Period: 01/01/2026 - 01/31/2026
      Total kWh: 12000
      Amount Due: $2400.50
      Peak Demand kW: 150
      Rate Schedule: B-19
      PG&E
    `;
    const out = analyzeBillIntelligenceV1({
      billPdfText: text,
      billPdfTariffTruth: {
        utilityHint: 'PG&E',
        rateScheduleText: 'B-19',
        evidence: { source: 'bill_pdf', matchedText: ['Rate Schedule: B-19', 'PG&E'] },
        warnings: [],
      },
    });

    expect(out.extractedFacts.totalKwh?.value).toBe(12000);
    expect(out.extractedFacts.totalDollars?.value).toBeCloseTo(2400.5, 3);
    expect(out.extractedFacts.peakKw?.value).toBe(150);
    expect(out.extractedFacts.billingPeriod?.startDateIso).toBe('2026-01-01');
    expect(out.extractedFacts.billingPeriod?.endDateIso).toBe('2026-01-31');
    expect(out.extractedFacts.rateScheduleText?.value).toBe('B-19');
    expect(out.extractedFacts.utilityHint?.value).toBe('PG&E');
    expect(out.extractedFacts.totalKwh?.evidence.ruleId).toBe('total_kwh_label');

    expect(out.derivedMetrics.blendedRate?.value).toBeCloseTo(2400.5 / 12000, 6);
    expect(out.derivedMetrics.avgDailyKwh?.value).toBeCloseTo(12000 / 31, 6);
    expect(out.derivedMetrics.avgKw?.value).toBeCloseTo(12000 / (31 * 24), 6);
    expect(out.derivedMetrics.demandFactorApprox?.value).toBeCloseTo((12000 / (31 * 24)) / 150, 6);

    const codes = out.warnings.map((w) => w.code);
    expect(codes).not.toContain(BillIntelligenceWarningCodesV1.BILL_INTEL_MISSING_TOTAL_KWH);
    expect(codes).not.toContain(BillIntelligenceWarningCodesV1.BILL_INTEL_MISSING_TOTAL_DOLLARS);
    expect(codes).not.toContain(BillIntelligenceWarningCodesV1.BILL_INTEL_MISSING_BILLING_PERIOD_DATES);
    expect(codes).not.toContain(BillIntelligenceWarningCodesV1.BILL_INTEL_MISSING_PEAK_KW);
  });

  it('emits missing-field warnings when dollars/dates/peak are absent', () => {
    const text = `
      Customer: Example Co
      Total kWh: 5000
    `;
    const out = analyzeBillIntelligenceV1({ billPdfText: text });

    expect(out.extractedFacts.totalKwh?.value).toBe(5000);
    expect(out.derivedMetrics.blendedRate).toBeUndefined();
    expect(out.derivedMetrics.avgDailyKwh).toBeUndefined();
    expect(out.derivedMetrics.demandFactorApprox).toBeUndefined();

    const codes = out.warnings.map((w) => w.code);
    expect(codes).toContain(BillIntelligenceWarningCodesV1.BILL_INTEL_MISSING_TOTAL_DOLLARS);
    expect(codes).toContain(BillIntelligenceWarningCodesV1.BILL_INTEL_MISSING_BILLING_PERIOD_DATES);
    expect(codes).toContain(BillIntelligenceWarningCodesV1.BILL_INTEL_MISSING_PEAK_KW);
  });

  it('does not parse ambiguous day/month and emits warning', () => {
    const text = `Billing Period: 03/04/2025 - 04/05/2025`;
    const out = analyzeBillIntelligenceV1({ billPdfText: text });
    const codes = out.warnings.map((w) => w.code);
    expect(out.extractedFacts.billingPeriod).toBeUndefined();
    expect(codes).toContain(BillIntelligenceWarningCodesV1.BILL_INTEL_BILLING_PERIOD_AMBIGUOUS_DATE_FORMAT);
  });

  it('selects strongest dollars label and warns when multiple', () => {
    const text = `
      Total Charges: $150.00
      Amount Due: $200.00
      Total Current Charges: $180.00
    `;
    const out = analyzeBillIntelligenceV1({ billPdfText: text });
    expect(out.extractedFacts.totalDollars?.value).toBe(200);
    const codes = out.warnings.map((w) => w.code);
    expect(codes).toContain(BillIntelligenceWarningCodesV1.BILL_INTEL_MULTIPLE_DOLLARS_CANDIDATES);
  });

  it('does not compute demandFactorApprox when peak kW is zero', () => {
    const text = `
      Total kWh: 1000
      Billing Period: 01/01/2026 - 01/31/2026
      Peak Demand kW: 0
    `;
    const out = analyzeBillIntelligenceV1({ billPdfText: text });
    expect(out.derivedMetrics.demandFactorApprox).toBeUndefined();
  });
});
