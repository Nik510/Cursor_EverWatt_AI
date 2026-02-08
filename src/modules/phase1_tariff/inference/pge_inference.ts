import { getDemandRateForCode } from '../../../utils/rates/demand-rate-lookup';
import type { BaselineSnapshot, TariffModel } from '../types';

export function inferPgeTariff(args: {
  rateCodeFromUser?: string;
  territory?: string;
}): { tariff: TariffModel; inference: BaselineSnapshot['tariffInference'] } {
  const why: string[] = [];
  const missingInfo: BaselineSnapshot['tariffInference']['missingInfo'] = [];

  const rateCode = (args.rateCodeFromUser || '').trim();
  if (!rateCode) {
    missingInfo.push({
      id: 'tariff.rateCode',
      title: 'Rate code missing',
      whyNeeded: 'Tariff inference cannot be high-confidence without a rate code from the bill/utility portal.',
      howToGet: 'Enter the PG&E rate schedule code from the bill (e.g. B-19, B-20).',
      severity: 'blocker',
    });
  }

  const demandRate = rateCode ? getDemandRateForCode(rateCode, 'PG&E') : null;
  if (rateCode && demandRate) {
    why.push(`Matched demand rate for ${demandRate.rateCode} from internal rate library (${demandRate.description}).`);
  } else if (rateCode) {
    missingInfo.push({
      id: 'tariff.demandRate',
      title: 'Demand rate not found in library for provided rate code',
      whyNeeded: 'Phase 1 baseline tariff requires a demand rate to compute deterministic bills.',
      howToGet: 'Provide the demand $/kW-month from the tariff/bill or choose a supported rate code.',
      severity: 'important',
    });
  }

  const demandRatePerKwMonth = demandRate?.rate ?? 20; // deterministic fallback (low confidence)
  if (!demandRate) why.push(`Using fallback demand rate $${demandRatePerKwMonth.toFixed(2)}/kW-month (low confidence).`);

  const confidence = rateCode && demandRate ? 0.8 : rateCode ? 0.3 : 0.1;

  const tariff: TariffModel = {
    version: 'phase1-pge-demand-v1',
    tariffId: `pge:${rateCode || 'UNKNOWN'}:phase1-demand-v1`,
    rateCode: rateCode || 'UNKNOWN',
    timezone: 'America/Los_Angeles',
    fixedMonthlyChargeUsd: 0,
    energyCharges: [],
    demandDeterminants: [
      {
        id: 'baseline.monthlyAllHours',
        name: 'Baseline monthly max demand (all hours)',
        kind: 'monthlyMax',
        tiers: [{ pricePerKw: demandRatePerKwMonth }],
      },
    ],
    meta: { utility: 'PG&E', territory: args.territory },
  };

  return {
    tariff,
    inference: {
      detectedRateCode: rateCode || undefined,
      detectedTariffId: tariff.tariffId,
      confidence,
      why,
      missingInfo,
      evidenceUsed: [],
    },
  };
}

