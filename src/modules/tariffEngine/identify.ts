import type { BillingPeriod, TariffModel } from './schema';
import { makeSimpleDemandTariff } from './library/simple-demand';

export type TariffDetection = {
  detectedTariff: {
    rateCode: string | null;
    tariffId: string | null;
    version: string | null;
    confidence: number; // 0..1
    whyMatched: string[];
    timezone: string;
  };
  tariff: TariffModel | null;
};

/**
 * Deterministic v1:
 * - If usage provides rateCode, use it
 * - Else if caller provides rateCode, use it
 * - Else mark UNKNOWN (and caller should block optimization)
 *
 * Tariff model used is a demand-only fallback until real tariff library is added.
 */
export function identifyTariff(args: {
  usagePeriods: BillingPeriod[];
  fallbackRateCode?: string;
  utility?: string;
  demandRatePerKwMonth: number;
  timezone?: string;
}): TariffDetection {
  const utility = args.utility || 'PGE';
  const timezone = args.timezone || 'America/Los_Angeles';
  const usageRate = args.usagePeriods.find((p) => p.rateCode && String(p.rateCode).trim())?.rateCode;
  const rateCode = String(usageRate || args.fallbackRateCode || '').trim() || null;

  if (!rateCode) {
    return {
      detectedTariff: {
        rateCode: null,
        tariffId: null,
        version: null,
        confidence: 0,
        whyMatched: ['No rate code present in usage data or request.'],
        timezone,
      },
      tariff: null,
    };
  }

  const tariff = makeSimpleDemandTariff({
    rateCode,
    utility,
    demandRatePerKwMonth: args.demandRatePerKwMonth,
    timezone,
  });

  return {
    detectedTariff: {
      rateCode,
      tariffId: tariff.tariffId,
      version: tariff.version,
      confidence: 1,
      whyMatched: usageRate ? ['rateCode from usage data.'] : ['fallback rateCode from request.'],
      timezone: tariff.timezone,
    },
    tariff,
  };
}

