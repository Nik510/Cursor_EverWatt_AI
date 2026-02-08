import type { TariffRateMetadata } from '../../tariffLibrary/types';
import type { MissingInfoItemV0 } from '../../utilityIntelligence/missingInfo/types';
import type { ApplicabilityResult, ApplicabilityStatus } from '../types';

export type PgeRuleContextV1 = {
  utility: 'PGE';
  rateCode: string;
  tariffMetadata?: TariffRateMetadata | null;
  maxDemandKwObserved?: number | null;
  demandSource?: 'billingRecords' | 'intervals' | 'unknown';
  voltage?: 'secondary' | 'primary' | 'transmission' | 'unknown';
  customerClass?: string;
  supplyType?: 'bundled' | 'CCA' | 'DA' | 'unknown';
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function asResult(input: {
  status: ApplicabilityStatus;
  confidence: number;
  because: string[];
  determinants: ApplicabilityResult['determinants'];
  missingInfo?: MissingInfoItemV0[];
  warnings?: string[];
}): ApplicabilityResult {
  return {
    status: input.status,
    confidence: clamp01(input.confidence),
    because: input.because,
    determinants: input.determinants,
    missingInfo: input.missingInfo || [],
    ...(input.warnings?.length ? { warnings: input.warnings } : {}),
  };
}

function normalizeRateFamily(rateCode: string): { family: 'B19' | 'B20' | 'OTHER'; isStorageVariant: boolean } {
  // Normalize aggressively: billing exports and user input may include hyphens/spaces ("B-19" vs "HB19S").
  const rc = String(rateCode || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9]/g, '');
  // Billing exports often show "HB19S" etc.
  const hasB19 = rc.includes('B19');
  const hasB20 = rc.includes('B20');
  const isStorageVariant = /B19S\b/.test(rc) || /B20S\b/.test(rc) || /S$/.test(rc);
  if (hasB19) return { family: 'B19', isStorageVariant };
  if (hasB20) return { family: 'B20', isStorageVariant };
  return { family: 'OTHER', isStorageVariant };
}

/**
 * Placeholder applicability thresholds for initial, deterministic rules.
 *
 * IMPORTANT:
 * - These are scaffolding constants; validate against authoritative PG&E tariff schedules before relying on them.
 * - The engine will include a warning when these constants influence a decision.
 */
export const PGE_B19_MIN_DEMAND_KW_V1 = 500;
export const PGE_B20_MAX_DEMAND_KW_V1 = 500; // interpreted as "below 500kW"

