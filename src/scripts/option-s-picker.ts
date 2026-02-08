/**
 * Option S-aware battery picker
 *
 * Flow:
 * - Load interval data (15-min) from data/INTERVAL.csv
 * - Convert to tariff intervals with TOU buckets
 * - Compute baseline bill on current rate
 * - For each battery: run LP bill minimization on current rate, and on Option S if eligible (10% kW gate)
 * - Score candidates by bill savings + Pareto knee to avoid "tiny battery wins ROI"
 *
 * Usage: npx tsx src/scripts/option-s-picker.ts
 */

import path from 'path';
import { readIntervalData, intervalDataToLoadProfile } from '../utils/excel-reader';
import { loadBatteryCatalog, type CatalogBatteryRow } from '../utils/battery-catalog-loader';
import {
  optionSEligibility,
  optimizeBillWithGlpk,
  pickKneeByMarginalValue,
  toTariffIntervals,
  type BatteryModel,
  type RatePlan,
  type TariffInterval,
} from '../modules/battery/option-s-optimizer';

const DATA_DIR = path.join(process.cwd(), 'data');
const INTERVAL_FILE = path.join(DATA_DIR, 'INTERVAL.csv');
const CATALOG_FILE = path.join(DATA_DIR, 'battery-catalog.csv');

/**
 * Simple TOU mapper for PG&E B-19 style windows (approx).
 * - On-peak: 16:00-21:00
 * - Part-peak: 09:00-16:00 and 21:00-24:00
 * - Off-peak: everything else
 */
function pgeTouMapper(d: Date): 'on' | 'part' | 'off' {
  const hr = d.getHours();
  if (hr >= 16 && hr < 21) return 'on';
  if ((hr >= 9 && hr < 16) || hr >= 21 || hr < 1) return 'part';
  return 'off';
}

function buildCurrentRatePlan(): RatePlan {
  const energy = { on: 0.25, part: 0.18, off: 0.12 };
  const monthlyDemandRate = 30; // $/kW-month placeholder (B-19 Secondary default)
  return {
    name: 'current',
    energy_rate_per_kWh: (i) => energy[i.tou],
    demand_components: [
      {
        kind: 'monthlyMax',
        name: 'monthly_all',
        rate_per_kW: monthlyDemandRate,
        applies: () => true,
      },
    ],
    fixed_monthly_usd: 0,
  };
}

function buildOptionSRatePlan(): RatePlan {
  const energy = { on: 0.24, part: 0.17, off: 0.11 };
  const dailyOn = 1.61; // $/kW-day (2025 PG&E published daily demand for Option S)
  const dailyPart = 1.1; // placeholder
  const monthlyMax = 15; // $/kW-month placeholder
  return {
    name: 'option_s',
    energy_rate_per_kWh: (i) => energy[i.tou],
    demand_components: [
      {
        kind: 'dailyMax',
        name: 'daily_on',
        rate_per_kW: dailyOn,
        applies: (i) => i.tou === 'on',
      },
      {
        kind: 'dailyMax',
        name: 'daily_part',
        rate_per_kW: dailyPart,
        applies: (i) => i.tou === 'part',
      },
      {
        kind: 'monthlyMax',
        name: 'monthly_all',
        rate_per_kW: monthlyMax,
        applies: () => true,
      },
    ],
    fixed_monthly_usd: 0,
  };
}

function catalogToBatteryModel(row: CatalogBatteryRow): BatteryModel {
  return {
    id: row.id || row.modelName,
    nameplate_power_kw: row.powerKw,
    nameplate_energy_kwh: row.capacityKwh,
    min_soc_frac: 0.1,
    max_soc_frac: 0.9,
    round_trip_efficiency_pct: row.efficiency * 100,
    charge_c_rate: row.cRate,
    discharge_c_rate: row.cRate,
    parasitic_load_kw: 0,
    fixed_om_usd_per_kw_per_year: 8,
    variable_om_usd_per_mwh: 2,
    replacement_cost_usd_per_kwh: 250,
    warranty_throughput_mwh: 8000,
  };
}

function systemCost(row: CatalogBatteryRow, quantity: number = 1): number {
  if (quantity >= 50) return row.price50Plus * quantity;
  if (quantity >= 21) return row.price21_50 * quantity;
  if (quantity >= 11) return row.price11_20 * quantity;
  return row.price1_10 * quantity;
}

