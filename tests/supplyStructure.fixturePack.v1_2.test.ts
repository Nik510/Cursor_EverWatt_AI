import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { extractBillPdfTariffHintsV1 } from '../src/modules/utilityIntelligence/billPdf/extractBillPdfTariffHintsV1';
import { detectSupplyStructureV1 } from '../src/modules/supplyStructureAnalyzerV1/detectSupplyStructureV1';

type Expectation = {
  fixtureFile: string;
  expected: {
    providerType: 'NONE' | 'CCA' | 'DA';
    iouUtility: string;
    lseName: string | null;
    daProviderName: string | null;
    confidence: number;
    evidenceMatchedPhrases: string[];
    warnings: string[];
    missingInfoIds: string[];
  };
};

function ids(items: any[]): string[] {
  return (items || [])
    .map((x) => String(x?.id || '').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function resolveRepoPath(rel: string): string {
  const raw = String(rel || '').trim();
  if (!raw) return '';
  const normalized = raw.replace(/\\/g, '/');
  return path.join(process.cwd(), ...normalized.split('/'));
}

describe('Supply Structure Analyzer v1.2 fixture pack contract (deterministic)', () => {
  it('matches all SSA v1.2 fixture expectations (fast)', () => {
    const expectationsPath = path.join(process.cwd(), 'tests', 'fixtures', 'supplyStructure', 'v1_2', 'expectations.ssa.v1_2.json');
    const expectations = JSON.parse(readFileSync(expectationsPath, 'utf-8')) as Expectation[];
    expect(Array.isArray(expectations)).toBe(true);
    expect(expectations.length).toBeGreaterThanOrEqual(20);

    for (const ex of expectations) {
      const fp = resolveRepoPath(ex.fixtureFile);
      const billText = readFileSync(fp, 'utf-8');
      const hints = extractBillPdfTariffHintsV1(billText);

      const out = detectSupplyStructureV1({
        billPdfText: billText,
        billHints: { utilityHint: hints?.utilityHint ?? null, rateScheduleText: hints?.rateScheduleText ?? null },
      });

      expect(out.providerType, ex.fixtureFile).toBe(ex.expected.providerType);
      expect(out.iouUtility, ex.fixtureFile).toBe(ex.expected.iouUtility);
      expect(out.lseName, ex.fixtureFile).toBe(ex.expected.lseName);
      expect(out.daProviderName, ex.fixtureFile).toBe(ex.expected.daProviderName);
      expect(out.confidence, ex.fixtureFile).toBeCloseTo(ex.expected.confidence, 6);
      expect(Array.isArray(out.evidence?.matchedPhrases)).toBe(true);
      expect(out.evidence.matchedPhrases, ex.fixtureFile).toEqual(ex.expected.evidenceMatchedPhrases);
      expect(out.warnings, ex.fixtureFile).toEqual(ex.expected.warnings);
      expect(ids(out.missingInfo as any), ex.fixtureFile).toEqual(ex.expected.missingInfoIds);
    }
  });
});

