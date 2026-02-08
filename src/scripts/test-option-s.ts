/**
 * Quick sanity checks for Option S schedule math.
 *
 * Run: npx tsx src/scripts/test-option-s.ts
 */

import type { LoadInterval } from '../modules/battery/types';
import { calculateOptionSDemandCharges, DEFAULT_OPTION_S_RATES_2025_SECONDARY } from '../utils/battery/s-rate-calculations';

function mkInterval(ts: string, kw: number): LoadInterval {
  return { timestamp: new Date(ts), kw };
}

function buildTwoDayToyProfile(): LoadInterval[] {
  // Day 1: big peak at 18:00 (Peak window), part-peak moderate at 15:00, midday excluded at 10:00
  // Day 2: lower everywhere
  const out: LoadInterval[] = [];
  // Day 1
  out.push(mkInterval('2025-01-01T10:00:00', 300)); // excluded window (9-14)
  out.push(mkInterval('2025-01-01T15:00:00', 200)); // part-peak
  out.push(mkInterval('2025-01-01T18:00:00', 400)); // peak
  out.push(mkInterval('2025-01-01T22:00:00', 250)); // part-peak
  out.push(mkInterval('2025-01-01T02:00:00', 150)); // all-hours
  // Day 2
  out.push(mkInterval('2025-01-02T10:00:00', 180));
  out.push(mkInterval('2025-01-02T15:00:00', 190));
  out.push(mkInterval('2025-01-02T18:00:00', 210));
  out.push(mkInterval('2025-01-02T02:00:00', 160));
  return out;
}

function main() {
  const intervals = buildTwoDayToyProfile();
  const r = calculateOptionSDemandCharges(intervals, DEFAULT_OPTION_S_RATES_2025_SECONDARY);

  console.log('=== Option S toy profile ===');
  console.log('Daily rows:', r.daily);
  console.log('Monthly rows:', r.monthly);
  console.log('Total in data:', r.totalInData.toFixed(2));

  // Basic assertions (throw to fail fast)
  const day1 = r.daily.find((d) => d.date === '2025-01-01');
  if (!day1) throw new Error('Missing day1');
  if (Math.round(day1.peakKw) !== 400) throw new Error(`Expected day1 peakKw=400, got ${day1.peakKw}`);
  if (Math.round(day1.partPeakKw) !== 250) throw new Error(`Expected day1 partPeakKw=250, got ${day1.partPeakKw}`);

  const month = r.monthly.find((m) => m.month === '2025-01');
  if (!month) throw new Error('Missing month row');
  // Exclusion window should ignore the 10:00 300 kW when computing monthlyMaxExclWindowKw.
  if (Math.round(month.monthlyMaxExclWindowKw) === 300) {
    throw new Error('Monthly exclusion window did not exclude 10:00 load');
  }

  console.log('✅ Option S sanity checks passed.');
}

main();