function billWithoutBattery(intervals: TariffInterval[], ratePlan: RatePlan): { bill: number } {
  // Energy
  const h =
    intervals.length >= 2
      ? (intervals[1].ts.getTime() - intervals[0].ts.getTime()) / (1000 * 60 * 60)
      : 0.25;
  const energy = intervals.reduce((sum, i) => sum + ratePlan.energy_rate_per_kWh(i) * i.kW_base * h, 0);

  // Demand
  let demand = 0;
  ratePlan.demand_components.forEach((comp) => {
    if (comp.kind === 'monthlyMax') {
      const groups = new Map<string, number>();
      intervals.forEach((i) => {
        if (!comp.applies(i)) return;
        groups.set(i.monthKey, Math.max(groups.get(i.monthKey) ?? 0, i.kW_base));
      });
      groups.forEach((peak) => {
        demand += peak * comp.rate_per_kW;
      });
    } else {
      const groups = new Map<string, number>();
      intervals.forEach((i) => {
        if (!comp.applies(i)) return;
        groups.set(i.dayKey, Math.max(groups.get(i.dayKey) ?? 0, i.kW_base));
      });
      groups.forEach((peak) => {
        demand += peak * comp.rate_per_kW;
      });
    }
  });

  const fixed = (ratePlan.fixed_monthly_usd ?? 0) * new Set(intervals.map((i) => i.monthKey)).size;
  return { bill: energy + demand + fixed };
}

async function main() {
  console.log('🔋 Option S-aware battery picker\n');

  const intervalData = readIntervalData(INTERVAL_FILE);
  const catalog = loadBatteryCatalog(CATALOG_FILE);
  const loadProfile = intervalDataToLoadProfile(intervalData);
  const intervals = toTariffIntervals(loadProfile, pgeTouMapper);

  const currentRate = buildCurrentRatePlan();
  const optionSRate = buildOptionSRatePlan();

  const baselineCurrent = billWithoutBattery(intervals, currentRate).bill;
  const baselineOptionS = billWithoutBattery(intervals, optionSRate).bill;

  console.log(`Intervals: ${intervals.length} | Baseline (current): $${baselineCurrent.toFixed(0)} | Baseline (Option S): $${baselineOptionS.toFixed(0)}`);

  const candidates: Array<{ id: string; capex: number; npv: number; bestBill: number; bestRate: string }> = [];

  for (const row of catalog) {
    try {
      const model = catalogToBatteryModel(row);
      const eligibility = optionSEligibility(model, intervals);
      const current = await optimizeBillWithGlpk(intervals, model, currentRate);
      let bestBill = current.bill_usd;
      let bestRate = 'current';

      if (eligibility.eligible) {
        const optionS = await optimizeBillWithGlpk(intervals, model, optionSRate);
        if (optionS.bill_usd < bestBill) {
          bestBill = optionS.bill_usd;
          bestRate = 'option_s';
        }
      }

      const billBaseline = bestRate === 'option_s' ? baselineOptionS : baselineCurrent;
      const annualSavings = (billBaseline - bestBill) * 12 / new Set(intervals.map((i) => i.monthKey)).size;
      const capex = systemCost(row);
      const npv = annualSavings * 10 - capex; // simple 10-year gross NPV proxy

      candidates.push({ id: row.modelName, capex, npv, bestBill, bestRate });
    } catch (err) {
      console.warn(`⚠️  Skipping ${row.modelName}: ${(err as Error).message}`);
    }
  }

  const pareto = candidates
    .filter((c) => c.npv > 0)
    .sort((a, b) => a.capex - b.capex);

  if (pareto.length === 0) {
    console.log('No positive-NPV candidates found.');
    return;
  }

  const knee = pickKneeByMarginalValue(pareto);

  console.log('\nTop candidates (capex, NPV, rate):');
  pareto.slice(0, 8).forEach((c, idx) => {
    console.log(
      `${idx + 1}. ${c.id.padEnd(24)} capex=$${c.capex.toFixed(0).padStart(8, ' ')} | npv=$${c.npv
        .toFixed(0)
        .padStart(8, ' ')} | rate=${c.bestRate}`
    );
  });

  console.log(`\nKnee pick: ${knee.id || 'unknown'} (capex=$${knee.capex.toFixed(0)}, npv=$${knee.npv.toFixed(0)})`);
}

main().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});

