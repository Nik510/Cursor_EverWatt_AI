import { describe, expect, it } from 'vitest';
import { appendTariffOverrideAuditEventV1 } from '../src/modules/project/audit/tariffOverrideAuditV1';

describe('appendTariffOverrideAuditEventV1', () => {
  it('appends apply event with previousOverride and newOverride', () => {
    const prev = null;
    const next: any = {
      schemaVersion: 1,
      commodity: 'electric',
      utilityId: 'PGE',
      snapshotId: '2026-02-05T1200Z',
      tariffIdOrRateCode: 'B-19',
      selectedBy: 'user',
      selectedAt: '2026-02-11T00:00:00.000Z',
      selectionSource: 'bill_pdf_match',
      matchType: 'EXACT',
    };
    const out = appendTariffOverrideAuditEventV1({
      existingEvents: [],
      previousOverride: prev,
      newOverride: next,
      nowIso: '2026-02-11T00:01:00.000Z',
    });
    expect(out.length).toBe(1);
    expect(out[0].eventType).toBe('TARIFF_OVERRIDE_APPLIED');
    expect((out[0] as any).previousOverride).toBeNull();
    expect((out[0] as any).newOverride.tariffIdOrRateCode).toBe('B-19');
    expect((out[0] as any).selectionSource).toBe('bill_pdf_match');
    expect((out[0] as any).matchType).toBe('EXACT');
  });

  it('appends clear event with previousOverride and newOverride=null', () => {
    const prev: any = {
      schemaVersion: 1,
      commodity: 'electric',
      utilityId: 'PGE',
      snapshotId: '2026-02-05T1200Z',
      tariffIdOrRateCode: 'B-19',
      selectedBy: 'user',
      selectedAt: '2026-02-11T00:00:00.000Z',
      selectionSource: 'bill_pdf_match',
      matchType: 'EXACT',
    };
    const out = appendTariffOverrideAuditEventV1({
      existingEvents: [],
      previousOverride: prev,
      newOverride: null,
      nowIso: '2026-02-11T00:02:00.000Z',
    });
    expect(out.length).toBe(1);
    expect(out[0].eventType).toBe('TARIFF_OVERRIDE_CLEARED');
    expect((out[0] as any).previousOverride.tariffIdOrRateCode).toBe('B-19');
    expect((out[0] as any).newOverride).toBeNull();
  });
});

