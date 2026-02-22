import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';

import { loadBatteryLibraryV1 } from '../../batteryLibrary/loadLibrary';
import type { BatteryLibraryItemV1 } from '../../batteryLibrary/types';
import { buildInternalEngineeringReportJsonV1 } from '../../reports/internalEngineering/v1/buildInternalEngineeringReportJsonV1';
import { runUtilityWorkflow } from '../../workflows/runUtilityWorkflow';
import { saveSnapshot } from '../../tariffLibrary/storage';

import type { GoldenSnapshotCaseV1, GoldenSnapshotOutputV1 } from './types';

type GoldenBillContextV1 = {
  projectId?: string;
  utility?: string;
  supplyType?: 'electric' | 'gas' | 'both';
  billPeriodStartYmd?: string | null;
  intervalFixtureRef?: string | null;
  currentRateOverride?: { utility: string; rateCode: string } | null;
};

function loadJson(fp: string): any {
  return JSON.parse(readFileSync(fp, 'utf-8'));
}

function loadText(fp: string): string {
  // Normalize fixtures to LF so golden snapshots are OS-independent.
  // (CRLF vs LF changes deterministic snippet windows and evidence text.)
  const raw = readFileSync(fp, 'utf-8');
  const lf = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return lf.endsWith('\n') ? lf : `${lf}\n`;
}

function makeEphemeralIdFactory(args: { prefix: string; seed: string }): () => string {
  const prefix = String(args.prefix || 'id').trim() || 'id';
  const seed =
    String(args.seed || '')
      .trim()
      .replace(/[^0-9A-Za-z]/g, '')
      .slice(0, 24) || 'seed';
  let i = 0;
  return () => `${prefix}_${seed}_${++i}`;
}

function resolveIntervalFixturePath(ref: string): string {
  const r = String(ref || '').trim().replace(/\\/g, '/');
  if (!r) return '';
  if (r.startsWith('tests/')) return path.join(process.cwd(), ...r.split('/').filter(Boolean));
  return path.join(process.cwd(), 'tests', 'fixtures', ...r.split('/').filter(Boolean));
}

async function seedTariffSnapshotsForCase(args: { baseDir: string; caseId: string; utilityId: string }): Promise<void> {
  const baseDir = String(args.baseDir || '').trim();
  const caseId = String(args.caseId || '').trim();
  const utilityId = String(args.utilityId || '').trim().toUpperCase();

  const capturedAt = '2026-03-01T00:00:00.000Z';
  const versionTag = '2026-03-01T0000Z';
  const isAmbiguousTariffCase = caseId.includes('ambiguous_tariff');

  const mkRates = (utility: string): any[] => {
    if (utility === 'PGE') {
      const base = [
        { utility: 'PGE', rateCode: 'E-19', sourceUrl: 'https://example.com/pge/e-19', sourceTitle: 'Schedule E-19', lastVerifiedAt: capturedAt },
        { utility: 'PGE', rateCode: 'B-19', sourceUrl: 'https://example.com/pge/b-19', sourceTitle: 'Schedule B-19', lastVerifiedAt: capturedAt },
      ];
      if (isAmbiguousTariffCase) {
        base.push({ utility: 'PGE', rateCode: 'E_19', sourceUrl: 'https://example.com/pge/e_19', sourceTitle: 'Schedule E_19', lastVerifiedAt: capturedAt });
      }
      return base;
    }
    if (utility === 'SCE') {
      return [{ utility: 'SCE', rateCode: 'TOU-GS-3', sourceUrl: 'https://example.com/sce/tou-gs-3', sourceTitle: 'Schedule TOU-GS-3', lastVerifiedAt: capturedAt }];
    }
    if (utility === 'SDGE') {
      return [{ utility: 'SDGE', rateCode: 'AL-TOU', sourceUrl: 'https://example.com/sdge/al-tou', sourceTitle: 'Schedule AL-TOU', lastVerifiedAt: capturedAt }];
    }
    return [];
  };

  const utilitiesToSeed = [utilityId, 'PGE', 'SCE', 'SDGE']
    .map((u) => String(u || '').trim().toUpperCase())
    .filter((u, i, a) => u && a.indexOf(u) === i)
    .filter((u) => u === 'PGE' || u === 'SCE' || u === 'SDGE');

  for (const u of utilitiesToSeed) {
    await saveSnapshot(
      {
        utility: u as any,
        capturedAt,
        versionTag,
        rates: mkRates(u),
        sourceFingerprints: [{ url: `https://example.com/${u.toLowerCase()}-index`, contentHash: 'hash1' }],
      } as any,
      { baseDir },
    );
  }
}

