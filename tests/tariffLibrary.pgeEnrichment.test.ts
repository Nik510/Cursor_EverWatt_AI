import { describe, expect, test } from 'vitest';

import { enrichTariffRateV1 } from '../src/modules/tariffLibrary/enrichment/enrichTariffRateV1';
import { extractPdfHeaderHintsV1 } from '../src/modules/tariffLibrary/enrichment/pdfHeaderSniffV1';
import { computeTariffMetadataCompletenessV0 } from '../src/modules/tariffLibrary/completeness';

function baseRate(rateCode: string) {
  return {
    utility: 'PGE',
    rateCode,
    sourceUrl: `https://example.com/${encodeURIComponent(rateCode)}.pdf`,
    lastVerifiedAt: '2026-02-08T00:00:00.000Z',
    evidence: [],
  } as any;
}

describe('tariffLibrary: PG&E enrichment v1', () => {
  test('rulebook fills customerClass/voltage for A-10, B-19, B-20', () => {
    for (const code of ['A-10', 'B-19', 'B-20']) {
      const r = enrichTariffRateV1({ base: baseRate(code) });
      expect(String(r.customerClass || '')).not.toBe('');
      expect(String(r.customerClassSource || '')).toBe('inferred');
      expect(String(r.voltage || '')).not.toBe('');
      expect(String(r.voltageSource || '')).toBe('inferred');
      const ev = (r.evidence || []).find((e: any) => e?.inferenceRuleId && e?.fieldName === 'customerClass');
      expect(Boolean(ev)).toBe(true);
    }
  });

  test('inferred badge condition is satisfied when rulebook is used', () => {
    const r = enrichTariffRateV1({ base: baseRate('B-19') });
    expect(r.customerClassSource).toBe('inferred');
    expect(r.customerClassSource).not.toBe('explicit');
  });

  test('PDF sniff evidence format is field-scoped and hashed', () => {
    const pdfText =
      '%PDF-1.4\n' +
      'Schedule E-19\n' +
      'Applicable To: Large Nonresidential Customers\n' +
      'Voltage: Primary Service\n' +
      'Time-Of-Use\n' +
      'Effective 01/01/2026\n';
    const hints = extractPdfHeaderHintsV1(pdfText);
    expect(Boolean(hints)).toBe(true);

    const r = enrichTariffRateV1({
      base: baseRate('E-19'),
      pdfHints: { voltage: hints?.voltage, eligibilityNotes: hints?.eligibilityNotes, effectiveStart: hints?.effectiveStart ?? null, sourceTitle: hints?.sourceTitle },
      pdfEvidence: Object.entries(hints?.evidenceSnippetsByField || {}).map(([fieldName, snippet]) => ({ fieldName, snippet })),
    });

    // voltage should upgrade from inferred -> pdf if present
    expect(r.voltage).toBe('primary');
    expect(r.voltageSource).toBe('pdf');

    const pdfEv = (r.evidence || []).find((e: any) => e?.kind === 'pdf' && e?.fieldName && e?.snippetHash && e?.sourceUrl);
    expect(Boolean(pdfEv)).toBe(true);
  });

  test('completeness score increases after enrichment', () => {
    const rawRates: any[] = [
      { utility: 'PGE', rateCode: 'A-10', sourceUrl: 'x', lastVerifiedAt: '2026-02-08T00:00:00.000Z', customerClass: 'unknown', voltage: 'unknown', eligibilityNotes: '', effectiveStart: null, effectiveEnd: null },
      { utility: 'PGE', rateCode: 'B-19', sourceUrl: 'y', lastVerifiedAt: '2026-02-08T00:00:00.000Z', customerClass: 'unknown', voltage: 'unknown', eligibilityNotes: '', effectiveStart: null, effectiveEnd: null },
    ];
    const before = computeTariffMetadataCompletenessV0(rawRates as any);
    const enriched = rawRates.map((rr) => enrichTariffRateV1({ base: rr }));
    const after = computeTariffMetadataCompletenessV0(enriched as any);
    expect(after.customerClassPct).toBeGreaterThan(before.customerClassPct);
    expect(after.voltagePct).toBeGreaterThan(before.voltagePct);
  });
});

