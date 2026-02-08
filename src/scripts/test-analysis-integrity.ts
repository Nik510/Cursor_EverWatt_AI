import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { selectOptimalBatteries, type CatalogBattery } from '../modules/battery/optimal-selection';
import type { LoadProfile } from '../modules/battery/types';

/**
 * Lightweight guardrails to prevent shipping misleading battery charts.
 *
 * This repo doesn't currently use a full test runner, so we enforce critical
 * invariants via an executable script (`npm test`).
 */

const repoRoot = process.cwd();

function read(relPath: string): string {
  const abs = path.join(repoRoot, relPath);
  return fs.readFileSync(abs, 'utf8');
}

function mustInclude(haystack: string, needle: string, message: string) {
  assert.ok(
    haystack.includes(needle),
    `${message}\nMissing expected snippet:\n${needle}`
  );
}

function mustNotMatch(haystack: string, re: RegExp, message: string) {
  assert.ok(
    !re.test(haystack),
    `${message}\nFound forbidden match:\n${String(re)}`
  );
}

function blockBetween(src: string, startMarker: string, endMarker: string): string {
  const start = src.indexOf(startMarker);
  assert.ok(start >= 0, `Failed to find start marker: ${startMarker}`);
  const end = src.indexOf(endMarker, start + startMarker.length);
  assert.ok(end >= 0, `Failed to find end marker: ${endMarker}`);
  return src.slice(start, end);
}

// ---------------------------------------------------------------------------
// 1) Ensure we persist full simulation intervals when saving an analysis
// ---------------------------------------------------------------------------
{
  const file = 'src/pages/modules/calculators/BatteryCalculator.tsx';
  const src = read(file);

  mustInclude(
    src,
    'final_load_profile',
    `[${file}] must persist full simulation result (final_load_profile) when saving analysisReportData.`
  );

  mustInclude(
    src,
    'battery_soc_history',
    `[${file}] should persist SOC history for debugging/validation.`
  );
}

// ---------------------------------------------------------------------------
// 2) Prevent misleading chart fallbacks (threshold-clipping masquerading as simulation)
// ---------------------------------------------------------------------------
{
  const file = 'src/pages/Phase2ResultsPage.tsx';
  const src = read(file);

  // These patterns were the root cause of "with vs without battery looks identical/misleading"
  // when finalIntervals were missing. We never want to re-introduce them.
  mustNotMatch(
    src,
    /Math\.min\(\s*base\.kw\s*,\s*targetThreshold\s*\)/,
    `[${file}] must not use Math.min(base.kw, targetThreshold) as a fallback for simulated intervals.`
  );

  const yearlyBlock = blockBetween(src, 'const yearlyPeakComparison', 'const loadProfileInsight');
  mustNotMatch(
    yearlyBlock,
    /Math\.min\(\s*interval\.kw\s*,\s*targetThreshold\s*\)/,
    `[${file}] yearlyPeakComparison must not use Math.min(interval.kw, targetThreshold) (must use finalIntervals).`
  );

  // Ensure we keep a visible warning if simulation intervals are missing/misaligned
  mustInclude(
    src,
    '!hasValidSimulationData',
    `[${file}] must keep a visible warning banner when simulation data is missing/invalid.`
  );
}

console.log('✅ Battery analysis integrity checks passed.');

// ---------------------------------------------------------------------------
// 3) Portfolio selection guardrails (no undersized recommendations)
// ---------------------------------------------------------------------------
{
  const batteriesJson = read('data/library/batteries.json');
  const rows = JSON.parse(batteriesJson) as any[];
  const catalog: CatalogBattery[] = rows
    .filter((b) => b && b.active)
    .map((b) => ({
      modelName: String(b.modelName),
      manufacturer: String(b.manufacturer),
      capacityKwh: Number(b.capacityKwh) || 0,
      powerKw: Number(b.powerKw) || 0,
      efficiency: Number(b.efficiency) || 0.9,
      warrantyYears: Number(b.warrantyYears) || 10,
      price1_10: Number(b.price1_10) || 0,
      price11_20: Number(b.price11_20) || 0,
      price21_50: Number(b.price21_50) || 0,
      price50Plus: Number(b.price50Plus) || 0,
    }))
    .filter((b) => b.capacityKwh > 0 && b.powerKw > 0);

  // Build a minimal load profile with a 344 kW peak.
  const start = new Date('2026-01-01T00:00:00.000Z');
  const intervals: LoadProfile['intervals'] = Array.from({ length: 96 }, (_, i) => ({
    timestamp: new Date(start.getTime() + i * 15 * 60 * 1000),
    kw: i === 50 ? 344 : 120,
  }));
  const loadProfile: LoadProfile = { intervals };

  const demandRate = 30.7;
  const result = selectOptimalBatteries(loadProfile, catalog, demandRate, 10);
  assert.ok(result.candidates.length > 0, 'Portfolio selection should produce at least one recommendation.');

  const sitePeakKw = 344;
  const minPowerFraction = 0.5;
  const minPowerKw = sitePeakKw * minPowerFraction; // 172 kW

  const best = result.candidates[0];
  assert.ok(
    best.totalPowerKw >= minPowerKw,
    `Best portfolio must satisfy feasibility guard: totalPowerKw >= ${minPowerKw} (got ${best.totalPowerKw}).`
  );
}


