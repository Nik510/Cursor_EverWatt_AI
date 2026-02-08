import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { normalizeIntervals } from '../src/modules/billingEngineV1/interval/normalizeIntervals';
import { calcBill } from '../src/modules/billingEngineV1/calc/calcBill';
import { getPgeRateById, resolvePgeSimRateForCode } from '../src/modules/billingEngineV1/rates/pge_catalog_v1';

function getArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  return process.argv[idx + 1] ? String(process.argv[idx + 1]) : null;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main() {
  const fixture = getArg('--intervalFixture');
  const rateArg = getArg('--rate');
  const tz = getArg('--tz') || 'America/Los_Angeles';
  const startArg = getArg('--start');
  const endArg = getArg('--end');

  if (!fixture || !rateArg) {
    console.error(
      [
        'Usage:',
        '  npx tsx scripts/run-billing-engine-v1.ts --intervalFixture samples/interval_peaky_office.json --rate PGE_SIM_B19_LIKE --tz America/Los_Angeles',
        '',
        'Optional:',
        '  --start 2026-01-01T00:00:00Z --end 2026-02-01T00:00:00Z',
      ].join('\n')
    );
    process.exit(2);
  }

  const filePath = path.isAbsolute(fixture) ? fixture : path.join(process.cwd(), fixture);
  const raw = JSON.parse(await readFile(filePath, 'utf-8')) as any;
  const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.intervals) ? raw.intervals : [];

  const rate = getPgeRateById(rateArg) || resolvePgeSimRateForCode(rateArg);
  if (!rate) {
    console.error(`Unknown rate "${rateArg}". Known: PGE_SIM_B19_LIKE, PGE_SIM_TOU_COMMERCIAL, PGE_SIM_DEMAND_LIGHT`);
    process.exit(2);
  }

  const norm = normalizeIntervals({ intervals: rows, inputUnit: 'infer', timezone: tz });
  if (norm.warnings.length && !hasFlag('--quiet')) {
    console.log('Warnings:', norm.warnings);
  }

  const valid = norm.intervals.filter((x) => x.isValid);
  const start = startArg ? new Date(startArg) : valid.length ? new Date(valid[0].ts) : new Date('2026-01-01T00:00:00.000Z');
  const end = endArg
    ? new Date(endArg)
    : valid.length
      ? new Date(new Date(valid[valid.length - 1].ts).getTime() + norm.inferred.resolutionMinutes * 60_000)
      : new Date('2026-02-01T00:00:00.000Z');

  const bill = calcBill({ intervals: norm.intervals, rate, billingPeriod: { start, end }, timezoneOverride: tz });

  console.log(`Rate: ${bill.rateId}`);
  console.log(`Period: ${bill.billingPeriod.startIso} → ${bill.billingPeriod.endIso} (${bill.billingPeriod.timezone})`);
  console.log('');
  console.log('Totals:');
  console.log(`  totalDollars: $${bill.totals.totalDollars.toFixed(2)}`);
  console.log(`  totalKwh:     ${bill.totals.totalKwh.toFixed(2)} kWh`);
  console.log(`  peakKw:       ${bill.totals.peakKw.toFixed(2)} kW`);
  console.log('');
  console.log('Line items:');
  console.log('  Energy:');
  for (const li of bill.lineItems.energy) {
    console.log(`    - ${li.touLabel}: ${li.kwh.toFixed(2)} kWh @ $${li.dollarsPerKwh.toFixed(4)}/kWh = $${li.dollars.toFixed(2)}`);
  }
  console.log('  Demand:');
  for (const li of bill.lineItems.demand) {
    console.log(`    - ${li.kind}(${li.touLabel}): ${li.peakKw.toFixed(2)} kW @ $${li.dollarsPerKw.toFixed(2)}/kW = $${li.dollars.toFixed(2)}`);
  }
  console.log('  Fixed:');
  for (const li of bill.lineItems.fixed) {
    console.log(`    - ${li.kind}: qty=${li.quantity} @ $${li.dollarsEach.toFixed(2)} = $${li.dollars.toFixed(2)}`);
  }
  console.log('');
  console.log('Demand determinants (first match per rule):');
  for (const d of bill.auditTrace.demandDeterminants) {
    const first = d.determinantIntervals[0];
    console.log(`  - ${d.kind}(${d.touLabel}): peakKw=${d.peakKw.toFixed(2)} at ${first ? first.ts : '(none)'}`);
  }

  if (bill.auditTrace.warnings.length && !hasFlag('--quiet')) {
    console.log('');
    console.log('Audit warnings:');
    for (const w of bill.auditTrace.warnings.slice(0, 20)) console.log(`  - ${w}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

