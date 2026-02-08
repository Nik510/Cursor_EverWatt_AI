/**
 * Program Intelligence v1 (deterministic) - match programs + print JSON.
 *
 * Usage:
 *   npx tsx scripts/run-program-intelligence.ts --territory PGE [--naics 622110] [--customerType healthcare] [--peakKw 500] [--annualKwh 2000000] [--intervalFixture <file>]
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';

import { matchPrograms, getDefaultCatalogForTerritory } from '../src/modules/programIntelligence/matchPrograms';
import { programMatchesToRecommendations } from '../src/modules/programIntelligence/toRecommendations';
import { toInboxSuggestions } from '../src/modules/utilityIntelligence/toInboxSuggestions';
import type { UtilityInputs } from '../src/modules/utilityIntelligence/types';

function argMap(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
    out[k] = v;
  }
  return out;
}

function loadIntervalFixture(filePath: string): Array<{ timestampIso: string; kw: number }> {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!existsSync(abs)) throw new Error(`Interval fixture not found: ${abs}`);
  const raw = readFileSync(abs, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Interval fixture must be a JSON array of {timestampIso, kw}');
  return parsed
    .map((r: any) => ({ timestampIso: String(r?.timestampIso || '').trim(), kw: Number(r?.kw) }))
    .filter((r: any) => r.timestampIso && Number.isFinite(r.kw));
}

async function main() {
  const args = argMap(process.argv.slice(2));
  const territory = String(args.territory || 'PGE').trim();
  const naics = String(args.naics || '').trim();
  const customerType = String(args.customerType || '').trim();
  const peakKw = args.peakKw ? Number(args.peakKw) : undefined;
  const annualKwh = args.annualKwh ? Number(args.annualKwh) : undefined;
  const intervalFixture = String(args.intervalFixture || '').trim();

  const interval = intervalFixture ? loadIntervalFixture(intervalFixture) : null;
  const hasIntervalData = Boolean(interval && interval.length);

  const inputs: UtilityInputs = {
    orgId: 'cli',
    projectId: 'cli',
    serviceType: 'electric',
    utilityTerritory: territory || undefined,
    ...(naics ? { naicsCode: naics } : {}),
    ...(customerType ? { customerType } : {}),
    ...(intervalFixture ? { intervalDataRef: { telemetrySeriesId: `fixture:${intervalFixture}`, resolution: 'hourly', channels: ['kW'] } } : {}),
  };

  const catalog = getDefaultCatalogForTerritory(territory);
  const matches = matchPrograms({
    inputs,
    derived: {
      peakKw,
      annualKwh,
      scheduleBucket: 'unknown',
      loadShiftScore: undefined,
      hasIntervalData,
      hasAdvancedMetering: hasIntervalData,
    },
    catalog,
  });

  let idSeq = 0;
  const nowIso = new Date('2026-01-01T00:00:00.000Z').toISOString();
  const recs = programMatchesToRecommendations({
    inputs,
    matches: matches.filter((m) => m.matchStatus !== 'unlikely').slice(0, 3),
    catalog,
    nowIso,
    idFactory: () => `progReco_${++idSeq}`,
  });

  const top = recs[0] || null;
  const inbox = top ? toInboxSuggestions({ inputs, recommendations: [top], nowIso, suggestionIdFactory: () => 'progSug_1', inboxIdFactory: () => 'progInbox_1' }) : null;

  console.log(
    JSON.stringify(
      {
        inputs,
        matches: matches.slice(0, 12),
        topRecommendation: top,
        inboxReady: inbox ? { suggestion: inbox.suggestions[0], inboxItem: inbox.inboxItems[0] } : null,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

