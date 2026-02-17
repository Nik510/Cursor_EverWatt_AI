import { incentivesStubVersionTagV1 } from './economicsConstants';
import { IncentivesStubReasonCodesV1, uniqSorted } from './economicsReasons';
import type { BatteryConfigV1, ConfidenceTierV1 } from './types';

export type IncentivesStubV1 = {
  programsConsidered: string[];
  estimatedIncentiveUsdRange: null;
  confidenceTier: ConfidenceTierV1;
  warnings: string[];
  missingInfo: string[];
  engineVersion: string;
};

export function incentivesStubV1(args: {
  recommendedBatteryConfig: BatteryConfigV1 | null;
  /** Optional territory/sector hints; no program mapping in v1 stub. */
  customerType?: string | null;
}): IncentivesStubV1 {
  const warnings: string[] = [];
  const missingInfo: string[] = [];

  missingInfo.push(IncentivesStubReasonCodesV1.INCENTIVES_V1_PROGRAM_UNKNOWN);

  const customerType = String(args.customerType || '').trim();
  if (!customerType) missingInfo.push(IncentivesStubReasonCodesV1.INCENTIVES_V1_NEED_CUSTOMER_CLASSIFICATION);

  const cfg = args.recommendedBatteryConfig;
  const hasTechDetails = Boolean(cfg && Number.isFinite(Number(cfg.powerKw)) && Number.isFinite(Number(cfg.energyKwh)) && Number(cfg.powerKw) > 0 && Number(cfg.energyKwh) > 0);
  if (!hasTechDetails) missingInfo.push(IncentivesStubReasonCodesV1.INCENTIVES_V1_NEED_TECHNOLOGY_DETAILS);

  return {
    programsConsidered: [],
    estimatedIncentiveUsdRange: null,
    confidenceTier: 'NONE',
    warnings: uniqSorted(warnings),
    missingInfo: uniqSorted(missingInfo),
    engineVersion: incentivesStubVersionTagV1,
  };
}