export function evaluatePgeApplicabilityV1(ctx: PgeRuleContextV1): ApplicabilityResult {
  const because: string[] = [];
  const warnings: string[] = [];
  const missingInfo: MissingInfoItemV0[] = [];

  const { family, isStorageVariant } = normalizeRateFamily(ctx.rateCode);
  if (family === 'OTHER') {
    return asResult({
      status: 'unknown',
      confidence: 0.25,
      because: [`No PG&E applicability rules registered for rateCode="${ctx.rateCode}".`],
      determinants: {
        utility: ctx.utility,
        rateCode: ctx.rateCode,
        customerClass: ctx.customerClass,
        voltage: ctx.voltage,
        maxDemandKwObserved: ctx.maxDemandKwObserved ?? null,
        demandSource: ctx.demandSource || 'unknown',
        supplyType: ctx.supplyType,
      },
      missingInfo: [
        {
          id: 'tariff.applicability.rules.missing',
          category: 'tariff',
          severity: 'info',
          description: `No applicability rules exist yet for rate "${ctx.rateCode}". Add a rule module for this rate family.`,
        },
      ],
    });
  }

  if (isStorageVariant) {
    because.push(`Rate code "${ctx.rateCode}" appears to be a storage/variant tariff (e.g., "-S").`);
    because.push('Storage-variant applicability requires battery/interconnection/export configuration which is not evaluated in v1.');
    missingInfo.push({
      id: 'tariff.applicability.storageConfig.missing',
      category: 'tariff',
      severity: 'blocking',
      description: 'Storage-variant tariff applicability requires battery size, interconnection type, and export configuration (not available).',
    });
    return asResult({
      status: 'unknown',
      confidence: 0.35,
      because,
      determinants: {
        utility: ctx.utility,
        rateCode: ctx.rateCode,
        customerClass: ctx.customerClass,
        voltage: ctx.voltage,
        maxDemandKwObserved: ctx.maxDemandKwObserved ?? null,
        demandSource: ctx.demandSource || 'unknown',
        supplyType: ctx.supplyType,
        notes: ['storage_variant_detected'],
      },
      missingInfo,
    });
  }

  const demand = ctx.maxDemandKwObserved;
  if (!Number.isFinite(demand as any)) {
    because.push(`Rate family "${family}" rule requires max demand kW, but it is missing/unknown.`);
    missingInfo.push({
      id: `tariff.applicability.demand.required.${family}`,
      category: 'tariff',
      severity: 'blocking',
      description: `Max demand (kW) is required to evaluate PG&E ${family === 'B19' ? 'B-19' : 'B-20'} applicability.`,
    });
    return asResult({
      status: 'unknown',
      confidence: 0.35,
      because,
      determinants: {
        utility: ctx.utility,
        rateCode: ctx.rateCode,
        customerClass: ctx.customerClass,
        voltage: ctx.voltage,
        maxDemandKwObserved: null,
        demandSource: ctx.demandSource || 'unknown',
        supplyType: ctx.supplyType,
      },
      missingInfo,
    });
  }

  warnings.push('Applicability thresholds for B-19/B-20 are scaffolding constants; verify against authoritative PG&E tariff schedules.');
  because.push(`Observed max demand=${Number(demand).toFixed(2)} kW (source=${ctx.demandSource || 'unknown'}).`);

  if (family === 'B19') {
    const min = PGE_B19_MIN_DEMAND_KW_V1;
    because.push(`Rule: B-19 requires maxDemandKw >= ${min} kW (placeholder).`);
    const ok = Number(demand) >= min;
    return asResult({
      status: ok ? 'applicable' : 'not_applicable',
      confidence: ok ? 0.8 : 0.8,
      because: ok ? [...because, 'Demand meets threshold for B-19.'] : [...because, 'Demand is below threshold for B-19.'],
      determinants: {
        utility: ctx.utility,
        rateCode: ctx.rateCode,
        customerClass: ctx.customerClass,
        voltage: ctx.voltage,
        maxDemandKwObserved: Number(demand),
        demandSource: ctx.demandSource || 'unknown',
        supplyType: ctx.supplyType,
      },
      missingInfo,
      warnings,
    });
  }

  if (family === 'B20') {
    const maxExclusive = PGE_B20_MAX_DEMAND_KW_V1;
    because.push(`Rule: B-20 applies when maxDemandKw < ${maxExclusive} kW (placeholder).`);
    const ok = Number(demand) < maxExclusive;
    return asResult({
      status: ok ? 'applicable' : 'not_applicable',
      confidence: ok ? 0.78 : 0.78,
      because: ok ? [...because, 'Demand falls within the B-20 band.'] : [...because, 'Demand exceeds the B-20 band.'],
      determinants: {
        utility: ctx.utility,
        rateCode: ctx.rateCode,
        customerClass: ctx.customerClass,
        voltage: ctx.voltage,
        maxDemandKwObserved: Number(demand),
        demandSource: ctx.demandSource || 'unknown',
        supplyType: ctx.supplyType,
      },
      missingInfo,
      warnings,
    });
  }

  return asResult({
    status: 'unknown',
    confidence: 0.25,
    because: [...because, `Unhandled PG&E family "${family}".`],
    determinants: {
      utility: ctx.utility,
      rateCode: ctx.rateCode,
      customerClass: ctx.customerClass,
      voltage: ctx.voltage,
      maxDemandKwObserved: Number(demand),
      demandSource: ctx.demandSource || 'unknown',
      supplyType: ctx.supplyType,
    },
    missingInfo: [
      ...missingInfo,
      {
        id: 'tariff.applicability.rules.unhandled',
        category: 'tariff',
        severity: 'info',
        description: `Applicability rule registry did not handle PG&E rate "${ctx.rateCode}".`,
      },
    ],
    warnings,
  });
}

