import { calculateFinancialAnalysis } from '../../modules/financials/calculations';
import type { FinancialAnalysis } from '../../modules/financials/types';
import type { FinancialParameters } from '../../core/types';

export type BatteryEconomicsAssumptions = {
  /** Payback cap used for grading (years). Default: 10 */
  paybackCapYears: number;
  /**
   * Preferred gross margin (0..1). Battery catalog costs are material-only; we uplift to a
   * price proxy via: price = materialCost / (1 - margin).
   *
   * Example: 50% margin => price = 2.0 * materialCost
   */
  preferredMargin: number;
  /** Discount rate for NPV / discounted payback. Default: 0.06 */
  discountRate: number;
  /** Analysis horizon. Default: 10 */
  analysisYears: number;
  /** Savings degradation per year. Default: 0.02 */
  degradationRate: number;
};

export type BatteryEconomicsResult = {
  assumptions: BatteryEconomicsAssumptions;
  materialCost: number;
  effectiveInstalledCost: number;
  yearlySavings: number[];
  financial: FinancialAnalysis;
  /** 0..100 */
  economicScore: number;
  passesPaybackCap: boolean;
};

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function safeMargin(m: number): number {
  if (!Number.isFinite(m)) return 0;
  // Avoid division by 0 / nonsense “99%+ margin” in this proxy.
  return Math.max(0, Math.min(0.95, m));
}

export function effectiveInstalledCostFromMaterialCost(materialCost: number, preferredMargin: number): number {
  const cost = Number(materialCost) || 0;
  const m = safeMargin(preferredMargin);
  if (cost <= 0) return 0;
  return cost / (1 - m);
}

export function buildYearlySavingsSeries(args: {
  annualSavings: number;
  years: number;
  degradationRate: number;
}): number[] {
  const annual = Number(args.annualSavings) || 0;
  const years = Math.max(1, Math.floor(Number(args.years) || 10));
  const degr = Math.max(0, Math.min(0.2, Number(args.degradationRate) || 0));
  const out: number[] = [];
  for (let y = 1; y <= years; y++) {
    out.push(annual * Math.pow(1 - degr, y - 1));
  }
  return out;
}

/**
 * Deterministic “economic engine” grading:
 * - Uses financial engine (NPV / discounted payback) over `analysisYears`.
 * - Uses an installed-price proxy from material-only cost + preferred gross margin.
 * - Produces a compact 0–100 `economicScore` gated by payback cap.
 */
export function gradeBatteryEconomics(args: {
  materialCost: number;
  annualSavings: number;
  assumptions?: Partial<BatteryEconomicsAssumptions>;
}): BatteryEconomicsResult {
  const assumptions: BatteryEconomicsAssumptions = {
    paybackCapYears: 10,
    preferredMargin: 0.5,
    discountRate: 0.06,
    analysisYears: 10,
    degradationRate: 0.02,
    ...(args.assumptions || {}),
  };

  const materialCost = Number(args.materialCost) || 0;
  const effectiveInstalledCost = effectiveInstalledCostFromMaterialCost(materialCost, assumptions.preferredMargin);
  const yearlySavings = buildYearlySavingsSeries({
    annualSavings: Number(args.annualSavings) || 0,
    years: assumptions.analysisYears,
    degradationRate: assumptions.degradationRate,
  });

  const params: FinancialParameters = {
    discountRate: assumptions.discountRate,
    analysisPeriod: assumptions.analysisYears,
  };

  const financial = calculateFinancialAnalysis(effectiveInstalledCost, yearlySavings, params);
  const payback = Number(financial.adjustedPayback);
  const passesPaybackCap = Number.isFinite(payback) ? payback <= assumptions.paybackCapYears : false;

  // Score components:
  // - Payback proximity (dominant, normalized to cap)
  // - NPV positivity (bonus)
  const paybackScore = Number.isFinite(payback) && payback > 0
    ? clamp01(1 - payback / Math.max(1e-6, assumptions.paybackCapYears))
    : 0;
  const npvBonus = financial.netPresentValue > 0 ? 1 : 0;

  const rawScore = 100 * (0.8 * paybackScore + 0.2 * npvBonus);
  const economicScore = Math.round(rawScore);

  return {
    assumptions,
    materialCost,
    effectiveInstalledCost,
    yearlySavings,
    financial,
    economicScore,
    passesPaybackCap,
  };
}

