import type { BatterySpec, LoadProfile, SimulationResult, OptimalSizingAnalysis, SizingScenario, SizingAnalysis } from './types';
import { analyzeBatteryEfficiency } from './efficiency-diagnostics';
import { analyzeLoadProfile, selectOptimalBatteries, type CatalogBattery } from './optimal-selection';
import { simulatePeakShaving } from './logic';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function paybackFrom(cost: number, savings: number): number {
  if (!Number.isFinite(cost) || cost <= 0) return Number.POSITIVE_INFINITY;
  if (!Number.isFinite(savings) || savings <= 0) return Number.POSITIVE_INFINITY;
  return cost / savings;
}

function toCatalogBattery(b: any): CatalogBattery {
  return {
    modelName: String(b.modelName ?? ''),
    manufacturer: String(b.manufacturer ?? ''),
    capacityKwh: Number(b.capacityKwh ?? b.capacity_kwh ?? 0),
    powerKw: Number(b.powerKw ?? b.max_power_kw ?? 0),
    efficiency: Number(b.efficiency ?? b.round_trip_efficiency ?? 0.9),
    warrantyYears: Number(b.warrantyYears ?? 10),
    price1_10: Number(b.price1_10 ?? 0),
    price11_20: Number(b.price11_20 ?? b.price1_10 ?? 0),
    price21_50: Number(b.price21_50 ?? b.price1_10 ?? 0),
    price50Plus: Number(b.price50Plus ?? b.price1_10 ?? 0),
  };
}

function candidateToBatterySpec(totalPowerKw: number, totalCapacityKwh: number, rte: number): BatterySpec {
  return {
    capacity_kwh: totalCapacityKwh,
    max_power_kw: totalPowerKw,
    round_trip_efficiency: rte,
    degradation_rate: 0.02,
    min_soc: 0.10,
    max_soc: 0.90,
    depth_of_discharge: 0.80,
  };
}

export function analyzeCurrentSizing(params: {
  loadProfile: LoadProfile;
  battery: BatterySpec;
  simulationResult: SimulationResult;
  thresholdKw: number;
  demandRatePerKwMonth?: number;
}): SizingAnalysis {
  const { loadProfile, battery, simulationResult, thresholdKw, demandRatePerKwMonth } = params;

  const diagnostic = analyzeBatteryEfficiency({
    loadProfile,
    battery,
    simulationResult,
    thresholdKw,
    demandRatePerKwMonth,
  });

  // Adequacy score: a compact “how well is this battery matched to this site” number.
  const movedPeakScore = diagnostic.kpis.peakAfterKw <= thresholdKw + 0.01 ? 1 : 0;
  const adequacyScore = clamp(
    10 +
      55 * diagnostic.captureRate +
      15 * (1 - diagnostic.usagePatternInsights.emptyAtPeakRate) +
      10 * movedPeakScore +
      10 * clamp(diagnostic.utilizationRate, 0, 1),
    0,
    100
  );

  return {
    currentBattery: {
      powerKw: battery.max_power_kw,
      capacityKwh: battery.capacity_kwh,
      adequacyScore,
    },
    diagnostic,
  };
}

export function generateSizingScenarios(params: {
  loadProfile: LoadProfile;
  catalog: CatalogBattery[];
  demandRatePerKwMonth: number;
  targetReductionPercent?: number;
}): { scenarios: SizingScenario[]; requirements: { minPowerKw: number; minCapacityKwh: number; thresholdKw: number } } {
  const { loadProfile, catalog, demandRatePerKwMonth, targetReductionPercent } = params;

  const selection = selectOptimalBatteries(loadProfile, catalog, demandRatePerKwMonth, targetReductionPercent);
  const req = selection.requirements;

  const scenarios: SizingScenario[] = selection.candidates.map((c, idx) => {
    const rte = Number((c as any).roundTripEfficiency ?? (c as any)?.battery?.efficiency ?? 0.9);
    const thresholdKw = Number((c as any).thresholdKw ?? req.targetThresholdKw ?? 0);
    const batterySpec = candidateToBatterySpec(c.totalPowerKw, c.totalCapacityKwh, rte);
    const sim = simulatePeakShaving(loadProfile, batterySpec, thresholdKw);
    const diag = analyzeBatteryEfficiency({
      loadProfile,
      battery: batterySpec,
      simulationResult: sim,
      thresholdKw,
      demandRatePerKwMonth,
    });

    const rec: SizingScenario['recommendation'] =
      idx === 0 ? 'optimal' : c.paybackYears <= 7 ? 'viable' : c.paybackYears <= 12 ? 'marginal' : 'marginal';

    return {
      label:
        (c as any)?.explanation?.label ||
        (c as any)?.selectionReason ||
        ((c as any)?.battery ? `${(c as any).battery.manufacturer} ${(c as any).battery.modelName}` : 'Scenario'),
      powerKw: c.totalPowerKw,
      capacityKwh: c.totalCapacityKwh,
      captureRate: diag.captureRate,
      annualSavings: Number((c as any).annualSavings ?? 0),
      systemCost: Number((c as any).systemCost ?? 0),
      paybackYears: Number((c as any).paybackYears ?? Infinity),
      recommendation: rec,
    };
  });

  return {
    scenarios,
    requirements: {
      minPowerKw: req.minPowerKw,
      minCapacityKwh: req.minEnergyKwh,
      thresholdKw: Number((selection.candidates[0] as any)?.thresholdKw ?? req.targetThresholdKw ?? 0),
    },
  };
}

