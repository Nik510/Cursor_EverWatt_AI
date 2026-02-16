import { describe, expect, it } from 'vitest';
import { extractBillPdfTariffHintsV1 } from '../src/modules/utilityIntelligence/billPdf/extractBillPdfTariffHintsV1';

describe('extractBillPdfTariffHintsV1', () => {
  it('extracts explicit utility + Rate Schedule: B-19', () => {
    const text = `
      PG&E
      Account: 123
      Rate Schedule: B-19
      Billing period: 01/01/2026 - 01/31/2026
    `;
    const out = extractBillPdfTariffHintsV1(text);
    expect(out).toBeTruthy();
    expect(out?.utilityHint).toBe('PG&E');
    expect(out?.rateScheduleText).toBe('B-19');
    expect(out?.evidence.source).toBe('bill_pdf');
    expect(out?.evidence.matchedText.join(' ')).toMatch(/rate schedule/i);
  });

  it('extracts explicit utility + Schedule: TOU-GS-3', () => {
    const text = `
      Southern California Edison (SCE)
      Schedule: TOU-GS-3
      Some other text
    `;
    const out = extractBillPdfTariffHintsV1(text);
    expect(out?.utilityHint).toBe('SCE');
    expect(out?.rateScheduleText).toBe('TOU-GS-3');
    expect(out?.warnings.some((w) => w.code === 'BILL_RATE_SCHEDULE_MISSING')).toBe(false);
  });

  it('emits BILL_RATE_SCHEDULE_MISSING when schedule label is absent', () => {
    const text = `
      SDG&E
      This is a bill statement.
      Delivery charges...
    `;
    const out = extractBillPdfTariffHintsV1(text);
    expect(out?.utilityHint).toBe('SDG&E');
    expect(out?.rateScheduleText).toBeUndefined();
    expect(out?.warnings.some((w) => w.code === 'BILL_RATE_SCHEDULE_MISSING')).toBe(true);
  });
});

