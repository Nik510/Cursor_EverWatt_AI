import { PgeOptionS } from '../options/pge_option_s';
import type { BaselineSnapshot, CandidateAssets, RateScenario, TariffModel } from '../types';

/**
 * Phase 1: bounded PG&E discovery (base + Option S only).
 */
export function discoverPgeScenarios(args: {
  baseTariff: TariffModel;
  baseline: BaselineSnapshot;
  assets: CandidateAssets;
}): RateScenario[] {
  const base: RateScenario = {
    scenarioId: `scenario:${args.baseTariff.tariffId}`,
    version: 'phase1-v1',
    baseTariffId: args.baseTariff.tariffId,
    appliedOptionIds: [],
    tariff: args.baseTariff,
    scenarioNotes: ['Baseline tariff scenario.'],
    eligibility: { passed: true, confidence: 1, reasons: ['Baseline scenario'], missingInfo: [], evidenceUsed: [] },
  };

  const out: RateScenario[] = [base];

  if (PgeOptionS.trigger_conditions(args.baseline)) {
    const elig = PgeOptionS.eligibility_rules(args.baseline, args.assets);
    const { transformedTariff, transformNotes } = PgeOptionS.billing_transform(args.baseTariff, args.baseline, args.assets);
    out.push({
      scenarioId: `scenario:${args.baseTariff.tariffId}:${PgeOptionS.optionId}`,
      version: 'phase1-v1',
      baseTariffId: args.baseTariff.tariffId,
      appliedOptionIds: [PgeOptionS.optionId],
      tariff: transformedTariff,
      scenarioNotes: transformNotes,
      eligibility: elig,
    });
  }

  return out;
}