export function discoverGoldenSnapshotCasesV1(args: { nowIso: string; fixturesBaseDir?: string } ): GoldenSnapshotCaseV1[] {
  const base = args.fixturesBaseDir
    ? path.resolve(args.fixturesBaseDir)
    : path.join(process.cwd(), 'tests', 'fixtures', 'goldenBills', 'v1');
  const nowIso = String(args.nowIso || '').trim() || new Date().toISOString();

  const caseDirs = readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => d.name !== 'shared')
    .map((d) => path.join(base, d.name))
    .sort((a, b) => a.localeCompare(b));

  return caseDirs.map((caseDir) => ({ caseId: path.basename(caseDir), caseDir, nowIso }));
}

export async function loadGoldenSnapshotBatteryLibraryV1(): Promise<BatteryLibraryItemV1[]> {
  const libPath = path.join(process.cwd(), 'samples', 'battery_library_fixture.json');
  const lib = await loadBatteryLibraryV1(libPath);
  return lib.library.items;
}

export async function runGoldenSnapshotCaseV1(args: { c: GoldenSnapshotCaseV1; batteryLibrary: BatteryLibraryItemV1[] }): Promise<GoldenSnapshotOutputV1> {
  const c = args.c;
  const caseDir = path.resolve(c.caseDir);
  const caseId = String(c.caseId || '').trim();
  const nowIso = String(c.nowIso || '').trim() || new Date().toISOString();

  const context = loadJson(path.join(caseDir, 'context.json')) as GoldenBillContextV1;
  const billText = loadText(path.join(caseDir, 'billText.txt'));

  const utilityId = String(context?.utility || '').trim().toUpperCase() || 'UNKNOWN';
  const projectId = String(context?.projectId || caseId);
  const serviceType = (String(context?.supplyType || 'electric').trim().toLowerCase() === 'gas' ? 'gas' : 'electric') as any;

  const intervalPointsV1 = (() => {
    const ref = String(context?.intervalFixtureRef || '').trim();
    if (!ref) return null;
    const fp = resolveIntervalFixturePath(ref);
    const raw = loadJson(fp);
    return Array.isArray(raw) ? raw : null;
  })();

  const currentRate =
    context?.currentRateOverride && context.currentRateOverride.utility && context.currentRateOverride.rateCode
      ? { utility: String(context.currentRateOverride.utility), rateCode: String(context.currentRateOverride.rateCode) }
      : null;

  const tariffBaseDir = mkdtempSync(path.join(os.tmpdir(), `everwatt-golden-snapshots-${caseId.replace(/[^0-9A-Za-z]+/g, '_')}-`));
  await seedTariffSnapshotsForCase({ baseDir: tariffBaseDir, caseId, utilityId });

  const prevTariffs = process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
  process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = tariffBaseDir;
  try {
    const wf = await runUtilityWorkflow({
      inputs: {
        orgId: 'o_golden',
        projectId,
        serviceType,
        utilityTerritory: utilityId,
        ...(currentRate ? { currentRate } : {}),
        billPdfText: billText,
      } as any,
      ...(intervalPointsV1 ? { intervalPointsV1: intervalPointsV1 as any } : {}),
      batteryLibrary: args.batteryLibrary,
      nowIso,
      idFactory: makeEphemeralIdFactory({ prefix: 'id', seed: `${nowIso}_${caseId}` }),
      suggestionIdFactory: makeEphemeralIdFactory({ prefix: 'sug', seed: `${nowIso}_${caseId}` }),
      inboxIdFactory: makeEphemeralIdFactory({ prefix: 'inbox', seed: `${nowIso}_${caseId}` }),
    });

    const response: GoldenSnapshotOutputV1['response'] = {
      success: true,
      project: { id: projectId },
      workflow: wf as any,
      summary: { json: {}, markdown: '' },
    };

    const reportJson = buildInternalEngineeringReportJsonV1({
      projectId,
      generatedAtIso: nowIso,
      analysisResults: response,
      telemetry: {
        intervalElectricPointsV1: intervalPointsV1 as any,
        intervalElectricMetaV1: null,
      },
    });

    return { caseId, response, reportJson };
  } finally {
    if (typeof prevTariffs === 'string') process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = prevTariffs;
    else delete process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
  }
}

