import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

import { extractBillPdfTariffHintsV1 } from '../src/modules/utilityIntelligence/billPdf/extractBillPdfTariffHintsV1';
import { matchBillTariffToLibraryV1 } from '../src/modules/tariffLibrary/matching/matchBillTariffToLibraryV1';
import { resolveFixturePath } from './helpers/fixturePath';

type Expectation = {
  fixtureFile: string;
  expectedUtility: string; // PGE|SCE|SDGE|SOCALGAS|UNKNOWN|...
  expectedSupplyType: 'ELECTRIC' | 'GAS';
  expectedExtractedRateLabel: string | null;
  expectedMatchStatus: 'EXACT' | 'NORMALIZED' | 'AMBIGUOUS' | 'NOT_FOUND';
  expectedTopCandidates: string[];
  expectedMissingInfoIds: string[];
};

function uniqSorted(arr: string[]): string[] {
  return Array.from(new Set(arr.map((s) => String(s || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function loadPackCase(args: { packPath: string; caseId: string }): string {
  const raw = readFileSync(args.packPath, 'utf-8');
  const lines = raw.split(/\r?\n/);
  const header = `=== CASE: ${args.caseId} ===`;
  let i = lines.findIndex((l) => l.trim() === header);
  if (i < 0) throw new Error(`Case not found in pack: ${args.packPath}#${args.caseId}`);
  i++;
  const body: string[] = [];
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim().startsWith('=== CASE: ')) break;
    body.push(l);
  }
  return body.join('\n').trim() + '\n';
}

function loadFixtureText(fixtureFile: string): string {
  const [rel, caseId] = fixtureFile.split('#');
  const fp = resolveFixturePath(rel);
  if (caseId) return loadPackCase({ packPath: fp, caseId });
  return readFileSync(fp, 'utf-8');
}

function utilityHintToLibraryId(u: string | undefined): string | null {
  const x = String(u || '').trim();
  if (x === 'PG&E') return 'PGE';
  if (x === 'SCE') return 'SCE';
  if (x === 'SDG&E') return 'SDGE';
  if (x === 'SoCalGas') return 'SOCALGAS';
  return null;
}

function buildSnapshotRegistry() {
  const base = {
    versionTag: 'fixture-2026-02-10T0000Z',
    capturedAt: '2026-02-10T00:00:00.000Z',
  };
  return {
    electric: {
      PGE: {
        ...base,
        rates: [
          { rateCode: 'E-19', sourceUrl: 'https://example.com/pge/e-19' },
          { rateCode: 'E-20', sourceUrl: 'https://example.com/pge/e-20' },
          { rateCode: 'B-19', sourceUrl: 'https://example.com/pge/b-19' },
          { rateCode: 'B-20', sourceUrl: 'https://example.com/pge/b-20' },
          { rateCode: 'B-10', sourceUrl: 'https://example.com/pge/b-10' },
          { rateCode: 'AG-1', sourceUrl: 'https://example.com/pge/ag-1' },
        ],
      },
      PGE_AMBIGUOUS: {
        ...base,
        rates: [
          { rateCode: 'E-19', sourceUrl: 'https://example.com/pge/e-19' },
          { rateCode: 'E_19', sourceUrl: 'https://example.com/pge/e_19' }, // crafted duplicate for ambiguity
        ],
      },
      SCE: {
        ...base,
        rates: [{ rateCode: 'TOU-D-Prime', sourceUrl: 'https://example.com/sce/tou-d-prime' }],
      },
      SCE_AMBIGUOUS: {
        ...base,
        rates: [
          { rateCode: 'TOU-D-Prime', sourceUrl: 'https://example.com/sce/tou-d-prime' },
          { rateCode: 'TOU_D_Prime', sourceUrl: 'https://example.com/sce/tou_d_prime' }, // crafted duplicate for ambiguity
        ],
      },
      SDGE: {
        ...base,
        rates: [{ rateCode: 'AL-TOU', sourceUrl: 'https://example.com/sdge/al-tou' }],
      },
      SDGE_AMBIGUOUS: {
        ...base,
        rates: [
          { rateCode: 'AL-TOU', sourceUrl: 'https://example.com/sdge/al-tou' },
          { rateCode: 'AL_TOU', sourceUrl: 'https://example.com/sdge/al_tou' }, // crafted duplicate for ambiguity
        ],
      },
    },
    gas: {
      SOCALGAS: {
        ...base,
        rates: [
          { rateCode: 'GR', sourceUrl: 'https://example.com/socalgas/gr' },
          { rateCode: 'G-NR1', sourceUrl: 'https://example.com/socalgas/g-nr1' },
        ],
      },
      SOCALGAS_AMBIGUOUS: {
        ...base,
        rates: [
          { rateCode: 'G-NR1', sourceUrl: 'https://example.com/socalgas/g-nr1' },
          { rateCode: 'G_NR1', sourceUrl: 'https://example.com/socalgas/g_nr1' }, // crafted duplicate for ambiguity
        ],
      },
    },
  } as const;
}

function computeMatchStatus(match: any): 'EXACT' | 'NORMALIZED' | 'AMBIGUOUS' | 'NOT_FOUND' {
  const warnings = Array.isArray(match?.warnings) ? match.warnings.map((w: any) => String(w || '')) : [];
  if (warnings.includes('BILL_TARIFF_AMBIGUOUS')) return 'AMBIGUOUS';
  if (match?.resolved?.matchType === 'EXACT') return 'EXACT';
  if (match?.resolved?.matchType === 'NORMALIZED') return 'NORMALIZED';
  if (warnings.includes('BILL_TARIFF_NOT_FOUND_IN_LIBRARY')) return 'NOT_FOUND';
  return 'NOT_FOUND';
}

describe('billPdf fixture pack (CA): tariff hints + tariff library match (deterministic)', () => {
  it('matches all fixture expectations', () => {
    const t0 = Date.now();
    const expectationsPath = resolveFixturePath('tests/fixtures/bills/ca/expectations.billTariffMatch.ca.v1.json');
    const expectations = JSON.parse(readFileSync(expectationsPath, 'utf-8')) as Expectation[];
    expect(Array.isArray(expectations)).toBe(true);
    expect(expectations.length).toBeGreaterThan(10);

    const registry = buildSnapshotRegistry();

    for (const ex of expectations) {
      try {
        const billText = loadFixtureText(ex.fixtureFile);
        const hints = extractBillPdfTariffHintsV1(billText);
        expect(hints).toBeTruthy();

        const utilityRaw = hints?.utilityHint ? String(hints.utilityHint) : null;
        const utilityKey = utilityHintToLibraryId(hints?.utilityHint) || utilityRaw;
        if (String(ex.expectedUtility) === 'UNKNOWN') {
          expect(utilityKey).toBe(null);
        } else {
          expect(utilityKey).toBe(ex.expectedUtility);
        }

        const extractedRate = hints?.rateScheduleText ? String(hints.rateScheduleText) : null;
        expect(extractedRate).toBe(ex.expectedExtractedRateLabel);

        const missingFromHints = (hints?.warnings || []).map((w) => String(w?.code || '')).filter(Boolean);

        // Match step: only meaningful when we have a utility that maps to the library and a rate label.
        const libUtility = utilityHintToLibraryId(hints?.utilityHint);
        const commodity = ex.expectedSupplyType === 'GAS' ? 'gas' : 'electric';
        const snapshotKey = ex.expectedMatchStatus === 'AMBIGUOUS' && libUtility ? `${libUtility}_AMBIGUOUS` : libUtility;
        const snapshot =
          commodity === 'electric'
            ? (snapshotKey ? (registry.electric as any)[snapshotKey] : null)
            : snapshotKey
              ? (registry.gas as any)[snapshotKey]
              : null;

        const match =
          extractedRate && libUtility && snapshot
            ? matchBillTariffToLibraryV1({
                utilityId: libUtility,
                commodity,
                rateScheduleText: extractedRate,
                snapshot,
              })
            : // When utility/rate/snapshot are missing, do not invent partial results; keep warnings empty.
              ({} as any);

        const status = computeMatchStatus(match);
        expect(status).toBe(ex.expectedMatchStatus);

        const topCandidates = Array.isArray(match?.candidates) ? match.candidates.map((c: any) => String(c?.rateCode || '')).filter(Boolean) : [];
        expect(topCandidates).toEqual(ex.expectedTopCandidates);

        const missingFromMatch = Array.isArray(match?.warnings) ? match.warnings.map((w: any) => String(w || '')).filter(Boolean) : [];
        const missingAll = uniqSorted([...missingFromHints, ...missingFromMatch]);
        const expectedMissing = uniqSorted(ex.expectedMissingInfoIds);
        if (missingAll.join('|') !== expectedMissing.join('|')) {
          throw new Error(
            [
              `missingInfo mismatch for fixture=${ex.fixtureFile}`,
              `expected=${JSON.stringify(expectedMissing)}`,
              `received=${JSON.stringify(missingAll)}`,
            ].join('\n'),
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Fixture failed: ${ex.fixtureFile}\n${msg}`);
      }
    }

    // Guardrail: keep this table-driven contract test fast.
    // Use a generous budget to avoid CI brittleness while still catching accidental slowdowns.
    const elapsedMs = Date.now() - t0;
    expect(elapsedMs).toBeLessThan(5_000);
  });
});