export function recommendOptimalSizing(params: {
  loadProfile: LoadProfile;
  demandRatePerKwMonth: number;
  /** Optional: catalog to turn the recommendation into “real” batteries and discover the economic knee. */
  catalog?: CatalogBattery[] | any[];
  /** Desired % peak reduction. If omitted, defaults to the selection algorithm’s default. */
  targetReductionPercent?: number;
}): OptimalSizingAnalysis {
  const { loadProfile, demandRatePerKwMonth, targetReductionPercent } = params;
  const catalog: CatalogBattery[] | null =
    params.catalog && Array.isArray(params.catalog) ? (params.catalog as any[]).map(toCatalogBattery) : null;

  const { requirements } = analyzeLoadProfile(loadProfile, targetReductionPercent);
  const minPowerKw = requirements.minPowerKw;
  const minCapacityKwh = requirements.minEnergyKwh;

  let optimalPowerKw = minPowerKw * 1.15;
  let optimalCapacityKwh = minCapacityKwh * 1.15;
  let maxPowerKw = minPowerKw * 1.8;
  let maxCapacityKwh = minCapacityKwh * 1.8;

  const sizingScenarios: SizingScenario[] = [];
  const reasoning: string[] = [...requirements.analysisNotes];

  if (catalog && catalog.length > 0) {
    const selection = selectOptimalBatteries(loadProfile, catalog, demandRatePerKwMonth, targetReductionPercent);
    const top = selection.candidates[0];
    if (top) {
      optimalPowerKw = top.totalPowerKw;
      optimalCapacityKwh = top.totalCapacityKwh;
      const topLabel =
        (top as any)?.explanation?.label ||
        (top as any)?.selectionReason ||
        'Best portfolio';
      reasoning.push(`Best catalog fit (economic knee): ${topLabel}`);
      reasoning.push(`System size: ${top.totalPowerKw.toFixed(0)} kW / ${top.totalCapacityKwh.toFixed(0)} kWh`);
      reasoning.push(
        `Estimated demand-charge savings: $${Number((top as any).annualSavings ?? 0).toFixed(0)}/yr; payback ~${Number((top as any).paybackYears ?? Infinity).toFixed(1)} yrs`
      );

      // “Max” sizing: pick the strongest among the top set (for diminishing returns visualization)
      const strongest = [...selection.candidates]
        .sort((a: any, b: any) => (Number(b.peakReductionKw ?? b.simulatedReductionKw ?? 0)) - (Number(a.peakReductionKw ?? a.simulatedReductionKw ?? 0)))[0];
      if (strongest) {
        maxPowerKw = Math.max(optimalPowerKw, strongest.totalPowerKw);
        maxCapacityKwh = Math.max(optimalCapacityKwh, strongest.totalCapacityKwh);
      }

      // Build scenarios from candidates (for scenario matrix / comparison)
      for (const c of selection.candidates.slice(0, 8)) {
        const label =
          (c as any)?.explanation?.label ||
          (c as any)?.selectionReason ||
          'Portfolio';
        sizingScenarios.push({
          label,
          powerKw: c.totalPowerKw,
          capacityKwh: c.totalCapacityKwh,
          // In portfolio mode we don't compute achievementPercent; keep conservative placeholder.
          captureRate: clamp((Number((c as any).peakReductionKw ?? 0) / Math.max(1, selection.peakProfile.originalPeakKw)) * 1.0, 0, 1),
          annualSavings: Number((c as any).annualSavings ?? 0),
          systemCost: Number((c as any).systemCost ?? 0),
          paybackYears: Number((c as any).paybackYears ?? Infinity),
          recommendation: c === top ? 'optimal' : Number((c as any).paybackYears ?? Infinity) <= 7 ? 'viable' : 'marginal',
        });
      }
    }
  } else {
    reasoning.push('No catalog provided; optimal/max sizing are expressed as multipliers above minimum requirements.');
  }

  return {
    currentBattery: null,
    recommendedSizing: {
      minPowerKw,
      optimalPowerKw,
      maxPowerKw,
      minCapacityKwh,
      optimalCapacityKwh,
      maxCapacityKwh,
      reasoning,
    },
    sizingScenarios,
    helpers: {
      paybackYearsFromAnnualSavings: (systemCost: number, annualSavings: number) => paybackFrom(systemCost, annualSavings),
    },
  };
}


