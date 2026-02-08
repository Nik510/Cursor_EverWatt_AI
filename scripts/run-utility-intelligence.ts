/**
 * Utility Intelligence Engine v1 (deterministic) - run + print JSON.
 *
 * Usage:
 *   npx tsx scripts/run-utility-intelligence.ts --projectId <id> [--org <orgId>] [--territory PGE] [--rateCode <code>] [--naics <code>] [--customerType <type>] [--intervalFixture <file>]
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { analyzeUtility } from '../src/modules/utilityIntelligence/analyzeUtility';
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
  const orgId = String(args.org || 'default-user').trim();
  const projectId = String(args.projectId || '').trim();
  const territory = String(args.territory || 'PGE').trim();
  const rateCode = String(args.rateCode || '').trim();
  const naics = String(args.naics || '').trim();
  const customerType = String(args.customerType || '').trim();
  const intervalFixture = String(args.intervalFixture || '').trim();

  if (!projectId) {
    console.error('Missing --projectId <id>');
    process.exit(2);
  }

  const intervalKwSeries = intervalFixture ? loadIntervalFixture(intervalFixture) : null;
  const nowIso = new Date('2026-01-01T00:00:00.000Z').toISOString();
  let recoSeq = 0;
  let inboxSeq = 0;

  const inputs: UtilityInputs = {
    orgId,
    projectId,
    serviceType: 'electric',
    utilityTerritory: territory || undefined,
    ...(customerType ? { customerType } : {}),
    ...(naics ? { naicsCode: naics } : {}),
    ...(rateCode
      ? {
          currentRate: { utility: territory || 'PGE', rateCode },
        }
      : {}),
    ...(intervalFixture
      ? {
          intervalDataRef: { telemetrySeriesId: `fixture:${intervalFixture}`, resolution: 'hourly', channels: ['kW'] },
        }
      : {}),
  };

  const { insights, recommendations } = await analyzeUtility(inputs, {
    intervalKwSeries: intervalKwSeries || undefined,
    nowIso,
    idFactory: () => `utilReco_${++recoSeq}`,
  });

  const inbox = toInboxSuggestions({
    inputs,
    recommendations,
    nowIso,
    suggestionIdFactory: () => `utilSug_${++recoSeq}`,
    inboxIdFactory: () => `utilInbox_${++inboxSeq}`,
  });

  const out = {
    inputs,
    insights,
    recommendations,
    programMatchesSummary: insights.programs.matches.slice(0, 10).map((m) => ({ programId: m.programId, status: m.matchStatus, score: m.score })),
    inboxArtifacts: {
      suggestions: inbox.suggestions.slice(0, 5),
      inboxItems: inbox.inboxItems.slice(0, 5),
    },
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

