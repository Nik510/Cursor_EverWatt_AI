import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { normalizeIntervals } from '../src/modules/billingEngineV1/interval/normalizeIntervals';
import { compareRates } from '../src/modules/billingEngineV1/evaluate/compareRates';
import { getPgeRateById, resolvePgeSimRateForCode } from '../src/modules/billingEngineV1/rates/pge_catalog_v1';

function getArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  return process.argv[idx + 1] ? String(process.argv[idx + 1]) : null;
}

async function main() {
  const fixture = getArg('--intervalFixture');
  const baselineArg = getArg('--baseline');
  const candidatesArg = getArg('--candidates');
  const tz = getArg('--tz') || 'America/Los_Angeles';

  if (!fixture || !baselineArg || !candidatesArg) {
    console.error(
      [
        'Usage:',
        '  npx tsx scripts/compare-rates-v1.ts --intervalFixture samples/interval_peaky_office.json --baseline PGE_SIM_B19_LIKE --candidates PGE_SIM_TOU_COMMERCIAL,PGE_SIM_DEMAND_LIGHT',
        'Optional:',
        '  --tz America/Los_Angeles',
      ].join('\n')
    );
    process.exit(2);
  }

  const filePath = path.isAbsolute(fixture) ? fixture : path.join(process.cwd(), fixture);
  const raw = JSON.parse(await readFile(filePath, 'utf-8')) as any;
  const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.intervals) ? raw.intervals : [];

  const baseline = getPgeRateById(baselineArg) || resolvePgeSimRateForCode(baselineArg);
  if (!baseline) {
    console.error(`Unknown baseline rate "${baselineArg}".`);
    process.exit(2);
  }

  const candIds = candidatesArg.split(',').map((s) => s.trim()).filter(Boolean);
  const candidates = candIds.map((id) => getPgeRateById(id) || resolvePgeSimRateForCode(id)).filter(Boolean) as any[];
  if (!candidates.length) {
    console.error('No valid candidates resolved.');
    process.exit(2);
  }

  const norm = normalizeIntervals({ intervals: rows, inputUnit: 'infer', timezone: tz });
  const valid = norm.intervals.filter((x) => x.isValid);
  const start = valid.length ? new Date(valid[0].ts) : new Date('2026-01-01T00:00:00.000Z');
  const end = valid.length ? new Date(new Date(valid[valid.length - 1].ts).getTime() + norm.inferred.resolutionMinutes * 60_000) : new Date('2026-02-01T00:00:00.000Z');

  const cmp = compareRates({
    intervals: norm.intervals,
    baseline,
    candidates,
    timezoneOverride: tz,
  });

  console.log(`Baseline: ${cmp.baselineRateId} total=$${cmp.baseline.totalDollars.toFixed(2)} peakKw=${cmp.baseline.peakKw.toFixed(2)} kWh=${cmp.baseline.totalKwh.toFixed(2)}`);
  if (cmp.baselineMonthlyTotals.length) {
    console.log('Baseline monthly totals:');
    for (const m of cmp.baselineMonthlyTotals) {
      console.log(`  - ${m.month}: $${m.totalDollars.toFixed(2)}  kWh=${m.totalKwh.toFixed(2)}  peakKw=${m.peakKw.toFixed(2)}`);
    }
  }
  console.log('');
  console.log('Ranked candidates:');
  for (const r of cmp.ranked) {
    console.log(
      `  - ${r.rateId}: total=$${r.totalDollars.toFixed(2)}  deltaVsBaseline=$${r.deltaDollarsVsBaseline.toFixed(2)}  estimatedDelta=$${r.estimatedDeltaDollars.toFixed(2)}`
    );
    if (r.monthlyTotals && r.monthlyTotals.length) {
      for (const m of r.monthlyTotals) {
        console.log(`      * ${m.month}: $${m.totalDollars.toFixed(2)}  kWh=${m.totalKwh.toFixed(2)}  peakKw=${m.peakKw.toFixed(2)}`);
      }
    }
  }
  console.log('');
  console.log('Top 3 audit summaries:');
  for (const r of cmp.ranked.slice(0, 3)) {
    if (!r.auditSummary) continue;
    console.log(`  - ${r.rateId}: warnings=${r.auditSummary.warningsCount}`);
    for (const d of r.auditSummary.demandDeterminants) {
      console.log(`      * ${d.kind}(${d.touLabel}) peakKw=${d.peakKw.toFixed(2)} @ ${d.ts || '(none)'}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

